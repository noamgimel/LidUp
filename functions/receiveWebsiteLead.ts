import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        // בדיקת אבטחה - secret_key
        const url = new URL(req.url);
        const secretKey = url.searchParams.get('secret_key');
        const expectedSecret = Deno.env.get('WEBHOOK_SECRET_KEY');

        if (!expectedSecret) {
            return Response.json({ 
                error: 'Server configuration error: WEBHOOK_SECRET_KEY not set' 
            }, { status: 500 });
        }

        if (!secretKey || secretKey !== expectedSecret) {
            return Response.json({ 
                error: 'Unauthorized: Invalid or missing secret_key' 
            }, { status: 401 });
        }

        // קריאת הנתונים מהבקשה
        const payload = await req.json();

        // בדיקת שדות חובה
        if (!payload.name || !payload.email) {
            return Response.json({ 
                error: 'Missing required fields: name and email are required' 
            }, { status: 400 });
        }

        if (!payload.form_id) {
            return Response.json({ 
                error: 'Missing required field: form_id is required' 
            }, { status: 400 });
        }

        // יצירת client מהבקשה עם service role
        const base44 = createClientFromRequest(req);

        // חיפוש הטופס במערכת לפי form_id כדי למצוא את המשתמש הנכון
        const formConnections = await base44.asServiceRole.entities.FormConnection.filter({
            form_id: payload.form_id,
            is_active: true
        });

        if (!formConnections || formConnections.length === 0) {
            return Response.json({ 
                error: 'Form not found or inactive' 
            }, { status: 404 });
        }

        const formConnection = formConnections[0];
        const targetUserEmail = formConnection.user_email;

        // הכנת נתוני הליד
        const leadData = {
            name: payload.name,
            email: payload.email,
            phone: payload.phone || '',
            company: payload.company || '',
            notes: payload.notes || payload.message || '',
            status: 'lead',
            source: 'Website Form',
            form_id: payload.form_id,
            page_url: payload.page_url || '',
            raw_payload: payload,
            utm_source: payload.utm_source || '',
            utm_medium: payload.utm_medium || '',
            utm_campaign: payload.utm_campaign || '',
            utm_content: payload.utm_content || '',
            utm_term: payload.utm_term || '',
            consent_marketing: payload.consent_marketing || false,
            submission_date: new Date().toISOString(),
            ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || ''
        };

        // יצירת הליד תחת המשתמש הנכון באמצעות created_by
        // נשתמש ב-service role כדי ליצור את הליד עבור המשתמש
        const newLead = await base44.asServiceRole.entities.Client.create({
            ...leadData,
            created_by: targetUserEmail
        });

        // עדכון מונה הלידים בטופס
        await base44.asServiceRole.entities.FormConnection.update(formConnection.id, {
            leads_received: (formConnection.leads_received || 0) + 1,
            last_lead_date: new Date().toISOString()
        });

        return Response.json({ 
            success: true,
            message: 'Lead created successfully',
            lead_id: newLead.id
        }, { status: 200 });

    } catch (error) {
        console.error('Error in receiveWebsiteLead:', error);
        return Response.json({ 
            error: 'Internal server error',
            details: error.message 
        }, { status: 500 });
    }
});