import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// פונקציה זו רצה כ-scheduled automation כל 5 דקות
// ובודקת לידים שחלפו בדיוק ~30 דקות מיצירתם ועדיין ללא מענה.
// חלון הבדיקה: 30-35 דקות (כדי לתפוס לידים שנוצרו בין ריצה לריצה).

Deno.serve(async (req) => {
  const traceId = crypto.randomUUID().slice(0, 8);
  const tag = `[checkSlaBreaches][${traceId}]`;

  try {
    const base44 = createClientFromRequest(req);

    const nowUtc = new Date();
    const slaMinutes = 30;
    const windowMinutes = 5; // חלון הסריקה = תדירות הריצה

    // חלון: לידים שנוצרו לפני 30–35 דקות (כדי לא לפספס ולא לכפול)
    const windowStart = new Date(nowUtc.getTime() - (slaMinutes + windowMinutes) * 60 * 1000);
    const windowEnd   = new Date(nowUtc.getTime() - slaMinutes * 60 * 1000);
    const nowIso = nowUtc.toISOString();

    console.log(`${tag} started. window: ${windowStart.toISOString()} → ${windowEnd.toISOString()}`);

    // שליפת כל הגדרות התראות פעילות עבור SLA
    const allSettings = await base44.asServiceRole.entities.NotificationSettings.filter({
      enabled: true,
      email_enabled: true,
      notify_sla_breach: true
    });

    console.log(`${tag} found ${allSettings.length} active notification settings`);

    let totalSent = 0;
    let totalFailed = 0;
    let totalSkipped = 0;

    for (const setting of allSettings) {
      const ownerEmail = setting.owner_email;

      // שליפת לידים של owner זה
      const leads = await base44.asServiceRole.entities.Client.filter({ owner_email: ownerEmail });

      // סינון לפי חלון הזמן + תנאי SLA
      const breachedLeads = leads.filter(lead => {
        if (lead.first_response_at) return false;       // כבר טופל
        if (lead.sla_breached_notified_at) return false; // כבר נשלח
        if (lead.lifecycle && lead.lifecycle !== 'open') return false; // won/lost

        const createdAt = new Date(lead.created_date);
        return createdAt >= windowStart && createdAt <= windowEnd;
      });

      console.log(`${tag} owner=${ownerEmail}: ${leads.length} leads, ${breachedLeads.length} in SLA breach window`);

      for (const lead of breachedLeads) {
        const logNow = new Date().toISOString();
        const minutesOld = Math.floor((nowUtc - new Date(lead.created_date)) / 60000);
        let status = 'sent';
        let errorMessage = null;

        console.log(`${tag}   SENDING sla_breach for lead "${lead.name}" (${lead.id}), ${minutesOld} min old`);

        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: ownerEmail,
            subject: `⚠️ חריגה מ-SLA: ליד ללא מענה – ${lead.name}`,
            body: `<div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px;">
              <h2 style="color: #dc2626;">⚠️ ליד ללא מענה – חריגת SLA</h2>
              <p>הליד הבא לא קיבל מענה כבר <strong>${minutesOld} דקות</strong>:</p>
              <table style="border-collapse: collapse; width: 100%; border: 1px solid #e2e8f0;">
                <tr><td style="padding: 8px; font-weight: bold; border: 1px solid #e2e8f0;">שם:</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${lead.name || '-'}</td></tr>
                <tr style="background:#f8fafc"><td style="padding: 8px; font-weight: bold; border: 1px solid #e2e8f0;">אימייל:</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${lead.email || '-'}</td></tr>
                <tr><td style="padding: 8px; font-weight: bold; border: 1px solid #e2e8f0;">טלפון:</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${lead.phone || '-'}</td></tr>
                <tr style="background:#f8fafc"><td style="padding: 8px; font-weight: bold; border: 1px solid #e2e8f0;">נכנס:</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${new Date(lead.created_date).toLocaleString('he-IL')}</td></tr>
              </table>
              <p style="color:#dc2626; font-weight: bold;">יש לפנות ללקוח בהקדם!</p>
              <hr style="border: 1px solid #e2e8f0; margin: 20px 0;" />
              <p style="color: #64748b; font-size: 13px;">הודעה אוטומטית מ-LidUp (traceId: ${traceId})</p>
            </div>`
          });

          await base44.asServiceRole.entities.Client.update(lead.id, {
            sla_breached_notified_at: logNow
          });

          totalSent++;
          console.log(`${tag}   SUCCESS: sla_breach sent for "${lead.name}"`);
        } catch (emailErr) {
          status = 'failed';
          errorMessage = emailErr?.message || String(emailErr);
          totalFailed++;
          console.error(`${tag}   FAILED: ${errorMessage}`);
        }

        await base44.asServiceRole.entities.NotificationLog.create({
          owner_email: ownerEmail,
          lead_id: lead.id,
          type: 'sla_breach',
          status,
          sent_at: logNow,
          error_message: errorMessage
        });
      }

      totalSkipped += leads.length - breachedLeads.length;
    }

    console.log(`${tag} done. sent=${totalSent} failed=${totalFailed} skipped=${totalSkipped}`);

    return Response.json({ success: true, traceId, sent: totalSent, failed: totalFailed, skipped: totalSkipped });
  } catch (error) {
    console.error(`${tag} EXCEPTION:`, error?.message);
    return Response.json({ error: error?.message, traceId }, { status: 500 });
  }
});