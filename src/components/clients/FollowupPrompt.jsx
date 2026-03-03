import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bell, X, Clock } from "lucide-react";
import { addDays, format } from "date-fns";
import { scheduleFollowup } from "@/functions/scheduleFollowup";

const DEFAULT_TIMES = ["09:00", "12:00", "16:00", "19:00"];

import { formatIsraeliDateTimeShort, getIsraelUtcOffsetMs } from "@/components/utils/timeUtils";
const formatIsraeliDate = formatIsraeliDateTimeShort;

/**
 * Converts a "YYYY-MM-DDTHH:mm" string that represents Israel local time → UTC ISO string.
 * DST-safe: uses current Israel UTC offset.
 */
function localIsraelDatetimeToUtcIso(localStr) {
  if (!localStr) return null;
  // Parse as if it were UTC, then subtract the Israel offset to get real UTC
  const asIfUtc = new Date(localStr + ":00Z");
  const offsetMs = getIsraelUtcOffsetMs();
  return new Date(asIfUtc.getTime() - offsetMs).toISOString();
}

/**
 * Props: leadId, onDone(iso|null), onClose
 * Flow:
 *   Step 1 → pick day (quick buttons or custom)
 *   Step 2 → pick time + note → save
 */
export default function FollowupPrompt({ leadId, onDone, onClose }) {
  const [step, setStep] = useState(1); // 1 = pick day, 2 = pick time+note
  const [selectedDate, setSelectedDate] = useState(null); // Date object
  const [isCustom, setIsCustom] = useState(false);
  const [customDatetime, setCustomDatetime] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [customTime, setCustomTime] = useState("");
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const pickDay = (days) => {
    const d = addDays(new Date(), days);
    d.setHours(9, 0, 0, 0);
    setSelectedDate(d);
    setIsCustom(false);
    setStep(2);
  };

  const pickCustom = () => {
    setIsCustom(true);
    setStep(2);
  };

  const buildIso = () => {
    if (isCustom) {
      // datetime-local value is browser-local time — treat as Israel time
      // Use Intl to get Israel offset and convert properly
      if (!customDatetime) return null;
      return localIsraelDatetimeToUtcIso(customDatetime);
    }
    if (!selectedDate) return null;
    const time = selectedTime || customTime;
    if (!time) return null;
    // Build Israel-local datetime string and convert to UTC
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    return localIsraelDatetimeToUtcIso(`${dateStr}T${time}`);
  };

  const save = async () => {
    const iso = buildIso();
    if (!iso) return;
    setIsSaving(true);
    setError(null);
    try {
      console.log("[FollowupPrompt] scheduleFollowup →", { lead_id: leadId, datetime: iso, has_note: !!note });
      const res = await scheduleFollowup({ lead_id: leadId, datetime: iso, note });
      console.log("[FollowupPrompt] scheduleFollowup ← success", res?.status, res?.data);
      const data = res?.data;
      if (!data?.ok) {
        const msg = data?.error || "שמירה נכשלה";
        console.error("[FollowupPrompt] error response:", msg);
        setError(msg);
        setIsSaving(false);
        return;
      }
      // SUCCESS — close and notify parent
      setIsSaving(false);
      onDone?.(iso);
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "שגיאת שרת — אנא נסה שוב";
      console.error("[FollowupPrompt] scheduleFollowup ← FAILED", err?.response?.status, msg);
      setError(msg);
      setIsSaving(false);
    }
  };

  const dateLabel = selectedDate
    ? format(selectedDate, "dd/MM")
    : null;

  const canSave = isCustom ? !!customDatetime : !!(selectedTime || customTime);

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
              {step === 1 ? "מתי לחזור ללקוח?" : `תאריך: ${dateLabel || "מותאם אישית"}`}
            </h3>
            <p className="text-xs text-slate-500">
              {step === 1 ? "בחר יום לפולואפ" : "בחר שעה והוסף הערה"}
            </p>
          </div>
        </div>

        {step === 1 && (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => pickDay(1)}
              className="h-12 text-sm font-semibold border-2 hover:border-orange-400 hover:bg-orange-50">מחר</Button>
            <Button variant="outline" onClick={() => pickDay(3)}
              className="h-12 text-sm font-semibold border-2 hover:border-orange-400 hover:bg-orange-50">עוד 3 ימים</Button>
            <Button variant="outline" onClick={() => pickDay(7)}
              className="h-12 text-sm font-semibold border-2 hover:border-orange-400 hover:bg-orange-50">שבוע</Button>
            <Button variant="outline" onClick={pickCustom}
              className="h-12 text-sm font-semibold border-2 hover:border-blue-400 hover:bg-blue-50">מותאם אישית</Button>
            <Button variant="ghost" onClick={() => onClose?.()}
              className="col-span-2 h-10 text-sm text-slate-500 hover:bg-slate-100">לא עכשיו</Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            {isCustom ? (
              <div>
                <p className="text-xs text-slate-500 mb-1">תאריך ושעה</p>
                <Input
                  type="datetime-local"
                  value={customDatetime}
                  onChange={e => setCustomDatetime(e.target.value)}
                  className="text-sm"
                />
              </div>
            ) : (
              <div>
                <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> בחר שעה ל-{dateLabel}
                </p>
                <div className="grid grid-cols-4 gap-1.5 mb-2">
                  {DEFAULT_TIMES.map(t => (
                    <Button
                      key={t}
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedTime(t)}
                      className={`text-xs h-9 font-semibold ${selectedTime === t ? "bg-orange-100 border-orange-500 text-orange-700" : "hover:border-orange-300"}`}
                    >
                      {t}
                    </Button>
                  ))}
                </div>
                <Input
                  type="time"
                  value={customTime}
                  onChange={e => { setCustomTime(e.target.value); setSelectedTime(""); }}
                  placeholder="שעה אחרת"
                  className="text-sm"
                />
              </div>
            )}

            <div>
              <p className="text-xs text-slate-500 mb-1">הערה קצרה (אופציונלי)</p>
              <Input
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="לדוגמה: לשאול על תקציב"
                className="text-right text-sm"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                ⚠️ {error}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="ghost" onClick={() => setStep(1)} className="flex-1 text-sm text-slate-500">חזרה</Button>
              <Button
                onClick={save}
                disabled={isSaving || !canSave}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold"
              >
                {isSaving ? "שומר..." : "קבע פולואפ"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}