import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    let payload = null;
    let adminUser = null;
    let authState = "not_attempted";

    try {
        const base44 = createClientFromRequest(req);
        
        // שלב 1: אימות אדמין
        try {
            adminUser = await base44.auth.me();
            authState = adminUser ? "authenticated" : "no_user";
            console.log("✓ Admin authenticated:", adminUser?.email);
        } catch (authError) {
            authState = "auth_error";
            console.error("✗ Auth failed:", {
                message: authError.message,
                stack: authError.stack
            });
            return Response.json({ 
                ok: false,
                error_code: "AUTH_FAILED",
                message: "כשל באימות משתמש - אין סשן פעיל",
                details: { 
                    error: authError.message,
                    stack: authError.stack,
                    auth_state: authState
                }
            }, { status: 401 });
        }
        
        if (!adminUser || adminUser.email !== 'noam.gamliel@gmail.com') {
            console.error("✗ Not admin:", adminUser?.email);
            return Response.json({ 
                ok: false,
                error_code: "FORBIDDEN",
                message: "רק אדמין מורשה יכול לעדכן מסלולים",
                details: { 
                    current_user: adminUser?.email,
                    auth_state: authState
                }
            }, { status: 403 });
        }

        // שלב 2: קריאת הנתונים
        try {
            payload = await req.json();
            console.log("✓ Payload received:", JSON.stringify(payload, null, 2));
        } catch (parseError) {
            console.error("✗ JSON parse failed:", parseError.message);
            return Response.json({ 
                ok: false,
                error_code: "INVALID_JSON",
                message: "נתונים לא תקינים",
                details: { 
                    error: parseError.message,
                    admin_user: adminUser?.email
                }
            }, { status: 400 });
        }

        const { user_email, plan_type } = payload;

        // שלב 3: בדיקת שדות חובה
        const validationErrors = [];
        
        if (!user_email) {
            validationErrors.push("user_email חסר");
        }
        if (!plan_type) {
            validationErrors.push("plan_type חסר");
        }
        if (plan_type && !['FREE', 'PREMIUM'].includes(plan_type)) {
            validationErrors.push(`plan_type לא תקין: ${plan_type}. חייב להיות FREE או PREMIUM`);
        }

        if (validationErrors.length > 0) {
            console.error("✗ Validation failed:", validationErrors);
            return Response.json({ 
                ok: false,
                error_code: "VALIDATION_FAILED",
                message: "שדות חובה חסרים או לא תקינים",
                details: { 
                    errors: validationErrors,
                    received_payload: payload,
                    admin_user: adminUser?.email
                }
            }, { status: 400 });
        }

        console.log("✓ Validation passed");

        // שלב 4: עדכון plan_type — מחפשים את ה-User לפי email ואז מעדכנים
        try {
            const users = await base44.asServiceRole.entities.User.filter({ email: user_email }, '-created_date', 1);
            if (!users || users.length === 0) {
                return Response.json({ ok: false, error_code: "USER_NOT_FOUND", message: `משתמש ${user_email} לא נמצא` }, { status: 404 });
            }
            const userId = users[0].id;
            await base44.asServiceRole.entities.User.update(userId, {
                plan_type: plan_type
            });
            console.log(`✓ User ${user_email} updated to ${plan_type}`);
        } catch (updateError) {
            console.error("✗ Update failed:", {
                message: updateError.message,
                stack: updateError.stack,
                user_email,
                plan_type
            });
            return Response.json({ 
                ok: false,
                error_code: "UPDATE_FAILED",
                message: "כשל בעדכון המשתמש",
                details: { 
                    error: updateError.message,
                    error_type: updateError.name,
                    stack: updateError.stack,
                    user_email,
                    plan_type,
                    admin_user: adminUser?.email
                }
            }, { status: 500 });
        }

        return Response.json({ 
            ok: true,
            message: `המשתמש ${user_email} עודכן ל-${plan_type}`,
            user: {
                email: user_email,
                plan_type: plan_type
            }
        });

    } catch (error) {
        console.error("✗ UNEXPECTED ERROR:", {
            message: error.message,
            stack: error.stack,
            name: error.name,
            payload,
            admin: adminUser?.email,
            auth_state: authState
        });
        
        return Response.json({ 
            ok: false,
            error_code: "INTERNAL_ERROR",
            message: "שגיאה לא צפויה בשרת",
            details: { 
                error: error.message,
                error_type: error.name,
                stack: error.stack,
                payload_received: payload,
                admin_user: adminUser?.email || "none",
                auth_state: authState
            }
        }, { status: 500 });
    }
});