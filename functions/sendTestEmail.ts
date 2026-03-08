import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  // קריאת ה-body לפני כל דבר אחר (stream חד-פעמי)
  let body = {};
  try { body = await req.json(); } catch (_) {}

  // base44.functions.invoke שולח { payload: {...} }
  const payload = body?.payload ?? body ?? {};

  console.log('[sendTestEmail] body received:', JSON.stringify(body));
  console.log('[sendTestEmail] payload resolved:', JSON.stringify(payload));

  try {
    const base44 = createClientFromRequest(req);

    // ניסיון auth
    let user = null;
    try { user = await base44.auth.me(); } catch (authErr) {
      console.log('[sendTestEmail] auth.me failed (ok for invoke):', authErr.message);
    }

    const targetEmail = user?.email || payload.email;
    const targetName = user?.full_name || payload.name || '';

    console.log('[sendTestEmail] targetEmail:', targetEmail, '| targetName:', targetName);

    if (!targetEmail) {
      return Response.json({ success: false, error: 'No email found - unauthorized' }, { status: 401 });
    }

    const nowUtc = new Date().toISOString();
    let status = 'sent';
    let errorMessage = null;

    try {
      console.log('[sendTestEmail] Calling SendEmail to:', targetEmail);
      await base44.integrations.Core.SendEmail({
        to: targetEmail,
        subject: 'LidUp – בדיקת התראות',
        body: `<div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #1e40af;">✅ בדיקת התראות LidUp</h2>
          <p>שלום ${targetName},</p>
          <p>אם קיבלת את המייל הזה – ההתראות פעילות ועובדות כראוי.</p>
          <hr style="border: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="color: #64748b; font-size: 13px;">הודעה זו נשלחה מ-LidUp בבקשתך.</p>
        </div>`
      });
      console.log('[sendTestEmail] SendEmail SUCCESS');
    } catch (emailErr) {
      status = 'failed';
      errorMessage = emailErr.message;
      console.error('[sendTestEmail] SendEmail FAILED:', emailErr.message, emailErr.stack);
    }

    // רישום לוג
    try {
      await base44.asServiceRole.entities.NotificationLog.create({
        owner_email: targetEmail,
        lead_id: null,
        type: 'test_email',
        status,
        sent_at: nowUtc,
        error_message: errorMessage
      });
    } catch (logErr) {
      console.error('[sendTestEmail] Log creation failed:', logErr.message);
    }

    if (status === 'failed') {
      return Response.json({ success: false, error: errorMessage }, { status: 200 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('[sendTestEmail] Unexpected error:', error.message, error.stack);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});