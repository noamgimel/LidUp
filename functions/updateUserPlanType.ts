import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);

    // אימות אדמין
    let adminUser = null;
    try {
        adminUser = await base44.auth.me();
    } catch (e) {
        return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!adminUser || adminUser.email !== 'noam.gamliel@gmail.com') {
        return Response.json({ ok: false, error: 'Forbidden' }, { status: 403 });
    }

    // קריאת payload
    let payload = {};
    try {
        payload = await req.json();
    } catch (e) {
        return Response.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
    }

    const { user_email, plan_type } = payload;

    if (!user_email || !plan_type || !['FREE', 'PREMIUM'].includes(plan_type)) {
        return Response.json({ ok: false, error: 'user_email and valid plan_type required' }, { status: 400 });
    }

    console.log('[updateUserPlanType] Updating', user_email, 'to', plan_type);

    try {
        // מחפשים את המשתמש לפי email
        const users = await base44.asServiceRole.entities.User.filter({ email: user_email });
        console.log('[updateUserPlanType] Found users:', users?.length, JSON.stringify(users?.map(u => ({ id: u.id, email: u.email }))));

        if (!users || users.length === 0) {
            return Response.json({ ok: false, error: `User ${user_email} not found` }, { status: 404 });
        }

        const userId = users[0].id;
        console.log('[updateUserPlanType] userId =', userId);

        // עדכון plan_type על ה-User entity
        const updated = await base44.asServiceRole.entities.User.update(userId, { plan_type });
        console.log('[updateUserPlanType] Updated successfully:', JSON.stringify(updated));

        return Response.json({
            ok: true,
            message: `User ${user_email} updated to ${plan_type}`,
            user: { email: user_email, plan_type }
        });

    } catch (error) {
        console.error('[updateUserPlanType] ERROR:', error.message, error.stack);
        return Response.json({ ok: false, error: error.message }, { status: 500 });
    }
});