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

        // Fetch lead directly by id
        let lead = null;
        try {
            const results = await base44.entities.Client.filter({ id: lead_id }, '-created_date', 1);
            lead = results?.[0] || null;
        } catch (e) {
            console.warn(`[markFollowupDone][${traceId}] user-scoped filter failed: ${e.message}`);
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
                console.error(`[markFollowupDone][${traceId}] service-role filter failed: ${e.message}`);
            }
        }

        if (!lead) {
            console.error(`[markFollowupDone][${traceId}] LEAD_NOT_FOUND — lead_id=${lead_id} user=${user.email}`);
            return Response.json({ ok: false, traceId, errorCode: "LEAD_NOT_FOUND", message: "Lead not found" }, { status: 404 });
        }

        console.log(`[markFollowupDone][${traceId}] lead found: name=${lead.name}`);

        const now = new Date().toISOString();
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

        console.log(`[markFollowupDone][${traceId}] SUCCESS`);
        return Response.json({ ok: true, traceId, leadId: lead_id });

    } catch (error) {
        console.error(`[markFollowupDone][${traceId}] UNEXPECTED ERROR:`, error.stack || error.message);
        return Response.json({ ok: false, traceId, errorCode: "SERVER_ERROR", message: error.message }, { status: 500 });
    }
});