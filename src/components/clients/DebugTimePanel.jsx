/**
 * DebugTimePanel — Debug component for verifying timezone correctness.
 * Only visible when ?debug=1 is in the URL.
 */
import React, { useState } from "react";
import { getLeadDebugInfo, TZ, getLeadReceivedAt } from "@/components/utils/timeUtils";
import { useServerTime } from "@/components/utils/ServerTimeContext";

export default function DebugTimePanel({ clients }) {
  const [expanded, setExpanded] = useState(false);
  const { serverOffsetMs, getNowMs } = useServerTime();

  if (!window.location.search.includes("debug=1")) return null;

  const now = new Date();
  const serverNow = new Date(getNowMs());
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
          <span className="text-green-300">client_now_utc: {now.toISOString()}</span>
          <span className="text-cyan-400">server_now_utc: {serverNow.toISOString()}</span>
          <span className="text-orange-400">server_offset_ms: <span className={Math.abs(serverOffsetMs) > 300000 ? "text-red-400 font-bold" : "text-green-400"}>{Math.round(serverOffsetMs)}ms ({Math.round(serverOffsetMs/60000)} דק')</span></span>
          <span className="text-purple-400">client_tz: {Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
          <span className="text-cyan-400">now_israel: {israelNow}</span>
        </div>
        <button onClick={() => setExpanded(e => !e)} className="text-yellow-300 underline ml-4">
          {expanded ? "הסתר" : "הצג הכל"}
        </button>
      </div>

      {(expanded ? sample : sample.slice(0, 5)).map(c => {
        const dbg = getLeadDebugInfo(c);
        const now = getNowMs(); // server-synced!

        // created_date diff (server-set — source of truth)
        const createdDateMs = c.created_date ? new Date(c.created_date).getTime() : null;
        const createdDateDiff = createdDateMs ? Math.round((now - createdDateMs) / 60000) : null;
        const createdDateOk = createdDateDiff !== null && createdDateDiff >= -1 && createdDateDiff < 35;

        // submission_date diff (may be frontend-written — can show bug)
        const submissionMs = c.submission_date ? new Date(c.submission_date).getTime() : null;
        const submissionDiff = submissionMs ? Math.round((now - submissionMs) / 60000) : null;

        // getLeadReceivedAt picks created_date (server)
        const receivedAt = getLeadReceivedAt(c);
        const receivedDiff = receivedAt ? Math.round((now - new Date(receivedAt).getTime()) / 60000) : null;

        const rtOk = Math.abs(dbg.roundTripTest?.error_seconds || 0) < 2;
        const allOk = createdDateOk;

        return (
          <div key={c.id} className={`mb-3 p-2 rounded border ${allOk ? "border-green-700" : "border-red-500 bg-red-900/20"}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-white font-bold">{c.name}</span>
              <span className={`text-xs font-bold ${allOk ? "text-green-400" : "text-red-400"}`}>
                {allOk ? "✅ created_date OK" : "❌ created_date diff WRONG"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-0.5">
              {/* Server-set timestamp (source of truth) */}
              <span className="col-span-2 text-yellow-300 font-bold mt-1">— source of truth (server) —</span>
              <span>created_date raw: <span className="text-cyan-300">{c.created_date || "—"}</span></span>
              <span>created_date diff: <span className={`font-bold ${createdDateOk ? "text-green-300" : "text-red-400"}`}>{createdDateDiff ?? "—"} דק'</span>
                <span className="text-gray-500 mr-1">(צריך 0–1 לליד חדש)</span>
              </span>

              {/* submission_date — may reveal frontend-timezone bug */}
              <span className="col-span-2 text-orange-400 font-bold mt-1">— submission_date (ייתכן frontend-written) —</span>
              <span>submission_date raw: <span className="text-cyan-300">{c.submission_date || "—"}</span></span>
              <span>submission_date diff: <span className={`font-bold ${submissionDiff === null || (submissionDiff >= -1 && submissionDiff < 35) ? "text-green-300" : "text-red-400"}`}>
                {submissionDiff ?? "—"} דק'
              </span>
                {submissionDiff !== null && createdDateDiff !== null && Math.abs(submissionDiff - createdDateDiff) > 90 && (
                  <span className="text-red-400 mr-2">⚠️ הפרש חשוד של {Math.abs(submissionDiff - createdDateDiff)} דק' מ-created_date — ייתכן בעיית TZ בטאמסטאמפ הזה</span>
                )}
              </span>

              {/* getLeadReceivedAt result */}
              <span className="col-span-2 text-green-400 font-bold mt-1">— getLeadReceivedAt (מה שמוצג ב-UI) —</span>
              <span>receivedAt: <span className="text-cyan-300">{receivedAt || "—"}</span></span>
              <span>diff: <span className={`font-bold ${receivedDiff !== null && receivedDiff >= -1 && receivedDiff < 35 ? "text-green-300" : "text-red-400"}`}>{receivedDiff ?? "—"} דק'</span></span>

              <span>computed_priority: <span className="text-yellow-300">{dbg.computed_priority}</span></span>
              <span>isSlaBreached: <span className={dbg.isSlaBreached ? "text-red-400" : "text-green-400"}>{String(dbg.isSlaBreached)}</span></span>
              {dbg.roundTripTest && (
                <span className="col-span-2">
                  roundTrip error: <span className={rtOk ? "text-green-400" : "text-red-400"}>{dbg.roundTripTest.error_seconds}s</span>
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