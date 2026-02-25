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

    console.log('[getMyFormConnections] user:', user.email);

    try {
        // שליפת חיבורי הטפסים של המשתמש
        const connections = await base44.asServiceRole.entities.FormConnection.filter(
            { owner_email: user.email },
            '-created_date',
            1000
        );

        console.log('[getMyFormConnections] Found', connections?.length, 'connections');

        // הסרת secret_key מהתגובה (אבטחה)
        const sanitizedConnections = connections.map(conn => ({
            ...conn,
            secret_key: conn.secret_key ? `sk_****${conn.secret_key.slice(-6)}` : null
        }));

        return Response.json({
            ok: true,
            count: sanitizedConnections.length,
            items: sanitizedConnections
        });

    } catch (error) {
        console.error('[getMyFormConnections] ERROR:', error.message);
        return Response.json({ ok: false, error: error.message }, { status: 500 });
    }
});