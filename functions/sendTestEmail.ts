import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const traceId = crypto.randomUUID().slice(0, 8);
  console.log(`[sendTestEmail][${traceId}] === START ===`);

  // קריאת ה-body — חייבת לפני createClientFromRequest (stream חד-פעמי)
  let body = {};
  try { body = await req.json(); } catch (_) {}

  // base44.functions.invoke שולח { payload: {...} }
  const payload = body?.payload ?? body ?? {};

  console.log(`[sendTestEmail][${traceId}] body:`, JSON.stringify(body));
  console.log(`[sendTestEmail][${traceId}] payload:`, JSON.stringify(payload));

  try {
    const base44 = createClientFromRequest(req);

    // ניסיון auth
    let user = null;
    try { user = await base44.auth.me(); } catch (authErr) {
      console.log(`[sendTestEmail][${traceId}] auth.me skipped: ${authErr.message}`);
    }
    console.log(`[sendTestEmail][${traceId}] user from auth:`, user?.email ?? 'none');

    const targetEmail = user?.email || payload.email;
    const targetName  = user?.full_name || payload.name || '';

    console.log(`[sendTestEmail][${traceId}] targetEmail: ${targetEmail} | targetName: ${targetName}`);

    if (!targetEmail) {
      console.error(`[sendTestEmail][${traceId}] ERROR: no email`);
      return Response.json({ ok: false, errorCode: 'NO_EMAIL', message: 'לא נמצאה כתובת מייל — נא להתחבר מחדש', traceId }, { status: 401 });
    }

    const nowUtc = new Date().toISOString();
    let emailStatus = 'sent';
    let emailErrorMessage = null;

    try {
      console.log(`[sendTestEmail][${traceId}] Calling SendEmail → ${targetEmail}`);
      await base44.integrations.Core.SendEmail({
        from_name: 'LidUp',
        to: targetEmail,
        subject: 'LidUp: בדיקת התראות',
        body: `<div dir="rtl" style="text-align:right">שלום,<br><br>זהו מייל בדיקה ממערכת <strong>LidUp</strong>.<br>אם קיבלת אותו – ההתראות פעילות.<br><br>תודה,<br>LidUp</div>`
      });
      console.log(`[sendTestEmail][${traceId}] SendEmail SUCCESS`);
    } catch (emailErr) {
      emailStatus = 'failed';
      emailErrorMessage = emailErr?.message || String(emailErr);
      console.error(`[sendTestEmail][${traceId}] SendEmail FAILED name=${emailErr?.name} msg=${emailErr?.message}`);
      console.error(`[sendTestEmail][${traceId}] stack:`, emailErr?.stack);
    }

    // רישום לוג — non-blocking
    try {
      await base44.asServiceRole.entities.NotificationLog.create({
        owner_email: targetEmail,
        lead_id: null,
        type: 'test_email',
        status: emailStatus,
        sent_at: nowUtc,
        error_message: emailErrorMessage
      });
    } catch (logErr) {
      console.error(`[sendTestEmail][${traceId}] Log write failed: ${logErr.message}`);
    }

    if (emailStatus === 'failed') {
      return Response.json({
        ok: false,
        errorCode: 'SEND_FAILED',
        message: `שליחת המייל נכשלה: ${emailErrorMessage}`,
        traceId
      }, { status: 200 });
    }

    console.log(`[sendTestEmail][${traceId}] === DONE OK ===`);
    return Response.json({ ok: true, traceId });

  } catch (error) {
    console.error(`[sendTestEmail][${traceId}] Unexpected:`, error?.message, error?.stack);
    return Response.json({
      ok: false,
      errorCode: 'UNEXPECTED',
      message: error?.message || 'שגיאה לא צפויה',
      traceId
    }, { status: 500 });
  }
});