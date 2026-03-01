import React, { useState, useEffect } from "react";
import { Clock, AlertTriangle } from "lucide-react";

const SLA_MINUTES = 30;

function getAgeParts(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 0) return { text: "עכשיו", minutes: 0 };
  const totalMinutes = Math.floor(diff / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return { text: `${days} ימים`, minutes: totalMinutes };
  if (hours > 0) return { text: `${hours} שע'`, minutes: totalMinutes };
  return { text: `${totalMinutes} דק'`, minutes: totalMinutes };
}

export default function AgeTimer({ createdAt, firstResponseAt, compact = false }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick(n => n + 1), 60000);
    return () => clearInterval(id);
  }, []);

  const ref = createdAt;
  const age = getAgeParts(ref);
  if (!age) return null;

  const overSLA = !firstResponseAt && age.minutes >= SLA_MINUTES;

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-medium ${overSLA ? 'text-red-600' : 'text-slate-500'}`}>
        {overSLA ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
        {age.text}
      </span>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold border ${
      overSLA
        ? 'bg-red-50 text-red-700 border-red-300'
        : 'bg-slate-50 text-slate-600 border-slate-200'
    }`}>
      {overSLA ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
      <span>לפני {age.text}</span>
    </div>
  );
}