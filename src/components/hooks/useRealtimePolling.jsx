import { useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";

const POLL_INTERVAL_MS = 10_000;

/**
 * Polls for new/updated leads every POLL_INTERVAL_MS.
 * - Fetches only leads created or updated after lastSyncAt (delta).
 * - Calls onNewLeads(newLeads) when brand-new leads arrive.
 * - Calls onUpdatedLeads(updatedLeads) when existing leads were updated.
 * - Never runs two polls in parallel.
 * - Stops cleanly on unmount.
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
      // Fetch leads created after lastSyncAt
      const [created, updated] = await Promise.all([
        base44.asServiceRole.entities.Client.filter(
          { owner_email: userEmail, "created_date__gt": since },
          "-created_date",
          50
        ).catch(() => []),
        base44.asServiceRole.entities.Client.filter(
          { owner_email: userEmail, "updated_date__gt": since },
          "-updated_date",
          100
        ).catch(() => []),
      ]);

      // Also check created_by for manually created leads
      const [createdByMe, updatedByMe] = await Promise.all([
        base44.asServiceRole.entities.Client.filter(
          { created_by: userEmail, "created_date__gt": since },
          "-created_date",
          50
        ).catch(() => []),
        base44.asServiceRole.entities.Client.filter(
          { created_by: userEmail, "updated_date__gt": since },
          "-updated_date",
          100
        ).catch(() => []),
      ]);

      // Merge & deduplicate
      const mergeById = (...arrays) => {
        const map = new Map();
        arrays.flat().forEach(item => map.set(item.id, item));
        return Array.from(map.values());
      };

      const allCreated = mergeById(created, createdByMe);
      const allUpdated = mergeById(updated, updatedByMe);

      if (allCreated.length > 0) onNewLeads(allCreated);
      if (allUpdated.length > 0) onUpdatedLeads(allUpdated);

      // Advance sync cursor
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
    return () => {
      clearInterval(timerRef.current);
    };
  }, [poll, userEmail]);
}