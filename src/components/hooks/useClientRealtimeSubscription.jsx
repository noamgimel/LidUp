import { useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";

/**
 * Subscribes to real-time Client entity changes via Base44 SDK.
 * Filters events to only the current user's leads (by owner_email).
 * Calls onClientEvent({ type, id, data }) for each relevant event.
 *
 * Safe against:
 * - Double subscription (React Strict Mode)
 * - Events from other users
 * - Events with missing data
 */
export function useClientRealtimeSubscription({ currentUserEmail, onClientEvent }) {
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    if (!currentUserEmail) return;

    // Cleanup any previous subscription before registering a new one
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    const unsubscribe = base44.entities.Client.subscribe((event) => {
      // Ignore events with no data
      if (!event?.data) return;

      // Filter: only process events belonging to this user
      const ownerEmail = event.data.owner_email || event.data.created_by;
      if (ownerEmail !== currentUserEmail) return;

      onClientEvent({ type: event.type, id: event.id, data: event.data });
    });

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [currentUserEmail, onClientEvent]);
}