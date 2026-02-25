import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
        }

        // שליפת כל הרשומות שבהן המשתמש הוא הבעלים (owner_email) או יוצר (created_by)
        const [byOwner, byCreator] = await Promise.all([
            base44.asServiceRole.entities.Client.filter({ owner_email: user.email }),
            base44.asServiceRole.entities.Client.filter({ created_by: user.email })
        ]);

        // מיזוג ללא כפילויות לפי ID
        const allMap = new Map();
        [...byOwner, ...byCreator].forEach(c => allMap.set(c.id, c));
        const clients = Array.from(allMap.values());

        // מיון לפי תאריך יצירה (חדש ראשון)
        clients.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

        return Response.json({ ok: true, clients });

    } catch (error) {
        console.error('Error in getMyClients:', error);
        return Response.json({ ok: false, error: error.message }, { status: 500 });
    }
});