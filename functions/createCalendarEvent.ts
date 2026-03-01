import { createClient } from 'npm:@base44/sdk@0.1.0';

const base44 = createClient({
    appId: Deno.env.get('BASE44_APP_ID'),
});

async function refreshGoogleToken(refreshToken) {
    const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');

    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
        }),
    });

    return await response.json();
}

async function createGoogleCalendarEvent(accessToken, eventData) {
    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Google Calendar API error: ${error}`);
    }

    return await response.json();
}

Deno.serve(async (req) => {
    try {
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

        // קבלת נתוני הפגישה
        const meetingData = await req.json();

        // בדיקה שהמשתמש מחובר ליומן Google
        if (!user.google_calendar_connected || !user.google_calendar_access_token) {
            return new Response(JSON.stringify({ 
                success: false, 
                message: 'User not connected to Google Calendar' 
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        let accessToken = user.google_calendar_access_token;

        // נסה ליצור את האירוע
        try {
            // הכנת נתוני האירוע
            const startDateTime = meetingData.startDateTime || `${meetingData.date}T${meetingData.time}:00+03:00`;
            const endTime = meetingData.endDateTime || 
                new Date(new Date(startDateTime).getTime() + (meetingData.duration || 60) * 60000).toISOString();

            const eventData = {
                summary: meetingData.title,
                description: meetingData.notes || '',
                location: meetingData.location || '',
                start: {
                    dateTime: startDateTime,
                    timeZone: 'Asia/Jerusalem',
                },
                end: {
                    dateTime: endTime,
                    timeZone: 'Asia/Jerusalem',
                },
                attendees: meetingData.client_email ? [
                    { email: meetingData.client_email }
                ] : [],
                reminders: {
                    useDefault: true
                }
            };

            const event = await createGoogleCalendarEvent(accessToken, eventData);

            return new Response(JSON.stringify({ 
                success: true, 
                eventId: event.id,
                eventLink: event.htmlLink 
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });

        } catch (error) {
            // אם הטוקן פג, נסה לרענן אותו
            if (error.message.includes('401') && user.google_calendar_refresh_token) {
                try {
                    const newTokens = await refreshGoogleToken(user.google_calendar_refresh_token);
                    
                    if (newTokens.access_token) {
                        // עדכון הטוקן החדש
                        await base44.entities.User.update(
                            { email: user.email },
                            { google_calendar_access_token: newTokens.access_token }
                        );

                        // נסה שוב עם הטוקן החדש
                        const eventData = {
                            summary: meetingData.title,
                            description: meetingData.notes || '',
                            location: meetingData.location || '',
                            start: {
                                dateTime: startDateTime,
                                timeZone: 'Asia/Jerusalem',
                            },
                            end: {
                                dateTime: endTime,
                                timeZone: 'Asia/Jerusalem',
                            },
                            attendees: meetingData.client_email ? [
                                { email: meetingData.client_email }
                            ] : [],
                            reminders: {
                                useDefault: true
                            }
                        };

                        const event = await createGoogleCalendarEvent(newTokens.access_token, eventData);

                        return new Response(JSON.stringify({ 
                            success: true, 
                            eventId: event.id,
                            eventLink: event.htmlLink 
                        }), {
                            status: 200,
                            headers: { 'Content-Type': 'application/json' }
                        });
                    }
                } catch (refreshError) {
                    console.error('Token refresh failed:', refreshError);
                }
            }

            throw error;
        }

    } catch (error) {
        console.error('Error creating calendar event:', error);
        return new Response(JSON.stringify({ 
            success: false, 
            error: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});