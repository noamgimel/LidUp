import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    try {
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { test_lead_id } = await req.json();
        
        const results = {};

        // 1. Test updateWorkStage
        try {
            const updateRes = await fetch('http://localhost/api/functions/updateWorkStage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lead_id: test_lead_id, stage_id: 'proposal_sent', stage_label: 'הצעה נשלחה' })
            });
            const updateData = await updateRes.json();
            results.updateWorkStage = { status: updateRes.status, data: updateData };
        } catch (e) {
            results.updateWorkStage = { error: e.message };
        }

        // 2. Test markFirstContact
        try {
            const firstRes = await fetch('http://localhost/api/functions/markFirstContact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lead_id: test_lead_id })
            });
            const firstData = await firstRes.json();
            results.markFirstContact = { status: firstRes.status, data: firstData };
        } catch (e) {
            results.markFirstContact = { error: e.message };
        }

        // 3. Test scheduleFollowup
        try {
            const schedRes = await fetch('http://localhost/api/functions/scheduleFollowup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    lead_id: test_lead_id, 
                    datetime: '2026-03-10T10:00:00Z', 
                    note: 'בדיקה' 
                })
            });
            const schedData = await schedRes.json();
            results.scheduleFollowup = { status: schedRes.status, data: schedData };
        } catch (e) {
            results.scheduleFollowup = { error: e.message };
        }

        // 4. Test markFollowupDone
        try {
            const doneRes = await fetch('http://localhost/api/functions/markFollowupDone', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lead_id: test_lead_id })
            });
            const doneData = await doneRes.json();
            results.markFollowupDone = { status: doneRes.status, data: doneData };
        } catch (e) {
            results.markFollowupDone = { error: e.message };
        }

        return Response.json({ results });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});