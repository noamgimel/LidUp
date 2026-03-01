import { createClient } from 'npm:@base44/sdk@0.1.0';
import Papa from 'npm:papaparse@5.4.1';
import * as XLSX from 'npm:xlsx@0.18.5';

const base44 = createClient({
    appId: Deno.env.get('BASE44_APP_ID'),
});

// Status normalization - הכי פשוט וברור
const normalizeStatus = (statusValue) => {
    // אם אין ערך כלל - תמיד ליד
    if (!statusValue || statusValue === null || statusValue === undefined) {
        return 'lead';
    }
    
    const str = String(statusValue).trim().toLowerCase();
    
    // אם זה ריק - תמיד ליד
    if (!str || str === '' || str === 'null' || str === 'undefined') {
        return 'lead';
    }
    
    // בדיקות פשוטות - ללא ניואנסים מורכבים
    if (str.includes('חם') || str.includes('hot')) {
        return 'hot_lead';
    }
    
    if (str.includes('לקוח') || str.includes('client') || str.includes('customer')) {
        return 'client';
    }
    
    if (str.includes('לא פעיל') || str.includes('inactive') || str.includes('לשעבר')) {
        return 'inactive';
    }
    
    // כל השאר (כולל Lead, Prospect, ליד וכו') -> lead
    return 'lead';
};

const normalizePhone = (phone) => {
    if (!phone) return null;
    let cleanPhone = String(phone).replace(/\D/g, '');
    if (cleanPhone.startsWith('972')) {
        cleanPhone = '0' + cleanPhone.substring(3);
    }
    if (cleanPhone.length === 9 && !cleanPhone.startsWith('0')) {
        cleanPhone = '0' + cleanPhone;
    }
    return cleanPhone.length >= 9 ? cleanPhone : null;
};

