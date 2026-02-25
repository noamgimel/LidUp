import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);

    // אימות משתמש
    let user = null;
    try {
        user = await base44.auth.me();
    } catch (e) {
        return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!user?.email) {
        return Response.json({ ok: false, error: 'User email not found' }, { status: 401 });
    }

    // קריאת payload
    let payload = {};
    try {
        payload = await req.json();
    } catch (e) {
        return Response.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
    }

    const { form_connection_id, is_active } = payload;

    if (!form_connection_id || typeof is_active !== 'boolean') {
        return Response.json({ 
            ok: false, 
            error: 'form_connection_id and is_active (boolean) are required' 
        }, { status: 400 });
    }

    console.log('[setFormConnectionStatus]', user.email, 'updating', form_connection_id, 'to', is_active);

    try {
        // בדיקה שהחיבור שייך למשתמש או שהוא admin
        const connection = await base44.asServiceRole.entities.FormConnection.get(form_connection_id);
        
        if (!connection) {
            return Response.json({ ok: false, error: 'Connection not found' }, { status: 404 });
        }

        const isAdmin = user.email === 'noam.gamliel@gmail.com';
        const isOwner = connection.owner_email === user.email;

        if (!isAdmin && !isOwner) {
            return Response.json({ 
                ok: false, 
                error: 'Forbidden: You can only update your own connections' 
            }, { status: 403 });
        }

        // עדכון הסטטוס
        const updated = await base44.asServiceRole.entities.FormConnection.update(form_connection_id, {
            is_active
        });

        console.log('[setFormConnectionStatus] Updated successfully');

        // הסרת secret_key מהתגובה
        const sanitized = {
            ...updated,
            secret_key: updated.secret_key ? `sk_****${updated.secret_key.slice(-6)}` : null
        };

        return Response.json({
            ok: true,
            connection: sanitized
        });

    } catch (error) {
        console.error('[setFormConnectionStatus] ERROR:', error.message);
        return Response.json({ ok: false, error: error.message }, { status: 500 });
    }
});