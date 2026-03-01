import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    try {
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { lead_id } = await req.json();
        
        // Try different retrieval methods
        let viaGet = null;
        let viaGetError = null;
        try {
            viaGet = await base44.asServiceRole.entities.Client.get(lead_id);
        } catch (e) {
            viaGetError = e.message;
        }

        let viaFilter = [];
        try {
            viaFilter = await base44.asServiceRole.entities.Client.filter({ id: lead_id });
        } catch (e) {
            console.error("Filter error:", e.message);
        }

        let allClients = [];
        try {
            allClients = await base44.asServiceRole.entities.Client.list('-created_date', 10);
        } catch (e) {
            console.error("List error:", e.message);
        }

        return Response.json({
            user_email: user.email,
            lead_id_requested: lead_id,
            get_found: !!viaGet,
            get_error: viaGetError,
            filter_found: viaFilter.length > 0,
            filter_count: viaFilter.length,
            all_count: allClients.length,
            all_ids: allClients.map(c => c.id),
            first_lead_detail: allClients[0] ? {
                id: allClients[0].id,
                name: allClients[0].name,
                created_by: allClients[0].created_by,
                owner_email: allClients[0].owner_email
            } : null
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});