Deno.serve(async (req) => {
    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ success: false, details: 'Unauthorized' }), { status: 401 });
        }
        base44.auth.setToken(authHeader.split(' ')[1]);
        
        const user = await base44.auth.me();
        if (!user) {
            return new Response(JSON.stringify({ success: false, details: 'User not found' }), { status: 401 });
        }

        const { 
            file_url, 
            fileName, 
            mappings,
            stageMapping = {},
            overwritePolicy = false
        } = await req.json();

        console.log('Import request:', { fileName, mappings, stageMapping });

        // 1. Fetch and Parse File
        const fileResponse = await fetch(file_url);
        if (!fileResponse.ok) {
            throw new Error(`Failed to fetch file: ${fileResponse.status}`);
        }
        const buffer = await fileResponse.arrayBuffer();
        
        let rows = [];
        if (fileName.toLowerCase().endsWith('.csv')) {
            const text = new TextDecoder('utf-8').decode(buffer);
            rows = Papa.parse(text, { header: true, skipEmptyLines: true }).data;
        } else {
            const workbook = XLSX.read(buffer, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "", raw: false });
        }

        console.log(`Parsed ${rows.length} rows`);

        // 2. Get existing data and work stages
        const [existingClients, userWorkStagesRes] = await Promise.all([
            base44.entities.Client.filter({ created_by: user.email }),
            base44.entities.UserCustomWorkStages.filter({ user_email: user.email })
        ]);
        
        const userWorkStages = userWorkStagesRes[0]?.custom_work_stages || [];
        console.log('Available work stages:', userWorkStages.map(s => s.label));
        
        // Create lookup maps for duplicates
        const emailMap = new Map();
        const phoneMap = new Map();
        
        existingClients.forEach(client => {
            if (client.email) {
                emailMap.set(client.email.toLowerCase().trim(), client);
            }
            if (client.phone) {
                phoneMap.set(client.phone, client);
            }
        });

        const results = { 
            created: 0, 
            updated: 0, 
            skipped: 0, 
            errors: [],
            statusStats: { 
                convertedToLead: 0,
                conversions: {} // Track specific conversions
            },
            workStageStats: { mapped: 0, defaulted: 0 }
        };

        // 3. Process rows
        for (const [index, row] of rows.entries()) {
            try {
                const clientData = {};
                
                // Map data based on the provided mappings
                Object.entries(mappings).forEach(([field, header]) => {
                    if (header && header !== 'dont_map' && row[header] !== undefined) {
                        let value = row[header];
                        
                        if (field === 'phone') {
                            value = normalizePhone(value);
                        } else if (field === 'status') {
                            const originalStatus = String(value || '').trim();
                            value = normalizeStatus(value);
                            
                            console.log(`Row ${index + 1}: Status "${originalStatus}" -> "${value}"`);
                            
                            // Track status conversions for reporting
                            if (originalStatus && originalStatus.toLowerCase() !== value.toLowerCase()) {
                                if (!results.statusStats.conversions[originalStatus]) {
                                    results.statusStats.conversions[originalStatus] = 0;
                                }
                                results.statusStats.conversions[originalStatus]++;
                                results.statusStats.convertedToLead++;
                            }
                        } else if (field === 'work_stage') {
                            // Handle work stage mapping
                            if (value && stageMapping[value]) {
                                const mapping = stageMapping[value];
                                if (mapping.type === 'existing' && mapping.id) {
                                    value = mapping.id;
                                    results.workStageStats.mapped++;
                                } else {
                                    value = 'initial_contact';
                                    results.workStageStats.defaulted++;
                                }
                            } else if (value) {
                                // Try to find existing stage by label
                                const existingStage = userWorkStages.find(s => 
                                    s.label.toLowerCase().trim() === String(value).toLowerCase().trim()
                                );
                                if (existingStage) {
                                    value = existingStage.id;
                                    results.workStageStats.mapped++;
                                } else {
                                    value = 'initial_contact';
                                    results.workStageStats.defaulted++;
                                }
                            } else {
                                value = 'initial_contact';
                                results.workStageStats.defaulted++;
                            }
                        } else if (typeof value === 'string') {
                            value = value.trim();
                        }
                        
                        // אל תדלג על שום ערך - גם אם הוא ריק, עדיף לשמור אותו
                        if (value !== null && value !== undefined) {
                            clientData[field] = value;
                        }
                    }
                });

                // Validate required field - רק שם מלא הוא חובה
                if (!clientData.name || String(clientData.name).trim() === '') {
                    results.errors.push({ 
                        rowData: { ...row, _rowNumber: index + 2 }, 
                        reason: 'שם מלא חסר או ריק' 
                    });
                    results.skipped++;
                    continue;
                }

                // וידוא שיש ערכי ברירת מחדל תמיד
                if (!clientData.work_stage) {
                    clientData.work_stage = 'initial_contact';
                    results.workStageStats.defaulted++;
                }

                if (!clientData.status) {
                    clientData.status = 'lead';
                }

                console.log(`Processing row ${index + 1}:`, {
                    name: clientData.name,
                    status: clientData.status,
                    work_stage: clientData.work_stage
                });

                // Check for duplicates
                let existingClient = null;
                if (clientData.email) {
                    existingClient = emailMap.get(clientData.email.toLowerCase().trim());
                }
                if (!existingClient && clientData.phone) {
                    existingClient = phoneMap.get(clientData.phone);
                }
                
                if (existingClient) {
                    // Update existing client
                    const updateData = { ...clientData };
                    if (!overwritePolicy) {
                        // Only update empty fields
                        Object.keys(updateData).forEach(key => {
                            if (existingClient[key] && String(existingClient[key]).trim() !== '') {
                                delete updateData[key];
                            }
                        });
                    }
                    
                    if (Object.keys(updateData).length > 0) {
                        await base44.entities.Client.update(existingClient.id, updateData);
                        results.updated++;
                        console.log(`Updated client: ${existingClient.name}`);
                    }
                } else {
                    // Create new client
                    const newClient = {
                        ...clientData,
                        source: `ייבוא - ${fileName}`,
                    };
                    
                    console.log('Creating new client:', newClient);
                    await base44.entities.Client.create(newClient);
                    results.created++;
                }
                
            } catch (error) {
                console.error(`Error processing row ${index + 1}:`, error);
                results.errors.push({ 
                    rowData: { ...row, _rowNumber: index + 2 }, 
                    reason: `שגיאת מערכת: ${error.message}` 
                });
                results.skipped++;
            }
        }

        console.log('Final import results:', results);

        return new Response(JSON.stringify({ success: true, ...results }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Import error:', error);
        return new Response(JSON.stringify({ 
            success: false, 
            details: error.message || 'שגיאה בייבוא הנתונים' 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});