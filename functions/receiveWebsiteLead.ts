import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        // קריאת הנתונים מהבקשה
        const payload = await req.json();

        // בדיקת שדות חובה
        if (!payload.form_id) {
            return Response.json({ 
                error: 'Missing required field: form_id is required' 
            }, { status: 400 });
        }

        if (!payload.secret_key) {
            return Response.json({ 
                error: 'Missing required field: secret_key is required' 
            }, { status: 400 });
        }

        if (!payload.name || !payload.email) {
            return Response.json({ 
                error: 'Missing required fields: name and email are required' 
            }, { status: 400 });
        }

        // יצירת client מהבקשה עם service role
        const base44 = createClientFromRequest(req);

        // חיפוש הטופס במערכת לפי form_id
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

        // אימות secret_key של החיבור הספציפי
        if (payload.secret_key !== formConnection.secret_key) {
            return Response.json({ 
                error: 'Unauthorized: Invalid secret_key for this form' 
            }, { status: 401 });
        }

        // הכנת נתוני הליד - ייווצר תחת owner_email של חיבור הטופס
        const leadData = {
            name: payload.name,
            email: payload.email,
            phone: payload.phone || '',
            company: payload.company || '',
            notes: payload.notes || payload.message || payload.body_message || '',
            status: 'lead',
            source: `Website Form - ${formConnection.form_name}`,
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

        // יצירת הליד תחת owner_email של חיבור הטופס
        const newLead = await base44.asServiceRole.entities.Client.create({
            ...leadData,
            created_by: formConnection.owner_email
        });

        // עדכון מונה השליחות בטופס
        await base44.asServiceRole.entities.FormConnection.update(formConnection.id, {
            submissions_count: (formConnection.submissions_count || 0) + 1,
            last_submission_at: new Date().toISOString()
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