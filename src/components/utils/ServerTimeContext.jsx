/**
 * ServerTimeContext — מספק serverOffsetMs לכל האפליקציה.
 *
 * serverOffsetMs = serverNowMs - clientNowMs (בעת אתחול)
 *
 * שימוש: const { getNowMs } = useServerTime();
 * getNowMs() מחזיר Date.now() + serverOffsetMs — זמן "נכון" מול השרת.
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getServerNow } from "@/functions/getServerNow";

const ServerTimeContext = createContext({ serverOffsetMs: 0, getNowMs: () => Date.now(), ready: false });

export function ServerTimeProvider({ children }) {
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchOffset = async () => {
      try {
        const clientBefore = Date.now();
        const res = await getServerNow({});
        const clientAfter = Date.now();
        const data = res?.data;
        if (data?.serverNowMs && !cancelled) {
          // Estimate round-trip latency and adjust
          const latencyMs = (clientAfter - clientBefore) / 2;
          const serverMs = data.serverNowMs + latencyMs;
          const offset = serverMs - clientAfter;
          setServerOffsetMs(offset);
          console.log(`[ServerTime] offset=${Math.round(offset)}ms (server=${data.serverNowIso}, latency=${Math.round(latencyMs)}ms)`);
        }
      } catch (e) {
        console.warn("[ServerTime] failed to fetch server time, using Date.now() as fallback:", e.message);
      } finally {
        if (!cancelled) setReady(true);
      }
    };
    fetchOffset();
    return () => { cancelled = true; };
  }, []);

  const getNowMs = useCallback(() => Date.now() + serverOffsetMs, [serverOffsetMs]);

  return (
    <ServerTimeContext.Provider value={{ serverOffsetMs, getNowMs, ready }}>
      {children}
    </ServerTimeContext.Provider>
  );
}

export function useServerTime() {
  return useContext(ServerTimeContext);
}