import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    try {
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { lead_id } = await req.json();
        if (!lead_id) return Response.json({ error: 'Missing lead_id' }, { status: 400 });

        // Verify user owns the lead
        let lead;
        try {
            lead = await base44.asServiceRole.entities.Client.get(lead_id);
        } catch {
            return Response.json({ error: 'Lead not found' }, { status: 404 });
        }
        if (!lead) return Response.json({ error: 'Lead not found' }, { status: 404 });
        if (lead.owner_email !== user.email && lead.created_by !== user.email) {
            return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Fetch all activities for this lead via service role (bypasses RLS)
        const activities = await base44.asServiceRole.entities.LeadActivity.filter(
            { lead_id },
            '-created_date',
            100
        );

        return Response.json({ ok: true, activities: activities || [] });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});