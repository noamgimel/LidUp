import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCircle2, Edit2, X, AlertTriangle } from "lucide-react";
import { scheduleFollowup } from "@/functions/scheduleFollowup";
import { markFollowupDone } from "@/functions/markFollowupDone";
import { cancelFollowup } from "@/functions/cancelFollowup";
import { rescheduleFollowup } from "@/functions/rescheduleFollowup";
import { base44 } from "@/api/base44Client";
import { formatIsraeliDateTime, isPast } from "@/components/utils/timeUtils";
import FollowupForm from "./FollowupForm";
import FollowupPrompt from "./FollowupPrompt";

export default function FollowupPanel({ client, onUpdate, onFollowupDone }) {
  const [isEditing, setIsEditing] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showNextPrompt, setShowNextPrompt] = useState(false);
  const [showFirstContactPrompt, setShowFirstContactPrompt] = useState(false);

  const hasActive = !!client.next_followup_at;
  const isOverdue = hasActive && isPast(client.next_followup_at);

  const handleSchedule = async (iso, note) => {
    setIsSaving(true);
    try {
      await scheduleFollowup({ lead_id: client.id, datetime: iso, note: note || "" });
      onUpdate?.({ next_followup_at: iso, next_followup_note: note });
      if (!client.first_response_at) {
        setShowFirstContactPrompt(true);
      }
    } catch (err) {
      console.error("[FollowupPanel] scheduleFollowup FAILED", err?.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkDone = async () => {
    setIsSaving(true);
    try {
      const res = await markFollowupDone({ lead_id: client.id });
      if (res?.data?.ok) {
        onFollowupDone?.();
        onUpdate?.({ next_followup_at: null, next_followup_note: null, first_response_at: null });
        setShowNextPrompt(true);
      }
    } catch (err) {
      console.error("[FollowupPanel] markFollowupDone FAILED", err?.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = async () => {
    setIsSaving(true);
    try {
      const res = await cancelFollowup({ lead_id: client.id });
      const data = res?.data;
      if (data?.ok) {
        // Clear followup + refetch + reset UI
        onUpdate?.({ next_followup_at: null, next_followup_note: null });
        setShowCancelConfirm(false);
        setIsEditing(false);
      }
    } catch (err) {
      console.error("[FollowupPanel] cancel FAILED", err?.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFirstContact = async () => {
    try {
      const { markFirstContact } = await import("@/functions/markFirstContact");
      const res = await markFirstContact({ lead_id: client.id });
      const data = res?.data;
      
      // Debug log
      console.log("[FollowupPanel::handleFirstContact] response:", { leadId: client.id, ok: data?.ok, error: data?.error || data?.message, traceId: data?.traceId });
      
      if (!data?.ok) {
        console.error(`[FollowupPanel] markFirstContact failed: ${data?.message || data?.error || "unknown"} (${data?.traceId})`);
        return;
      }
      
      onUpdate?.({ first_response_at: data.first_response_at || new Date().toISOString() });
    } catch (err) {
      console.error("[FollowupPanel] markFirstContact exception:", { message: err?.message, leadId: client.id });
    } finally {
      setShowFirstContactPrompt(false);
    }
  };

  return (
    <div className="space-y-3">
      {!hasActive && !isEditing && (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
          <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500 mb-3">אין פולואפ פעיל — קבע מתי לחזור ללקוח</p>
          <FollowupForm onSave={handleSchedule} isSaving={isSaving} />
        </div>
      )}

      {hasActive && !isEditing && (
        <div className={`p-4 rounded-xl border ${isOverdue ? "bg-red-50 border-red-300" : "bg-orange-50 border-orange-200"}`}>
          <div className="flex items-center gap-2 mb-2">
            <Bell className={`w-4 h-4 ${isOverdue ? "text-red-600" : "text-orange-600"}`} />
            <span className={`font-semibold text-sm ${isOverdue ? "text-red-800" : "text-orange-800"}`}>פולואפ פעיל</span>
            {isOverdue && <Badge className="bg-red-600 text-white text-xs">עבר!</Badge>}
          </div>
          <p className={`text-base font-bold mb-1 ${isOverdue ? "text-red-900" : "text-orange-900"}`}>
            {formatIsraeliDateTime(client.next_followup_at)}
          </p>
          {client.next_followup_note && (
            <p className="text-sm text-orange-700 mb-3">📝 {client.next_followup_note}</p>
          )}
          <div className="flex flex-wrap gap-2 mt-3">
            <Button size="sm" onClick={handleMarkDone} disabled={isSaving} className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {isSaving ? "שומר..." : "בוצע פולואפ"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsEditing(true)} className="gap-1.5 bg-white">
              <Edit2 className="w-3.5 h-3.5" />שנה פולואפ
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowCancelConfirm(true)} className="gap-1.5 bg-white border-red-200 text-red-600 hover:bg-red-50">
              <X className="w-3.5 h-3.5" />בטל פולואפ
            </Button>
          </div>
        </div>
      )}

      {isEditing && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-blue-800 text-sm">עדכון פולואפ פעיל</span>
            <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <FollowupForm
            initialDatetime={client.next_followup_at}
            initialNote={client.next_followup_note}
            isReschedule
            onSave={async (iso, note) => {
              setIsSaving(true);
              try {
                await rescheduleFollowup({ lead_id: client.id, datetime: iso, note: note || "" });
                onUpdate?.({ next_followup_at: iso, next_followup_note: note });
                setIsEditing(false);
              } catch (err) {
                console.error("[FollowupPanel] reschedule FAILED", err?.message);
              } finally {
                setIsSaving(false);
              }
            }}
            isSaving={isSaving}
          />
        </div>
      )}

      <AnimatePresence>
        {showCancelConfirm && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-3 bg-red-50 border border-red-300 rounded-xl flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2 text-sm text-red-800">
              <AlertTriangle className="w-4 h-4" />
              לבטל את הפולואפ הפעיל?
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowCancelConfirm(false)} className="text-xs">ביטול</Button>
              <Button size="sm" onClick={handleCancel} disabled={isSaving} className="bg-red-600 hover:bg-red-700 text-white text-xs">
                {isSaving ? "מבטל..." : "כן, בטל פולואפ"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showNextPrompt && (
          <FollowupPrompt
            leadId={client.id}
            onDone={(iso) => {
              setShowNextPrompt(false);
              if (iso) onUpdate?.({ next_followup_at: iso });
            }}
            onClose={() => setShowNextPrompt(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showFirstContactPrompt && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/30" onClick={() => setShowFirstContactPrompt(false)} />
            <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm rtl-text z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center">
                  <Bell className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">האם כבר נוצר קשר?</h3>
                  <p className="text-xs text-slate-500">הפולואפ נקבע בהצלחה</p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Button onClick={handleFirstContact} className="bg-blue-600 hover:bg-blue-700 text-white">
                  כן, סמן נוצר קשר
                </Button>
                <Button variant="ghost" onClick={() => setShowFirstContactPrompt(false)} className="text-slate-500">
                  לא עדיין
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}