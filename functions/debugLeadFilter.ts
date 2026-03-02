import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    try {
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { lead_id } = await req.json();

        // Test 1: filter by id field
        let filterById = null;
        let filterByIdError = null;
        try {
            const res = await base44.asServiceRole.entities.Client.filter({ id: lead_id });
            filterById = res;
        } catch(e) {
            filterByIdError = e.message;
        }

        // Test 2: list all and find manually
        let allLeads = null;
        let foundInAll = null;
        try {
            allLeads = await base44.asServiceRole.entities.Client.list('-created_date', 100);
            foundInAll = allLeads?.find(l => l.id === lead_id) || null;
        } catch(e) {
            allLeads = { error: e.message };
        }

        return Response.json({
            user_email: user.email,
            lead_id_requested: lead_id,
            filterById_count: filterById?.length,
            filterById_result: filterById,
            filterByIdError,
            all_count: allLeads?.length,
            found_in_all: foundInAll ? { id: foundInAll.id, name: foundInAll.name, created_by: foundInAll.created_by, owner_email: foundInAll.owner_email } : null,
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});