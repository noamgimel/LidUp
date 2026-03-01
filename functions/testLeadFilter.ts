import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    try {
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { lead_id } = await req.json();
        console.log("[testLeadFilter] Testing with lead_id:", lead_id);

        // Try list all
        console.log("[testLeadFilter] Listing all clients...");
        const allClients = await base44.asServiceRole.entities.Client.list('-created_date', 10);
        console.log("[testLeadFilter] Found", allClients?.length, "clients");
        const allIds = allClients?.map(c => c.id) || [];
        console.log("[testLeadFilter] IDs:", allIds);

        // Try filter
        console.log("[testLeadFilter] Filtering by id:", lead_id);
        const filtered = await base44.asServiceRole.entities.Client.filter({ id: lead_id });
        console.log("[testLeadFilter] Filter result:", filtered?.length, "items");
        const found = filtered?.[0];
        console.log("[testLeadFilter] Found?", !!found, found?.name);

        return Response.json({
            ok: true,
            total_clients: allClients?.length,
            all_ids: allIds,
            searched_id: lead_id,
            filter_found: !!found,
            lead_name: found?.name
        });
    } catch (error) {
        console.error("[testLeadFilter] Error:", error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});