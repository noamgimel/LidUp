import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// URL קבוע של Production - תמיד
const PRODUCTION_BASE_URL = 'https://lidup.co.il';
const WEBHOOK_PATH = '/api/functions/receiveWebsiteLead';

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
            console.error("✗ Auth failed:", authError.message);
            return Response.json({ 
                ok: false,
                error_code: "AUTH_FAILED",
                message: "כשל באימות משתמש - אין סשן פעיל",
                details: { error: authError.message }
            }, { status: 401 });
        }

        if (!adminUser || adminUser.email !== 'noam.gamliel@gmail.com') {
            console.error("✗ Not admin:", adminUser?.email);
            return Response.json({ 
                ok: false,
                error_code: "FORBIDDEN",
                message: "רק אדמין מורשה יכול ליצור חיבורים",
                details: { current_user: adminUser?.email }
            }, { status: 403 });
        }

        // שלב 2: קריאת Payload
        try {
            payload = await req.json();
            console.log("✓ Payload received:", JSON.stringify(payload, null, 2));
        } catch (parseError) {
            return Response.json({ 
                ok: false,
                error_code: "INVALID_JSON",
                message: "נתונים לא תקינים",
                details: { error: parseError.message }
            }, { status: 400 });
        }

        const { userEmail, form_name, platform_type, notes, client_id, client_name } = payload;

        // שלב 3: בדיקות תקינות
        const validationErrors = [];
        if (!userEmail) validationErrors.push("userEmail חסר");
        if (!form_name) validationErrors.push("form_name חסר");
        if (!platform_type) validationErrors.push("platform_type חסר");
        
        const validPlatforms = ['WIX', 'WORDPRESS', 'HTML_CODE', 'OTHER'];
        if (platform_type && !validPlatforms.includes(platform_type)) {
            validationErrors.push(`platform_type לא תקין: ${platform_type}`);
        }

        if (validationErrors.length > 0) {
            return Response.json({ 
                ok: false,
                error_code: "VALIDATION_FAILED",
                message: "שדות חובה חסרים או לא תקינים",
                details: { errors: validationErrors }
            }, { status: 400 });
        }

        // שלב 4: יצירת IDs - Webhook URL תמיד מפנה ל-Production
        const formId = generateFormId();
        const secretKey = generateSecretKey();
        const webhookUrl = `${PRODUCTION_BASE_URL}${WEBHOOK_PATH}`;

        console.log("✓ Production Webhook URL:", webhookUrl);

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
            console.error("✗ DB Create failed:", dbError.message);
            return Response.json({ 
                ok: false,
                error_code: "DB_CREATE_FAILED",
                message: "כשל ביצירת החיבור במסד הנתונים",
                details: { error: dbError.message }
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
        console.error("✗ UNEXPECTED ERROR:", error.message);
        return Response.json({ 
            ok: false,
            error_code: "INTERNAL_ERROR",
            message: "שגיאה לא צפויה בשרת",
            details: { error: error.message }
        }, { status: 500 });
    }
});