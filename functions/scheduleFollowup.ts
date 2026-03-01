import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    try {
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { lead_id, datetime, note } = await req.json();
        if (!lead_id || !datetime) return Response.json({ error: 'Missing lead_id or datetime' }, { status: 400 });

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

        const now = new Date().toISOString();
        await base44.asServiceRole.entities.Client.update(lead_id, {
            next_followup_at: datetime,
            next_followup_note: note || '',
            last_activity_at: now
        });

        const formattedDate = new Intl.DateTimeFormat('he-IL', {
            timeZone: 'Asia/Jerusalem',
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: false
        }).format(new Date(datetime));

        await base44.asServiceRole.entities.LeadActivity.create({
            lead_id,
            event_type: 'followup_set',
            content: `פולואפ נקבע ל-${formattedDate}${note ? ` — ${note}` : ''}`,
            created_by_email: user.email
        });

        return Response.json({ ok: true });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});