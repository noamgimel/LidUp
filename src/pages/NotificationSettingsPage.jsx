import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Bell, Mail, ArrowRight, Loader2, CheckCircle2, AlertCircle, Send, Info } from "lucide-react";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";

const BUILD_STAMP = 'notifications-email-fix-20260308-1400';

const DEFAULT_SETTINGS = {
  enabled: true,
  email_enabled: true,
  notify_new_lead: true,
  notify_sla_breach: true
};

export default function NotificationSettingsPage() {
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [settingsId, setSettingsId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState(null); // 'success' | 'error'
  const [testError, setTestError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const t0 = performance.now();
    setIsLoading(true);
    try {
      // שלב 1: auth.me
      const t1 = performance.now();
      const currentUser = await base44.auth.me();
      console.log(`[Notifications] auth.me took ${(performance.now() - t1).toFixed(0)} ms`);
      setUser(currentUser);

      // שלב 2: טעינת הגדרות בלבד (ללא לוגים — לא נחוץ ל-MVP)
      const t2 = performance.now();
      const records = await base44.entities.NotificationSettings.filter({ owner_email: currentUser.email });
      console.log(`[Notifications] load settings took ${(performance.now() - t2).toFixed(0)} ms`);

      if (records?.length > 0) {
        const rec = records[0];
        setSettingsId(rec.id);
        setSettings({
          enabled: rec.enabled !== false,
          email_enabled: rec.email_enabled !== false,
          notify_new_lead: rec.notify_new_lead !== false,
          notify_sla_breach: rec.notify_sla_breach !== false
        });
      } else {
        const created = await base44.entities.NotificationSettings.create({
          owner_email: currentUser.email,
          ...DEFAULT_SETTINGS
        });
        setSettingsId(created.id);
        setSettings(DEFAULT_SETTINGS);
      }
    } catch (err) {
      console.error("[Notifications] loadData error:", err);
    }
    console.log(`[Notifications] total load took ${(performance.now() - t0).toFixed(0)} ms`);
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!settingsId) return;
    setIsSaving(true);
    try {
      await base44.entities.NotificationSettings.update(settingsId, {
        ...settings,
        owner_email: user.email
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("שגיאה בשמירה:", err);
    }
    setIsSaving(false);
  };

  const handleSendTest = async () => {
    setIsSendingTest(true);
    setTestResult(null);
    setTestError(null);
    try {
      const res = await base44.functions.invoke('sendTestEmail', { email: user?.email, name: user?.full_name || '' });
      // base44.functions.invoke עשוי להחזיר את ה-body ישירות, או עטוף ב-{ data: ... }
      const body = res?.data ?? res;
      console.log('[sendTestEmail] body:', JSON.stringify(body));
      if (body?.ok === true) {
        setTestResult('success');
      } else {
        const msg = body?.message || 'שגיאה לא ידועה';
        const trace = body?.traceId ? ` (traceId: ${body.traceId})` : '';
        setTestError(msg + trace);
        setTestResult('error');
      }
    } catch (err) {
      console.error('[sendTestEmail] exception:', err?.message, err);
      setTestError(err?.message || 'שגיאת רשת');
      setTestResult('error');
    }
    setIsSendingTest(false);
    setTimeout(() => { setTestResult(null); setTestError(null); }, 10000);
  };

  const update = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const isDisabled = !settings.enabled;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }



  return (
    <div className="px-4 pt-20 pb-8 sm:px-6 md:p-8 min-h-screen rtl-text" dir="rtl">
      <div className="max-w-2xl mx-auto">

        {/* Back */}
        <Link to={createPageUrl("Integrations")} className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-6 transition-colors">
          <ArrowRight className="w-4 h-4" />
          <span>חזרה לאינטגרציות</span>
        </Link>

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-blue-100 rounded-xl">
            <Bell className="w-7 h-7 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">הגדרות התראות</h1>
            <p className="text-slate-500 text-sm">קבל התראות אוטומטיות על לידים חדשים וחריגות SLA</p>
          </div>
        </div>

        {/* Master Toggle */}
        <Card className="mb-6 border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-900 text-base">הפעל התראות</p>
                <p className="text-sm text-slate-500 mt-0.5">הפעל או כבה את כל ההתראות</p>
              </div>
              <Switch
                checked={settings.enabled}
                onCheckedChange={(val) => update('enabled', val)}
              />
            </div>
            {isDisabled && (
              <div className="mt-4 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <p className="text-amber-700 text-sm">ההתראות כבויות. הפעל את הטוגל כדי לקבל התראות.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Email Channel */}
        <Card className={`mb-6 border-slate-200 shadow-sm transition-opacity ${isDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
          <CardHeader className="border-b border-slate-100 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Mail className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold text-slate-900">ערוץ אימייל</CardTitle>
                  <CardDescription className="text-xs mt-0.5">שליחת התראות למייל המשתמש</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">זמין</Badge>
                <Switch
                  checked={settings.email_enabled}
                  onCheckedChange={(val) => update('email_enabled', val)}
                  disabled={isDisabled}
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-5 space-y-5">
            {/* Recipient */}
            <div className="bg-slate-50 rounded-lg p-3 flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <p className="text-sm text-slate-600">
                ההתראות נשלחות לכתובת: <span className="font-medium text-slate-800">{user?.email}</span>
              </p>
            </div>

            <Separator />

            {/* Notification types */}
            <div className={settings.email_enabled ? '' : 'opacity-50 pointer-events-none'}>
              <p className="text-sm font-semibold text-slate-700 mb-3">סוגי התראות:</p>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="new_lead"
                    checked={settings.notify_new_lead}
                    onCheckedChange={(val) => update('notify_new_lead', val)}
                    disabled={isDisabled || !settings.email_enabled}
                  />
                  <div>
                    <Label htmlFor="new_lead" className="font-medium text-slate-800 cursor-pointer">התראה על ליד חדש</Label>
                    <p className="text-xs text-slate-500 mt-0.5">קבל מייל מיד כאשר ליד חדש נכנס למערכת</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="sla_breach"
                    checked={settings.notify_sla_breach}
                    onCheckedChange={(val) => update('notify_sla_breach', val)}
                    disabled={isDisabled || !settings.email_enabled}
                  />
                  <div>
                    <Label htmlFor="sla_breach" className="font-medium text-slate-800 cursor-pointer">התראה על חריגת SLA (30 דקות ללא מענה)</Label>
                    <p className="text-xs text-slate-500 mt-0.5">קבל מייל אם ליד נכנס ולא טופל תוך 30 דקות</p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Test button */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-sm font-medium text-slate-700">שלח מייל בדיקה</p>
                <p className="text-xs text-slate-500">בדוק שהמיילים מגיעים אליך</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSendTest}
                disabled={isSendingTest || isDisabled || !settings.email_enabled}
                className="gap-2"
              >
                {isSendingTest ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {isSendingTest ? 'שולח...' : 'שלח מייל בדיקה'}
              </Button>
            </div>

            {testResult === 'success' && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <p className="text-green-700 text-sm">מייל הבדיקה נשלח! בדוק את תיבת הדואר שלך.</p>
              </div>
            )}
            {testResult === 'error' && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <p className="text-red-700 text-sm">{testError || 'שגיאה בשליחת המייל.'}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Build stamp */}
        <p className="text-xs text-slate-300 text-center mb-2">Build: {BUILD_STAMP}</p>

        {/* Future channels hint */}
        <Card className="mb-8 border-dashed border-slate-300 bg-slate-50">
          <CardContent className="p-4 text-center">
            <p className="text-slate-400 text-sm">ערוצי התראות נוספים (SMS, WhatsApp) יתווספו בקרוב</p>
          </CardContent>
        </Card>

        {/* Save */}
        <div className="flex items-center justify-between">
          <div>
            {saveSuccess && (
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-medium">ההגדרות נשמרו בהצלחה</span>
              </div>
            )}
          </div>
          <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 gap-2">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {isSaving ? 'שומר...' : 'שמור הגדרות'}
          </Button>
        </div>
      </div>
    </div>
  );
}