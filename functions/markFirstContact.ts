import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    try {
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { lead_id } = await req.json();
        if (!lead_id) return Response.json({ error: 'Missing lead_id' }, { status: 400 });

        // Fetch lead via service role using filter (bypass RLS)
        const leads = await base44.asServiceRole.entities.Client.filter({ id: lead_id });
        const lead = leads?.[0];
        if (!lead) return Response.json({ error: 'Lead not found' }, { status: 404 });

        // Check if user is a system admin OR owns the lead (by email or created_by)
        const isAdmin = await base44.asServiceRole.entities.SystemAdmin.filter({ user_email: user.email, is_active: true });
        const isLeadOwner = lead.owner_email === user.email || lead.created_by === user.email;
        if (!isLeadOwner && !isAdmin?.length) {
            return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

        if (lead.first_response_at) {
            return Response.json({ ok: true, already_set: true, first_response_at: lead.first_response_at });
        }

        const now = new Date().toISOString();
        const followupOverdue = lead.next_followup_at && new Date(lead.next_followup_at) <= new Date();
        const newPriority = lead.priority === 'overdue' && !followupOverdue ? 'warm' : (lead.priority === 'overdue' ? 'warm' : lead.priority);
        // Only update work_stage if lead is still at the initial 'new_lead' stage.
        // If user already manually set a more advanced stage, don't override it.
        const isAtInitialStage = !lead.work_stage || lead.work_stage === 'new_lead';
        const stageUpdate = isAtInitialStage ? { work_stage: 'first_contact' } : {};

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