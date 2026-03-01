import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    try {
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        console.log("[checkSystemAdmin] User email:", user.email);

        // Check SystemAdmin
        try {
            const admins = await base44.asServiceRole.entities.SystemAdmin.filter({ user_email: user.email, is_active: true });
            console.log("[checkSystemAdmin] Found admins:", admins?.length);
            console.log("[checkSystemAdmin] Admin data:", admins?.[0]);
        } catch (e) {
            console.log("[checkSystemAdmin] SystemAdmin filter error:", e.message);
        }

        // Try to list all SystemAdmins (might not work due to RLS)
        try {
            const allAdmins = await base44.asServiceRole.entities.SystemAdmin.list();
            console.log("[checkSystemAdmin] Total admins in system:", allAdmins?.length);
        } catch (e) {
            console.log("[checkSystemAdmin] SystemAdmin list error:", e.message);
        }

        return Response.json({ ok: true, user_email: user.email });
    } catch (error) {
        console.error("[checkSystemAdmin] Error:", error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});