import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const genTraceId = () => Math.random().toString(36).slice(2, 10).toUpperCase();

Deno.serve(async (req) => {
    const traceId = genTraceId();
    const base44 = createClientFromRequest(req);
    try {
        const user = await base44.auth.me();
        if (!user) {
            console.error(`[rescheduleFollowup][${traceId}] Unauthorized`);
            return Response.json({ ok: false, traceId, errorCode: "UNAUTHORIZED" }, { status: 401 });
        }

        let body;
        try { body = await req.json(); } catch (_) { body = {}; }
        const { lead_id, datetime, note } = body;

        if (!lead_id || !datetime) {
            console.error(`[rescheduleFollowup][${traceId}] BAD_REQUEST — missing lead_id or datetime`);
            return Response.json({ ok: false, traceId, errorCode: "BAD_REQUEST", message: "Missing lead_id or datetime" }, { status: 400 });
        }

        console.log(`[rescheduleFollowup][${traceId}] user=${user.email} lead_id=${lead_id} datetime=${datetime}`);

        // Fetch via user-scoped call — RLS guarantees ownership
        let lead = null;
        try {
            lead = await base44.entities.Client.get(lead_id);
        } catch (e) {
            console.error(`[rescheduleFollowup][${traceId}] get failed: ${e.message}`);
        }

        if (!lead) {
            console.error(`[rescheduleFollowup][${traceId}] LEAD_NOT_FOUND`);
            return Response.json({ ok: false, traceId, errorCode: "LEAD_NOT_FOUND", message: "Lead not found" }, { status: 404 });
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
            event_type: 'followup_rescheduled',
            content: `פולואפ עודכן ל-${formattedDate}${note ? ` — ${note}` : ''}`,
            created_by_email: user.email
        });

        console.log(`[rescheduleFollowup][${traceId}] ✅ SUCCESS`);
        return Response.json({ ok: true, traceId });

    } catch (error) {
        console.error(`[rescheduleFollowup][${traceId}] UNEXPECTED ERROR:`, error.stack || error.message);
        return Response.json({ ok: false, traceId, errorCode: "SERVER_ERROR", message: error.message }, { status: 500 });
    }
});