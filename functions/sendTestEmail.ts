import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const nowUtc = new Date().toISOString();

    // שליחת מייל בדיקה
    let status = 'sent';
    let errorMessage = null;
    try {
      await base44.integrations.Core.SendEmail({
        to: user.email,
        subject: 'LidUp – בדיקת התראות',
        body: `<div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #1e40af;">✅ בדיקת התראות LidUp</h2>
          <p>שלום ${user.full_name || ''},</p>
          <p>אם קיבלת את המייל הזה – ההתראות פעילות ועובדות כראוי.</p>
          <hr style="border: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="color: #64748b; font-size: 13px;">הודעה זו נשלחה מ-LidUp בבקשתך.</p>
        </div>`
      });
    } catch (emailErr) {
      status = 'failed';
      errorMessage = emailErr.message;
    }

    // רישום לוג
    await base44.asServiceRole.entities.NotificationLog.create({
      owner_email: user.email,
      lead_id: null,
      type: 'test_email',
      status,
      sent_at: nowUtc,
      error_message: errorMessage
    });

    if (status === 'failed') {
      return Response.json({ success: false, error: errorMessage }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});