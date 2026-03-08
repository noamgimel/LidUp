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

        if (!lead_id || typeof lead_id !== 'string' || lead_id.trim() === '') {
            return Response.json({ ok: false, traceId, errorCode: "BAD_REQUEST", message: "Missing or invalid lead_id" }, { status: 400 });
        }

        console.log(`[markFirstContact][${traceId}] user=${user.email} lead_id=${lead_id}`);

        // Fetch lead via service role and verify ownership
        let lead = null;
        try {
            lead = await base44.asServiceRole.entities.Client.get(lead_id);
        } catch (e) {
            console.error(`[markFirstContact][${traceId}] get failed: ${e.message}`);
        }
        if (!lead) {
            return Response.json({ ok: false, traceId, errorCode: "LEAD_NOT_FOUND", message: "Lead not found" }, { status: 404 });
        }
        // בדוק בעלות: המשתמש חייב להיות owner_email או created_by
        if (lead.owner_email !== user.email && lead.created_by !== user.email) {
            console.warn(`[markFirstContact][${traceId}] FORBIDDEN: owner=${lead.owner_email} created_by=${lead.created_by} user=${user.email}`);
            return Response.json({ ok: false, traceId, errorCode: "FORBIDDEN", message: "Permission denied" }, { status: 403 });
        }

        const now = new Date().toISOString();
        const isFirstContact = !lead.first_response_at;

        console.log(`[markFirstContact][${traceId}] isFirstContact=${isFirstContact} first_response_at=${lead.first_response_at}`);

        if (isFirstContact) {
            // ── קשר ראשון: מגדירים first_response_at + last_contact_at ──
            const isAtInitialStage = !lead.work_stage || lead.work_stage === 'new_lead';
            const stageUpdate = isAtInitialStage ? { work_stage: 'first_contact' } : {};
            const newPriority = lead.priority === 'overdue' ? 'warm' : (lead.priority || 'warm');

            const updatePayload = {
                first_response_at: now,
                last_contact_at: now,
                last_activity_at: now,
                priority: newPriority,
                ...stageUpdate
            };
            await base44.asServiceRole.entities.Client.update(lead_id, updatePayload);

            await base44.asServiceRole.entities.LeadActivity.create({
                lead_id,
                event_type: 'first_response',
                content: 'נוצר קשר ראשון עם הליד',
                created_by_email: user.email
            });

            console.log(`[markFirstContact][${traceId}] ✅ FIRST CONTACT marked`);
            return Response.json({
                ok: true, traceId, leadId: lead_id,
                is_first: true,
                first_response_at: now,
                last_contact_at: now,
                priority: newPriority,
                ...stageUpdate
            });

        } else {
            // ── קשר נוסף: רק last_contact_at מתעדכן, first_response_at נשאר קבוע ──
            await base44.entities.Client.update(lead_id, {
                last_contact_at: now,
                last_activity_at: now
            });

            await base44.asServiceRole.entities.LeadActivity.create({
                lead_id,
                event_type: 'contact',
                content: 'נוצר קשר נוסף עם הליד',
                created_by_email: user.email
            });

            console.log(`[markFirstContact][${traceId}] ✅ ADDITIONAL CONTACT marked`);
            return Response.json({
                ok: true, traceId, leadId: lead_id,
                is_first: false,
                first_response_at: lead.first_response_at,
                last_contact_at: now
            });
        }

    } catch (error) {
        console.error(`[markFirstContact][${traceId}] 💥 ERROR:`, error.stack || error.message);
        return Response.json({ ok: false, traceId, errorCode: "SERVER_ERROR", message: error.message }, { status: 500 });
    }
});