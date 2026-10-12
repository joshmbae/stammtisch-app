import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";

/**
 * Aktuelle Uhrzeit, die im angegebenen Takt neu rendert — aber nur, solange
 * der Screen sichtbar ist. Damit springt z. B. die Termin-Phase von „vorher"
 * auf „live", ohne dass Hintergrund-Screens die ganze Zeit mitticken.
 */
export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date());
  useFocusEffect(
    useCallback(() => {
      setNow(new Date());
      const id = setInterval(() => setNow(new Date()), intervalMs);
      return () => clearInterval(id);
    }, [intervalMs])
  );
  return now;
}
