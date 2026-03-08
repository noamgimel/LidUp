import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const genTraceId = () => Math.random().toString(36).slice(2, 10).toUpperCase();

Deno.serve(async (req) => {
    const traceId = genTraceId();
    const base44 = createClientFromRequest(req);
    try {
        const user = await base44.auth.me();
        if (!user) return Response.json({ ok: false, errorCode: "UNAUTHORIZED" }, { status: 401 });

        const { lead_id, lifecycle } = await req.json();
        if (!lead_id || !lifecycle) return Response.json({ ok: false, errorCode: "BAD_REQUEST" }, { status: 400 });

        if (!['open', 'won', 'lost'].includes(lifecycle)) {
            return Response.json({ ok: false, errorCode: "BAD_REQUEST", message: "Invalid lifecycle value" }, { status: 400 });
        }

        // Verify ownership via service role
        const lead = await base44.asServiceRole.entities.Client.get(lead_id);

        if (!lead) return Response.json({ ok: false, errorCode: "LEAD_NOT_FOUND" }, { status: 404 });

        if (lead.owner_email !== user.email && lead.created_by !== user.email) {
            console.warn(`[updateLeadLifecycle][${traceId}] FORBIDDEN: owner=${lead.owner_email} user=${user.email}`);
            return Response.json({ ok: false, errorCode: "FORBIDDEN" }, { status: 403 });
        }

        const now = new Date().toISOString();
        await base44.asServiceRole.entities.Client.update(lead_id, {
            lifecycle,
            last_activity_at: now
        });

        const content = lifecycle === "won" ? "ליד נסגר בהצלחה ✅" : lifecycle === "lost" ? "ליד סומן כלא רלוונטי ❌" : "ליד הוחזר לפעיל";
        await base44.asServiceRole.entities.LeadActivity.create({
            lead_id,
            event_type: 'lifecycle_changed',
            content,
            created_by_email: user.email
        });

        console.log(`[updateLeadLifecycle][${traceId}] ✅ lifecycle=${lifecycle} for lead=${lead_id}`);
        return Response.json({ ok: true, lifecycle });

    } catch (error) {
        console.error(`[updateLeadLifecycle][${traceId}] ERROR:`, error.message);
        return Response.json({ ok: false, error: error.message }, { status: 500 });
    }
});