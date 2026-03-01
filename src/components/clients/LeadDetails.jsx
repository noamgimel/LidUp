import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import FollowupPrompt from "./FollowupPrompt";
import WorkStagePrompt from "./WorkStagePrompt";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  X, Edit, Phone, Mail, MessageCircle, Calendar, Clock,
  Plus, ChevronUp, CheckCircle2, XCircle, Handshake,
  Link2, ChevronDown, Send, Bell
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { addDays } from "date-fns";
import { base44 } from "@/api/base44Client";

import { useUserWorkStages } from "../hooks/useUserWorkStages";
import { getWorkStageColorClass } from "../utils/workStagesUtils";
import { PRIORITY_CONFIG, LIFECYCLE_CONFIG } from "./LeadPriorityConfig";
import AgeTimer from "./AgeTimer";

const formatIsraeliDate = (d) => {
  if (!d) return null;
  try {
    return new Intl.DateTimeFormat("he-IL", {
      timeZone: "Asia/Jerusalem",
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: false,
    }).format(new Date(d));
  } catch { return null; }
};

function ActivityTimeline({ leadId, onActivityAdded }) {
  const [activities, setActivities] = useState([]);
  const [newNote, setNewNote] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { loadActivities(); }, [leadId]);

  const loadActivities = async () => {
    setIsLoading(true);
    try {
      // Use backend function to bypass RLS for webhook leads
      const res = await base44.functions.invoke("getLeadActivities", { lead_id: leadId });
      setActivities(res?.data?.activities || []);
    } catch {
      setActivities([]);
    }
    setIsLoading(false);
  };

  const addNote = async () => {
    if (!newNote.trim()) return;
    setIsSaving(true);
    try {
      await base44.functions.invoke("addLeadNote", { lead_id: leadId, content: newNote.trim() });
      setNewNote("");
      await loadActivities();
      onActivityAdded?.();
    } finally {
      setIsSaving(false);
    }
  };

  const eventTypeLabel = {
    created: "ליד נקלט",
    note: "הערה",
    status_change: "שינוי סטטוס",
    stage_change: "שינוי שלב",
    lifecycle_changed: "שינוי מצב",
    followup_set: "נקבע פולואפ",
    followup_done: "פולואפ בוצע",
    first_response: "נוצר קשר ראשון",
    meeting_created: "נוצרה פגישה",
    meeting_updated: "פגישה עודכנה"
  };
  const eventTypeColor = {
    created: "text-blue-600 bg-blue-50 border-blue-200",
    note: "text-slate-600 bg-slate-50 border-slate-200",
    first_response: "text-green-600 bg-green-50 border-green-200",
    lifecycle_changed: "text-purple-600 bg-purple-50 border-purple-200",
    followup_set: "text-orange-600 bg-orange-50 border-orange-200",
    followup_done: "text-teal-600 bg-teal-50 border-teal-200",
    meeting_created: "text-indigo-600 bg-indigo-50 border-indigo-200",
    stage_change: "text-yellow-700 bg-yellow-50 border-yellow-200",
    status_change: "text-pink-600 bg-pink-50 border-pink-200",
    meeting_updated: "text-indigo-500 bg-indigo-50 border-indigo-200",
  };

  return (
    <div className="space-y-3">
      {/* Add note */}
      <div className="flex gap-2">
        <Textarea
          value={newNote}
          onChange={e => setNewNote(e.target.value)}
          placeholder="הוסף הערה..."
          className="text-right min-h-[60px] resize-none text-sm"
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addNote(); } }}
        />
        <Button onClick={addNote} disabled={isSaving || !newNote.trim()} size="icon" className="bg-blue-600 hover:bg-blue-700 self-end h-9 w-9 flex-shrink-0">
          <Send className="w-4 h-4" />
        </Button>
      </div>

      {/* Timeline */}
      {isLoading ? (
        <p className="text-slate-400 text-sm text-center py-4">טוען...</p>
      ) : activities.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-4">אין פעילות עדיין</p>
      ) : (
        <div className="space-y-2">
          {activities.map(act => (
            <div key={act.id} className={`flex gap-3 p-3 rounded-lg border text-right ${eventTypeColor[act.event_type] || eventTypeColor.note}`}>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold mb-0.5">{eventTypeLabel[act.event_type] || act.event_type}</p>
                {act.content && <p className="text-sm">{act.content}</p>}
              </div>
              <p className="text-xs text-slate-400 flex-shrink-0">{formatIsraeliDate(act.created_date)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FollowupPanel({ client, onUpdate }) {
  const [date, setDate] = useState(client.next_followup_at ? client.next_followup_at.slice(0, 16) : "");
  const [note, setNote] = useState(client.next_followup_note || "");
  const [isSaving, setIsSaving] = useState(false);
  const [showNextPrompt, setShowNextPrompt] = useState(false);

  const save = async (nextDate, nextNote) => {
    if (!nextDate) return;
    setIsSaving(true);
    try {
      await base44.functions.invoke("scheduleFollowup", { lead_id: client.id, datetime: new Date(nextDate).toISOString(), note: nextNote || "" });
      onUpdate?.();
    } finally {
      setIsSaving(false);
    }
  };

  const markDone = async () => {
    setIsSaving(true);
    try {
      await base44.functions.invoke("markFollowupDone", { lead_id: client.id });
      setShowNextPrompt(true);
      onUpdate?.();
    } finally {
      setIsSaving(false);
    }
  };

  const quickSet = (days) => {
    const d = addDays(new Date(), days);
    d.setHours(9, 0, 0, 0);
    const iso = d.toISOString().slice(0, 16);
    setDate(iso);
  };

  const isOverdue = client.next_followup_at && new Date(client.next_followup_at) <= new Date();

  return (
    <>
      <div className="space-y-3 p-4 bg-orange-50 border border-orange-200 rounded-xl">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-orange-600" />
            <span className="font-semibold text-orange-800 text-sm">פולואפ הבא</span>
            {isOverdue && <Badge className="bg-red-600 text-white text-xs">עבר!</Badge>}
          </div>
          {client.next_followup_at && (
            <Button size="sm" onClick={markDone} disabled={isSaving} className="bg-teal-600 hover:bg-teal-700 text-white text-xs gap-1 h-7">
              <CheckCircle2 className="w-3.5 h-3.5" />בוצע פולואפ
            </Button>
          )}
        </div>

        {client.next_followup_at && (
          <p className="text-sm font-medium text-orange-900">
            {formatIsraeliDate(client.next_followup_at)}
            {client.next_followup_note && <span className="text-orange-600 mr-2">— {client.next_followup_note}</span>}
          </p>
        )}

        <Input
          type="datetime-local"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="text-sm bg-white"
        />
        <Input
          placeholder="הערה קצרה..."
          value={note}
          onChange={e => setNote(e.target.value)}
          className="text-right text-sm bg-white"
        />

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => quickSet(1)} className="text-xs bg-white">מחר</Button>
          <Button size="sm" variant="outline" onClick={() => quickSet(3)} className="text-xs bg-white">עוד 3 ימים</Button>
          <Button size="sm" variant="outline" onClick={() => quickSet(7)} className="text-xs bg-white">שבוע</Button>
          <Button size="sm" onClick={() => save(date, note)} disabled={isSaving || !date} className="bg-orange-600 hover:bg-orange-700 text-white text-xs">
            {isSaving ? "שומר..." : "קבע פולואפ"}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {showNextPrompt && (
          <FollowupPrompt
            leadId={client.id}
            onDone={() => { setShowNextPrompt(false); onUpdate?.(); }}
            onClose={() => setShowNextPrompt(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

export default function LeadDetails({ client: initialClient, meetings, onClose, onEdit, onCreateMeeting, onRefresh }) {
  const [client, setClient] = useState(initialClient);
  const [activeTab, setActiveTab] = useState("activity");
  const [showUtm, setShowUtm] = useState(false);
  const [showFollowupPrompt, setShowFollowupPrompt] = useState(false);
  const [showWorkStagePrompt, setShowWorkStagePrompt] = useState(false);
  const { userWorkStages } = useUserWorkStages();

  useEffect(() => { setClient(initialClient); }, [initialClient]);

  const priority = client.priority || "warm";
  const pCfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.warm;
  const lifecycle = client.lifecycle || "open";
  const lCfg = LIFECYCLE_CONFIG[lifecycle];

  const workStage = userWorkStages.find(s => s.id === client.work_stage);
  const workStageLabel = workStage?.label || "";
  const workStageColor = workStage ? getWorkStageColorClass(workStage.color) : "bg-gray-100 text-gray-700 border-gray-200";

  const upcomingMeetings = meetings?.filter(m => m.status === "scheduled") || [];

  const [isMarkingContacted, setIsMarkingContacted] = useState(false);
  const [isMarkingFollowupDone, setIsMarkingFollowupDone] = useState(false);

  const handleFirstResponse = async () => {
    if (client.first_response_at || isMarkingContacted) return;
    setIsMarkingContacted(true);
    try {
      const res = await markFirstContact({ lead_id: client.id });
      const data = res?.data;
      if (data?.ok) {
        setClient(prev => ({
          ...prev,
          first_response_at: data.first_response_at || new Date().toISOString(),
          priority: data.priority || prev.priority,
          ...(data.work_stage ? { work_stage: data.work_stage } : {})
        }));
        onRefresh?.();
        setShowFollowupPrompt(true);
      }
    } finally {
      setIsMarkingContacted(false);
    }
  };

  const handleFollowupDone = async () => {
    if (isMarkingFollowupDone) return;
    setIsMarkingFollowupDone(true);
    try {
      await markFollowupDone({ lead_id: client.id });
      setClient(prev => ({ ...prev, next_followup_at: null, next_followup_note: "" }));
      onRefresh?.();
      setShowFollowupPrompt(true);
    } finally {
      setIsMarkingFollowupDone(false);
    }
  };

  const handleFollowupPromptDone = (iso) => {
    setShowFollowupPrompt(false);
    if (iso) setClient(prev => ({ ...prev, next_followup_at: iso }));
    onRefresh?.();
    setShowWorkStagePrompt(true);
  };

  const handleLifecycleChange = async (newLifecycle) => {
    const user = await base44.auth.me();
    const now = new Date().toISOString();
    await base44.entities.Client.update(client.id, {
      lifecycle: newLifecycle,
      last_activity_at: now
    });
    await base44.entities.LeadActivity.create({
      lead_id: client.id,
      event_type: "lifecycle_changed",
      content: newLifecycle === "won" ? "ליד נסגר בהצלחה ✅" : "ליד סומן כלא רלוונטי ❌",
      created_by_email: user?.email || ""
    });
    setClient(prev => ({ ...prev, lifecycle: newLifecycle }));
    onRefresh?.();
  };

  const phone = client.phone?.replace(/\D/g, "") || "";

  return (
    <motion.div
      initial={{ opacity: 0, y: -15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="mb-6 rtl-text"
      data-client-details
    >
      <Card className="shadow-xl border-slate-200 overflow-hidden">

        {/* ───── ACTION BAR HEADER ───── */}
        <div className={`p-4 border-b border-slate-200 ${pCfg.row}`}>
          {/* Top row: name + priority + age + close */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg ${pCfg.accent}`}>
                {client.name?.charAt(0)}
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">{client.name}</h2>
                {client.company && <p className="text-sm text-slate-500">{client.company}</p>}
              </div>
              <Badge className={`${pCfg.badge} border text-sm px-3 py-1`}>{pCfg.label}</Badge>
              {lifecycle !== "open" && <Badge className={`${lCfg.badge} border text-sm`}>{lCfg.label}</Badge>}
              <AgeTimer createdAt={client.created_date || client.submission_date} firstResponseAt={client.first_response_at} />
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button size="sm" onClick={onEdit} variant="outline" className="gap-1 h-8">
                <Edit className="w-3.5 h-3.5" /><span className="hidden sm:inline">עריכה</span>
              </Button>
              <Button size="icon" variant="ghost" onClick={onClose} className="h-8 w-8 text-slate-500 hover:text-slate-800">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Quick action buttons */}
          <TooltipProvider delayDuration={200}>
          <div className="flex items-center gap-1.5 mt-3 flex-wrap">
            {/* Icon-only contact buttons */}
            {phone && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <a href={`tel:${phone}`}>
                    <Button size="icon" className="bg-green-600 hover:bg-green-700 text-white h-9 w-9 shadow-sm rounded-lg">
                      <Phone className="w-4 h-4" />
                    </Button>
                  </a>
                </TooltipTrigger>
                <TooltipContent>התקשר — {client.phone}</TooltipContent>
              </Tooltip>
            )}
            {phone && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <a href={`https://wa.me/972${phone.replace(/^0/, "")}`} target="_blank" rel="noreferrer">
                    <Button size="icon" className="bg-[#25D366] hover:bg-[#1db954] text-white h-9 w-9 shadow-sm rounded-lg">
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                  </a>
                </TooltipTrigger>
                <TooltipContent>וואטסאפ</TooltipContent>
              </Tooltip>
            )}
            {client.email && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <a href={`mailto:${client.email}`}>
                    <Button size="icon" variant="outline" className="h-9 w-9 bg-white border-slate-300 text-slate-600 hover:bg-slate-50 shadow-sm rounded-lg">
                      <Mail className="w-4 h-4" />
                    </Button>
                  </a>
                </TooltipTrigger>
                <TooltipContent>שלח מייל</TooltipContent>
              </Tooltip>
            )}

            <div className="w-px bg-slate-300 self-stretch mx-1" />

            {/* Contextual action buttons — with text */}
            {client.first_response_at ? (
              <>
                <div className="flex items-center gap-1.5 h-9 px-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ✅ נוצר קשר — {formatIsraeliDate(client.first_response_at)}
                </div>
                {client.next_followup_at ? (
                  <Button
                    size="sm"
                    onClick={handleFollowupDone}
                    disabled={isMarkingFollowupDone}
                    className="gap-1.5 h-9 text-sm font-semibold shadow-sm rounded-lg bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {isMarkingFollowupDone ? "שומר..." : "בוצע פולואפ"}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => setShowFollowupPrompt(true)}
                    className="gap-1.5 h-9 text-sm font-semibold shadow-sm rounded-lg bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    <Bell className="w-4 h-4" />קבע פולואפ
                  </Button>
                )}
              </>
            ) : (
              <Button
                size="sm"
                onClick={handleFirstResponse}
                disabled={isMarkingContacted}
                className="gap-1.5 h-9 text-sm font-semibold shadow-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Handshake className="w-4 h-4" />
                {isMarkingContacted ? "שומר..." : "סמן 'נוצר קשר'"}
              </Button>
            )}

            <Button size="sm" variant="outline" onClick={() => onCreateMeeting(client)} className="gap-1.5 h-9 text-sm font-semibold bg-white border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm rounded-lg">
              <Calendar className="w-4 h-4" />פגישה
            </Button>

            <div className="w-px bg-slate-300 self-stretch mx-1" />

            {lifecycle === "open" ? (
              <>
                <Button size="sm" onClick={() => handleLifecycleChange("won")} className="gap-1.5 h-9 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm rounded-lg">
                  <CheckCircle2 className="w-4 h-4" />סגור ✅
                </Button>
                <Button size="sm" onClick={() => handleLifecycleChange("lost")} variant="outline" className="gap-1.5 h-9 text-sm font-semibold border-red-300 text-red-600 hover:bg-red-50 bg-white shadow-sm rounded-lg">
                  <XCircle className="w-4 h-4" />לא רלוונטי
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={() => handleLifecycleChange("open")} variant="outline" className="gap-1.5 h-9 text-sm font-semibold bg-white border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm rounded-lg">
                החזר לפעיל
              </Button>
            )}
          </div>
          </TooltipProvider>
        </div>

        <AnimatePresence>
          {showFollowupPrompt && (
            <FollowupPrompt
              leadId={client.id}
              onDone={handleFollowupPromptDone}
              onClose={() => setShowFollowupPrompt(false)}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showWorkStagePrompt && (
            <WorkStagePrompt
              leadId={client.id}
              currentWorkStage={client.work_stage}
              onDone={(stageId) => {
                setShowWorkStagePrompt(false);
                if (stageId) setClient(prev => ({ ...prev, work_stage: stageId }));
                onRefresh?.();
              }}
              onClose={() => setShowWorkStagePrompt(false)}
            />
          )}
        </AnimatePresence>

        <CardContent className="p-0">
          {/* ───── QUICK FACTS ───── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-slate-200 border-b border-slate-200">
            {[
              { label: "טלפון", value: client.phone || "—" },
              { label: "אימייל", value: client.email || "—" },
              { label: "מקור", value: client.source === "website_form" && client.form_name ? `טופס אתר: ${client.form_name}` : (client.source || "—") },
              { label: "שלב מכירה", value: workStageLabel || "לא מוגדר" },
              { label: "פולואפ הבא", value: client.next_followup_at ? formatIsraeliDate(client.next_followup_at) : "—" },
              { label: "כניסה למערכת", value: formatIsraeliDate(client.created_date) || "—" },
            ].map(f => (
              <div key={f.label} className="bg-white p-3">
                <p className="text-xs text-slate-400 mb-0.5">{f.label}</p>
                <p className="text-sm font-medium text-slate-800 truncate">{f.value}</p>
              </div>
            ))}
          </div>

          {/* ───── TABS ───── */}
          <div className="border-b border-slate-200 flex">
            {[
              { key: "activity", label: "פעילות" },
              { key: "meetings", label: `פגישות${upcomingMeetings.length ? ` (${upcomingMeetings.length})` : ""}` },
              { key: "followup", label: "פולואפ" + (client.next_followup_at && new Date(client.next_followup_at) <= new Date() ? " ⚠️" : "") },
              { key: "details", label: "פרטים טכניים" },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === t.key
                    ? "border-blue-600 text-blue-700"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-4">
            {/* Activity Tab */}
            {activeTab === "activity" && (
              <ActivityTimeline leadId={client.id} onActivityAdded={onRefresh} />
            )}

            {/* Meetings Tab */}
            {activeTab === "meetings" && (
              <div className="space-y-3">
                <Button size="sm" onClick={() => onCreateMeeting(client)} className="gap-2 bg-purple-600 hover:bg-purple-700">
                  <Plus className="w-4 h-4" />פגישה חדשה
                </Button>
                {upcomingMeetings.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-4">אין פגישות מתוכננות</p>
                ) : upcomingMeetings.map(m => (
                  <div key={m.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50">
                    <div>
                      <p className="font-medium text-slate-800">{m.title}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <Calendar className="w-3 h-3" /><span>{m.date}</span>
                        <Clock className="w-3 h-3" /><span>{m.time}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">מתוכנן</Badge>
                  </div>
                ))}
              </div>
            )}

            {/* Followup Tab */}
            {activeTab === "followup" && (
              <FollowupPanel client={client} onUpdate={() => { onRefresh?.(); }} />
            )}

            {/* Details Tab */}
            {activeTab === "details" && (
              <div className="space-y-3">
                {client.notes && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-1">הערות</p>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 p-3 rounded-lg border">{client.notes}</p>
                  </div>
                )}
                {client.page_url && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-1">דף נחיתה</p>
                    <a href={client.page_url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                      <Link2 className="w-3 h-3" />{client.page_url}
                    </a>
                  </div>
                )}
                {(client.utm_source || client.utm_medium || client.utm_campaign) && (
                  <div>
                    <button onClick={() => setShowUtm(p => !p)} className="flex items-center gap-1 text-xs font-semibold text-slate-500 mb-1">
                      UTM <ChevronDown className={`w-3 h-3 transition-transform ${showUtm ? "rotate-180" : ""}`} />
                    </button>
                    {showUtm && (
                      <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-3 rounded-lg border">
                        {client.utm_source && <p>Source: {client.utm_source}</p>}
                        {client.utm_medium && <p>Medium: {client.utm_medium}</p>}
                        {client.utm_campaign && <p>Campaign: {client.utm_campaign}</p>}
                        {client.utm_content && <p>Content: {client.utm_content}</p>}
                        {client.utm_term && <p>Term: {client.utm_term}</p>}
                      </div>
                    )}
                  </div>
                )}
                {client.ip_address && (
                  <p className="text-xs text-slate-400">IP: {client.ip_address}</p>
                )}
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                  <div><span className="font-medium">נקלט: </span>{formatIsraeliDate(client.created_date) || "—"}</div>
                  <div><span className="font-medium">עדכון: </span>{formatIsraeliDate(client.updated_date) || "—"}</div>
                  {client.first_response_at && <div><span className="font-medium">קשר ראשון: </span>{formatIsraeliDate(client.first_response_at)}</div>}
                  {client.last_activity_at && <div><span className="font-medium">פעילות אחרונה: </span>{formatIsraeliDate(client.last_activity_at)}</div>}
                </div>
              </div>
            )}
          </div>
        </CardContent>

        <div className="flex justify-center p-3 border-t border-slate-100">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-slate-500 gap-1 hover:text-slate-700">
            <ChevronUp className="w-4 h-4" />סגור
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}