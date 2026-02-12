import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // אימות אדמין
        const adminUser = await base44.auth.me();
        
        if (!adminUser || adminUser.email !== 'noam.gamliel@gmail.com') {
            return Response.json({ 
                ok: false,
                error_code: "FORBIDDEN",
                message: "רק אדמין מורשה יכול לקרוא את כל החיבורים"
            }, { status: 403 });
        }

        // קריאה עם service role - עוקף RLS
        console.log("=== Attempting to read all FormConnections ===");
        const allConnections = await base44.asServiceRole.entities.FormConnection.list();
        console.log("=== Found connections:", allConnections.length);
        console.log("=== Connections data:", JSON.stringify(allConnections, null, 2));

        return Response.json({ 
            ok: true,
            connections: allConnections,
            count: allConnections.length
        });

    } catch (error) {
        console.error("Error:", error);
        return Response.json({ 
            ok: false,
            error_code: "INTERNAL_ERROR",
            message: error.message
        }, { status: 500 });
    }
});