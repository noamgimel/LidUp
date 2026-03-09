import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const traceId = crypto.randomUUID().slice(0, 8);
  const tag = `[notifyNewLead][${traceId}]`;

  console.log(`${tag} START`);

  const base44 = createClientFromRequest(req);

  try {
    // קריאת הפיילוד הגולמי
    const rawPayload = await req.json().catch(() => ({}));
    console.log(`${tag} rawPayload = ${JSON.stringify(rawPayload)}`);

    // חילוץ clientId גמיש מכל פורמט אפשרי
    const clientId =
      rawPayload?.event?.entity_id ||
      rawPayload?.recordId ||
      rawPayload?.entityId ||
      rawPayload?.id ||
      rawPayload?.data?.id ||
      rawPayload?.payload?.id ||
      rawPayload?.payload?.recordId ||
      null;

    console.log(`${tag} extracted clientId = ${clientId}`);

    if (!clientId) {
      console.error(`${tag} MISSING_RECORD_ID — payload had no recognizable id field`);
      return Response.json({ error: 'MISSING_RECORD_ID', traceId, rawPayload }, { status: 400 });
    }

    // ניסיון לקחת את ה-data ישירות מהפיילוד (ממה שה-trigger שלח) — חוסך קריאת DB
    let client = rawPayload?.data || null;

    // אם אין data מלא, נטען מה-DB
    if (!client || !client.id) {
      console.log(`${tag} no inline data — fetching Client from DB by id=${clientId}`);
      const results = await base44.asServiceRole.entities.Client.filter({ id: clientId });
      client = results?.[0] || null;
    }

    console.log(`${tag} client found? ${client ? 'yes' : 'no'} | name="${client?.name}" | owner_email="${client?.owner_email}"`);

    if (!client) {
      console.error(`${tag} Client not found for clientId=${clientId}`);
      return Response.json({ error: 'Client not found', clientId, traceId }, { status: 404 });
    }

    const ownerEmail = client.owner_email;
    if (!ownerEmail) {
      console.log(`${tag} SKIP: no owner_email on client ${client.id}`);
      return Response.json({ success: true, traceId, skipped: 'no_owner_email' });
    }

    const nowUtc = new Date().toISOString();

    // ── התראת ליד חדש ──────────────────────────────────────────
    // idempotency: בדוק גם client.new_lead_notified_at וגם NotificationLog
    if (client.new_lead_notified_at) {
      console.log(`${tag} SKIP new_lead: already notified at ${client.new_lead_notified_at}`);
      return Response.json({ success: true, traceId, skipped: 'already_notified' });
    }

    // בדיקת NotificationLog כ-fallback idempotency (למקרה שעדכון Client נכשל בעבר)
    const existingLog = await base44.asServiceRole.entities.NotificationLog.filter({
      lead_id: client.id,
      type: 'new_lead',
      status: 'sent'
    });
    if (existingLog.length > 0) {
      console.log(`${tag} SKIP new_lead: found existing sent log — already notified`);
      return Response.json({ success: true, traceId, skipped: 'already_notified_via_log' });
    }

    const settings = await base44.asServiceRole.entities.NotificationSettings.filter({
      owner_email: ownerEmail,
      enabled: true,
      email_enabled: true,
      notify_new_lead: true
    });

    console.log(`${tag} NotificationSettings for ${ownerEmail}: ${settings.length} found`);

    if (settings.length === 0) {
      console.log(`${tag} SKIP new_lead: no active settings for ${ownerEmail}`);
      await base44.asServiceRole.entities.NotificationLog.create({
        owner_email: ownerEmail,
        lead_id: client.id,
        type: 'new_lead',
        status: 'skipped',
        sent_at: nowUtc,
        error_message: 'no_active_settings'
      });
      return Response.json({ success: true, traceId, skipped: 'no_active_settings' });
    }

    let status = 'sent';
    let errorMessage = null;

    console.log(`${tag} SENDING new_lead email to ${ownerEmail} for client "${client.name}"`);

    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: ownerEmail,
        subject: `🎯 ליד חדש נכנס למערכת: ${client.name}`,
        body: `<div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #1e40af;">🎯 ליד חדש נכנס!</h2>
          <table style="border-collapse: collapse; width: 100%; border: 1px solid #e2e8f0;">
            <tr><td style="padding: 8px; font-weight: bold; border: 1px solid #e2e8f0;">שם:</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${client.name || '-'}</td></tr>
            <tr style="background:#f8fafc"><td style="padding: 8px; font-weight: bold; border: 1px solid #e2e8f0;">אימייל:</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${client.email || '-'}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; border: 1px solid #e2e8f0;">טלפון:</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${client.phone || '-'}</td></tr>
            <tr style="background:#f8fafc"><td style="padding: 8px; font-weight: bold; border: 1px solid #e2e8f0;">חברה:</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${client.company || '-'}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; border: 1px solid #e2e8f0;">מקור:</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${client.source || '-'}</td></tr>
          </table>
          <hr style="border: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="color: #64748b; font-size: 13px;">הודעה אוטומטית מ-LidUp | traceId: ${traceId}</p>
        </div>`
      });

      console.log(`${tag} SEND OK → new_lead email sent`);

      // ניסיון עדכון new_lead_notified_at — אם נכשל בגלל RLS זה בסדר, ה-NotificationLog הוא ה-idempotency
      try {
        await base44.asServiceRole.entities.Client.update(client.id, { new_lead_notified_at: nowUtc });
        console.log(`${tag} Client.new_lead_notified_at updated OK`);
      } catch (updateErr) {
        console.warn(`${tag} WARNING: could not update new_lead_notified_at (RLS?) — ${updateErr?.message}. NotificationLog will serve as idempotency.`);
      }
    } catch (emailErr) {
      status = 'failed';
      errorMessage = emailErr?.message || String(emailErr);
      console.error(`${tag} SEND_FAILED: ${errorMessage}`);
    }

    await base44.asServiceRole.entities.NotificationLog.create({
      owner_email: ownerEmail,
      lead_id: client.id,
      type: 'new_lead',
      status,
      sent_at: nowUtc,
      error_message: errorMessage
    });

    return Response.json({ success: true, traceId, status, clientId: client.id });

  } catch (error) {
    console.error(`${tag} EXCEPTION: ${error?.message}`, error?.stack);
    return Response.json({ error: error?.message || 'unexpected error', traceId }, { status: 500 });
  }
});