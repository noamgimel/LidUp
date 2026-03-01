import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    try {
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { lead_id } = await req.json();
        console.log("[testOwnership] User:", user.email, "| Testing lead:", lead_id);

        // Get lead
        const leads = await base44.asServiceRole.entities.Client.filter({ id: lead_id });
        const lead = leads?.[0];
        if (!lead) return Response.json({ error: 'Lead not found' }, { status: 404 });

        console.log("[testOwnership] Lead name:", lead.name);
        console.log("[testOwnership] Lead.created_by:", lead.created_by);
        console.log("[testOwnership] Lead.owner_email:", lead.owner_email);
        console.log("[testOwnership] User.email:", user.email);
        console.log("[testOwnership] created_by match?", lead.created_by === user.email);
        console.log("[testOwnership] owner_email match?", lead.owner_email === user.email);

        const isOwner = lead.owner_email === user.email || lead.created_by === user.email;

        return Response.json({
            ok: true,
            user_email: user.email,
            lead_created_by: lead.created_by,
            lead_owner_email: lead.owner_email,
            is_owner: isOwner
        });
    } catch (error) {
        console.error("[testOwnership] Error:", error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});