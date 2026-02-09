import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const adminUser = await base44.auth.me();

        // בדיקה שהמשתמש המבקש הוא אדמין
        if (!adminUser || adminUser.email !== 'noam.gamliel@gmail.com') {
            return Response.json({ 
                error: 'Forbidden: Admin access required' 
            }, { status: 403 });
        }

        const payload = await req.json();
        const { userEmail, formData } = payload;

        if (!userEmail || !formData) {
            return Response.json({ 
                error: 'Missing required fields: userEmail, formData' 
            }, { status: 400 });
        }

        console.log("=== יצירת חיבור טופס ===");
        console.log("Admin:", adminUser.email);
        console.log("Target User:", userEmail);
        console.log("Form Data:", formData);

        // יצירת החיבור עם service role
        const result = await base44.asServiceRole.entities.FormConnection.create({
            ...formData,
            created_by: userEmail
        });

        console.log("תוצאת היצירה:", result);

        return Response.json({ 
            success: true, 
            connection: result 
        });

    } catch (error) {
        console.error("=== שגיאה ביצירת חיבור טופס ===");
        console.error("Error:", error.message);
        console.error("Stack:", error.stack);
        
        return Response.json({ 
            error: error.message || 'Failed to create form connection' 
        }, { status: 500 });
    }
});