import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// פונקציה זו מופעלת ע"י entity trigger בעת יצירת ליד חדש (Client created)
// וגם מתזמנת בדיקת SLA ל-30 דקות קדימה (via checkSlaBreachForLead)

Deno.serve(async (req) => {
  const traceId = crypto.randomUUID().slice(0, 8);
  const tag = `[notifyNewLead][${traceId}]`;

  console.log(`${tag} START`);

  const base44 = createClientFromRequest(req);

  try {
    const payload = await req.json();

    // תמיכה בשני מקרים: entity trigger { event, data } או קריאה ישירה { lead_id }
    let lead = payload?.data || null;
    const leadId = payload?.event?.entity_id || payload?.lead_id || lead?.id;

    if (!lead && leadId) {
      lead = await base44.asServiceRole.entities.Client.get(leadId);
    }

    if (!lead || !lead.id) {
      console.error(`${tag} ERROR: no lead found`);
      return Response.json({ error: 'lead not found', traceId }, { status: 400 });
    }

    const ownerEmail = lead.owner_email;
    if (!ownerEmail) {
      console.log(`${tag} SKIP: no owner_email on lead ${lead.id}`);
      return Response.json({ success: true, traceId, skipped: 'no_owner_email' });
    }

    const nowUtc = new Date().toISOString();

    // ── 1. התראת ליד חדש ──────────────────────────────────────────
    if (lead.new_lead_notified_at) {
      console.log(`${tag} SKIP new_lead: already notified`);
    } else {
      const settings = await base44.asServiceRole.entities.NotificationSettings.filter({
        owner_email: ownerEmail,
        enabled: true,
        email_enabled: true,
        notify_new_lead: true
      });

      if (settings.length === 0) {
        console.log(`${tag} SKIP new_lead: no active settings for ${ownerEmail}`);
        await base44.asServiceRole.entities.NotificationLog.create({
          owner_email: ownerEmail,
          lead_id: lead.id,
          type: 'new_lead',
          status: 'skipped',
          sent_at: nowUtc,
          error_message: 'no_active_settings'
        });
      } else {
        let status = 'sent';
        let errorMessage = null;

        console.log(`${tag} SENDING new_lead email to ${ownerEmail} for lead "${lead.name}"`);

        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: ownerEmail,
            subject: `🎯 ליד חדש נכנס למערכת: ${lead.name}`,
            body: `<div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px;">
              <h2 style="color: #1e40af;">🎯 ליד חדש נכנס!</h2>
              <table style="border-collapse: collapse; width: 100%; border: 1px solid #e2e8f0;">
                <tr><td style="padding: 8px; font-weight: bold; border: 1px solid #e2e8f0;">שם:</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${lead.name || '-'}</td></tr>
                <tr style="background:#f8fafc"><td style="padding: 8px; font-weight: bold; border: 1px solid #e2e8f0;">אימייל:</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${lead.email || '-'}</td></tr>
                <tr><td style="padding: 8px; font-weight: bold; border: 1px solid #e2e8f0;">טלפון:</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${lead.phone || '-'}</td></tr>
                <tr style="background:#f8fafc"><td style="padding: 8px; font-weight: bold; border: 1px solid #e2e8f0;">חברה:</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${lead.company || '-'}</td></tr>
                <tr><td style="padding: 8px; font-weight: bold; border: 1px solid #e2e8f0;">מקור:</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${lead.source || '-'}</td></tr>
              </table>
              <hr style="border: 1px solid #e2e8f0; margin: 20px 0;" />
              <p style="color: #64748b; font-size: 13px;">הודעה אוטומטית מ-LidUp | traceId: ${traceId}</p>
            </div>`
          });

          // עדכון הליד רק אם השליחה הצליחה
          await base44.asServiceRole.entities.Client.update(lead.id, { new_lead_notified_at: nowUtc });
          console.log(`${tag} SEND OK → new_lead email sent`);
        } catch (emailErr) {
          status = 'failed';
          errorMessage = emailErr?.message || String(emailErr);
          console.error(`${tag} SEND_FAILED: ${errorMessage}`);
          // לא מעדכנים new_lead_notified_at כדי לאפשר ניסיון חוזר
        }

        await base44.asServiceRole.entities.NotificationLog.create({
          owner_email: ownerEmail,
          lead_id: lead.id,
          type: 'new_lead',
          status,
          sent_at: nowUtc,
          error_message: errorMessage
        });
      }
    }

    // ── 2. תזמון בדיקת SLA ל-30 דקות ──────────────────────────────
    // checkSlaBreaches רץ כ-scheduled automation כל 5 דקות
    // ומטפל בלידים שחלפו 30 דקות מיצירתם ועדיין ללא מענה.
    // לכן אין צורך בתזמון נפרד פר ליד.
    console.log(`${tag} SLA check will be handled by scheduled checkSlaBreaches automation`);

    return Response.json({ success: true, traceId, leadId: lead.id });

  } catch (error) {
    console.error(`${tag} EXCEPTION: ${error?.message}`, error?.stack);
    return Response.json({ error: error?.message || 'unexpected error', traceId }, { status: 500 });
  }
});