import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X, ShieldAlert, Crown, Users as UsersIcon } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import PremiumUsersManager from "../components/premium/PremiumUsersManager";

export default function PremiumManagement() {
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    setIsLoading(true);
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);
      
      // בדיקת הרשאות Admin
      if (user.email !== 'noam.gamliel@gmail.com') {
        setIsAuthorized(false);
        setIsLoading(false);
        toast({
          title: "גישה נדחתה",
          description: "אין לך הרשאה לצפות בעמוד זה",
          variant: "destructive",
        });
        return;
      }
      
      setIsAuthorized(true);
    } catch (error) {
      console.error("שגיאה בבדיקת הרשאות:", error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לאמת את ההרשאות",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="px-4 pt-20 pb-4 sm:px-6 md:p-8 min-h-screen flex items-center justify-center">
        <p className="text-slate-500">טוען...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="px-4 pt-20 pb-4 sm:px-6 md:p-8 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">גישה נדחתה</h2>
          <p className="text-slate-600">אין לך הרשאה לצפות בעמוד זה. עמוד זה מיועד למנהלי המערכת בלבד.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-20 pb-4 sm:px-6 md:p-8 space-y-4 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">ניהול משתמשי פרימיום</h1>
            <p className="text-slate-600">נהל משתמשים, שדרג לפרימיום וצור חיבורי טפסים</p>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
          <div className="flex gap-3">
            <Crown className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-purple-900">
              <p className="font-semibold mb-1">ניהול מסלולים</p>
              <p>רק משתמשי פרימיום יכולים לקבל חיבורי טפסים לאתרים שלהם. שדרג משתמש לפרימיום כדי לאפשר לו ליצור חיבורי טפסים וקבל לידים אוטומטית.</p>
            </div>
          </div>
        </div>

        {/* Users Management */}
        <div className="mt-6">
          <PremiumUsersManager />
        </div>
      </div>
    </div>
  );
}