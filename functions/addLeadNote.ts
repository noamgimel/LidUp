import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    try {
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { lead_id, content } = await req.json();
        if (!lead_id || !content) return Response.json({ error: 'Missing lead_id or content' }, { status: 400 });

        // Fetch via user-scoped call — RLS guarantees ownership
        let lead = null;
        try {
            lead = await base44.entities.Client.get(lead_id);
        } catch (e) {
            // not found or no permission
        }

        if (!lead) return Response.json({ error: 'Lead not found' }, { status: 404 });

        const now = new Date().toISOString();
        await base44.asServiceRole.entities.LeadActivity.create({
            lead_id,
            event_type: 'note',
            content,
            created_by_email: user.email
        });

        await base44.entities.Client.update(lead_id, {
            last_activity_at: now
        });

        return Response.json({ ok: true });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});