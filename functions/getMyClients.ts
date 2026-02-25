import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// פונקציה לשליפת כל הרשומות עם pagination
async function fetchAll(entityRef, filter) {
    const pageSize = 100;
    let skip = 0;
    let all = [];
    while (true) {
        const page = await entityRef.filter(filter, '-created_date', pageSize, skip);
        all = all.concat(page);
        if (page.length < pageSize) break;
        skip += pageSize;
    }
    return all;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
        }

        console.log('[getMyClients] user.email =', user.email);

        const clientEntity = base44.asServiceRole.entities.Client;

        // שליפה לפי owner_email (לידים מטפסים חיצוניים)
        const byOwner = await fetchAll(clientEntity, { owner_email: user.email });
        console.log('[getMyClients] byOwner count =', byOwner.length);

        // שליפה לפי created_by (רשומות שנוצרו ידנית)
        const byCreator = await fetchAll(clientEntity, { created_by: user.email });
        console.log('[getMyClients] byCreator count =', byCreator.length);

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