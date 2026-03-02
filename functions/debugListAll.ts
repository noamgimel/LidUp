import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    try {
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { lead_id } = await req.json();

        // Test 1: service role list
        let srList = null, srError = null;
        try {
            srList = await base44.asServiceRole.entities.Client.list('-created_date', 500);
        } catch(e) { srError = e.message; }

        // Test 2: user-scoped list
        let userList = null, userError = null;
        try {
            userList = await base44.entities.Client.list('-created_date', 500);
        } catch(e) { userError = e.message; }

        const foundInSr = srList?.find(l => l.id === lead_id);
        const foundInUser = userList?.find(l => l.id === lead_id);

        return Response.json({
            user_email: user.email,
            lead_id,
            sr_count: srList?.length,
            sr_ids: srList?.map(l => l.id),
            sr_error: srError,
            found_in_sr: foundInSr ? { id: foundInSr.id, name: foundInSr.name } : null,
            user_count: userList?.length,
            user_ids: userList?.map(l => l.id),
            user_error: userError,
            found_in_user: foundInUser ? { id: foundInUser.id, name: foundInUser.name } : null,
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});