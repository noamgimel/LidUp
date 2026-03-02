import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    try {
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { lead_id } = await req.json();
        if (!lead_id) return Response.json({ error: 'Missing lead_id' }, { status: 400 });

        // Use filter instead of get — get() has a known issue with asServiceRole
        const leads = await base44.asServiceRole.entities.Client.filter({ id: lead_id });
        const lead = leads?.[0];

        if (!lead) return Response.json({ error: 'Lead not found' }, { status: 404 });

        if (lead.owner_email !== user.email && lead.created_by !== user.email) {
            return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

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