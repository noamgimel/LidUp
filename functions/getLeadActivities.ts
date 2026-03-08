import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    try {
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { lead_id } = await req.json();
        if (!lead_id) return Response.json({ error: 'Missing lead_id' }, { status: 400 });

        // Verify ownership via service role
        const lead = await base44.asServiceRole.entities.Client.get(lead_id);

        if (!lead) return Response.json({ error: 'Lead not found' }, { status: 404 });

        if (lead.owner_email !== user.email && lead.created_by !== user.email) {
            return Response.json({ error: 'Permission denied' }, { status: 403 });
        }

        const activities = await base44.asServiceRole.entities.LeadActivity.filter(
            { lead_id },
            '-created_date',
            50
        );

        // Normalize created_date: ensure it ends with 'Z' so the browser treats it as UTC
        const normalized = (activities || []).map(a => ({
            ...a,
            created_date: a.created_date
                ? (String(a.created_date).endsWith('Z') || String(a.created_date).includes('+')
                    ? a.created_date
                    : a.created_date + 'Z')
                : a.created_date
        }));
        return Response.json({ activities: normalized });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});