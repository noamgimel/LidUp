import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);

    let user = null;
    try {
        user = await base44.auth.me();
    } catch (authError) {
        console.log('[getMyClients] auth.me() error:', authError.message);
        return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!user) {
        return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[getMyClients] user.email =', user.email);

    try {
        // שלב 1: שליפה לפי created_by (לידים שנוצרו ידנית על ידי המשתמש)
        const userClients = await base44.asServiceRole.entities.Client.filter(
            { created_by: user.email }, '-created_date', 5000
        );
        console.log('[getMyClients] userClients (by created_by) count =', userClients.length);

        // שלב 2: שליפה לפי owner_email (לידים שהגיעו מטפסים חיצוניים)
        const byOwner = await base44.asServiceRole.entities.Client.filter(
            { owner_email: user.email }, '-created_date', 5000
        );
        console.log('[getMyClients] byOwner (by owner_email) count =', byOwner.length);

        // מיזוג ללא כפילויות
        const allMap = new Map();
        [...userClients, ...byOwner].forEach(c => allMap.set(c.id, c));
        const clients = Array.from(allMap.values());

        console.log('[getMyClients] Total merged count =', clients.length);

        clients.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

        return Response.json({
            ok: true,
            user_email: user.email,
            count: clients.length,
            clients
        });

    } catch (error) {
        console.error('[getMyClients] ERROR:', error.message);
        return Response.json({ ok: false, error: error.message }, { status: 500 });
    }
});