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

    // אם כבר יש offset מהסשן הנוכחי — משתמשים בו מיד (ללא חסימה)
    const cached = sessionStorage.getItem('serverOffsetMs');
    if (cached !== null) {
      setServerOffsetMs(Number(cached));
      setReady(true);
    }

    const fetchOffset = async () => {
      try {
        const clientBefore = Date.now();
        const res = await getServerNow({});
        const clientAfter = Date.now();
        const data = res?.data ?? res;
        if (data?.serverNowMs && !cancelled) {
          const latencyMs = (clientAfter - clientBefore) / 2;
          const serverMs = data.serverNowMs + latencyMs;
          const offset = serverMs - clientAfter;
          setServerOffsetMs(offset);
          sessionStorage.setItem('serverOffsetMs', String(offset));
          console.log(`[ServerTime] offset=${Math.round(offset)}ms (latency=${Math.round(latencyMs)}ms)`);
        }
      } catch (e) {
        console.warn("[ServerTime] failed, using Date.now():", e.message);
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