import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const genTraceId = () => Math.random().toString(36).slice(2, 10).toUpperCase();

Deno.serve(async (req) => {
    const traceId = genTraceId();
    const base44 = createClientFromRequest(req);
    try {
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ ok: false, traceId, errorCode: "UNAUTHORIZED" }, { status: 401 });
        }

        let body;
        try { body = await req.json(); } catch (_) { body = {}; }
        const { lead_id } = body;

        if (!lead_id) {
            return Response.json({ ok: false, traceId, errorCode: "BAD_REQUEST", message: "Missing lead_id" }, { status: 400 });
        }

        console.log(`[markFollowupDone][${traceId}] user=${user.email} lead_id=${lead_id}`);

        // Fetch via user-scoped call — RLS guarantees ownership
        let lead = null;
        try {
            lead = await base44.entities.Client.get(lead_id);
        } catch (e) {
            // not found or no permission
        }
        if (!lead) return Response.json({ ok: false, traceId, errorCode: "LEAD_NOT_FOUND", message: "Lead not found" }, { status: 404 });

        const now = new Date().toISOString();

        // ✅ מאפס רק next_followup_* — אסור לגעת ב-first_response_at ו-last_contact_at
        await base44.asServiceRole.entities.Client.update(lead_id, {
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

        console.log(`[markFollowupDone][${traceId}] ✅ SUCCESS`);
        return Response.json({ ok: true, traceId, leadId: lead_id });

    } catch (error) {
        console.error(`[markFollowupDone][${traceId}] 💥 ERROR:`, error.stack || error.message);
        return Response.json({ ok: false, traceId, errorCode: "SERVER_ERROR", message: error.message }, { status: 500 });
    }
});