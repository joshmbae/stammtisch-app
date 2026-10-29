import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ensureAuthSession } from "../utils/supabase";
import { clearCache } from "../utils/cache";
import { getLegacySingleStammtischId, setActiveStammtischId as cacheStammtischId, clearActiveStammtischId, STAMMTISCH_STORAGE_KEY } from "../utils/storage";

const STAMMTISCH_KEY = STAMMTISCH_STORAGE_KEY;
const STAMMTISCH_NAME_KEY = "st_active_stammtisch_name";
/** Stammtische, in denen man auf diesem Gerät schon war – zum Wiederbetreten mit einem Tipp. */
const MEINE_KEY = "st_meine_stammtische";
/** Gleicher Schlüssel wie in SessionContext: das gewählte Profil. */
const SESSION_KEY = "st_active_member";

export interface GemerkterStammtisch {
  id: string;
  name: string;
  /** Zuletzt gewähltes Profil in diesem Stammtisch, damit man beim Zurückkommen direkt drin ist. */
  memberId?: string;
}

async function ladeMeine(): Promise<GemerkterStammtisch[]> {
  try {
    const raw = await AsyncStorage.getItem(MEINE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
/** Nach dieser Zeit ohne Auth-Antwort startet die App mit gecachten Daten weiter. */
const AUTH_TIMEOUT_MS = 5000;

interface StammtischContextType {
  stammtischId: string | null;
  stammtischName: string | null;
  stammtischLoaded: boolean;
  setActiveStammtisch: (id: string, name: string) => Promise<void>;
  clearStammtisch: () => Promise<void>;
  /** Aus dem aktuellen Stammtisch raus, ohne ihn zu vergessen (Profil wird gemerkt). */
  stammtischVerlassen: (name?: string) => Promise<void>;
  /** Zurück in einen gemerkten Stammtisch; true, wenn das Profil schon feststeht. */
  stammtischBetreten: (s: GemerkterStammtisch) => Promise<boolean>;
  meineStammtische: GemerkterStammtisch[];
  stammtischVergessen: (id: string) => Promise<void>;
}

const StammtischContext = createContext<StammtischContextType>({
  stammtischId: null,
  stammtischName: null,
  stammtischLoaded: false,
  setActiveStammtisch: async () => {},
  clearStammtisch: async () => {},
  stammtischVerlassen: async () => {},
  stammtischBetreten: async () => false,
  meineStammtische: [],
  stammtischVergessen: async () => {},
});

export function StammtischProvider({ children }: { children: React.ReactNode }) {
  const [stammtischId, setStammtischId] = useState<string | null>(null);
  const [stammtischName, setStammtischName] = useState<string | null>(null);
  const [stammtischLoaded, setStammtischLoaded] = useState(false);
  const [meineStammtische, setMeine] = useState<GemerkterStammtisch[]>([]);

  useEffect(() => { resolveStammtisch(); }, []);

  async function meineSpeichern(liste: GemerkterStammtisch[]) {
    setMeine(liste);
    await AsyncStorage.setItem(MEINE_KEY, JSON.stringify(liste)).catch(() => {});
  }

  /** Eintrag hinzufügen oder aktualisieren; zuletzt genutzter steht oben. */
  async function merken(eintrag: GemerkterStammtisch) {
    const alt = await ladeMeine();
    const bisher = alt.find((x) => x.id === eintrag.id);
    await meineSpeichern([{ ...bisher, ...eintrag }, ...alt.filter((x) => x.id !== eintrag.id)]);
  }

  async function resolveStammtisch() {
    // Offline darf der Start nicht hier hängenbleiben: ohne Netz wirft
    // ensureAuthSession(), der Stammtisch würde nie aufgelöst und die Screens
    // kämen gar nicht erst bis zum Lesecache. Steht die Auswahl schon lokal,
    // reicht sie zum Anzeigen der gecachten Daten; Schreibzugriffe scheitern
    // ohnehin sichtbar.
    // Zusätzlich gedeckelt: der Auth-Client wiederholt fehlgeschlagene Logins
    // intern über lange Zeit, ohne Timeout bliebe der Start bei schlechtem
    // Netz minutenlang auf dem Splash stehen statt in die gecachte Ansicht zu
    // fallen.
    try {
      await Promise.race([
        ensureAuthSession(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Auth-Timeout")), AUTH_TIMEOUT_MS)),
      ]);
    } catch {
      // bewusst geschluckt — beim nächsten Start mit Netz zieht sich die
      // Session von selbst wieder.
    }
    const id = await AsyncStorage.getItem(STAMMTISCH_KEY);
    const name = await AsyncStorage.getItem(STAMMTISCH_NAME_KEY);
    setMeine(await ladeMeine());
    if (id) {
      // Bestehende Installationen: den aktuellen Stammtisch nachträglich merken.
      if (name) await merken({ id, name });
      cacheStammtischId(id);
      setStammtischId(id);
      setStammtischName(name);
      setStammtischLoaded(true);
      return;
    }
    // Bestandsinstallation ohne gespeicherte Auswahl: automatisch übernehmen,
    // wenn es genau einen (legacy) Stammtisch gibt.
    const legacyId = await getLegacySingleStammtischId().catch(() => null);
    if (legacyId) {
      await AsyncStorage.setItem(STAMMTISCH_KEY, legacyId);
      cacheStammtischId(legacyId);
      setStammtischId(legacyId);
      setStammtischName(null);
    }
    setStammtischLoaded(true);
  }

  async function setActiveStammtisch(id: string, name: string) {
    await merken({ id, name });
    await AsyncStorage.setItem(STAMMTISCH_KEY, id);
    await AsyncStorage.setItem(STAMMTISCH_NAME_KEY, name);
    cacheStammtischId(id);
    setStammtischId(id);
    setStammtischName(name);
  }

  async function clearStammtisch() {
    // Cache gehört zum verlassenen Stammtisch — sonst blitzen dessen Daten
    // beim nächsten Beitritt kurz im neuen Tenant auf.
    await clearCache();
    await AsyncStorage.removeItem(STAMMTISCH_KEY);
    await AsyncStorage.removeItem(STAMMTISCH_NAME_KEY);
    clearActiveStammtischId();
    setStammtischId(null);
    setStammtischName(null);
    // Gelöscht oder nicht mehr erreichbar: auch aus der Liste nehmen.
    if (stammtischId) await meineSpeichern((await ladeMeine()).filter((x) => x.id !== stammtischId));
  }

  async function stammtischVerlassen(name?: string) {
    if (stammtischId) {
      const memberId = (await AsyncStorage.getItem(SESSION_KEY)) ?? undefined;
      await merken({ id: stammtischId, name: name || stammtischName || "Stammtisch", memberId });
    }
    await clearCache();
    await AsyncStorage.multiRemove([STAMMTISCH_KEY, STAMMTISCH_NAME_KEY, SESSION_KEY]);
    clearActiveStammtischId();
    setStammtischId(null);
    setStammtischName(null);
  }

  async function stammtischBetreten(s: GemerkterStammtisch): Promise<boolean> {
    // Profil vor dem Wechsel setzen: die Session lädt es, sobald der Stammtisch steht.
    if (s.memberId) await AsyncStorage.setItem(SESSION_KEY, s.memberId);
    await setActiveStammtisch(s.id, s.name);
    return !!s.memberId;
  }

  async function stammtischVergessen(id: string) {
    await meineSpeichern((await ladeMeine()).filter((x) => x.id !== id));
  }

  return (
    <StammtischContext.Provider value={{
      stammtischId, stammtischName, stammtischLoaded,
      setActiveStammtisch, clearStammtisch,
      stammtischVerlassen, stammtischBetreten, meineStammtische, stammtischVergessen,
    }}>
      {children}
    </StammtischContext.Provider>
  );
}

export function useStammtisch() {
  return useContext(StammtischContext);
}
