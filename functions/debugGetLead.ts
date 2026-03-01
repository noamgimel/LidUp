import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    try {
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { lead_id } = await req.json();

        // Try listing all clients to see if data is accessible
        const allClients = await base44.asServiceRole.entities.Client.list('-created_date', 5);
        
        // Try getting specific lead
        let specificLead = null;
        let specificError = null;
        if (lead_id) {
            try {
                specificLead = await base44.asServiceRole.entities.Client.get(lead_id);
            } catch (e) {
                specificError = e.message;
            }
        }

        return Response.json({
            ok: true,
            user_email: user.email,
            total_found_via_list: allClients?.length,
            first_ids: allClients?.map(c => c.id),
            specific_lead_id: lead_id,
            specific_lead_found: !!specificLead,
            specific_lead_name: specificLead?.name,
            specific_error: specificError
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});