import { createClient } from 'npm:@base44/sdk@0.1.0';

const base44 = createClient({
    appId: Deno.env.get('BASE44_APP_ID'),
});

Deno.serve(async (req) => {
    console.log("🚀 googlecallback handler invoked!");
    
    try {
        const url = new URL(req.url);
        const code = url.searchParams.get('code');
        const encodedState = url.searchParams.get('state');
        const error = url.searchParams.get('error');

        console.log("📥 Received parameters:", { 
            hasCode: !!code, 
            hasEncodedState: !!encodedState, 
            error: error 
        });

        let origin, userEmail;
        if (encodedState) {
            const statePayload = JSON.parse(atob(encodedState));
            origin = statePayload.origin;
            userEmail = statePayload.email;
            console.log("📋 Decoded state:", { origin, userEmail });
        } else {
            throw new Error("State parameter is missing");
        }
        
        const finalRedirectPage = new URL('/GoogleAuthSuccess', origin);

        if (error) {
            console.log("❌ Google returned error:", error);
            finalRedirectPage.searchParams.set('error', error);
            return Response.redirect(finalRedirectPage.toString(), 302);
        }

        if (!code || !userEmail) {
            console.log("❌ Missing required data:", { hasCode: !!code, hasUserEmail: !!userEmail });
            finalRedirectPage.searchParams.set('error', 'Missing code or user identification');
            return Response.redirect(finalRedirectPage.toString(), 302);
        }
        
        const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
        const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
        const REDIRECT_URI = `https://lidup.co.il/functions/googlecallback`;

        console.log("🔄 Exchanging code for tokens...");
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                code,
                grant_type: 'authorization_code',
                redirect_uri: REDIRECT_URI,
            }),
        });

        const tokens = await tokenResponse.json();
        console.log("🎟️ Token exchange result:", { 
            success: tokenResponse.ok, 
            hasAccessToken: !!tokens.access_token,
            hasRefreshToken: !!tokens.refresh_token,
            error: tokens.error 
        });

        if (!tokenResponse.ok || !tokens.access_token) {
            throw new Error(`Failed to get access token: ${tokens.error_description || 'Unknown error'}`);
        }

        console.log("💾 Updating user in database...");
        const updateResult = await base44.entities.User.update(
            { email: userEmail },
            {
                google_calendar_access_token: tokens.access_token,
                google_calendar_refresh_token: tokens.refresh_token || null,
                google_calendar_connected: true,
                google_calendar_connected_at: new Date().toISOString()
            }
        );
        console.log("✅ User update completed:", updateResult);

        // הפניה לדף ההצלחה באותו origin
        finalRedirectPage.searchParams.set('success', 'true');
        console.log("🔄 Redirecting to success page:", finalRedirectPage.toString());
        return Response.redirect(finalRedirectPage.toString(), 302);

    } catch (err) {
        console.error('❌ Error in googleCallback:', err);
        // במקרה של שגיאה - נפנה לדף שגיאה
        const errorPage = new URL('/GoogleAuthSuccess', 'https://app-lid-up-08cf2617.base44.app');
        errorPage.searchParams.set('error', err.message);
        return Response.redirect(errorPage.toString(), 302);
    }
});