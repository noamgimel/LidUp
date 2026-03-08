import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // פונקציה זו נקראת ע"י automation – לא צריך auth משתמש
    const nowUtc = new Date();
    const slaThreshold = new Date(nowUtc.getTime() - 30 * 60 * 1000); // 30 דקות אחורה

    console.log(`[checkSlaBreaches] running at ${nowUtc.toISOString()}, SLA threshold: ${slaThreshold.toISOString()}`);

    // שליפת כל הגדרות התראות פעילות
    const allSettings = await base44.asServiceRole.entities.NotificationSettings.filter({
      enabled: true,
      email_enabled: true,
      notify_sla_breach: true
    });

    console.log(`[checkSlaBreaches] found ${allSettings.length} active notification settings`);

    let totalSent = 0;
    let totalFailed = 0;

    for (const setting of allSettings) {
      const ownerEmail = setting.owner_email;

      // שליפת לידים שחרגו מ-SLA ועדיין לא קיבלו התראה
      const leads = await base44.asServiceRole.entities.Client.filter({
        owner_email: ownerEmail
      });

      const breachedLeads = leads.filter(lead => {
        const hasNoResponse = !lead.first_response_at;
        const notYetNotified = !lead.sla_breached_notified_at;
        const createdAt = new Date(lead.created_date);
        const isOldEnough = createdAt <= slaThreshold;
        return hasNoResponse && notYetNotified && isOldEnough;
      });

      console.log(`[checkSlaBreaches] owner ${ownerEmail}: ${breachedLeads.length} breached leads`);

      for (const lead of breachedLeads) {
        const nowIso = new Date().toISOString();
        let status = 'sent';
        let errorMessage = null;

        const minutesOld = Math.floor((nowUtc - new Date(lead.created_date)) / 60000);

        try {
          await base44.integrations.Core.SendEmail({
            to: ownerEmail,
            subject: `⚠️ חריגה מ-SLA: ליד ללא מענה – ${lead.name}`,
            body: `<div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px;">
              <h2 style="color: #dc2626;">⚠️ ליד ללא מענה – חריגת SLA</h2>
              <p>הליד הבא לא קיבל מענה כבר <strong>${minutesOld} דקות</strong>:</p>
              <table style="border-collapse: collapse; width: 100%;">
                <tr><td style="padding: 8px; font-weight: bold;">שם:</td><td style="padding: 8px;">${lead.name || '-'}</td></tr>
                <tr style="background:#f8fafc"><td style="padding: 8px; font-weight: bold;">אימייל:</td><td style="padding: 8px;">${lead.email || '-'}</td></tr>
                <tr><td style="padding: 8px; font-weight: bold;">טלפון:</td><td style="padding: 8px;">${lead.phone || '-'}</td></tr>
                <tr style="background:#f8fafc"><td style="padding: 8px; font-weight: bold;">נכנס:</td><td style="padding: 8px;">${new Date(lead.created_date).toLocaleString('he-IL')}</td></tr>
              </table>
              <p style="color:#dc2626; font-weight: bold;">יש לפנות ללקוח בהקדם!</p>
              <hr style="border: 1px solid #e2e8f0; margin: 20px 0;" />
              <p style="color: #64748b; font-size: 13px;">הודעה אוטומטית מ-LidUp</p>
            </div>`
          });

          // עדכון שדה sla_breached_notified_at רק לאחר שליחה מוצלחת
          await base44.asServiceRole.entities.Client.update(lead.id, {
            sla_breached_notified_at: nowIso
          });

          totalSent++;
        } catch (emailErr) {
          status = 'failed';
          errorMessage = emailErr.message;
          totalFailed++;
          // לא מעדכנים sla_breached_notified_at – retry בסבב הבא
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
    }

    console.log(`[checkSlaBreaches] done. sent: ${totalSent}, failed: ${totalFailed}`);
    return Response.json({ success: true, sent: totalSent, failed: totalFailed });
  } catch (error) {
    console.error('[checkSlaBreaches] error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});