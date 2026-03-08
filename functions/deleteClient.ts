import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    try {
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { client_id } = await req.json();
        if (!client_id) {
            return Response.json({ ok: false, error: 'Missing client_id' }, { status: 400 });
        }

        // Fetch via user-scoped call — RLS guarantees ownership
        let client = null;
        try {
            client = await base44.entities.Client.get(client_id);
        } catch (e) {
            // not found or no permission
        }

        if (!client) {
            return Response.json({ ok: false, error: 'Not found' }, { status: 404 });
        }

        await base44.asServiceRole.entities.Client.delete(client_id);

        return Response.json({ ok: true });

    } catch (error) {
        console.error('[deleteClient] ERROR:', error.message);
        return Response.json({ ok: false, error: error.message }, { status: 500 });
    }
});