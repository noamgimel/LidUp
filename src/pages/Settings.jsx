import React, { useState, useEffect } from "react";
import WorkStageManager from "../components/clients/WorkStageManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Info, ClipboardList, MessageCircle, Save, RotateCcw } from "lucide-react";
import { base44 } from "@/api/base44Client";

const DEFAULT_TEMPLATE = "אהלן {{lead_name}}, תודה שפנית אלינו 🙂 אשמח לעזור לך. אפשר לשאול במה מדובר?";

function WhatsAppTemplateSettings() {
  const [template, setTemplate] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    base44.auth.me().then(u => {
      setTemplate(u?.whatsapp_template || "");
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await base44.auth.updateMe({ whatsapp_template: template });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => setTemplate("");

  const preview = (template || DEFAULT_TEMPLATE).replace(/\{\{lead_name\}\}/g, "ישראל ישראלי");

  return (
    <Card>
      <CardContent className="p-4 md:p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">תבנית ההודעה</label>
          <Textarea
            value={template}
            onChange={e => setTemplate(e.target.value)}
            placeholder={DEFAULT_TEMPLATE}
            className="min-h-[90px] text-right"
            dir="rtl"
          />
          <p className="text-xs text-slate-400 mt-1">השתמש ב-<code className="bg-slate-100 px-1 rounded">{"{{lead_name}}"}</code> כדי להכניס את שם הליד אוטומטית. אם השדה ריק — תשמש תבנית ברירת מחדל.</p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-green-700 mb-1">תצוגה מקדימה:</p>
          <p className="text-sm text-green-900">{preview}</p>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700 gap-2">
            <Save className="w-4 h-4" />
            {saving ? "שומר..." : saved ? "נשמר ✓" : "שמור תבנית"}
          </Button>
          <Button variant="outline" onClick={handleReset} className="gap-2 text-slate-500">
            <RotateCcw className="w-4 h-4" />
            איפוס לברירת מחדל
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Settings() {
  return (
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
                <h4 className="font-semibold mb-2">שלבי מכירה:</h4>
                <ul className="space-y-1">
                  <li>• התאם את שלבי המכירה לתהליך העסקי שלך</li>
                  <li>• שנה את סדר השלבים בעזרת החצים</li>
                  <li>• ניתן למחוק שלבים מסוימים אם אין בהם לקוחות פעילים</li>
                  <li>• שלבי המכירה יעזרו לך לעקוב אחר התקדמות הלקוחות</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="max-w-4xl mx-auto space-y-8">
          {/* WhatsApp Template */}
          <div className="space-y-3 md:space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-1.5 md:p-2 bg-green-100 rounded-lg">
                <MessageCircle className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg md:text-xl font-bold text-slate-900">תבנית הודעת וואטסאפ</h2>
                <p className="text-xs md:text-sm text-slate-600">הודעה שתישלח אוטומטית לליד בלחיצה על כפתור וואטסאפ</p>
              </div>
            </div>
            <WhatsAppTemplateSettings />
          </div>

          {/* Work Stages */}
          <div className="space-y-3 md:space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-1.5 md:p-2 bg-purple-100 rounded-lg">
                <ClipboardList className="w-4 h-4 md:w-5 md:h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg md:text-xl font-bold text-slate-900">שלבי מכירה</h2>
                <p className="text-xs md:text-sm text-slate-600">התאם את תהליך המכירה עם הלקוחות</p>
              </div>
            </div>
            <WorkStageManager />
          </div>
        </div>
      </div>
    </div>
  );
}