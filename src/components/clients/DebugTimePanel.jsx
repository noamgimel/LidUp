/**
 * DebugTimePanel — Debug component for verifying timezone correctness.
 * Shows raw UTC data and computed diff for each lead.
 * Only visible when ?debug=1 is in the URL.
 */
import React, { useState } from "react";
import { getLeadDebugInfo, TZ } from "@/components/utils/timeUtils";

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

  // Show only the 10 most recent
  const sample = [...clients]
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .slice(0, 10);

  return (
    <div className="bg-black text-green-400 font-mono text-xs rounded-xl p-4 border border-green-800 mb-4 overflow-auto">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-yellow-400 font-bold">🔍 DEBUG MODE</span>
          <span className="text-green-300 mr-3">now_utc: {now.toISOString()}</span>
          <span className="text-cyan-400">now_israel: {israelNow}</span>
        </div>
        <button
          onClick={() => setExpanded(e => !e)}
          className="text-yellow-300 underline"
        >
          {expanded ? "הסתר" : "הצג הכל"}
        </button>
      </div>

      {(expanded ? sample : sample.slice(0, 3)).map(c => {
        const dbg = getLeadDebugInfo(c);
        const ok = dbg.diff_minutes !== null && dbg.diff_minutes >= 0 && dbg.diff_minutes < 35;
        return (
          <div key={c.id} className={`mb-2 p-2 rounded border ${ok ? "border-green-700" : "border-red-600 bg-red-900/20"}`}>
            <div className="text-white font-bold">{c.name} <span className={`text-xs ${ok ? "text-green-400" : "text-red-400"}`}>{ok ? "✅ OK" : "❌ WRONG"}</span></div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-1">
              <span>created_at_raw: <span className="text-cyan-300">{dbg.created_at_raw}</span></span>
              <span>israel_display: <span className="text-cyan-300">{dbg.israel_display}</span></span>
              <span>diff_minutes: <span className={`font-bold ${ok ? "text-green-300" : "text-red-400"}`}>{dbg.diff_minutes}</span></span>
              <span>computed_priority: <span className="text-yellow-300">{dbg.computed_priority}</span></span>
              <span>isSlaBreached: <span className={dbg.isSlaBreached ? "text-red-400" : "text-green-400"}>{String(dbg.isSlaBreached)}</span></span>
              <span>now_ms: <span className="text-gray-400">{dbg.now_ms}</span></span>
            </div>
          </div>
        );
      })}
      <div className="text-gray-500 mt-2 text-xs">להסרת Debug: הסר ?debug=1 מה-URL</div>
    </div>
  );
}