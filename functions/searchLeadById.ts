import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // אימות אדמין בלבד
        const user = await base44.auth.me();
        if (!user || user.email !== 'noam.gamliel@gmail.com') {
            return Response.json({ ok: false, error: 'Unauthorized: Admin access required' }, { status: 403 });
        }

        const { lead_id } = await req.json();

        if (!lead_id) {
            return Response.json({ ok: false, error: 'Missing lead_id parameter' }, { status: 400 });
        }

        // חיפוש הליד דרך service role - get() לפי ID
        let lead = null;
        try {
            lead = await base44.asServiceRole.entities.Client.get(lead_id);
        } catch (e) {
            // לא נמצא
        }

        if (!lead) {
            return Response.json({ ok: false, error_code: 'NOT_FOUND', message: 'לא נמצא ליד עם המזהה שהוזן' }, { status: 404 });
        }

        return Response.json({ ok: true, lead });

    } catch (error) {
        console.error('Error in searchLeadById:', error);
        return Response.json({ ok: false, error: 'Internal server error', details: error.message }, { status: 500 });
    }
});