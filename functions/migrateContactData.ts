/**
 * Migration: תיקון נתונים קיימים
 * - first_response_at = תאריך Activity הכי מוקדם מסוג first_response
 * - last_contact_at = תאריך Activity הכי מאוחר מסוג first_response או contact
 * Admin-only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    try {
        const user = await base44.auth.me();
        if (user?.role !== 'admin') {
            return Response.json({ ok: false, error: 'Admin only' }, { status: 403 });
        }

        console.log('[migrateContactData] Starting migration...');

        // Get all leads
        const leads = await base44.asServiceRole.entities.Client.list('-created_date', 1000);
        console.log(`[migrateContactData] Found ${leads.length} leads`);

        let updated = 0;
        let skipped = 0;
        const errors = [];

        for (const lead of leads) {
            try {
                // Get all activities for this lead
                const activities = await base44.asServiceRole.entities.LeadActivity.filter(
                    { lead_id: lead.id },
                    'created_date',
                    500
                );

                const contactActivities = activities.filter(a =>
                    a.event_type === 'first_response' || a.event_type === 'contact'
                );

                if (contactActivities.length === 0) {
                    // אין Activities — השאר first_response_at כמו שהוא, קבע last_contact_at = first_response_at
                    if (lead.first_response_at && !lead.last_contact_at) {
                        await base44.asServiceRole.entities.Client.update(lead.id, {
                            last_contact_at: lead.first_response_at
                        });
                        updated++;
                    } else {
                        skipped++;
                    }
                    continue;
                }

                // מיין לפי תאריך
                const sorted = contactActivities.sort((a, b) =>
                    new Date(a.created_date) - new Date(b.created_date)
                );

                const earliestContactDate = sorted[0].created_date;
                const latestContactDate = sorted[sorted.length - 1].created_date;

                const updatePayload = {};

                // first_response_at = הכי מוקדם (רק אם צריך לתקן)
                if (!lead.first_response_at || lead.first_response_at !== earliestContactDate) {
                    updatePayload.first_response_at = earliestContactDate;
                }

                // last_contact_at = הכי מאוחר
                if (!lead.last_contact_at || lead.last_contact_at !== latestContactDate) {
                    updatePayload.last_contact_at = latestContactDate;
                }

                if (Object.keys(updatePayload).length > 0) {
                    await base44.asServiceRole.entities.Client.update(lead.id, updatePayload);
                    updated++;
                    console.log(`[migrateContactData] Updated lead ${lead.id} (${lead.name}): ${JSON.stringify(updatePayload)}`);
                } else {
                    skipped++;
                }

            } catch (err) {
                errors.push({ lead_id: lead.id, error: err.message });
                console.error(`[migrateContactData] Error for lead ${lead.id}: ${err.message}`);
            }
        }

        console.log(`[migrateContactData] Done. updated=${updated} skipped=${skipped} errors=${errors.length}`);
        return Response.json({ ok: true, total: leads.length, updated, skipped, errors });

    } catch (error) {
        console.error('[migrateContactData] FATAL:', error.message);
        return Response.json({ ok: false, error: error.message }, { status: 500 });
    }
});