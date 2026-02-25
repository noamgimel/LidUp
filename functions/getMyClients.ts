import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
        }

        console.log('[getMyClients] user.email =', user.email);

        const clientEntity = base44.asServiceRole.entities.Client;

        // שלב 1: שליפה לפי owner_email (לידים מטפסים חיצוניים)
        const byOwner = await clientEntity.filter({ owner_email: user.email }, '-created_date', 5000);
        console.log('[getMyClients] byOwner count =', byOwner.length);

        // שלב 2: שליפת כל הרשומות בבת אחת וסינון לפי created_by בצד הקוד
        // (כי created_by הוא שדה מערכת ולא ניתן לפלטר עליו ישירות)
        const allClients = await clientEntity.list('-created_date', 5000);
        console.log('[getMyClients] allClients total =', allClients.length);

        const byCreator = allClients.filter(c => c.created_by === user.email);
        console.log('[getMyClients] byCreator (filtered in code) count =', byCreator.length);

        // שלב 3: מיזוג ללא כפילויות לפי ID
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