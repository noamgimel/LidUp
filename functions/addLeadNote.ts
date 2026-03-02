import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    try {
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { lead_id, content } = await req.json();
        if (!lead_id || !content) return Response.json({ error: 'Missing lead_id or content' }, { status: 400 });

        // Verify ownership - check both created_by and owner_email
        const allLeads = await base44.entities.Client.list('-created_date', 500);
        let lead = allLeads?.find(l => l.id === lead_id) || null;

        if (!lead) {
            const byOwner = await base44.asServiceRole.entities.Client.filter({ owner_email: user.email }, '-created_date', 500);
            lead = byOwner?.find(l => l.id === lead_id) || null;
        }

        if (!lead) return Response.json({ error: 'Lead not found' }, { status: 404 });

        const now = new Date().toISOString();
        await base44.asServiceRole.entities.LeadActivity.create({
            lead_id,
            event_type: 'note',
            content,
            created_by_email: user.email
        });

        await base44.asServiceRole.entities.Client.update(lead_id, {
            last_activity_at: now
        });

        return Response.json({ ok: true });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});