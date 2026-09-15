import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Lese-Cache für Serverdaten. Jeder Ladevorgang schreibt sein Ergebnis nach
 * AsyncStorage; schlägt der Netzwerkzugriff fehl (Funkloch im Wirtshaus,
 * Server nicht erreichbar), wird der zuletzt bekannte Stand zurückgegeben
 * statt zu werfen. Dadurch bleibt die App ohne Netz lesbar.
 *
 * Bewusst nur für Lesezugriffe: Schreibvorgänge (Strafe eintragen, zusagen,
 * ...) gehen weiterhin direkt an den Server und scheitern offline sichtbar —
 * eine Offline-Warteschlange wäre ein eigenes Thema.
 */

const PREFIX = "st_cache_";

// ─── Offline-Zustand ──────────────────────────────────────────────────────────
// Wird von withCache() gepflegt: sobald ein Ladevorgang nur noch aus dem Cache
// bedient werden konnte, gilt die App als offline — bis der nächste Zugriff
// wieder durchgeht. Screens zeigen darüber einen Hinweis an (OfflineBanner).

let offline = false;
const listeners = new Set<(value: boolean) => void>();

function setOffline(value: boolean): void {
  if (offline === value) return;
  offline = value;
  listeners.forEach((l) => l(value));
}

export function isOffline(): boolean {
  return offline;
}

/** Abonniert den Offline-Zustand (true = Daten kommen gerade aus dem Cache). */
export function useOffline(): boolean {
  const [value, setValue] = useState(offline);
  useEffect(() => {
    listeners.add(setValue);
    setValue(offline);
    return () => { listeners.delete(setValue); };
  }, []);
  return value;
}

// ─── Cache-Zugriff ────────────────────────────────────────────────────────────

async function readCache<T>(key: string): Promise<T | undefined> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

async function writeCache<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Cache ist ein Nice-to-have — ein voller Speicher darf den Ladevorgang nicht kippen.
  }
}

/**
 * Lädt über `loader` und legt das Ergebnis unter `key` ab. Scheitert der
 * Ladevorgang, wird der letzte gecachte Stand geliefert; gibt es keinen,
 * fliegt der ursprüngliche Fehler weiter an den aufrufenden Screen.
 */
export async function withCache<T>(key: string, loader: () => Promise<T>): Promise<T> {
  try {
    const data = await loader();
    setOffline(false);
    await writeCache(key, data);
    return data;
  } catch (error) {
    const cached = await readCache<T>(key);
    if (cached !== undefined) {
      setOffline(true);
      return cached;
    }
    throw error;
  }
}

/** Wirft den kompletten Cache weg (Stammtisch-Wechsel, Abmelden). */
export async function clearCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const ours = keys.filter((k) => k.startsWith(PREFIX));
    if (ours.length > 0) await AsyncStorage.multiRemove(ours);
  } catch {
    // s. o. — Aufräumen darf nie den Flow blockieren.
  }
  setOffline(false);
}
