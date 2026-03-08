import React, { useState, useEffect, useRef } from "react";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Zap, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  Settings,
  Plug,
  Copy,
  Info,
  Loader2,
  Crown,
  Bell
} from "lucide-react";
import { createPageUrl } from "@/utils";

import { googleAuth } from '@/functions/googleAuth';

export default function Integrations() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const pollingIntervalRef = useRef(null);

  useEffect(() => {
    loadUser();
    
    // Cleanup interval on component unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const loadUser = async () => {
    try {
      const user = await User.me();
      setCurrentUser(user);
    } catch (error) {
      console.error("שגיאה בטעינת משתמש:", error);
      setCurrentUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleCalendarConnect = async () => {
    if (isConnecting) return;
    setIsConnecting(true);
    
    try {
      const response = await googleAuth({ origin: window.location.origin });
      
      if (response.data?.authUrl) {
        window.open(
          response.data.authUrl,
          'google-auth',
          'width=500,height=600,scrollbars=yes,resizable=yes'
        );

        // Start polling for connection status
        pollingIntervalRef.current = setInterval(async () => {
          try {
            const updatedUser = await User.me();
            if (updatedUser.google_calendar_connected) {
              clearInterval(pollingIntervalRef.current);
              setCurrentUser(updatedUser);
              setIsConnecting(false);
            }
          } catch (err) {
            // Ignore polling errors
          }
        }, 3000);

        // Timeout for polling after 5 minutes (safety net)
        setTimeout(() => {
          if (pollingIntervalRef.current) { // Only clear if still polling
            clearInterval(pollingIntervalRef.current);
            setIsConnecting(false);
          }
        }, 5 * 60 * 1000); // 5 minutes

      } else {
        alert('שגיאה: לא התקבל קישור אימות משרת.');
        setIsConnecting(false); // No auth URL, reset state
      }
    } catch (error) {
      console.error('Error connecting to Google Calendar:', error);
      alert('שגיאה בהתחברות ליומן Google');
      setIsConnecting(false); // Error during initial auth call, reset state
    }
  };
  
  const integrations = [
    {
      id: "notifications",
      name: "התראות",
      description: "קבל התראות אוטומטיות במייל על לידים חדשים וחריגות SLA.",
      icon: "bell",
      status: "available",
      features: [
        "התראה מיידית על ליד חדש",
        "התראה על ליד ללא מענה (חריגת SLA 30 דקות)",
        "מייל בדיקה לאימות הגדרות",
        "מוכן להרחבה לערוצים נוספים"
      ],
      color: "blue",
      hasSettings: true,
      settingsPage: "NotificationSettingsPage"
    },
    {
      id: "website-forms",
      name: "חיבורי האתר",
      description: "חיבור טפסים מהאתר לקליטה אוטומטית של לידים למערכת, בזמן אמת.",
      icon: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/233c624f0_.png",
      status: "premium",
      features: [
        "קליטת לידים אוטומטית מטפסים באתר",
        "שמירת מקור הפנייה ושדות הטופס",
        "התחלת עבודה מיידית בלי איבוד לידים"
      ],
      color: "blue",
      hasSettings: true
    },
    {
      id: "google-calendar",
      name: "Google Calendar",
      description: "סנכרן את כל הפגישות שלך עם יומן Google באופן אוטומטי",
      icon: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/379e7a253_Google_Calendar_icon_2020svg.png",
      status: "premium",
      features: [
        "יצירת פגישות אוטומטית ביומן Google",
        "שליחת זימונים אוטומטית ללקוחות", 
        "סנכרון אוטומטי של הפגישות שלך בלבד",
        "התראות ותזכורות אוטומטיות"
      ],
      color: "blue"
    },
    {
      id: "whatsapp",
      name: "WhatsApp Business",
      description: "שלח הודעות ועדכונים ללקוחות דרך WhatsApp",
      icon: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/afb871e56_whatsapp-icon.png",
      status: "premium",
      features: [
        "הודעות אוטומטיות ללקוחות חדשים",
        "תזכורות לפגישות", 
        "עדכונים על סטטוס פרויקטים",
        "שירות לקוחות משופר"
      ],
      color: "green"
    }
  ];

  const getStatusBadge = (status) => {
    switch(status) {
      case "connected":
        return <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" />מחובר</Badge>;
      case "available":
        return <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" />זמין לכולם</Badge>;
      case "premium":
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200"><Zap className="w-3 h-3 mr-1" />פרימיום</Badge>;
      default:
        return null;
    }
  };

  const getActionButton = (integration) => {
    const isPremium = currentUser?.plan_type === 'PREMIUM' || currentUser?.email === 'noam.gamliel@gmail.com';

    // כרטיס התראות – זמין לכולם
    if (integration.status === "available" && integration.hasSettings) {
      return (
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => window.location.href = createPageUrl(integration.settingsPage)}
          className="gap-2"
        >
          <Settings className="w-3 h-3" />
          הגדרות
        </Button>
      );
    }
    
    if (integration.status === "premium") {
      if (isPremium && integration.hasSettings) {
        return (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.location.href = createPageUrl('WebsiteConnections')}
            className="gap-2"
          >
            <Settings className="w-3 h-3" />
            הגדרות
          </Button>
        );
      }
      return (
        <div className="flex flex-col items-end gap-1">
          <Button 
            variant="outline" 
            size="sm" 
            disabled={!isPremium}
            className={!isPremium ? "opacity-60" : ""}
            onClick={() => {
              if (isPremium && !integration.hasSettings) {
                window.location.href = 'mailto:noam.gamliel@gmail.com?subject=בקשה לחיבור אינטגרציה';
              }
            }}
          >
            {isPremium ? (
              <><Zap className="w-3 h-3 mr-1" />התחבר</>
            ) : (
              <><Crown className="w-3 h-3 mr-1" />שדרג לפרימיום</>
            )}
          </Button>
          {!isPremium && <span className="text-xs text-purple-600">זמין למשתמשי פרימיום</span>}
        </div>
      );
    }
    return (
      <Button variant="outline" size="sm" disabled>בפיתוח</Button>
    );
  };

  const getColorClasses = (color) => {
    const colors = {
      blue: "from-blue-500 to-blue-600 bg-blue-50 text-blue-600",
      orange: "from-orange-500 to-orange-600 bg-orange-50 text-orange-600", 
      green: "from-green-500 to-green-600 bg-green-50 text-green-600"
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="px-4 pt-20 pb-4 sm:px-6 md:p-8 space-y-6 min-h-screen rtl-text">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">אינטגרציות</h1>
          <p className="text-slate-600">חבר את לידUp לכלים האהובים עליך והפוך את העבודה לאוטומטית</p>
        </div>

        {/* Premium Notice */}
        <Card className="mb-8 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Zap className="w-6 h-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-purple-900 mb-2">האינטגרציות זמינות למשתמשי פרימיום</h3>
                <p className="text-purple-800 mb-3">רוצים להתחבר? דברו איתי במייל:</p>
                <a 
                  href="mailto:noam.gamliel@gmail.com" 
                  className="inline-flex items-center gap-2 text-purple-700 hover:text-purple-900 font-medium transition-colors"
                >
                  <span>noam.gamliel@gmail.com</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Integration Cards */}
        <div className="grid gap-6 md:gap-8">
          {integrations.map((integration) => {
            const Icon = integration.icon;
            const colorClasses = getColorClasses(integration.color);
            
            return (
              <Card key={integration.id} className="shadow-lg border-slate-200 hover:shadow-xl transition-all duration-300">
                <CardHeader className="border-b border-slate-100 p-4 md:p-6">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {typeof Icon === 'string' ? (
                        <img src={Icon} alt={`${integration.name} logo`} className="w-12 h-12 rounded-lg" />
                      ) : (
                        <div className={`p-3 rounded-xl bg-gradient-to-br ${colorClasses.split(' ')[0]} ${colorClasses.split(' ')[1]}`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                      )}
                      <div>
                        <CardTitle className="text-lg md:text-xl font-bold text-slate-900">{integration.name}</CardTitle>
                        <p className="text-slate-600 mt-1 text-sm">{integration.description}</p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto self-start md:self-center">
                      {getStatusBadge(integration.status)}
                      {getActionButton(integration)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 md:p-6">
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-3">תכונות עיקריות:</h4>
                    <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
                      {integration.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2 text-slate-700">
                          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Help Section */}
        <Card className="mt-8 bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
          <CardContent className="p-6 md:p-8 text-center">
            <div className="max-w-2xl mx-auto">
              <h3 className="text-xl font-bold text-slate-900 mb-4">זקוק לעזרה עם האינטגרציות?</h3>
              <p className="text-slate-600 mb-6">
                אנחנו כאן לעזור לך להגדיר ולהתאים את האינטגרציות שלך בצורה המושלמת עבור הצרכים שלך.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="outline" className="gap-2">
                  <ExternalLink className="w-4 h-4" />
                  מדריך התקנה
                </Button>
                <Button variant="outline" className="gap-2">
                  <Settings className="w-4 h-4" />
                  יצירת קשר לתמיכה
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}