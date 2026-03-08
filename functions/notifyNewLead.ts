import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { lead_id } = await req.json();
    if (!lead_id) return Response.json({ error: 'lead_id required' }, { status: 400 });

    const nowUtc = new Date().toISOString();

    // שליפת הליד
    const leads = await base44.asServiceRole.entities.Client.filter({ id: lead_id });
    if (!leads || leads.length === 0) return Response.json({ error: 'Lead not found' }, { status: 404 });
    const lead = leads[0];

    // בדיקה שלא נשלחה כבר התראה
    if (lead.new_lead_notified_at) {
      return Response.json({ skipped: true, reason: 'already_notified' });
    }

    // שליפת הגדרות התראות של בעל הליד
    const ownerEmail = lead.owner_email || lead.created_by;
    if (!ownerEmail) return Response.json({ skipped: true, reason: 'no_owner' });

    const settings = await base44.asServiceRole.entities.NotificationSettings.filter({ owner_email: ownerEmail });
    const s = settings?.[0];

    if (!s || !s.enabled || !s.email_enabled || !s.notify_new_lead) {
      return Response.json({ skipped: true, reason: 'notifications_disabled' });
    }

    // שליחת מייל
    let status = 'sent';
    let errorMessage = null;
    try {
      await base44.integrations.Core.SendEmail({
        to: ownerEmail,
        subject: `ליד חדש נכנס למערכת: ${lead.name}`,
        body: `<div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #1e40af;">🎯 ליד חדש נכנס!</h2>
          <table style="border-collapse: collapse; width: 100%;">
            <tr><td style="padding: 8px; font-weight: bold;">שם:</td><td style="padding: 8px;">${lead.name || '-'}</td></tr>
            <tr style="background:#f8fafc"><td style="padding: 8px; font-weight: bold;">אימייל:</td><td style="padding: 8px;">${lead.email || '-'}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">טלפון:</td><td style="padding: 8px;">${lead.phone || '-'}</td></tr>
            <tr style="background:#f8fafc"><td style="padding: 8px; font-weight: bold;">חברה:</td><td style="padding: 8px;">${lead.company || '-'}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">מקור:</td><td style="padding: 8px;">${lead.source || '-'}</td></tr>
          </table>
          <hr style="border: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="color: #64748b; font-size: 13px;">הודעה אוטומטית מ-LidUp</p>
        </div>`
      });

      // עדכון notified_at בליד רק אחרי שליחה מוצלחת
      await base44.asServiceRole.entities.Client.update(lead.id, {
        new_lead_notified_at: nowUtc
      });
    } catch (emailErr) {
      status = 'failed';
      errorMessage = emailErr.message;
      // לא מעדכנים new_lead_notified_at – כדי לאפשר retry
    }

    await base44.asServiceRole.entities.NotificationLog.create({
      owner_email: ownerEmail,
      lead_id: lead.id,
      type: 'new_lead',
      status,
      sent_at: nowUtc,
      error_message: errorMessage
    });

    return Response.json({ success: status === 'sent', status });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});