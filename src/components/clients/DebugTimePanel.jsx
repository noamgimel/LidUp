/**
 * DebugTimePanel — Debug component for verifying timezone correctness.
 * Only visible when ?debug=1 is in the URL.
 */
import React, { useState } from "react";
import { getLeadDebugInfo, TZ, getLeadReceivedAt } from "@/components/utils/timeUtils";

export default function DebugTimePanel({ clients }) {
  const [expanded, setExpanded] = useState(false);

  if (!window.location.search.includes("debug=1")) return null;

  const now = new Date();
  const israelNow = new Intl.DateTimeFormat("he-IL", {
    timeZone: TZ,
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false
  }).format(now);

  const sample = [...clients]
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .slice(0, 10);

  return (
    <div className="bg-black text-green-400 font-mono text-xs rounded-xl p-4 border border-green-800 mb-4 overflow-auto">
      <div className="flex items-center justify-between mb-3">
        <div className="flex flex-wrap gap-3">
          <span className="text-yellow-400 font-bold">🔍 DEBUG MODE</span>
          <span className="text-green-300">now_utc: {now.toISOString()}</span>
          <span className="text-cyan-400">now_israel: {israelNow}</span>
        </div>
        <button onClick={() => setExpanded(e => !e)} className="text-yellow-300 underline ml-4">
          {expanded ? "הסתר" : "הצג הכל"}
        </button>
      </div>

      {(expanded ? sample : sample.slice(0, 5)).map(c => {
        const dbg = getLeadDebugInfo(c);
        const diffOk = dbg.diff_minutes !== null && dbg.diff_minutes >= -1 && dbg.diff_minutes < 35;
        const rtOk = dbg.roundTripTest?.error_seconds === 0 || Math.abs(dbg.roundTripTest?.error_seconds || 0) < 2;
        const allOk = diffOk;
        return (
          <div key={c.id} className={`mb-3 p-2 rounded border ${allOk ? "border-green-700" : "border-red-500 bg-red-900/20"}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-white font-bold">{c.name}</span>
              <span className={`text-xs font-bold ${allOk ? "text-green-400" : "text-red-400"}`}>
                {allOk ? "✅ diff OK" : "❌ diff WRONG — likely timezone offset bug"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-0.5">
              <span>created_at_raw: <span className="text-cyan-300">{dbg.created_at_raw}</span></span>
              <span>israel_display: <span className="text-cyan-300">{dbg.israel_display}</span></span>
              <span>diff_minutes: <span className={`font-bold ${diffOk ? "text-green-300" : "text-red-400"}`}>{dbg.diff_minutes}</span>
                <span className="text-gray-500 mr-1">(should be 0–30 for new lead)</span>
              </span>
              <span>computed_priority: <span className="text-yellow-300">{dbg.computed_priority}</span></span>
              <span>isSlaBreached: <span className={dbg.isSlaBreached ? "text-red-400" : "text-green-400"}>{String(dbg.isSlaBreached)}</span></span>
              {dbg.roundTripTest && (
                <span>
                  roundTrip error: <span className={rtOk ? "text-green-400" : "text-red-400"}>
                    {dbg.roundTripTest.error_seconds}s
                  </span>
                  <span className="text-gray-500 mr-1">({dbg.roundTripTest.israel_local} → {dbg.roundTripTest.back_to_utc})</span>
                </span>
              )}
            </div>
          </div>
        );
      })}
      <div className="text-gray-500 mt-2 text-xs">להסרת Debug: הסר ?debug=1 מה-URL</div>
    </div>
  );
}