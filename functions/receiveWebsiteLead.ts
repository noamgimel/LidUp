import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// מחלץ ערך משדה עם שמות שונים אפשריים
function extractField(payload, ...keys) {
    for (const key of keys) {
        if (payload[key] !== undefined && payload[key] !== null && payload[key] !== '') {
            return payload[key];
        }
    }
    // ניסיון לחפש לפי prefix (Wix משתמש ב field:name_1 וכו')
    for (const key of keys) {
        for (const payloadKey of Object.keys(payload)) {
            if (payloadKey.toLowerCase().includes(key.toLowerCase()) && payload[payloadKey]) {
                return payload[payloadKey];
            }
        }
    }
    return '';
}

Deno.serve(async (req) => {
    try {
        // קריאת הנתונים מהבקשה
        let raw;
        const contentType = req.headers.get('content-type') || '';
        
        if (contentType.includes('application/json')) {
            raw = await req.json();
        } else if (contentType.includes('application/x-www-form-urlencoded')) {
            const text = await req.text();
            const params = new URLSearchParams(text);
            raw = Object.fromEntries(params.entries());
        } else {
            // ננסה JSON ראשון, אחר כך text
            const text = await req.text();
            try {
                raw = JSON.parse(text);
            } catch {
                raw = { raw_text: text };
            }
        }
        
        console.log('=== Webhook Received ===');
        console.log('Content-Type:', contentType);
        console.log('Raw Payload:', JSON.stringify(raw, null, 2));

        // תמיכה במבני JSON שונים:
        // 1. Wix Automation עוטף תחת "data"
        // 2. שליחה ישירה (flat)
        const payload = raw?.data ?? raw;
        console.log('Extracted Payload:', JSON.stringify(payload, null, 2));
        console.log('Received keys:', Object.keys(payload));

        // חילוץ form_id ו-secret_key
        const form_id = extractField(payload, 'form_id');
        const secret_key = extractField(payload, 'secret_key');
        
        // חילוץ שם ואימייל עם מגוון שמות שדות אפשריים (Wix/WordPress/HTML)
        const name = extractField(payload, 
            'name', 'full_name', 'fullName', 'contact_name',
            'field:name', 'field:name_1', 'field:full_name_1'
        );
        const email = extractField(payload,
            'email', 'email_address', 'emailAddress', 'contact_email',
            'field:email', 'field:email_1', 'field:email_address_1'
        );
        const phone = extractField(payload,
            'phone', 'phone_number', 'phoneNumber', 'mobile', 'tel',
            'field:phone', 'field:phone_1', 'field:phone_number_1'
        );
        const notes = extractField(payload,
            'notes', 'message', 'body_message', 'comment', 'description',
            'field:message', 'field:message_1'
        );

        console.log('Extracted fields:', { form_id, secret_key, name, email, phone });

        // בדיקת שדות חובה
        if (!form_id) {
            console.log('ERROR: Missing form_id');
            return Response.json({ error: 'Missing required field: form_id', received_keys: Object.keys(payload) }, { status: 400 });
        }
        if (!secret_key) {
            console.log('ERROR: Missing secret_key');
            return Response.json({ error: 'Missing required field: secret_key', received_keys: Object.keys(payload) }, { status: 400 });
        }
        if (!name) {
            console.log('ERROR: Missing name. Payload:', JSON.stringify(payload));
            return Response.json({ error: 'Missing required field: name', received_keys: Object.keys(payload), payload }, { status: 400 });
        }
        if (!email) {
            console.log('ERROR: Missing email. Payload:', JSON.stringify(payload));
            return Response.json({ error: 'Missing required field: email', received_keys: Object.keys(payload), payload }, { status: 400 });
        }
        
        console.log('✓ All required fields present');

        // יצירת client מהבקשה עם service role
        const base44 = createClientFromRequest(req);

        // חיפוש הטופס במערכת לפי form_id
        console.log('Searching for form_id:', form_id);
        const formConnections = await base44.asServiceRole.entities.FormConnection.filter({
            form_id: form_id,
            is_active: true
        });

        if (!formConnections || formConnections.length === 0) {
            console.log('ERROR: Form not found or inactive for form_id:', form_id);
            return Response.json({ error: 'Form not found or inactive', form_id }, { status: 404 });
        }

        const formConnection = formConnections[0];
        console.log('✓ Form found:', formConnection.form_name, 'Owner:', formConnection.owner_email);

        // אימות secret_key
        if (secret_key !== formConnection.secret_key) {
            console.log('ERROR: Invalid secret_key');
            return Response.json({ error: 'Unauthorized: Invalid secret_key for this form' }, { status: 401 });
        }
        console.log('✓ Secret key validated');

        // הכנת נתוני הליד
        const pageUrl = extractField(payload, 'page_url', 'pageUrl', 'url', 'referer') || '';
        const leadData = {
            name,
            email,
            phone,
            company: extractField(payload, 'company', 'business', 'organization') || '',
            notes,
            status: 'lead',
            source: 'website_form',
            form_id,
            form_name: formConnection.form_name,
            page_url: pageUrl,
            raw_payload: raw,
            utm_source: extractField(payload, 'utm_source') || '',
            utm_medium: extractField(payload, 'utm_medium') || '',
            utm_campaign: extractField(payload, 'utm_campaign') || '',
            utm_content: extractField(payload, 'utm_content') || '',
            utm_term: extractField(payload, 'utm_term') || '',
            consent_marketing: payload.consent_marketing || false,
            submission_date: new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jerusalem" })).toISOString(),
            ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '',
            owner_email: formConnection.owner_email
        };

        console.log('Creating lead for user:', formConnection.owner_email);
        const newLead = await base44.asServiceRole.entities.Client.create(leadData);
        console.log('✅ SUCCESS! Lead created:', newLead.id, '| owner_email:', newLead.owner_email);

        // יצירת Activity אוטומטי
        await base44.asServiceRole.entities.LeadActivity.create({
            lead_id: newLead.id,
            event_type: 'created',
            content: `ליד נקלט מטופס: ${formConnection.form_name}${pageUrl ? ` | דף: ${pageUrl}` : ''}`,
            created_by_email: formConnection.owner_email
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