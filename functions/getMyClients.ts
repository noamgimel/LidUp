import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);

    let user = null;
    try {
        user = await base44.auth.me();
    } catch (authError) {
        console.log('[getMyClients] auth.me() threw:', authError.message);
    }

    if (!user) {
        console.log('[getMyClients] No authenticated user — returning 401');
        return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[getMyClients] user.email =', user.email);

    try {
        const clientEntity = base44.asServiceRole.entities.Client;

        // שליפה לפי owner_email (לידים מטפסים חיצוניים)
        const byOwner = await clientEntity.filter({ owner_email: user.email }, '-created_date', 5000);
        console.log('[getMyClients] byOwner count =', byOwner.length);

        // שליפת כל הרשומות וסינון לפי created_by בצד הקוד
        // (created_by הוא שדה מערכת שלא עובד כ-filter ישיר)
        const allClients = await clientEntity.list('-created_date', 5000);
        console.log('[getMyClients] allClients total from DB =', allClients.length);

        const byCreator = allClients.filter(c => c.created_by === user.email);
        console.log('[getMyClients] byCreator (in-memory filter) count =', byCreator.length);

        // מיזוג ללא כפילויות לפי ID
        const allMap = new Map();
        [...byOwner, ...byCreator].forEach(c => allMap.set(c.id, c));
        const clients = Array.from(allMap.values());

        console.log('[getMyClients] Total merged count =', clients.length);

        // מיון לפי תאריך יצירה (חדש ראשון)
        clients.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

        return Response.json({
            ok: true,
            user_email: user.email,
            count: clients.length,
            clients
        });

    } catch (error) {
        console.error('[getMyClients] ERROR:', error.message, error.stack);
        return Response.json({ ok: false, error: error.message }, { status: 500 });
    }
});