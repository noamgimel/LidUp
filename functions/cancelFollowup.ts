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

        // Fetch lead using filter (RLS aware)
        let lead = null;
        let fetchMethod = "none";
        try {
            const results = await base44.entities.Client.filter({ id: lead_id }, '-created_date', 1);
            lead = results?.[0] || null;
            if (lead) {
                fetchMethod = "user-scoped";
                console.log(`[cancelFollowup][${traceId}] 📌 lead found via user-scoped filter`);
            }
        } catch (e) {
            console.warn(`[cancelFollowup][${traceId}] ⚠️ user-scoped filter failed: ${e.message}`);
        }

        // Fallback: service role + ownership check
        if (!lead) {
            try {
                const results = await base44.asServiceRole.entities.Client.filter({ id: lead_id }, '-created_date', 1);
                const found = results?.[0];
                if (found) {
                    console.log(`[cancelFollowup][${traceId}] 🔍 lead found via service-role | owner_email=${found?.owner_email}`);
                    if (found.owner_email === user.email || found.created_by === user.email) {
                        lead = found;
                        fetchMethod = "service-role";
                        console.log(`[cancelFollowup][${traceId}] ✅ ownership check PASSED`);
                    } else {
                        console.warn(`[cancelFollowup][${traceId}] ❌ ownership check FAILED — user=${user.email}`);
                        return Response.json({ ok: false, traceId, errorCode: "FORBIDDEN", message: "Permission denied" }, { status: 403 });
                    }
                }
            } catch (e) {
                console.error(`[cancelFollowup][${traceId}] 💥 service-role filter failed: ${e.message}`);
            }
        }

        if (!lead) {
            console.error(`[cancelFollowup][${traceId}] ❌ LEAD_NOT_FOUND — lead_id=${lead_id} fetchMethod=${fetchMethod}`);
            return Response.json({ ok: false, traceId, errorCode: "LEAD_NOT_FOUND", message: "Lead not found" }, { status: 404 });
        }

        console.log(`[cancelFollowup][${traceId}] 📊 BEFORE: next_followup_at=${lead.next_followup_at}`);

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

        console.log(`[cancelFollowup][${traceId}] ✅✅✅ SUCCESS — returning ok:true`);
        return Response.json({ ok: true, traceId });

    } catch (error) {
        console.error(`[cancelFollowup][${traceId}] 💥 UNEXPECTED ERROR:`, error.stack || error.message);
        const response = { ok: false, traceId, errorCode: "SERVER_ERROR", message: error.message };
        console.log(`[cancelFollowup][${traceId}] 📤 ERROR RESPONSE:`, JSON.stringify(response));
        return Response.json(response, { status: 500 });
    }
});