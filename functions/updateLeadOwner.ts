import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    try {
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { lead_id } = await req.json();
        console.log("[updateLeadOwner] Updating lead", lead_id, "to owner:", user.email);

        // Get lead
        const leads = await base44.asServiceRole.entities.Client.filter({ id: lead_id });
        const lead = leads?.[0];
        if (!lead) return Response.json({ error: 'Lead not found' }, { status: 404 });

        // Update owner_email to current user
        await base44.asServiceRole.entities.Client.update(lead_id, {
            owner_email: user.email
        });

        console.log("[updateLeadOwner] Lead owner updated successfully");

        return Response.json({
            ok: true,
            lead_id,
            owner_email: user.email
        });
    } catch (error) {
        console.error("[updateLeadOwner] Error:", error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});