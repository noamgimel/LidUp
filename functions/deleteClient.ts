import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { client_id } = await req.json();
        if (!client_id) {
            return Response.json({ ok: false, error: 'Missing client_id' }, { status: 400 });
        }

        // וידוא שהרשומה שייכת למשתמש לפני מחיקה
        const client = await base44.asServiceRole.entities.Client.get(client_id);
        if (!client) {
            return Response.json({ ok: false, error: 'Not found' }, { status: 404 });
        }

        if (client.owner_email !== user.email && client.created_by !== user.email) {
            return Response.json({ ok: false, error: 'Forbidden' }, { status: 403 });
        }

        await base44.asServiceRole.entities.Client.delete(client_id);

        return Response.json({ ok: true });

    } catch (error) {
        console.error('[deleteClient] ERROR:', error.message);
        return Response.json({ ok: false, error: error.message }, { status: 500 });
    }
});