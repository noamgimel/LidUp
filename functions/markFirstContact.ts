import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    try {
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { lead_id } = await req.json();
        if (!lead_id) return Response.json({ error: 'Missing lead_id' }, { status: 400 });

        // Fetch lead via service role (handles webhook leads too)
        const leads = await base44.asServiceRole.entities.Client.filter({ id: lead_id });
        const lead = leads?.[0];
        if (!lead) return Response.json({ error: 'Lead not found' }, { status: 404 });

        // Ownership check
        if (lead.owner_email !== user.email && lead.created_by !== user.email) {
            return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

        if (lead.first_response_at) {
            return Response.json({ ok: true, already_set: true, first_response_at: lead.first_response_at });
        }

        const now = new Date().toISOString();
        const followupOverdue = lead.next_followup_at && new Date(lead.next_followup_at) <= new Date();
        const newPriority = lead.priority === 'overdue' && !followupOverdue ? 'warm' : (lead.priority === 'overdue' ? 'warm' : lead.priority);
        await base44.asServiceRole.entities.Client.update(lead_id, {
            first_response_at: now,
            last_activity_at: now,
            priority: newPriority,
        });

        await base44.asServiceRole.entities.LeadActivity.create({
            lead_id,
            event_type: 'first_response',
            content: 'נוצר קשר ראשון עם הליד',
            created_by_email: user.email
        });

        return Response.json({ ok: true, first_response_at: now, priority: newPriority });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});