
import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';
import Papa from 'npm:papaparse@5.4.1'; // Fix: Import the default export

// Helper function to create mapping from ID to Label
const createLabelMap = (items) => {
    if (!items || !Array.isArray(items)) return {};
    return items.reduce((acc, item) => {
        if (item && item.id && item.label) {
            acc[item.id] = item.label;
        }
        return acc;
    }, {});
};

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Authenticate user
        const user = await base44.auth.me();
        if (!user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        // Fetch all necessary data
        const [clients, statusesRes, workStagesRes] = await Promise.all([
            base44.entities.Client.filter({ created_by: user.email }),
            base44.entities.UserCustomStatuses.filter({ user_email: user.email }),
            base44.entities.UserCustomWorkStages.filter({ user_email: user.email })
        ]);
        
        // Create label mappings for statuses and work stages
        const statusMap = createLabelMap(statusesRes[0]?.custom_statuses);
        const workStageMap = createLabelMap(workStagesRes[0]?.custom_work_stages);

        // Prepare data for CSV export
        const dataToExport = clients.map(client => ({
            "שם מלא": client.name || '',
            "חברה": client.company || '',
            "אימייל": client.email || '',
            "טלפון": client.phone || '',
            "כתובת": client.address || '',
            "סטטוס": statusMap[client.status] || client.status || '',
            "שלב עבודה": workStageMap[client.work_stage] || client.work_stage || '',
            "סכום עסקה": client.total_value || 0,
            "שולם": client.paid || 0,
            "הערות": client.notes || '',
            "מקור": client.source || '',
            "תאריך יצירה": client.created_date ? new Date(client.created_date).toLocaleString('he-IL') : ''
        }));

        // Convert JSON to CSV using Papaparse
        const csv = Papa.unparse(dataToExport); // Fix: Use Papa.unparse

        // Return the CSV as a file download
        return new Response(csv, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="clients-export-${new Date().toISOString().split('T')[0]}.csv"`
            }
        });

    } catch (error) {
        console.error('Error exporting clients:', error);
        return new Response(JSON.stringify({ error: 'Failed to export clients', details: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});
