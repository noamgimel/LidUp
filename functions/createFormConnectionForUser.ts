import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const adminUser = await base44.auth.me();

        // בדיקה שהמשתמש המבקש הוא אדמין
        if (!adminUser || adminUser.email !== 'noam.gamliel@gmail.com') {
            return Response.json({ 
                error: 'Forbidden: רק אדמין יכול ליצור חיבורים עבור משתמשים אחרים' 
            }, { status: 403 });
        }

        const payload = await req.json();
        const { userEmail, formData } = payload;

        console.log("=== בקשה ליצירת חיבור טופס ===");
        console.log("Admin:", adminUser.email);
        console.log("Target User Email:", userEmail);
        console.log("Form Data Received:", JSON.stringify(formData, null, 2));

        // בדיקת שדות חובה
        if (!userEmail) {
            return Response.json({ 
                error: 'חסר שדה חובה: userEmail' 
            }, { status: 400 });
        }

        if (!formData || !formData.form_name || !formData.form_id) {
            return Response.json({ 
                error: 'חסרים שדות חובה בנתוני הטופס: form_name, form_id' 
            }, { status: 400 });
        }

        // הכנת הנתונים ליצירה - הוספת owner_email במקום created_by
        const connectionData = {
            ...formData,
            owner_email: userEmail
        };

        console.log("Connection Data to Create:", JSON.stringify(connectionData, null, 2));

        // יצירת החיבור עם service role (עוקף RLS)
        const result = await base44.asServiceRole.entities.FormConnection.create(connectionData);

        console.log("✅ החיבור נוצר בהצלחה:", result.id);

        return Response.json({ 
            success: true, 
            connection: result 
        });

    } catch (error) {
        console.error("❌ שגיאה ביצירת חיבור טופס");
        console.error("Error Type:", error.constructor.name);
        console.error("Error Message:", error.message);
        console.error("Stack:", error.stack);
        
        return Response.json({ 
            error: error.message || 'Failed to create form connection',
            details: error.toString()
        }, { status: 500 });
    }
});