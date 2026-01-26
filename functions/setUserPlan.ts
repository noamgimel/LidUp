import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Step 1: אימות שהמשתמש הנוכחי הוא admin
        let currentUser;
        try {
            currentUser = await base44.auth.me();
        } catch (error) {
            return Response.json({ 
                error: 'Authentication failed',
                where_failed: 'auth.me()',
                message: 'לא ניתן לאמת את המשתמש המבצע',
                details: error.message
            }, { status: 401 });
        }
        
        if (!currentUser || currentUser.email !== 'noam.gamliel@gmail.com') {
            return Response.json({ 
                error: 'Forbidden: Admin access required',
                where_failed: 'admin_check',
                message: 'רק מנהל המערכת noam.gamliel@gmail.com יכול לבצע פעולה זו',
                current_user: currentUser?.email || 'unknown'
            }, { status: 403 });
        }

        // Step 2: קריאת הנתונים מהבקשה
        let requestData;
        try {
            requestData = await req.json();
        } catch (error) {
            return Response.json({ 
                error: 'Invalid JSON',
                where_failed: 'json_parse',
                message: 'לא ניתן לפענח את הנתונים שנשלחו'
            }, { status: 400 });
        }

        const { target_user_email, plan_type } = requestData;

        // Step 3: בדיקת שדות חובה
        if (!target_user_email || !plan_type) {
            return Response.json({ 
                error: 'Missing required fields',
                where_failed: 'validation',
                message: 'חסרים שדות חובה: target_user_email ו-plan_type',
                received: { target_user_email, plan_type }
            }, { status: 400 });
        }

        // Step 4: בדיקת ערכים תקינים (enum)
        if (!['FREE', 'PREMIUM'].includes(plan_type)) {
            return Response.json({ 
                error: 'Invalid plan_type value',
                where_failed: 'enum_validation',
                message: 'plan_type חייב להיות FREE או PREMIUM בדיוק (case sensitive)',
                received: plan_type,
                allowed: ['FREE', 'PREMIUM']
            }, { status: 400 });
        }

        // Step 5: עדכון המשתמש המבוקש
        let updatedUser;
        try {
            // User entity דורש שימוש ב-API מיוחד של users
            updatedUser = await base44.asServiceRole.users.update(target_user_email, {
                plan_type: plan_type
            });
        } catch (error) {
            // אם המשתמש לא נמצא או שגיאת RLS
            return Response.json({ 
                error: 'Failed to update user',
                where_failed: 'users.update()',
                message: `לא ניתן לעדכן את המשתמש ${target_user_email}`,
                details: error.message,
                possible_reasons: [
                    'המשתמש לא קיים במערכת',
                    'שגיאת הרשאות (RLS)',
                    'שדה plan_type לא קיים בטבלת User',
                    'ערך enum לא תקין'
                ]
            }, { status: 500 });
        }

        // Step 6: החזרת תוצאה מוצלחת
        return Response.json({ 
            success: true,
            message: `המשתמש ${target_user_email} עודכן בהצלחה ל-${plan_type}`,
            updated_user: {
                email: target_user_email,
                plan_type: plan_type,
                updated_at: new Date().toISOString()
            }
        }, { status: 200 });

    } catch (error) {
        // catch כללי לכל שגיאה בלתי צפויה
        console.error('Unexpected error in setUserPlan:', error);
        return Response.json({ 
            error: 'Internal server error',
            where_failed: 'unexpected',
            message: 'שגיאה בלתי צפויה בשרת',
            details: error.message,
            stack: error.stack
        }, { status: 500 });
    }
});