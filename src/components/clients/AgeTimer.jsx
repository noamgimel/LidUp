import React, { useState, useEffect } from "react";
import { Clock, AlertTriangle } from "lucide-react";
import { getLeadReceivedAt, getAgeParts, SLA_MINUTES } from "@/components/utils/timeUtils";
import { useServerTime } from "@/components/utils/ServerTimeContext";

// createdAt is still supported for backward compat, but prefer passing client object
export default function AgeTimer({ client, createdAt, firstResponseAt, compact = false }) {
  const [, tick] = useState(0);
  const { getNowMs } = useServerTime();

  useEffect(() => {
    const id = setInterval(() => tick(n => n + 1), 30000);
    return () => clearInterval(id);
  }, []);

  // Use server-generated created_date as source of truth
  const receivedAt = client ? getLeadReceivedAt(client) : createdAt;
  const resolvedFirstResponseAt = client ? client.first_response_at : firstResponseAt;

  const age = getAgeParts(receivedAt, getNowMs());
  if (!age) return null;

  const overSLA = !resolvedFirstResponseAt && age.minutes >= SLA_MINUTES;

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
      <span>מועד קליטה: {age.text} לפני</span>
    </div>
  );
}