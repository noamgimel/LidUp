import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Bell, X } from "lucide-react";
import { scheduleFollowup } from "@/functions/scheduleFollowup";
   import { formatIsraeliDateTimeShort } from "@/components/utils/timeUtils";
   import FollowupForm from "./FollowupForm";

/**
 * FollowupPrompt — modal popup for scheduling a followup after "first contact" or "followup done"
 * Props:
 *   leadId          string
 *   existingFollowup string|null  — UTC ISO if there's already an active followup
 *   onDone(iso|null)  — called when followup is set (or skipped)
 *   onClose()
 */
export default function FollowupPrompt({ leadId, existingFollowup, onDone, onClose }) {
   const [mode, setMode] = useState(existingFollowup ? "existing" : "schedule"); // "existing" | "schedule"
   const [isSaving, setIsSaving] = useState(false);
   const [error, setError] = useState(null);

  const handleSave = async (iso, note) => {
    setIsSaving(true);
    setError(null);
    try {
      const res = await scheduleFollowup({ lead_id: leadId, datetime: iso, note });
      const data = res?.data;
      if (!data?.ok) {
        setError(data?.message || data?.error || "שמירה נכשלה");
        setIsSaving(false);
        return;
      }
      setIsSaving(false);
      console.log("[FollowupPrompt] SUCCESS:", { leadId, iso, note, responseData: data });
      // ✅ סוגרים והמודאל ייסגר, ואחרי כן ייפתח WorkStagePrompt מ-handleFollowupPromptDone
      onDone?.(iso);
    } catch (err) {
      const errMsg = err?.response?.data?.message || err?.response?.data?.error || err?.message || "שגיאת שרת";
      console.error("[FollowupPrompt] scheduleFollowup error:", errMsg);
      setError(errMsg);
      setIsSaving(false);
    }
  };



  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm rtl-text z-10">
        <button onClick={onClose} className="absolute top-3 left-3 p-1 rounded-full text-slate-400 hover:bg-slate-100">
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 bg-orange-100 rounded-full flex items-center justify-center">
            <Bell className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">
              {mode === "existing" ? "כבר קיים פולואפ פעיל" : "מתי לחזור ללקוח?"}
            </h3>
            <p className="text-xs text-slate-500">
              {mode === "existing"
                ? `פולואפ ל-${formatIsraeliDateTimeShort(existingFollowup)}`
                : "קבע פולואפ"}
            </p>
          </div>
        </div>

        {/* ── Existing followup mode ── */}
        {mode === "existing" && (
          <div className="space-y-2">
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-800 font-medium">
              📅 {formatIsraeliDateTimeShort(existingFollowup)}
            </div>
            <p className="text-xs text-slate-500 text-center">מה ברצונך לעשות?</p>
            <Button
              onClick={() => setMode("schedule")}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white"
            >
              החלף פולואפ
            </Button>
            <Button
              variant="outline"
              onClick={() => onDone?.(null)}
              className="w-full"
            >
              השאר כמו שהוא
            </Button>
          </div>
        )}

        {/* ── Schedule mode ── */}
         {mode === "schedule" && (
           <>
             <FollowupForm
               onSave={handleSave}
               isSaving={isSaving}
             />
             {error && (
               <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                 ⚠️ {error}
               </div>
             )}
             {existingFollowup && (
               <Button variant="ghost" onClick={() => setMode("existing")} className="w-full mt-2 text-sm text-slate-500">
                 חזרה
               </Button>
             )}
             <Button variant="ghost" onClick={() => onClose?.()} className="w-full mt-1 text-sm text-slate-400">
               לא עכשיו
             </Button>
           </>
         )}
      </div>
    </motion.div>
  );
}