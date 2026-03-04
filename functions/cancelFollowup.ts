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
        const { lead_id } = body;

        if (!lead_id) {
            return Response.json({ ok: false, error: 'Missing lead_id' }, { status: 400 });
        }

        const now = new Date().toISOString();

        await base44.entities.Client.update(lead_id, {
            next_followup_at: null,
            next_followup_note: null,
            last_activity_at: now
        });

        await base44.asServiceRole.entities.LeadActivity.create({
            lead_id,
            event_type: 'followup_canceled',
            content: 'פולואפ בוטל',
            created_by_email: user.email
        });

        return Response.json({ ok: true });

    } catch (error) {
        return Response.json({ ok: false, error: error.message }, { status: 500 });
    }
});