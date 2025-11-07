import { createClient } from 'npm:@base44/sdk@0.1.0';
import Papa from 'npm:papaparse@5.4.1';
import * as XLSX from 'npm:xlsx@0.18.5';

const base44 = createClient({
    appId: Deno.env.get('BASE44_APP_ID'),
});

Deno.serve(async (req) => {
    try {
        // Authentication
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 });
        }
        base44.auth.setToken(authHeader.split(' ')[1]);
        
        const user = await base44.auth.me();
        if (!user) {
            return new Response(JSON.stringify({ success: false, error: 'User not found' }), { status: 401 });
        }

        const { file_url, fileName } = await req.json();

        const fileResponse = await fetch(file_url);
        if (!fileResponse.ok) {
            throw new Error('Failed to fetch the uploaded file.');
        }
        const buffer = await fileResponse.arrayBuffer();
        
        let rows = [];
        let headers = [];

        // Parse based on file type
        if (fileName.toLowerCase().endsWith('.csv')) {
            try {
                // Try UTF-8 first
                let text = new TextDecoder('utf-8').decode(buffer);
                let result = Papa.parse(text, { 
                    header: true, 
                    skipEmptyLines: true,
                    delimiter: '', // Auto-detect delimiter
                    transformHeader: (header) => header.trim()
                });
                
                // If parsing failed or looks wrong, try Windows-1255
                if (result.errors.length > 0 || result.data.length === 0) {
                    text = new TextDecoder('windows-1255').decode(buffer);
                    result = Papa.parse(text, { 
                        header: true, 
                        skipEmptyLines: true,
                        delimiter: '', // Auto-detect delimiter
                        transformHeader: (header) => header.trim()
                    });
                }
                
                rows = result.data;
                headers = result.meta.fields || [];
            } catch (csvError) {
                throw new Error('שגיאה בפענוח קובץ CSV. ודא שהקובץ תקין.');
            }
        } else if (fileName.toLowerCase().match(/\.(xlsx|xls)$/)) {
            const workbook = XLSX.read(buffer, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            rows = XLSX.utils.sheet_to_json(worksheet, { defval: "", raw: false });
            headers = rows.length > 0 ? Object.keys(rows[0]).map(h => h.trim()) : [];
        } else {
            throw new Error('פורמט קובץ לא נתמך. השתמש בקבצי Excel (.xlsx, .xls) או CSV.');
        }

        if (rows.length > 10000) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: 'הקובץ מכיל יותר מ-10,000 שורות. אנא פצל אותו לקבצים קטנים יותר.' 
            }), { status: 400 });
        }

        return new Response(JSON.stringify({ 
            success: true, 
            headers: headers.filter(h => h && h.trim()), 
            rows: rows.slice(0, 100), // Return first 100 rows for preview
            totalRows: rows.length
        }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' } 
        });

    } catch (error) {
        console.error("Error in parseImportFile:", error);
        return new Response(JSON.stringify({ 
            success: false, 
            error: error.message || 'שגיאה בפענוח הקובץ' 
        }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }
});