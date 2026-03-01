import { createClient } from 'npm:@base44/sdk@0.1.0';

const base44 = createClient({
    appId: Deno.env.get('BASE44_APP_ID'),
});

Deno.serve(async (req) => {
    try {
        const { origin } = await req.json();
        
        // אימות המשתמש
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response('Unauthorized', { status: 401 });
        }
        const token = authHeader.split(' ')[1];
        base44.auth.setToken(token);
        const user = await base44.auth.me();
        if (!user) {
            return new Response('Unauthorized', { status: 401 });
        }

        const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
        const REDIRECT_URI = `https://lidup.co.il/functions/googlecallback`;

        // קידוד האימייל וה-origin המקורי בתוך ה-state
        const statePayload = {
            email: user.email,
            origin: origin || 'https://app-lid-up-08cf2617.base44.app'
        };
        const encodedState = btoa(JSON.stringify(statePayload));

        // יצירת URL לאימות עם Google
        const params = new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            redirect_uri: REDIRECT_URI,
            response_type: 'code',
            scope: 'https://www.googleapis.com/auth/calendar',
            access_type: 'offline',
            prompt: 'consent',
            state: encodedState
        });

        const authUrl = `https://accounts.google.com/o/oauth2/auth?${params.toString()}`;

        return new Response(JSON.stringify({ authUrl }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error in googleAuth:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});