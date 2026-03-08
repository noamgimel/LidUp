import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const traceId = crypto.randomUUID().slice(0, 8);
  const tag = `[notifyNewLead][${traceId}]`;
  const nowUtc = new Date().toISOString();

  // קריאת body לפני createClientFromRequest — test האם זה גורם ל-timeout
  let body = {};
  try {
    const text = await req.text();
    console.log(`${tag} raw text (first 300):`, text.slice(0, 300));
    body = JSON.parse(text);
  } catch (e) {
    console.log(`${tag} body parse error: ${e?.message}`);
    body = {};
  }

  // הרצת SDK לאחר קריאת ה-body — הוא ישתמש רק ב-headers
  const base44 = createClientFromRequest(req);

  console.log(`${tag} START body keys: ${Object.keys(body).join(',')}`);

  try {
    const lead_id = body?.lead_id
      || body?.payload?.lead_id
      || body?.event?.entity_id
      || body?.data?.id;

    console.log(`${tag} lead_id resolved: "${lead_id}"`);

    if (!lead_id) {
      console.error(`${tag} ERROR: lead_id missing`);
      return Response.json({ error: 'lead_id required', body_keys: Object.keys(body) }, { status: 400 });
    }

    const leads = await base44.asServiceRole.entities.Client.filter({ id: lead_id });
    const lead = leads?.[0];

    if (!lead) {
      console.error(`${tag} ERROR: Lead not found: ${lead_id}`);
      return Response.json({ error: 'Lead not found' }, { status: 404 });
    }

    console.log(`${tag} lead: name="${lead.name}" owner_email="${lead.owner_email}" created_by="${lead.created_by}" new_lead_notified_at="${lead.new_lead_notified_at}"`);

    const ownerEmail = lead.owner_email || lead.created_by;

    if (lead.new_lead_notified_at) {
      const reason = 'ALREADY_NOTIFIED';
      console.log(`${tag} SKIP: ${reason}`);
      await base44.asServiceRole.entities.NotificationLog.create({ owner_email: ownerEmail || 'unknown', lead_id: lead.id, type: 'new_lead', status: 'skipped', sent_at: nowUtc, error_message: reason });
      return Response.json({ skipped: true, reason });
    }

    if (!ownerEmail) {
      const reason = 'OWNER_EMAIL_MISSING';
      console.error(`${tag} SKIP: ${reason}`);
      await base44.asServiceRole.entities.NotificationLog.create({ owner_email: 'unknown', lead_id: lead.id, type: 'new_lead', status: 'skipped', sent_at: nowUtc, error_message: reason });
      return Response.json({ skipped: true, reason });
    }

    const settings = await base44.asServiceRole.entities.NotificationSettings.filter({ owner_email: ownerEmail });
    const s = settings?.[0];
    console.log(`${tag} NotificationSettings for "${ownerEmail}": found=${!!s} enabled=${s?.enabled} email_enabled=${s?.email_enabled} notify_new_lead=${s?.notify_new_lead}`);

    if (!s) {
      const reason = 'SETTINGS_NOT_FOUND';
      console.log(`${tag} SKIP: ${reason}`);
      await base44.asServiceRole.entities.NotificationLog.create({ owner_email: ownerEmail, lead_id: lead.id, type: 'new_lead', status: 'skipped', sent_at: nowUtc, error_message: reason });
      return Response.json({ skipped: true, reason });
    }
    if (s.enabled === false) {
      const reason = 'SETTINGS_DISABLED';
      console.log(`${tag} SKIP: ${reason}`);
      await base44.asServiceRole.entities.NotificationLog.create({ owner_email: ownerEmail, lead_id: lead.id, type: 'new_lead', status: 'skipped', sent_at: nowUtc, error_message: reason });
      return Response.json({ skipped: true, reason });
    }
    if (s.email_enabled === false) {
      const reason = 'EMAIL_DISABLED';
      console.log(`${tag} SKIP: ${reason}`);
      await base44.asServiceRole.entities.NotificationLog.create({ owner_email: ownerEmail, lead_id: lead.id, type: 'new_lead', status: 'skipped', sent_at: nowUtc, error_message: reason });
      return Response.json({ skipped: true, reason });
    }
    if (s.notify_new_lead === false) {
      const reason = 'NOTIFY_NEW_LEAD_DISABLED';
      console.log(`${tag} SKIP: ${reason}`);
      await base44.asServiceRole.entities.NotificationLog.create({ owner_email: ownerEmail, lead_id: lead.id, type: 'new_lead', status: 'skipped', sent_at: nowUtc, error_message: reason });
      return Response.json({ skipped: true, reason });
    }

    console.log(`${tag} ALL CHECKS PASSED → SENDING email to ${ownerEmail}`);

    let status = 'sent';
    let errorMessage = null;

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
      await base44.asServiceRole.entities.Client.update(lead.id, { new_lead_notified_at: nowUtc });
      console.log(`${tag} SEND OK`);
    } catch (emailErr) {
      status = 'failed';
      errorMessage = emailErr?.message || String(emailErr);
      console.error(`${tag} SEND_EMAIL_ERROR: ${errorMessage}`);
    }

    await base44.asServiceRole.entities.NotificationLog.create({
      owner_email: ownerEmail,
      lead_id: lead.id,
      type: 'new_lead',
      status,
      sent_at: nowUtc,
      error_message: errorMessage
    });

    console.log(`${tag} DONE status=${status}`);
    return Response.json({ success: status === 'sent', status, traceId });

  } catch (error) {
    console.error(`${tag} EXCEPTION: ${error?.message}`, error?.stack);
    return Response.json({ error: error?.message || 'unexpected error', traceId }, { status: 500 });
  }
});