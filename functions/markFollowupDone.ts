import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const genTraceId = () => Math.random().toString(36).slice(2, 10).toUpperCase();

Deno.serve(async (req) => {
    const traceId = genTraceId();
    const base44 = createClientFromRequest(req);
    try {
        const user = await base44.auth.me();
        if (!user) {
            console.error(`[markFollowupDone][${traceId}] Unauthorized — no user`);
            return Response.json({ ok: false, traceId, errorCode: "UNAUTHORIZED" }, { status: 401 });
        }

        let body;
        try { body = await req.json(); } catch (_) { body = {}; }
        const { lead_id } = body;

        if (!lead_id) {
            console.error(`[markFollowupDone][${traceId}] BAD_REQUEST — missing lead_id`);
            return Response.json({ ok: false, traceId, errorCode: "BAD_REQUEST", message: "Missing lead_id" }, { status: 400 });
        }

        console.log(`[markFollowupDone][${traceId}] user=${user.email} lead_id=${lead_id}`);

        // Skip fetching lead — just update directly (RLS write allows created_by OR owner_email).
        // If the lead doesn't belong to this user, the update will throw/return empty and we catch it.
        console.log(`[markFollowupDone][${traceId}] proceeding with update for lead_id=${lead_id}`);

        const now = new Date().toISOString();
        // Reset the contact cycle: clear first_response_at + followup fields.
        // This is the source of truth — UI derives contactCycleOpen from !!first_response_at.
        await base44.entities.Client.update(lead_id, {
            first_response_at: null,
            next_followup_at: null,
            next_followup_note: '',
            last_activity_at: now
        });

        await base44.asServiceRole.entities.LeadActivity.create({
            lead_id,
            event_type: 'followup_done',
            content: 'פולואפ בוצע',
            created_by_email: user.email
        });

        console.log(`[markFollowupDone][${traceId}] SUCCESS`);
        return Response.json({ ok: true, traceId, leadId: lead_id, first_response_at: null });

    } catch (error) {
        console.error(`[markFollowupDone][${traceId}] UNEXPECTED ERROR:`, error.stack || error.message);
        return Response.json({ ok: false, traceId, errorCode: "SERVER_ERROR", message: error.message }, { status: 500 });
    }
});