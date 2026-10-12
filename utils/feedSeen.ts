import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getStammtischId } from "./storage";

/**
 * Bis zu welchem Zeitpunkt die Chronik gesehen wurde — pro Stammtisch und
 * Gerät. Steuert den Punkt an der Glocke auf Home.
 */
async function schluessel(): Promise<string> {
  return `st_feed_seen_${await getStammtischId()}`;
}

export async function markFeedSeen(bis: string = new Date().toISOString()): Promise<void> {
  try {
    await AsyncStorage.setItem(await schluessel(), bis);
  } catch {
    // Ohne Speicher bleibt der Punkt eben sichtbar — kein Grund für einen Fehler.
  }
}

/** Zeitpunkt der letzten Ansicht, aktualisiert sich bei jedem Fokus des Screens. */
export function useFeedSeen(): string | null {
  const [seen, setSeen] = useState<string | null>(null);
  useFocusEffect(
    useCallback(() => {
      let aktiv = true;
      schluessel()
        .then((k) => AsyncStorage.getItem(k))
        .then((v) => { if (aktiv) setSeen(v); })
        .catch(() => {});
      return () => { aktiv = false; };
    }, [])
  );
  return seen;
}

/** Ungelesen, wenn der neueste Eintrag jünger ist als die letzte Ansicht (noch nie gesehen = ungelesen). */
export function istUngelesen(neuesterEintrag: string | null | undefined, gesehen: string | null): boolean {
  if (!neuesterEintrag) return false;
  if (!gesehen) return true;
  // Als Zeitpunkt vergleichen: Supabase liefert "+00:00", toISOString() "Z".
  return Date.parse(neuesterEintrag) > Date.parse(gesehen);
}
