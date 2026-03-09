import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// פונקציה זו רצה כ-scheduled automation כל 5 דקות.
// סורקת כל ליד שחרג מ-SLA (30 דקות) ועדיין לא נשלחה לו התראה.
// אין חלון — כל ליד שחרג בין nowUtc-48h ל-nowUtc-30min נסרק.

Deno.serve(async (req) => {
  const traceId = crypto.randomUUID().slice(0, 8);
  const tag = `[checkSlaBreaches][${traceId}]`;

  try {
    const base44 = createClientFromRequest(req);

    const nowUtc = new Date();
    const slaMinutes = 30;
    const maxLookbackHours = 48;

    const slaThreshold  = new Date(nowUtc.getTime() - slaMinutes * 60 * 1000);
    const lookbackStart = new Date(nowUtc.getTime() - maxLookbackHours * 60 * 60 * 1000);

    console.log(`${tag} started. nowUtc=${nowUtc.toISOString()} | slaThreshold=${slaThreshold.toISOString()} | lookback=${lookbackStart.toISOString()}`);

    // שליפת כל הלידים הפתוחים ללא sla_breached_notified_at
    const allLeads = await base44.asServiceRole.entities.Client.filter({ lifecycle: 'open' });

    console.log(`${tag} total open leads fetched: ${allLeads.length}`);

    // סינון ראשוני — לידים מתאימים לסריקה (חרגו מ-SLA, בתוך חלון 48h)
    const candidates = allLeads.filter(lead => {
      if (!lead.created_date) return false;
      const createdAt = new Date(lead.created_date);
      return createdAt <= slaThreshold && createdAt >= lookbackStart;
    });

    console.log(`${tag} scannedCandidates (past SLA threshold, within 48h): ${candidates.length}`);

    let totalSent = 0;
    let totalFailed = 0;
    let totalSkipped = 0;
    const reasonsCount = {};

    const bump = (reason) => {
      reasonsCount[reason] = (reasonsCount[reason] || 0) + 1;
      totalSkipped++;
    };

    for (const lead of candidates) {
      const minutesOld = Math.floor((nowUtc - new Date(lead.created_date)) / 60000);

      // בדיקות idempotency
      if (lead.first_response_at) {
        console.log(`${tag} SKIP lead "${lead.name}" (${lead.id}): FIRST_RESPONSE_EXISTS`);
        bump('FIRST_RESPONSE_EXISTS');
        continue;
      }
      if (lead.sla_breached_notified_at) {
        console.log(`${tag} SKIP lead "${lead.name}" (${lead.id}): ALREADY_NOTIFIED`);
        bump('ALREADY_NOTIFIED');
        continue;
      }

      const ownerEmail = lead.owner_email;
      if (!ownerEmail) {
        console.log(`${tag} SKIP lead "${lead.name}" (${lead.id}): MISSING_OWNER_EMAIL`);
        bump('MISSING_OWNER_EMAIL');
        continue;
      }

      // שליפת הגדרות התראה לפי owner
      const settings = await base44.asServiceRole.entities.NotificationSettings.filter({ owner_email: ownerEmail });

      if (!settings || settings.length === 0) {
        console.log(`${tag} SKIP lead "${lead.name}" (${lead.id}): SETTINGS_NOT_FOUND for ${ownerEmail}`);
        bump('SETTINGS_NOT_FOUND');
        continue;
      }

      const s = settings[0];

      if (!s.enabled) {
        console.log(`${tag} SKIP lead "${lead.name}" (${lead.id}): SETTINGS_DISABLED`);
        bump('SETTINGS_DISABLED');
        continue;
      }
      if (!s.email_enabled) {
        console.log(`${tag} SKIP lead "${lead.name}" (${lead.id}): EMAIL_DISABLED`);
        bump('EMAIL_DISABLED');
        continue;
      }
      if (!s.notify_sla_breach) {
        console.log(`${tag} SKIP lead "${lead.name}" (${lead.id}): NOTIFY_DISABLED`);
        bump('NOTIFY_DISABLED');
        continue;
      }

      // שליחת מייל
      const nowIso = new Date().toISOString();
      let status = 'sent';
      let errorMessage = null;

      console.log(`${tag} SENDING sla_breach for lead "${lead.name}" (${lead.id}), ${minutesOld} min old, owner=${ownerEmail}`);

      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: ownerEmail,
          subject: `ליד ללא מענה: ${lead.name}`,
          body: `ליד לא ענית עליו כבר ${minutesOld} דקות:

שם: ${lead.name || '-'}
אימייל: ${lead.email || '-'}
טלפון: ${lead.phone || '-'}

https://app.lidup.co.il`
        });

        await base44.asServiceRole.entities.Client.update(lead.id, {
          sla_breached_notified_at: nowIso
        });

        totalSent++;
        console.log(`${tag} SUCCESS: sla_breach sent for "${lead.name}"`);
      } catch (emailErr) {
        status = 'failed';
        errorMessage = emailErr?.message || String(emailErr);
        totalFailed++;
        console.error(`${tag} FAILED for "${lead.name}": ${errorMessage}`);
      }

      await base44.asServiceRole.entities.NotificationLog.create({
        owner_email: ownerEmail,
        lead_id: lead.id,
        type: 'sla_breach',
        status,
        sent_at: nowIso,
        error_message: errorMessage
      });
    }

    const result = {
      success: true,
      traceId,
      nowUtc: nowUtc.toISOString(),
      scannedCandidates: candidates.length,
      sent: totalSent,
      failed: totalFailed,
      skipped: totalSkipped,
      reasonsCount
    };

    console.log(`${tag} done.`, JSON.stringify(result));
    return Response.json(result);

  } catch (error) {
    console.error(`${tag} EXCEPTION:`, error?.message, error?.stack);
    return Response.json({ error: error?.message, traceId }, { status: 500 });
  }
});