import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    try {
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { lead_id } = await req.json();
        console.log("[debugOwnership] User:", user.email);
        console.log("[debugOwnership] Testing lead:", lead_id);

        // Get lead
        const leads = await base44.asServiceRole.entities.Client.filter({ id: lead_id });
        const lead = leads?.[0];
        if (!lead) return Response.json({ error: 'Lead not found' }, { status: 404 });

        console.log("[debugOwnership] Lead found:", lead.name);
        console.log("[debugOwnership] lead.owner_email:", lead.owner_email);
        console.log("[debugOwnership] lead.created_by:", lead.created_by);
        console.log("[debugOwnership] user.email:", user.email);

        const isLeadOwner = lead.owner_email === user.email || lead.created_by === user.email;
        console.log("[debugOwnership] isLeadOwner:", isLeadOwner);
        console.log("[debugOwnership] lead.owner_email === user.email:", lead.owner_email === user.email);
        console.log("[debugOwnership] lead.created_by === user.email:", lead.created_by === user.email);

        // Check SystemAdmin
        let isAdmin = false;
        let adminCount = 0;
        try {
            console.log("[debugOwnership] Checking SystemAdmin...");
            const admins = await base44.asServiceRole.entities.SystemAdmin.filter({ user_email: user.email, is_active: true });
            console.log("[debugOwnership] Admin filter result length:", admins?.length);
            adminCount = admins?.length || 0;
            isAdmin = admins?.length > 0;
        } catch (e) {
            console.log("[debugOwnership] SystemAdmin check failed:", e.message);
        }
        console.log("[debugOwnership] isAdmin:", isAdmin);

        const allowed = isLeadOwner || isAdmin;
        console.log("[debugOwnership] Allowed:", allowed);

        return Response.json({
            ok: true,
            user_email: user.email,
            lead_owner_email: lead.owner_email,
            lead_created_by: lead.created_by,
            is_lead_owner: isLeadOwner,
            is_admin: isAdmin,
            admin_count: adminCount,
            allowed: allowed
        });
    } catch (error) {
        console.error("[debugOwnership] Error:", error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});