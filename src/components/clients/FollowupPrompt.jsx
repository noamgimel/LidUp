import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Bell, X } from "lucide-react";
import { addDays } from "date-fns";
import { base44 } from "@/api/base44Client";

const formatIsraeliDate = (d) => {
  if (!d) return null;
  try {
    return new Intl.DateTimeFormat("he-IL", {
      timeZone: "Asia/Jerusalem",
      day: "2-digit", month: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: false,
    }).format(new Date(d));
  } catch { return null; }
};

/**
 * Mini-modal for quickly scheduling a follow-up after first contact or followup done.
 * Props:
 *   leadId, onDone (called with scheduled iso or null), onClose
 */
export default function FollowupPrompt({ leadId, onDone, onClose }) {
  const [isSaving, setIsSaving] = React.useState(false);

  const schedule = async (days) => {
    setIsSaving(true);
    const d = addDays(new Date(), days);
    d.setHours(9, 0, 0, 0);
    const iso = d.toISOString();
    const user = await base44.auth.me();
    await base44.entities.Client.update(leadId, {
      next_followup_at: iso,
      last_activity_at: new Date().toISOString()
    });
    await base44.entities.LeadActivity.create({
      lead_id: leadId,
      event_type: "followup_set",
      content: `פולואפ נקבע ל-${formatIsraeliDate(iso)}`,
      created_by_email: user?.email || ""
    });
    setIsSaving(false);
    onDone?.(iso);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* backdrop */}
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
            <h3 className="font-bold text-slate-900">לקבוע פולואפ?</h3>
            <p className="text-xs text-slate-500">בחר מתי לחזור ללקוח</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            disabled={isSaving}
            onClick={() => schedule(1)}
            className="h-12 text-sm font-semibold border-2 hover:border-orange-400 hover:bg-orange-50"
          >
            מחר
          </Button>
          <Button
            variant="outline"
            disabled={isSaving}
            onClick={() => schedule(3)}
            className="h-12 text-sm font-semibold border-2 hover:border-orange-400 hover:bg-orange-50"
          >
            עוד 3 ימים
          </Button>
          <Button
            variant="outline"
            disabled={isSaving}
            onClick={() => schedule(7)}
            className="h-12 text-sm font-semibold border-2 hover:border-orange-400 hover:bg-orange-50"
          >
            שבוע
          </Button>
          <Button
            variant="ghost"
            disabled={isSaving}
            onClick={() => onClose?.()}
            className="h-12 text-sm text-slate-500 hover:bg-slate-100"
          >
            לא עכשיו
          </Button>
        </div>
      </div>
    </motion.div>
  );
}