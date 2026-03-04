import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const genTraceId = () => Math.random().toString(36).slice(2, 10).toUpperCase();

Deno.serve(async (req) => {
    const traceId = genTraceId();
    const base44 = createClientFromRequest(req);
    try {
        const user = await base44.auth.me();
        if (!user) {
            console.error(`[markFirstContact][${traceId}] Unauthorized — no user`);
            return Response.json({ ok: false, traceId, errorCode: "UNAUTHORIZED" }, { status: 401 });
        }

        let body;
        try { body = await req.json(); } catch (_) { body = {}; }
        const { lead_id } = body;

        if (!lead_id) {
            console.error(`[markFirstContact][${traceId}] BAD_REQUEST — missing lead_id`);
            return Response.json({ ok: false, traceId, errorCode: "BAD_REQUEST", message: "Missing lead_id" }, { status: 400 });
        }

        console.log(`[markFirstContact][${traceId}] user=${user.email} lead_id=${lead_id}`);

        // Fetch lead directly by id using filter — avoids full list scan + timeout
        let lead = null;
        try {
            // Try as current user first (RLS: created_by OR owner_email)
            const results = await base44.entities.Client.filter({ id: lead_id }, '-created_date', 1);
            lead = results?.[0] || null;
        } catch (e) {
            console.warn(`[markFirstContact][${traceId}] user-scoped filter failed: ${e.message}`);
        }

        // Fallback: try owner_email match via service role
        if (!lead) {
            try {
                const results = await base44.asServiceRole.entities.Client.filter({ id: lead_id }, '-created_date', 1);
                const found = results?.[0];
                if (found && (found.owner_email === user.email || found.created_by === user.email)) {
                    lead = found;
                } else if (found) {
                    console.warn(`[markFirstContact][${traceId}] lead found but ownership mismatch — owner_email=${found.owner_email} created_by=${found.created_by} user=${user.email}`);
                    return Response.json({ ok: false, traceId, errorCode: "FORBIDDEN", message: "Permission denied" }, { status: 403 });
                }
            } catch (e) {
                console.error(`[markFirstContact][${traceId}] service-role filter failed: ${e.message}`);
            }
        }

        if (!lead) {
            console.error(`[markFirstContact][${traceId}] LEAD_NOT_FOUND — lead_id=${lead_id} user=${user.email}`);
            return Response.json({ ok: false, traceId, errorCode: "LEAD_NOT_FOUND", message: "Lead not found" }, { status: 404 });
        }

        console.log(`[markFirstContact][${traceId}] lead found: name=${lead.name} first_response_at=${lead.first_response_at}`);

        if (lead.first_response_at) {
            console.log(`[markFirstContact][${traceId}] already_set — skipping`);
            return Response.json({ ok: true, traceId, leadId: lead_id, already_set: true, first_response_at: lead.first_response_at });
        }

        const now = new Date().toISOString();
        const isAtInitialStage = !lead.work_stage || lead.work_stage === 'new_lead';
        const stageUpdate = isAtInitialStage ? { work_stage: 'first_contact' } : {};
        const newPriority = lead.priority === 'overdue' ? 'warm' : (lead.priority || 'warm');

        const updatePayload = { first_response_at: now, last_activity_at: now, priority: newPriority, ...stageUpdate };
        console.log(`[markFirstContact][${traceId}] updating lead — payload:`, JSON.stringify(updatePayload));

        // Use user-scoped update — RLS write rule allows created_by OR owner_email
        await base44.entities.Client.update(lead_id, updatePayload);

        await base44.asServiceRole.entities.LeadActivity.create({
            lead_id,
            event_type: 'first_response',
            content: 'נוצר קשר ראשון עם הליד',
            created_by_email: user.email
        });

        console.log(`[markFirstContact][${traceId}] SUCCESS`);
        return Response.json({ ok: true, traceId, leadId: lead_id, first_response_at: now, priority: newPriority, ...stageUpdate });

    } catch (error) {
        console.error(`[markFirstContact][${traceId}] UNEXPECTED ERROR:`, error.stack || error.message);
        return Response.json({ ok: false, traceId, errorCode: "SERVER_ERROR", message: error.message }, { status: 500 });
    }
});