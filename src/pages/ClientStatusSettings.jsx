import React from "react";
import StatusManager from "../components/clients/StatusManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Info } from "lucide-react";

export default function ClientStatusSettings() {
  return (
    <div className="px-4 pt-20 pb-4 sm:px-6 md:p-8 space-y-6 min-h-screen rtl-text">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">הגדרות סטטוסי לקוחות</h1>
          <p className="text-slate-600">התאם אישית את סטטוסי הלקוחות שלך</p>
        </div>

        {/* Info Card */}
        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Info className="w-5 h-5" />
              מידע חשוב
            </CardTitle>
          </CardHeader>
          <CardContent className="text-blue-800">
            <ul className="space-y-2 text-sm">
              <li>• תוכל לערוך את שמות הסטטוסים הקיימים או להוסיף סטטוסים חדשים</li>
              <li>• שינויים יחולו על כל הלקוחות החדשים והקיימים</li>
              <li>• הסטטוסים החדשים יופיעו בכל הדוחות והפילטרים</li>
              <li>• לא ניתן למחוק סטטוסים בסיסיים (ליד, ליד חם, לקוח, לא פעיל)</li>
            </ul>
          </CardContent>
        </Card>

        {/* Status Manager */}
        <StatusManager />

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
              <Link to={createPageUrl("Statistics")}>
                <Button variant="outline">
                  צפה בדוחות
                </Button>
              </Link>
              <Link to={createPageUrl("AdvancedReports")}>
                <Button variant="outline">
                  דוחות מתקדמים
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}