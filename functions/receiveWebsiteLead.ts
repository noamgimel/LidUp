import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        // קריאת הנתונים מהבקשה
        const raw = await req.json();
        console.log('=== Webhook Received ===');
        console.log('Raw Payload:', JSON.stringify(raw, null, 2));

        // תמיכה במבני JSON שונים - Wix עוטף תחת data
        const payload = raw?.data ?? raw;
        console.log('Extracted Payload:', JSON.stringify(payload, null, 2));

        // מיפוי שדות - אם יש body_message ואין notes
        if (payload.body_message && !payload.notes) {
            payload.notes = payload.body_message;
        }

        // בדיקת שדות חובה
        const receivedKeys = Object.keys(payload);
        console.log('Received keys:', receivedKeys);

        if (!payload.form_id) {
            console.log('ERROR: Missing form_id');
            return Response.json({ 
                error: 'Missing required field: form_id',
                received_keys: receivedKeys
            }, { status: 400 });
        }

        if (!payload.secret_key) {
            console.log('ERROR: Missing secret_key');
            return Response.json({ 
                error: 'Missing required field: secret_key',
                received_keys: receivedKeys
            }, { status: 400 });
        }

        if (!payload.name) {
            console.log('ERROR: Missing name');
            return Response.json({ 
                error: 'Missing required field: name',
                received_keys: receivedKeys
            }, { status: 400 });
        }

        if (!payload.email) {
            console.log('ERROR: Missing email');
            return Response.json({ 
                error: 'Missing required field: email',
                received_keys: receivedKeys
            }, { status: 400 });
        }
        
        console.log('✓ All required fields present');

        // יצירת client מהבקשה עם service role
        const base44 = createClientFromRequest(req);

        // חיפוש הטופס במערכת לפי form_id
        console.log('Searching for form_id:', payload.form_id);
        const formConnections = await base44.asServiceRole.entities.FormConnection.filter({
            form_id: payload.form_id,
            is_active: true
        });

        if (!formConnections || formConnections.length === 0) {
            console.log('ERROR: Form not found or inactive for form_id:', payload.form_id);
            return Response.json({ 
                error: 'Form not found or inactive',
                form_id: payload.form_id
            }, { status: 404 });
        }

        const formConnection = formConnections[0];
        console.log('✓ Form found:', formConnection.form_name, 'Owner:', formConnection.owner_email);

        // אימות secret_key של החיבור הספציפי
        console.log('Validating secret_key...');
        if (payload.secret_key !== formConnection.secret_key) {
            console.log('ERROR: Invalid secret_key. Expected:', formConnection.secret_key, 'Got:', payload.secret_key);
            return Response.json({ 
                error: 'Unauthorized: Invalid secret_key for this form'
            }, { status: 401 });
        }
        console.log('✓ Secret key validated');

        // הכנת נתוני הליד - ייווצר תחת owner_email של חיבור הטופס
        const leadData = {
            name: payload.name,
            email: payload.email,
            phone: payload.phone || '',
            company: payload.company || '',
            notes: payload.notes || payload.message || '',
            status: 'lead',
            source: `Website Form - ${formConnection.form_name}`,
            form_id: payload.form_id,
            page_url: payload.page_url || '',
            raw_payload: raw,  // שמירת הPayload המקורי לדיבוג
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
        console.log('Creating lead for user:', formConnection.owner_email);
        console.log('Lead data to create:', { name: leadData.name, email: leadData.email, phone: leadData.phone });
        const newLead = await base44.asServiceRole.entities.Client.create({
            ...leadData,
            created_by: formConnection.owner_email
        });
        console.log('✅✅✅ SUCCESS! Lead created for user:', formConnection.owner_email);
        console.log('Lead ID:', newLead.id, '| Name:', newLead.name, '| Email:', newLead.email);

        // עדכון מונה השליחות בטופס
        await base44.asServiceRole.entities.FormConnection.update(formConnection.id, {
            submissions_count: (formConnection.submissions_count || 0) + 1,
            last_submission_at: new Date().toISOString()
        });
        console.log('✓ Form connection updated');

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