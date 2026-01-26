import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // אימות שהמשתמש הוא admin
        const user = await base44.auth.me();
        
        if (!user || user.email !== 'noam.gamliel@gmail.com') {
            return Response.json({ 
                error: 'Forbidden: Admin access required' 
            }, { status: 403 });
        }

        // קריאת הנתונים מהבקשה
        const { user_email, plan_type } = await req.json();

        // בדיקת שדות חובה
        if (!user_email || !plan_type) {
            return Response.json({ 
                error: 'Missing required fields: user_email and plan_type are required' 
            }, { status: 400 });
        }

        // בדיקת ערכים תקינים
        if (!['FREE', 'PREMIUM'].includes(plan_type)) {
            return Response.json({ 
                error: 'Invalid plan_type. Must be FREE or PREMIUM' 
            }, { status: 400 });
        }

        // מציאת המשתמש לפי email
        const users = await base44.asServiceRole.entities.User.filter({
            email: user_email
        });

        if (!users || users.length === 0) {
            return Response.json({ 
                error: 'User not found' 
            }, { status: 404 });
        }

        const targetUser = users[0];

        // עדכון plan_type
        await base44.asServiceRole.entities.User.update(targetUser.id, {
            plan_type: plan_type
        });

        return Response.json({ 
            success: true,
            message: `User ${user_email} updated to ${plan_type}`,
            user: {
                email: user_email,
                plan_type: plan_type
            }
        }, { status: 200 });

    } catch (error) {
        console.error('Error in updateUserPlanType:', error);
        return Response.json({ 
            error: 'Internal server error',
            details: error.message 
        }, { status: 500 });
    }
});