import { useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";

// Poll every 60 seconds to avoid rate limiting
const POLL_INTERVAL_MS = 60_000;

/**
 * Polls for new/updated leads every POLL_INTERVAL_MS.
 * Uses only 2 API calls per poll (by owner_email, covers both manual & form leads).
 * Never runs two polls in parallel. Stops cleanly on unmount.
 */
export function useRealtimePolling({ userEmail, lastSyncAtRef, onNewLeads, onUpdatedLeads }) {
  const isPollingRef = useRef(false);
  const timerRef = useRef(null);

  const poll = useCallback(async () => {
    if (isPollingRef.current || !userEmail) return;
    isPollingRef.current = true;

    const since = lastSyncAtRef.current;
    const nowIso = new Date().toISOString();

    try {
      // 2 calls only: new leads & updated leads (filtered by owner_email which covers all lead types)
      const [created, updated] = await Promise.all([
        base44.entities.Client.filter(
          { owner_email: userEmail, "created_date__gt": since },
          "-created_date",
          50
        ).catch(() => []),
        base44.entities.Client.filter(
          { owner_email: userEmail, "updated_date__gt": since },
          "-updated_date",
          100
        ).catch(() => []),
      ]);

      if (created.length > 0) onNewLeads(created);
      if (updated.length > 0) onUpdatedLeads(updated);

      lastSyncAtRef.current = nowIso;
    } catch (err) {
      console.warn("[useRealtimePolling] poll error:", err?.message);
    } finally {
      isPollingRef.current = false;
    }
  }, [userEmail, lastSyncAtRef, onNewLeads, onUpdatedLeads]);

  useEffect(() => {
    if (!userEmail) return;
    timerRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(timerRef.current);
  }, [poll, userEmail]);
}