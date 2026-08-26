import { useCallback, useRef } from "react";

/**
 * Schützt async-Handler vor doppelter Ausführung durch mehrfaches Antippen
 * (z. B. wenn die App kurz hängt und man denselben Button wiederholt drückt).
 * Während ein Aufruf noch läuft, werden weitere Aufrufe einfach ignoriert.
 */
export function useSingleFlight() {
  const pending = useRef(false);

  return useCallback(async (fn: () => Promise<void>) => {
    if (pending.current) return;
    pending.current = true;
    try {
      await fn();
    } finally {
      pending.current = false;
    }
  }, []);
}
