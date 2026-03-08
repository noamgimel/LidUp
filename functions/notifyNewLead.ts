import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// פונקציה זו רצה כ-scheduled automation כל דקה
// ומחפשת לידים חדשים שטרם קיבלו התראת "ליד חדש"
// גישה זו עוקפת את בעיית ה-body stream של entity triggers

Deno.serve(async (req) => {
  const traceId = crypto.randomUUID().slice(0, 8);
  const tag = `[notifyNewLead][${traceId}]`;
  const nowUtc = new Date().toISOString();

  console.log(`${tag} START (scheduled scan mode)`);

  const base44 = createClientFromRequest(req);

  try {
    // שליפת כל הגדרות ה-notifications הפעילות
    const allSettings = await base44.asServiceRole.entities.NotificationSettings.filter({
      enabled: true,
      email_enabled: true,
      notify_new_lead: true
    });

    console.log(`${tag} found ${allSettings.length} active notification settings`);

    let totalScanned = 0;
    let totalSent = 0;
    let totalSkipped = 0;
    let totalFailed = 0;

    // סריקה לכל owner עם הגדרות פעילות
    for (const setting of allSettings) {
      const ownerEmail = setting.owner_email;

      // שליפת לידים חדשים שלא קיבלו התראה
      const leads = await base44.asServiceRole.entities.Client.filter({
        owner_email: ownerEmail,
        new_lead_notified_at: null
      });

      totalScanned += leads.length;

      // סינון לידים שנוצרו בשעה האחרונה (למניעת שליחה על לידים ישנים)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentLeads = leads.filter(lead => {
        const created = new Date(lead.created_date);
        return created >= oneHourAgo;
      });

      console.log(`${tag} owner=${ownerEmail}: ${leads.length} unnotified leads, ${recentLeads.length} recent (<1h)`);

      for (const lead of recentLeads) {
        const leadNowUtc = new Date().toISOString();
        let status = 'sent';
        let errorMessage = null;

        console.log(`${tag} → processing lead: name="${lead.name}" id=${lead.id} owner_email="${lead.owner_email}" created_by="${lead.created_by}"`);
        console.log(`${tag}   new_lead_notified_at="${lead.new_lead_notified_at}"`);
        console.log(`${tag}   settings: enabled=${setting.enabled} email_enabled=${setting.email_enabled} notify_new_lead=${setting.notify_new_lead}`);

        // double-check שלא נשלחה כבר
        if (lead.new_lead_notified_at) {
          const reason = 'ALREADY_NOTIFIED';
          console.log(`${tag}   SKIP: ${reason}`);
          totalSkipped++;
          await base44.asServiceRole.entities.NotificationLog.create({ owner_email: ownerEmail, lead_id: lead.id, type: 'new_lead', status: 'skipped', sent_at: leadNowUtc, error_message: reason });
          continue;
        }

        console.log(`${tag}   ALL CHECKS PASSED → SENDING email to ${ownerEmail}`);

        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: ownerEmail,
            subject: `ליד חדש נכנס למערכת: ${lead.name}`,
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

          await base44.asServiceRole.entities.Client.update(lead.id, { new_lead_notified_at: leadNowUtc });
          console.log(`${tag}   SEND OK → email sent to ${ownerEmail}`);
          totalSent++;
        } catch (emailErr) {
          status = 'failed';
          errorMessage = emailErr?.message || String(emailErr);
          totalFailed++;
          console.error(`${tag}   SEND_EMAIL_ERROR: ${errorMessage}`);
        }

        await base44.asServiceRole.entities.NotificationLog.create({
          owner_email: ownerEmail,
          lead_id: lead.id,
          type: 'new_lead',
          status,
          sent_at: leadNowUtc,
          error_message: errorMessage
        });
      }
    }

    console.log(`${tag} DONE. scanned=${totalScanned} sent=${totalSent} skipped=${totalSkipped} failed=${totalFailed}`);

    return Response.json({ success: true, traceId, scanned: totalScanned, sent: totalSent, skipped: totalSkipped, failed: totalFailed });

  } catch (error) {
    console.error(`${tag} EXCEPTION: ${error?.message}`, error?.stack);
    return Response.json({ error: error?.message || 'unexpected error', traceId }, { status: 500 });
  }
});