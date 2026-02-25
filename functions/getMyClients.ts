import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        const user = await base44.auth.me();
        if (!user) {
            console.log('[getMyClients] ERROR: No authenticated user');
            return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
        }

        console.log('[getMyClients] user.email =', user.email);

        // שליפה לפי owner_email (לידים שהגיעו מטפסים חיצוניים)
        const byOwner = await base44.asServiceRole.entities.Client.filter({ owner_email: user.email });
        console.log('[getMyClients] byOwner count =', byOwner.length);
        if (byOwner.length > 0) {
            console.log('[getMyClients] byOwner sample IDs:', byOwner.slice(0, 3).map(c => `${c.id} (${c.email})`).join(', '));
        }

        // שליפה לפי created_by (רשומות שנוצרו ידנית)
        const byCreator = await base44.asServiceRole.entities.Client.filter({ created_by: user.email });
        console.log('[getMyClients] byCreator count =', byCreator.length);

        // מיזוג ללא כפילויות לפי ID
        const allMap = new Map();
        [...byOwner, ...byCreator].forEach(c => allMap.set(c.id, c));
        const clients = Array.from(allMap.values());

        console.log('[getMyClients] Total merged count =', clients.length);

        // debug: בדיקת הליד הספציפי
        const testLead = clients.find(c => c.email === 'postman@example.com');
        console.log('[getMyClients] postman@example.com found:', testLead ? `YES - id=${testLead.id}, owner=${testLead.owner_email}` : 'NO');

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