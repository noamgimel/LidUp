import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

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

        console.log(`[markFirstContact][${traceId}] REQUEST BODY:`, JSON.stringify(body));

        if (!lead_id || typeof lead_id !== 'string' || lead_id.trim() === '') {
            console.error(`[markFirstContact][${traceId}] BAD_REQUEST — lead_id missing or invalid | received: ${JSON.stringify(lead_id)}`);
            return Response.json({ ok: false, traceId, errorCode: "BAD_REQUEST", message: "Missing or invalid lead_id" }, { status: 400 });
        }

        console.log(`[markFirstContact][${traceId}] ✅ user=${user.email} | lead_id=${lead_id}`);

        // Fetch lead directly by id using filter — avoids full list scan + timeout
        let lead = null;
        let fetchMethod = "none";
        try {
            // Try as current user first (RLS: created_by OR owner_email)
            const results = await base44.entities.Client.filter({ id: lead_id }, '-created_date', 1);
            lead = results?.[0] || null;
            if (lead) fetchMethod = "user-scoped";
        } catch (e) {
            console.warn(`[markFirstContact][${traceId}] ⚠️ user-scoped filter failed: ${e.message}`);
        }

        // Fallback: try owner_email match via service role
        if (!lead) {
            try {
                const results = await base44.asServiceRole.entities.Client.filter({ id: lead_id }, '-created_date', 1);
                const found = results?.[0];
                if (found) {
                    console.log(`[markFirstContact][${traceId}] 🔍 lead found via service-role | owner_email=${found.owner_email} created_by=${found.created_by}`);
                    if (found.owner_email === user.email || found.created_by === user.email) {
                        lead = found;
                        fetchMethod = "service-role";
                        console.log(`[markFirstContact][${traceId}] ✅ ownership check PASSED`);
                    } else {
                        console.warn(`[markFirstContact][${traceId}] ❌ ownership check FAILED — user=${user.email}`);
                        return Response.json({ ok: false, traceId, errorCode: "FORBIDDEN", message: "Permission denied" }, { status: 403 });
                    }
                }
            } catch (e) {
                console.error(`[markFirstContact][${traceId}] 💥 service-role filter failed: ${e.message}`);
            }
        }

        if (!lead) {
            console.error(`[markFirstContact][${traceId}] ❌ LEAD_NOT_FOUND — lead_id=${lead_id} fetchMethod=${fetchMethod}`);
            return Response.json({ ok: false, traceId, errorCode: "LEAD_NOT_FOUND", message: "Lead not found" }, { status: 404 });
        }

        console.log(`[markFirstContact][${traceId}] 📌 lead found: id=${lead.id} name=${lead.name} first_response_at=${lead.first_response_at}`);

        if (lead.first_response_at) {
            console.log(`[markFirstContact][${traceId}] ℹ️ already_set — skipping update`);
            return Response.json({ ok: true, traceId, leadId: lead_id, already_set: true, first_response_at: lead.first_response_at });
        }

        const now = new Date().toISOString();
        const isAtInitialStage = !lead.work_stage || lead.work_stage === 'new_lead';
        const stageUpdate = isAtInitialStage ? { work_stage: 'first_contact' } : {};
        const newPriority = lead.priority === 'overdue' ? 'warm' : (lead.priority || 'warm');

        const updatePayload = { first_response_at: now, last_activity_at: now, priority: newPriority, ...stageUpdate };
        console.log(`[markFirstContact][${traceId}] 📝 UPDATE PAYLOAD:`, JSON.stringify(updatePayload));

        // Use user-scoped update — RLS write rule allows created_by OR owner_email
        await base44.entities.Client.update(lead_id, updatePayload);
        console.log(`[markFirstContact][${traceId}] ✅ lead updated`);

        await base44.asServiceRole.entities.LeadActivity.create({
            lead_id,
            event_type: 'first_response',
            content: 'נוצר קשר ראשון עם הליד',
            created_by_email: user.email
        });
        console.log(`[markFirstContact][${traceId}] ✅ LeadActivity created (first_response)`);

        console.log(`[markFirstContact][${traceId}] ✅✅✅ SUCCESS — returning ok:true`);
        return Response.json({ ok: true, traceId, leadId: lead_id, first_response_at: now, priority: newPriority, ...stageUpdate });

    } catch (error) {
        console.error(`[markFirstContact][${traceId}] 💥 UNEXPECTED ERROR:`, error.stack || error.message);
        const response = { ok: false, traceId, errorCode: "SERVER_ERROR", message: error.message };
        console.log(`[markFirstContact][${traceId}] 📤 ERROR RESPONSE:`, JSON.stringify(response));
        return Response.json(response, { status: 500 });
    }
});