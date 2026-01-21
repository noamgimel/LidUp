import React from "react";
import WorkStageManager from "../components/clients/WorkStageManager";
import WorkspaceAuthGuard from "../components/auth/WorkspaceAuthGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Info, Settings as SettingsIcon, ClipboardList } from "lucide-react";

export default function Settings() {
  return (
    <WorkspaceAuthGuard>
    <div className="px-3 pt-20 pb-4 sm:px-6 md:p-8 space-y-4 md:space-y-6 min-h-screen rtl-text">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-xl md:text-3xl font-bold text-slate-900 mb-2">הגדרות מערכת</h1>
          <p className="text-sm md:text-base text-slate-600">התאם אישית את המערכת לצרכים שלך</p>
        </div>

        {/* Info Card */}
        <Card className="mb-6 md:mb-8 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardHeader className="pb-3 p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 text-blue-900 text-sm md:text-base">
              <Info className="w-4 h-4 md:w-5 md:h-5" />
              מידע חשוב
            </CardTitle>
          </CardHeader>
          <CardContent className="text-blue-800 p-4 md:p-6 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-1 gap-4 text-xs md:text-sm">
              <div>
                <h4 className="font-semibold mb-2">שלבי עבודה:</h4>
                <ul className="space-y-1">
                  <li>• התאם את שלבי העבודה לתהליך העסקי שלך</li>
                  <li>• שנה את סדר השלבים בעזרת החצים</li>
                  <li>• ניתן למחוק שלבים מסוימים אם אין בהם לקוחות פעילים</li>
                  <li>• שלבי העבודה יעזרו לך לעקוב אחר התקדמות הלקוחות</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Settings Grid - Only Work Stages now */}
        <div className="max-w-4xl mx-auto">
          <div className="space-y-3 md:space-y-4">
            <div className="flex items-center gap-3 mb-3 md:mb-4">
              <div className="p-1.5 md:p-2 bg-purple-100 rounded-lg">
                <ClipboardList className="w-4 h-4 md:w-5 md:h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg md:text-xl font-bold text-slate-900">שלבי עבודה</h2>
                <p className="text-xs md:text-sm text-slate-600">התאם את תהליך העבודה עם הלקוחות</p>
              </div>
            </div>
            <WorkStageManager />
          </div>
        </div>
      </div>
    </div>
    </WorkspaceAuthGuard>
  );
}