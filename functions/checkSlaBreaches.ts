import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const traceId = crypto.randomUUID().slice(0, 8);
  const tag = `[checkSlaBreaches][${traceId}]`;

  try {
    const base44 = createClientFromRequest(req);

    const nowUtc = new Date();
    const slaThreshold = new Date(nowUtc.getTime() - 30 * 60 * 1000);
    const nowIso = nowUtc.toISOString();

    console.log(`${tag} started. nowUtc=${nowIso} slaThreshold=${slaThreshold.toISOString()}`);

    // רישום scan_run log
    await base44.asServiceRole.entities.NotificationLog.create({
      owner_email: 'system',
      lead_id: null,
      type: 'sla_scan_run',
      status: 'sent',
      sent_at: nowIso,
      error_message: `scan started at ${nowIso}`
    });

    // שליפת כל הגדרות התראות פעילות
    const allSettings = await base44.asServiceRole.entities.NotificationSettings.filter({
      enabled: true,
      email_enabled: true,
      notify_sla_breach: true
    });

    console.log(`${tag} found ${allSettings.length} active notification settings`);

    let totalChecked = 0;
    let totalBreached = 0;
    let totalSent = 0;
    let totalFailed = 0;
    let totalSkipped = 0;

    for (const setting of allSettings) {
      const ownerEmail = setting.owner_email;

      const leads = await base44.asServiceRole.entities.Client.filter({ owner_email: ownerEmail });
      totalChecked += leads.length;

      console.log(`${tag} owner=${ownerEmail}: ${leads.length} total leads`);

      const breachedLeads = leads.filter(lead => {
        const hasNoResponse = !lead.first_response_at;
        const notYetNotified = !lead.sla_breached_notified_at;
        const createdAt = new Date(lead.created_date);
        const isOldEnough = createdAt <= slaThreshold;

        if (!hasNoResponse) return false;
        if (!notYetNotified) return false;
        if (!isOldEnough) {
          const minutesOld = Math.floor((nowUtc - createdAt) / 60000);
          console.log(`${tag}   lead "${lead.name}" (${lead.id}): only ${minutesOld} min old, not breached yet`);
          return false;
        }
        return true;
      });

      totalBreached += breachedLeads.length;
      console.log(`${tag} owner=${ownerEmail}: ${breachedLeads.length} breached leads (no response + >${30}min old + not notified yet)`);

      for (const lead of breachedLeads) {
        const logNowIso = new Date().toISOString();
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
              <table style="border-collapse: collapse; width: 100%;">
                <tr><td style="padding: 8px; font-weight: bold;">שם:</td><td style="padding: 8px;">${lead.name || '-'}</td></tr>
                <tr style="background:#f8fafc"><td style="padding: 8px; font-weight: bold;">אימייל:</td><td style="padding: 8px;">${lead.email || '-'}</td></tr>
                <tr><td style="padding: 8px; font-weight: bold;">טלפון:</td><td style="padding: 8px;">${lead.phone || '-'}</td></tr>
                <tr style="background:#f8fafc"><td style="padding: 8px; font-weight: bold;">נכנס:</td><td style="padding: 8px;">${new Date(lead.created_date).toLocaleString('he-IL')}</td></tr>
              </table>
              <p style="color:#dc2626; font-weight: bold;">יש לפנות ללקוח בהקדם!</p>
              <hr style="border: 1px solid #e2e8f0; margin: 20px 0;" />
              <p style="color: #64748b; font-size: 13px;">הודעה אוטומטית מ-LidUp (traceId: ${traceId})</p>
            </div>`
          });

          await base44.asServiceRole.entities.Client.update(lead.id, {
            sla_breached_notified_at: logNowIso
          });

          totalSent++;
          console.log(`${tag}   SUCCESS: sla_breach sent for lead "${lead.name}"`);
        } catch (emailErr) {
          status = 'failed';
          errorMessage = emailErr.message;
          totalFailed++;
          console.error(`${tag}   FAILED: sla_breach for lead "${lead.name}": ${emailErr.message}`);
        }

        await base44.asServiceRole.entities.NotificationLog.create({
          owner_email: ownerEmail,
          lead_id: lead.id,
          type: 'sla_breach',
          status,
          sent_at: logNowIso,
          error_message: errorMessage
        });
      }
    }

    console.log(`${tag} done. checked=${totalChecked} breached=${totalBreached} sent=${totalSent} failed=${totalFailed} skipped=${totalSkipped}`);

    return Response.json({
      success: true,
      traceId,
      checked: totalChecked,
      breached: totalBreached,
      sent: totalSent,
      failed: totalFailed
    });
  } catch (error) {
    console.error(`${tag} EXCEPTION:`, error.message);
    return Response.json({ error: error.message, traceId }, { status: 500 });
  }
});