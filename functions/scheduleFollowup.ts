import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    try {
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { lead_id, datetime, note } = await req.json();
        if (!lead_id || !datetime) return Response.json({ error: 'Missing lead_id or datetime' }, { status: 400 });

        // Verify ownership via user-scoped read (RLS covers created_by + owner_email for reads)
        let lead = null;
        try {
            const allLeads = await base44.entities.Client.list('-created_date', 500);
            lead = allLeads?.find(l => l.id === lead_id) || null;
        } catch (_) {}

        if (!lead) return Response.json({ error: 'Lead not found' }, { status: 404 });

        const now = new Date().toISOString();
        // Use service role for update — ownership already verified above
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