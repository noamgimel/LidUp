import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    try {
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { lead_id, stage_id, stage_label } = await req.json();
        if (!lead_id || !stage_id) return Response.json({ error: 'Missing lead_id or stage_id' }, { status: 400 });

        // Use filter instead of get — get() has a known issue with asServiceRole
        const leads = await base44.asServiceRole.entities.Client.filter({ id: lead_id });
        const lead = leads?.[0];

        if (!lead) return Response.json({ error: 'Lead not found' }, { status: 404 });

        if (lead.owner_email !== user.email && lead.created_by !== user.email) {
            return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

        const now = new Date().toISOString();
        await base44.asServiceRole.entities.Client.update(lead_id, {
            work_stage: stage_id,
            last_activity_at: now
        });

        await base44.asServiceRole.entities.LeadActivity.create({
            lead_id,
            event_type: 'stage_change',
            content: `שלב מכירה עודכן ל: ${stage_label || stage_id}`,
            created_by_email: user.email
        });

        return Response.json({ ok: true, work_stage: stage_id });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});