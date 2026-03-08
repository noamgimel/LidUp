import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    try {
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { lead_id, stage_id, stage_label } = await req.json();
        if (!lead_id || !stage_id) return Response.json({ error: 'Missing lead_id or stage_id' }, { status: 400 });

        // Try to fetch the lead by id (user-scoped via RLS: created_by OR owner_email)
        let lead = null;
        try {
            const results = await base44.entities.Client.filter({ id: lead_id }, '-created_date', 1);
            lead = results?.[0] || null;
        } catch (_) {}

        // Fallback: service role with ownership check
        if (!lead) {
            try {
                const results = await base44.asServiceRole.entities.Client.filter({ id: lead_id }, '-created_date', 1);
                const found = results?.[0];
                if (found && (found.owner_email === user.email || found.created_by === user.email)) {
                    lead = found;
                } else if (found) {
                    return Response.json({ error: 'Permission denied' }, { status: 403 });
                }
            } catch (_) {}
        }

        if (!lead) return Response.json({ error: 'Lead not found' }, { status: 404 });

        const now = new Date().toISOString();
        // Use service role for the update to bypass RLS (ownership already verified above)
        // Use user-scoped update — RLS write rule allows created_by OR owner_email
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