import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clock } from "lucide-react";
import { addDays, format } from "date-fns";
import { israelLocalToUtcIso, TZ } from "@/components/utils/timeUtils";

const DEFAULT_TIMES = ["09:00", "12:00", "16:00", "19:00"];

/**
 * Reusable inline followup scheduling form.
 * Props:
 *   onSave(iso, note)
 *   isSaving
 *   initialDatetime (UTC ISO — for edit mode)
 *   initialNote (string — for edit mode)
 *   isReschedule (bool — changes button label)
 */
export default function FollowupForm({ onSave, isSaving, initialDatetime, initialNote, isReschedule }) {
  // Parse initial datetime to Israel local for the input
  const toLocalStr = (utcStr) => {
    if (!utcStr) return "";
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: TZ,
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", hour12: false
      }).formatToParts(new Date(utcStr));
      const get = (t) => parts.find(p => p.type === t)?.value || "00";
      let h = get("hour");
      if (h === "24") h = "00";
      return `${get("year")}-${get("month")}-${get("day")}T${h}:${get("minute")}`;
    } catch { return ""; }
  };

  const [step, setStep] = useState(initialDatetime ? 2 : 1);
  const [selectedDate, setSelectedDate] = useState(null);
  const [isCustom, setIsCustom] = useState(!!initialDatetime);
  const [customDatetime, setCustomDatetime] = useState(toLocalStr(initialDatetime));
  const [selectedTime, setSelectedTime] = useState("");
  const [customTime, setCustomTime] = useState("");
  const [note, setNote] = useState(initialNote || "");

  const pickDay = (days) => {
    const d = addDays(new Date(), days);
    d.setHours(9, 0, 0, 0);
    setSelectedDate(d);
    setIsCustom(false);
    setStep(2);
  };

  const buildIso = () => {
    if (isCustom) {
      if (!customDatetime) return null;
      return israelLocalToUtcIso(customDatetime);
    }
    if (!selectedDate) return null;
    const time = selectedTime || customTime;
    if (!time) return null;
    const dateStr = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(selectedDate);
    return israelLocalToUtcIso(`${dateStr}T${time}`);
  };

  const canSave = isCustom ? !!customDatetime : !!(selectedTime || customTime);

  const dateLabel = selectedDate ? format(selectedDate, "dd/MM") : null;

  const handleSave = () => {
    const iso = buildIso();
    if (!iso) return;
    onSave(iso, note);
  };

  return (
    <div className="space-y-3">
      {step === 1 && (
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => pickDay(1)} className="h-10 text-sm font-semibold hover:border-orange-400 hover:bg-orange-50">מחר</Button>
          <Button variant="outline" onClick={() => pickDay(3)} className="h-10 text-sm font-semibold hover:border-orange-400 hover:bg-orange-50">עוד 3 ימים</Button>
          <Button variant="outline" onClick={() => pickDay(7)} className="h-10 text-sm font-semibold hover:border-orange-400 hover:bg-orange-50">שבוע</Button>
          <Button variant="outline" onClick={() => { setIsCustom(true); setStep(2); }} className="h-10 text-sm font-semibold hover:border-blue-400 hover:bg-blue-50">מותאם אישית</Button>
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
                className="text-sm bg-white"
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
                className="text-sm bg-white"
              />
            </div>
          )}

          <Input
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="הערה קצרה (אופציונלי)"
            className="text-right text-sm bg-white"
          />

          <div className="flex gap-2">
            {!initialDatetime && (
              <Button variant="ghost" onClick={() => setStep(1)} className="flex-1 text-sm text-slate-500">חזרה</Button>
            )}
            <Button
              onClick={handleSave}
              disabled={isSaving || !canSave}
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold"
            >
              {isSaving ? "שומר..." : isReschedule ? "עדכן פולואפ" : "קבע פולואפ"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}