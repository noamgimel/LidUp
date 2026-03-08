import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const traceId = crypto.randomUUID().slice(0, 8);
  const tag = `[notifyNewLead][${traceId}]`;

  try {
    const base44 = createClientFromRequest(req);

    // פונקציה זו נקראת מ-automation (entity trigger) – לא ניתן להשתמש ב-auth.me()
    // משתמשים ב-asServiceRole בלבד
    const body = await req.json();
    console.log(`${tag} raw body:`, JSON.stringify(body));

    // תמיכה בקריאה ישירה (lead_id) וגם מ-automation payload (event.entity_id / data.id)
    const lead_id = body.lead_id || body.event?.entity_id || body.data?.id;
    if (!lead_id) {
      console.error(`${tag} ERROR: lead_id missing in body`);
      return Response.json({ error: 'lead_id required' }, { status: 400 });
    }

    console.log(`${tag} processing lead_id: ${lead_id}`);
    const nowUtc = new Date().toISOString();

    // שליפת הליד
    const leads = await base44.asServiceRole.entities.Client.filter({ id: lead_id });
    if (!leads || leads.length === 0) {
      console.error(`${tag} ERROR: Lead not found for id: ${lead_id}`);
      return Response.json({ error: 'Lead not found' }, { status: 404 });
    }
    const lead = leads[0];
    console.log(`${tag} lead found: name="${lead.name}" owner_email="${lead.owner_email}" created_by="${lead.created_by}" new_lead_notified_at="${lead.new_lead_notified_at}"`);

    // בדיקה שלא נשלחה כבר התראה
    if (lead.new_lead_notified_at) {
      const reason = 'ALREADY_NOTIFIED';
      console.log(`${tag} SKIP: ${reason}`);
      await base44.asServiceRole.entities.NotificationLog.create({
        owner_email: lead.owner_email || lead.created_by || 'unknown',
        lead_id: lead.id,
        type: 'new_lead',
        status: 'skipped',
        sent_at: nowUtc,
        error_message: reason
      });
      return Response.json({ skipped: true, reason });
    }

    // שליפת בעל הליד
    const ownerEmail = lead.owner_email || lead.created_by;
    if (!ownerEmail) {
      const reason = 'NO_OWNER_EMAIL';
      console.error(`${tag} SKIP: ${reason}`);
      await base44.asServiceRole.entities.NotificationLog.create({
        owner_email: 'unknown',
        lead_id: lead.id,
        type: 'new_lead',
        status: 'skipped',
        sent_at: nowUtc,
        error_message: reason
      });
      return Response.json({ skipped: true, reason });
    }

    // שליפת הגדרות התראות
    const settings = await base44.asServiceRole.entities.NotificationSettings.filter({ owner_email: ownerEmail });
    const s = settings?.[0];
    console.log(`${tag} settings for ${ownerEmail}:`, JSON.stringify(s ?? null));

    if (!s) {
      const reason = 'SETTINGS_NOT_FOUND';
      console.log(`${tag} SKIP: ${reason}`);
      await base44.asServiceRole.entities.NotificationLog.create({
        owner_email: ownerEmail,
        lead_id: lead.id,
        type: 'new_lead',
        status: 'skipped',
        sent_at: nowUtc,
        error_message: reason
      });
      return Response.json({ skipped: true, reason });
    }

    if (!s.enabled) {
      const reason = 'SETTINGS_DISABLED (enabled=false)';
      console.log(`${tag} SKIP: ${reason}`);
      await base44.asServiceRole.entities.NotificationLog.create({ owner_email: ownerEmail, lead_id: lead.id, type: 'new_lead', status: 'skipped', sent_at: nowUtc, error_message: reason });
      return Response.json({ skipped: true, reason });
    }
    if (!s.email_enabled) {
      const reason = 'SETTINGS_DISABLED (email_enabled=false)';
      console.log(`${tag} SKIP: ${reason}`);
      await base44.asServiceRole.entities.NotificationLog.create({ owner_email: ownerEmail, lead_id: lead.id, type: 'new_lead', status: 'skipped', sent_at: nowUtc, error_message: reason });
      return Response.json({ skipped: true, reason });
    }
    if (!s.notify_new_lead) {
      const reason = 'SETTINGS_DISABLED (notify_new_lead=false)';
      console.log(`${tag} SKIP: ${reason}`);
      await base44.asServiceRole.entities.NotificationLog.create({ owner_email: ownerEmail, lead_id: lead.id, type: 'new_lead', status: 'skipped', sent_at: nowUtc, error_message: reason });
      return Response.json({ skipped: true, reason });
    }

    console.log(`${tag} SENDING email to ${ownerEmail} for lead "${lead.name}"`);

    // שליחת מייל
    let status = 'sent';
    let errorMessage = null;
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
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
          <p style="color: #64748b; font-size: 13px;">הודעה אוטומטית מ-LidUp (traceId: ${traceId})</p>
        </div>`
      });

      await base44.asServiceRole.entities.Client.update(lead.id, {
        new_lead_notified_at: nowUtc
      });

      console.log(`${tag} SUCCESS: email sent to ${ownerEmail}`);
    } catch (emailErr) {
      status = 'failed';
      errorMessage = emailErr.message;
      console.error(`${tag} FAILED to send email: ${emailErr.message}`);
    }

    await base44.asServiceRole.entities.NotificationLog.create({
      owner_email: ownerEmail,
      lead_id: lead.id,
      type: 'new_lead',
      status,
      sent_at: nowUtc,
      error_message: errorMessage
    });

    console.log(`${tag} done. status=${status}`);
    return Response.json({ success: status === 'sent', status, traceId });
  } catch (error) {
    console.error(`${tag} EXCEPTION:`, error.message);
    return Response.json({ error: error.message, traceId }, { status: 500 });
  }
});