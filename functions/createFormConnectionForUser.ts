import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// פונקציות עזר ליצירת IDs ייחודיים
const generateFormId = () => {
    return 'form_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
};

const generateSecretKey = () => {
    return 'sk_' + Math.random().toString(36).substr(2, 16) + Math.random().toString(36).substr(2, 16);
};

Deno.serve(async (req) => {
    const startTime = Date.now();
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
                stack: authError.stack,
                headers: Object.fromEntries(req.headers.entries())
            });
            return Response.json({ 
                ok: false,
                error_code: "AUTH_FAILED",
                message: "כשל באימות משתמש - אין סשן פעיל",
                details: { 
                    error: authError.message,
                    auth_state: authState,
                    hint: "ייתכן שהבעיה היא cross-origin או חוסר credentials"
                }
            }, { status: 401 });
        }

        if (!adminUser || adminUser.email !== 'noam.gamliel@gmail.com') {
            console.error("✗ Not admin:", adminUser?.email);
            return Response.json({ 
                ok: false,
                error_code: "FORBIDDEN",
                message: "רק אדמין מורשה יכול ליצור חיבורים",
                details: { 
                    current_user: adminUser?.email,
                    auth_state: authState
                }
            }, { status: 403 });
        }

        // שלב 2: קריאת Payload
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

        const { userEmail, form_name, platform_type, notes, client_id, client_name } = payload;

        // שלב 3: בדיקות תקינות - רק השדות שה-UI צריך לשלוח
        const validationErrors = [];
        
        if (!userEmail) {
            validationErrors.push("userEmail חסר");
        }
        if (!form_name) {
            validationErrors.push("form_name חסר");
        }
        if (!platform_type) {
            validationErrors.push("platform_type חסר");
        }
        
        // בדיקת enum
        const validPlatforms = ['WIX', 'WORDPRESS', 'HTML_CODE', 'OTHER'];
        if (platform_type && !validPlatforms.includes(platform_type)) {
            validationErrors.push(`platform_type לא תקין: ${platform_type}. חייב להיות אחד מ: ${validPlatforms.join(', ')}`);
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

        // שלב 4: יצירת IDs ומפתחות בשרת (לא סומכים על UI)
        const formId = generateFormId();
        const secretKey = generateSecretKey();
        const origin = req.headers.get('origin') || req.headers.get('referer') || 'https://lidup.co.il';
        const webhookUrl = `${origin}/api/functions/receiveWebsiteLead`;

        // שלב 5: הכנת נתוני החיבור
        const connectionData = {
            form_id: formId,
            form_name: form_name,
            owner_email: userEmail,
            platform_type: platform_type,
            secret_key: secretKey,
            webhook_url: webhookUrl,
            is_active: true,
            submissions_count: 0,
            notes: notes || ""
        };

        // client_id אופציונלי - רק אם קיים
        if (client_id) {
            connectionData.client_id = client_id;
            connectionData.client_name = client_name || "";
        }

        console.log("✓ Connection data prepared:", JSON.stringify(connectionData, null, 2));

        // שלב 6: יצירה ב-DB
        let result;
        try {
            result = await base44.asServiceRole.entities.FormConnection.create(connectionData);
            console.log("✓ DB Create success:", result.id);
        } catch (dbError) {
            console.error("✗ DB Create failed:", {
                message: dbError.message,
                stack: dbError.stack,
                name: dbError.name,
                connectionData
            });
            
            return Response.json({ 
                ok: false,
                error_code: "DB_CREATE_FAILED",
                message: "כשל ביצירת החיבור במסד הנתונים",
                details: { 
                    error: dbError.message,
                    error_type: dbError.name,
                    stack: dbError.stack,
                    data_sent: connectionData,
                    admin_user: adminUser?.email
                }
            }, { status: 500 });
        }

        const duration = Date.now() - startTime;
        console.log(`✓ Success! Duration: ${duration}ms`);

        return Response.json({ 
            ok: true,
            connection: result,
            duration_ms: duration
        });

    } catch (error) {
        const duration = Date.now() - startTime;
        console.error("✗ UNEXPECTED ERROR:", {
            message: error.message,
            stack: error.stack,
            name: error.name,
            payload,
            admin: adminUser?.email,
            auth_state: authState,
            duration_ms: duration
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