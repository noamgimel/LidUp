import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    try {
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
        }

        let body;
        try { body = await req.json(); } catch (_) { body = {}; }
        const { lead_id, datetime, note } = body;

        if (!lead_id || !datetime) {
            return Response.json({ ok: false, error: 'Missing lead_id or datetime' }, { status: 400 });
        }

        const now = new Date().toISOString();

        await base44.entities.Client.update(lead_id, {
            next_followup_at: datetime,
            next_followup_note: note || '',
            last_activity_at: now
        });

        const formattedDate = new Intl.DateTimeFormat('he-IL', {
            timeZone: 'Asia/Jerusalem',
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: false
        }).format(new Date(datetime));

        await base44.asServiceRole.entities.LeadActivity.create({
            lead_id,
            event_type: 'followup_rescheduled',
            content: `פולואפ עודכן ל-${formattedDate}${note ? ` — ${note}` : ''}`,
            created_by_email: user.email
        });

        return Response.json({ ok: true });

    } catch (error) {
        return Response.json({ ok: false, error: error.message }, { status: 500 });
    }
});