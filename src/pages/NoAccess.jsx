import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, Mail, LogOut } from "lucide-react";

export default function NoAccess() {
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setUserEmail(user.email);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
              <ShieldAlert className="w-10 h-10 text-red-600" />
            </div>
          </div>
          <CardTitle className="text-center text-2xl">אין לך גישה למערכת</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center text-slate-600">
            <p className="mb-4">החשבון שלך אינו משויך לאף Workspace במערכת.</p>
            <p>כדי לקבל גישה, פנה למנהל המערכת וציין את כתובת המייל שלך:</p>
          </div>

          {userEmail && (
            <div className="bg-slate-100 p-4 rounded-lg">
              <div className="flex items-center justify-center gap-2 text-slate-800">
                <Mail className="w-4 h-4" />
                <code className="font-mono text-sm">{userEmail}</code>
              </div>
            </div>
          )}

          <div className="text-center text-sm text-slate-500">
            <p>לאחר שהמנהל יוסיף אותך ל-Workspace, תוכל להתחבר שוב ולהשתמש במערכת.</p>
          </div>

          <div className="flex justify-center pt-4">
            <Button
              onClick={handleLogout}
              variant="outline"
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              התנתק
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}