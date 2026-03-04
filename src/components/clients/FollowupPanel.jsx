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

  const hasActive = !!client.next_followup_at;
  const isOverdue = hasActive && isPast(client.next_followup_at);

  const handleSchedule = async (iso, note) => {
     setIsSaving(true);
     try {
       await scheduleFollowup({ lead_id: client.id, datetime: iso, note: note || "" });
       onUpdate?.({ next_followup_at: iso, next_followup_note: note });
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
        setShowNextPrompt(true);  // רק Prompt לפולואפ הבא - לא Prompt "האם נוצר קשר"
      }
    } catch (err) {
      console.error("[FollowupPanel] markFollowupDone FAILED", err?.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = async () => {
    console.group("[FollowupPanel::handleCancel] START");
    console.log("🔹 leadId:", client.id);
    console.log("🔹 before:", { next_followup_at: client.next_followup_at });
    setIsSaving(true);
    try {
      const res = await cancelFollowup({ lead_id: client.id });
      const data = res?.data;
      
      console.log("📤 RESPONSE from cancelFollowup:", JSON.stringify(data, null, 2));
      
      if (data?.ok) {
        console.log("✅ SUCCESS - clearing followup state");
        // עדכון state + refetch נתונים לעקביות
        onUpdate?.({ next_followup_at: null, next_followup_note: null });
        setShowCancelConfirm(false);
        setIsEditing(false);
        // הערה: כפתור "סמן נוצר קשר" נשאר מוסתר - משום שהכלל: חוזר רק אחרי followup_done
      } else {
        console.error(`❌ FAILED: ${data?.message} | traceId=${data?.traceId}`);
      }
    } catch (err) {
      console.error("💥 EXCEPTION:", err?.message);
    } finally {
      console.groupEnd();
      setIsSaving(false);
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
               const res = await rescheduleFollowup({ lead_id: client.id, datetime: iso, note: note || "" });
               if (res?.data?.ok) {
                 onUpdate?.({ next_followup_at: iso, next_followup_note: note });
                 setIsEditing(false);
               }
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


    </div>
  );
}