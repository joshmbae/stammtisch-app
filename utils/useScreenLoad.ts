import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";

/**
 * Kapselt das Lade-Muster aller Daten-Screens: laden beim Fokussieren,
 * Fehler abfangen statt sie als unbehandelte Rejection verpuffen zu lassen,
 * und Pull-to-Refresh.
 *
 * Vorher setzte jeder Screen sein `loading` selbst und hatte kein catch —
 * ein Netzwerkfehler ließ den Spinner für immer stehen, ohne Meldung und
 * ohne Möglichkeit, es nochmal zu versuchen.
 */
export function useScreenLoad(load: () => Promise<void>, deps: unknown[] = []) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Der Screen gibt load() meist als frische Closure herein; über die Ref
  // bleibt run() stabil und der Fokus-Effekt feuert nicht bei jedem Render.
  const loadRef = useRef(load);
  loadRef.current = load;

  const run = useCallback(async (mode: "initial" | "refresh") => {
    if (mode === "refresh") setRefreshing(true);
    try {
      await loadRef.current();
      setError(null);
    } catch (e) {
      setError(fehlertext(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useFocusEffect(
    useCallback(() => {
      run("initial");
    }, [run])
  );

  return {
    loading,
    refreshing,
    error,
    /** Für RefreshControl.onRefresh */
    onRefresh: useCallback(() => { run("refresh"); }, [run]),
    /** Für den „Erneut versuchen"-Knopf im Fehlerzustand */
    retry: useCallback(() => { setLoading(true); run("initial"); }, [run]),
  };
}

function fehlertext(e: unknown): string {
  const raw = e instanceof Error ? e.message : typeof e === "string" ? e : "";
  if (/fetch|network|timeout|Failed to fetch/i.test(raw)) {
    return "Keine Verbindung zum Server. Prüf dein Netz und versuch's nochmal.";
  }
  return raw.trim() || "Da ist etwas schiefgelaufen.";
}
