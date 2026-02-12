import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    const startTime = Date.now();
    let payload = null;
    let adminUser = null;
    
    try {
        const base44 = createClientFromRequest(req);
        
        // שלב 1: אימות אדמין
        try {
            adminUser = await base44.auth.me();
            console.log("✓ Admin authenticated:", adminUser?.email);
        } catch (authError) {
            console.error("✗ Auth failed:", authError.message);
            return Response.json({ 
                ok: false,
                error_code: "AUTH_FAILED",
                message: "כשל באימות משתמש",
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
            console.error("✗ JSON parse failed:", parseError.message);
            return Response.json({ 
                ok: false,
                error_code: "INVALID_JSON",
                message: "נתונים לא תקינים",
                details: { error: parseError.message }
            }, { status: 400 });
        }

        const { userEmail, formData } = payload;

        // שלב 3: בדיקות תקינות
        const validationErrors = [];
        
        if (!userEmail) {
            validationErrors.push("userEmail חסר");
        }
        if (!formData) {
            validationErrors.push("formData חסר");
        } else {
            if (!formData.form_name) validationErrors.push("form_name חסר");
            if (!formData.form_id) validationErrors.push("form_id חסר");
            if (!formData.secret_key) validationErrors.push("secret_key חסר");
            if (!formData.platform_type) validationErrors.push("platform_type חסר");
            
            // בדיקת enum
            const validPlatforms = ['WIX', 'WORDPRESS', 'HTML_CODE', 'OTHER'];
            if (formData.platform_type && !validPlatforms.includes(formData.platform_type)) {
                validationErrors.push(`platform_type לא תקין: ${formData.platform_type}. חייב להיות אחד מ: ${validPlatforms.join(', ')}`);
            }
        }

        if (validationErrors.length > 0) {
            console.error("✗ Validation failed:", validationErrors);
            return Response.json({ 
                ok: false,
                error_code: "VALIDATION_FAILED",
                message: "שדות חובה חסרים או לא תקינים",
                details: { 
                    errors: validationErrors,
                    received_payload: payload
                }
            }, { status: 400 });
        }

        console.log("✓ Validation passed");

        // שלב 4: הכנת נתוני החיבור
        const connectionData = {
            form_id: formData.form_id,
            form_name: formData.form_name,
            owner_email: userEmail,
            platform_type: formData.platform_type,
            secret_key: formData.secret_key,
            webhook_url: formData.webhook_url,
            is_active: formData.is_active ?? true,
            submissions_count: formData.submissions_count ?? 0,
            notes: formData.notes || ""
        };

        // client_id אופציונלי - רק אם קיים
        if (formData.client_id) {
            connectionData.client_id = formData.client_id;
            connectionData.client_name = formData.client_name || "";
        }

        console.log("✓ Connection data prepared:", JSON.stringify(connectionData, null, 2));

        // שלב 5: יצירה ב-DB
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
                    data_sent: connectionData
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
            duration_ms: duration
        });
        
        return Response.json({ 
            ok: false,
            error_code: "INTERNAL_ERROR",
            message: "שגיאה לא צפויה בשרת",
            details: { 
                error: error.message,
                error_type: error.name,
                payload_received: payload,
                stack: error.stack
            }
        }, { status: 500 });
    }
});