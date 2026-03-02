import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    try {
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { lead_id } = await req.json();
        if (!lead_id) return Response.json({ error: 'Missing lead_id' }, { status: 400 });

        // First try user-scoped (works for leads created by this user)
        let lead = null;
        try {
            const userLeads = await base44.entities.Client.filter({ id: lead_id });
            lead = userLeads?.[0] || null;
        } catch(_e) { /* ignore */ }

        // Fallback: service role list scan (for webhook/external leads with owner_email)
        if (!lead) {
            try {
                const allLeads = await base44.asServiceRole.entities.Client.list('-created_date', 500);
                lead = allLeads?.find(l => l.id === lead_id) || null;
                // Ownership check for external leads
                if (lead && lead.owner_email !== user.email && lead.created_by !== user.email) {
                    return Response.json({ error: 'Forbidden' }, { status: 403 });
                }
            } catch(_e) { /* ignore */ }
        }

        if (!lead) return Response.json({ error: 'Lead not found' }, { status: 404 });

        if (lead.first_response_at) {
            return Response.json({ ok: true, already_set: true, first_response_at: lead.first_response_at });
        }

        const now = new Date().toISOString();
        const isAtInitialStage = !lead.work_stage || lead.work_stage === 'new_lead';
        const stageUpdate = isAtInitialStage ? { work_stage: 'first_contact' } : {};
        const newPriority = lead.priority === 'overdue' ? 'warm' : lead.priority;

        await base44.asServiceRole.entities.Client.update(lead_id, {
            first_response_at: now,
            last_activity_at: now,
            priority: newPriority,
            ...stageUpdate
        });

        await base44.asServiceRole.entities.LeadActivity.create({
            lead_id,
            event_type: 'first_response',
            content: 'נוצר קשר ראשון עם הליד',
            created_by_email: user.email
        });

        return Response.json({ ok: true, first_response_at: now, priority: newPriority, ...stageUpdate });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});