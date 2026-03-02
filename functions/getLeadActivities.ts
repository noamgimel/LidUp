import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    try {
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { lead_id } = await req.json();
        if (!lead_id) return Response.json({ error: 'Missing lead_id' }, { status: 400 });

        // Verify ownership using user-scoped list
        const allLeads = await base44.entities.Client.list('-created_date', 500);
        const lead = allLeads?.find(l => l.id === lead_id) || null;

        if (!lead) return Response.json({ error: 'Lead not found' }, { status: 404 });

        const activities = await base44.asServiceRole.entities.LeadActivity.filter(
            { lead_id },
            '-created_date',
            50
        );

        return Response.json({ activities: activities || [] });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});