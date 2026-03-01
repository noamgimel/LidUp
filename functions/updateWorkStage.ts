import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    try {
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { lead_id, stage_id, stage_label } = await req.json();
        if (!lead_id || !stage_id) return Response.json({ error: 'Missing lead_id or stage_id' }, { status: 400 });

        // Fetch lead via service role using filter (bypass RLS)
        const leads = await base44.asServiceRole.entities.Client.filter({ id: lead_id });
        const lead = leads?.[0];
        if (!lead) return Response.json({ error: 'Lead not found' }, { status: 404 });

        // For admins or leads with owner_email set: allow. Otherwise allow if user is admin.
        // Since webhook-created leads have owner_email or no restrictions, check ownership first.
        const isLeadOwner = lead.owner_email === user.email || lead.created_by === user.email;
        
        // Admin check (optional, for system admins to manage any lead)
        let isAdmin = false;
        try {
            const admins = await base44.asServiceRole.entities.SystemAdmin.filter({ user_email: user.email, is_active: true });
            isAdmin = admins?.length > 0;
        } catch {
            isAdmin = false;
        }
        
        // Allow if: user is the lead owner/creator OR user is a system admin
        if (!isLeadOwner && !isAdmin) {
            return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

        const now = new Date().toISOString();

        // Update work_stage using service role to bypass RLS for webhook leads
        await base44.asServiceRole.entities.Client.update(lead_id, {
            work_stage: stage_id,
            last_activity_at: now
        });

        // Log the activity
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