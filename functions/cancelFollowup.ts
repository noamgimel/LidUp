import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const genTraceId = () => Math.random().toString(36).slice(2, 10).toUpperCase();

Deno.serve(async (req) => {
    const traceId = genTraceId();
    const base44 = createClientFromRequest(req);
    try {
        const user = await base44.auth.me();
        if (!user) {
            console.error(`[cancelFollowup][${traceId}] Unauthorized — no user`);
            return Response.json({ ok: false, traceId, errorCode: "UNAUTHORIZED" }, { status: 401 });
        }

        let body;
        try { body = await req.json(); } catch (_) { body = {}; }
        const { lead_id } = body;

        console.log(`[cancelFollowup][${traceId}] REQUEST BODY:`, JSON.stringify(body));

        if (!lead_id || typeof lead_id !== 'string' || lead_id.trim() === '') {
            console.error(`[cancelFollowup][${traceId}] BAD_REQUEST — lead_id missing or invalid | received: ${JSON.stringify(lead_id)}`);
            return Response.json({ ok: false, traceId, errorCode: "BAD_REQUEST", message: "Missing or invalid lead_id" }, { status: 400 });
        }

        console.log(`[cancelFollowup][${traceId}] ✅ user=${user.email} | lead_id=${lead_id}`);

        // Fetch via user-scoped call — RLS guarantees ownership
        let lead = null;
        try {
            lead = await base44.entities.Client.get(lead_id);
        } catch (e) {
            console.error(`[cancelFollowup][${traceId}] 💥 get failed: ${e.message}`);
        }

        if (!lead) {
            console.error(`[cancelFollowup][${traceId}] ❌ LEAD_NOT_FOUND — lead_id=${lead_id}`);
            return Response.json({ ok: false, traceId, errorCode: "LEAD_NOT_FOUND", message: "Lead not found" }, { status: 404 });
        }

        const now = new Date().toISOString();
        await base44.entities.Client.update(lead_id, {
            next_followup_at: null,
            next_followup_note: null,
            last_activity_at: now
        });
        console.log(`[cancelFollowup][${traceId}] ✅ lead updated — next_followup_at set to NULL`);

        await base44.asServiceRole.entities.LeadActivity.create({
            lead_id,
            event_type: 'followup_canceled',
            content: 'פולואפ בוטל',
            created_by_email: user.email
        });
        console.log(`[cancelFollowup][${traceId}] ✅ LeadActivity created (followup_canceled)`);

        console.log(`[cancelFollowup][${traceId}] ✅ SUCCESS`);
        return Response.json({ ok: true, traceId });

    } catch (error) {
        console.error(`[cancelFollowup][${traceId}] 💥 UNEXPECTED ERROR:`, error.stack || error.message);
        const response = { ok: false, traceId, errorCode: "SERVER_ERROR", message: error.message };
        console.log(`[cancelFollowup][${traceId}] 📤 ERROR RESPONSE:`, JSON.stringify(response));
        return Response.json(response, { status: 500 });
    }
});