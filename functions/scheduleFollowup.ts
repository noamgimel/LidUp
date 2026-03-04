import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const genTraceId = () => Math.random().toString(36).slice(2, 10).toUpperCase();

Deno.serve(async (req) => {
    const traceId = genTraceId();
    const base44 = createClientFromRequest(req);
    try {
        const user = await base44.auth.me();
        if (!user) {
            console.error(`[scheduleFollowup][${traceId}] Unauthorized — no user`);
            return Response.json({ ok: false, traceId, errorCode: "UNAUTHORIZED" }, { status: 401 });
        }

        let body;
        try { body = await req.json(); } catch (_) { body = {}; }
        const { lead_id, datetime, note } = body;

        if (!lead_id || !datetime) {
            console.error(`[scheduleFollowup][${traceId}] BAD_REQUEST — missing lead_id or datetime`);
            return Response.json({ ok: false, traceId, errorCode: "BAD_REQUEST", message: "Missing lead_id or datetime" }, { status: 400 });
        }

        console.log(`[scheduleFollowup][${traceId}] user=${user.email} lead_id=${lead_id} datetime=${datetime}`);

        // Fetch lead directly by id
        let lead = null;
        try {
            const results = await base44.entities.Client.filter({ id: lead_id }, '-created_date', 1);
            lead = results?.[0] || null;
        } catch (e) {
            console.warn(`[scheduleFollowup][${traceId}] user-scoped filter failed: ${e.message}`);
        }

        if (!lead) {
            try {
                const results = await base44.asServiceRole.entities.Client.filter({ id: lead_id }, '-created_date', 1);
                const found = results?.[0];
                if (found && (found.owner_email === user.email || found.created_by === user.email)) {
                    lead = found;
                } else if (found) {
                    return Response.json({ ok: false, traceId, errorCode: "FORBIDDEN", message: "Permission denied" }, { status: 403 });
                }
            } catch (e) {
                console.error(`[scheduleFollowup][${traceId}] service-role filter failed: ${e.message}`);
            }
        }

        if (!lead) {
            console.error(`[scheduleFollowup][${traceId}] LEAD_NOT_FOUND — lead_id=${lead_id} user=${user.email}`);
            return Response.json({ ok: false, traceId, errorCode: "LEAD_NOT_FOUND", message: "Lead not found" }, { status: 404 });
        }

        console.log(`[scheduleFollowup][${traceId}] lead found: name=${lead.name}`);

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

        console.log(`[scheduleFollowup][${traceId}] SUCCESS`);
        return Response.json({ ok: true, traceId, leadId: lead_id });

    } catch (error) {
        console.error(`[scheduleFollowup][${traceId}] UNEXPECTED ERROR:`, error.stack || error.message);
        return Response.json({ ok: false, traceId, errorCode: "SERVER_ERROR", message: error.message }, { status: 500 });
    }
});