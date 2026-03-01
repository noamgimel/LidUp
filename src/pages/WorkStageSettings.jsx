import React from "react";
import WorkStageManager from "../components/clients/WorkStageManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Info, ClipboardList } from "lucide-react";

export default function WorkStageSettings() {
  return (
    <div className="px-4 pt-20 pb-4 sm:px-6 md:p-8 space-y-6 min-h-screen rtl-text">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">הגדרות שלבי מכירה</h1>
          <p className="text-slate-600">התאם אישית את שלבי המכירה של הלידים שלך</p>
        </div>

        {/* Info Card */}
        <Card className="mb-6 bg-purple-50 border-purple-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-purple-900">
              <Info className="w-5 h-5" />
              מידע חשוב
            </CardTitle>
          </CardHeader>
          <CardContent className="text-purple-800">
            <ul className="space-y-2 text-sm">
              <li>• תוכל לערוך את שמות שלבי המכירה הקיימים או להוסיף שלבים חדשים</li>
              <li>• השתמש בחצים כדי לשנות את סדר השלבים</li>
              <li>• לא ניתן למחוק שלבים שיש בהם לקוחות פעילים</li>
              <li>• שלבי המכירה יופיעו בכל הדוחות והפילטרים</li>
              <li>• כל שלב יכול לקבל צבע ייחודי לזיהוי קל</li>
            </ul>
          </CardContent>
        </Card>

        {/* Work Stage Manager */}
        <WorkStageManager />

        {/* Quick Actions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>פעולות מהירות</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Link to={createPageUrl("Clients")}>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  עבור לניהול לקוחות
                </Button>
              </Link>
              <Link to={createPageUrl("ClientStatusSettings")}>
                <Button variant="outline">
                  הגדרות סטטוסים
                </Button>
              </Link>
              <Link to={createPageUrl("Reports")}>
                <Button variant="outline">
                  צפה בדוחות
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}