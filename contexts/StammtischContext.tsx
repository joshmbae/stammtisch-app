import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ensureAuthSession } from "../utils/supabase";
import { clearCache } from "../utils/cache";
import { getLegacySingleStammtischId, setActiveStammtischId as cacheStammtischId, clearActiveStammtischId, STAMMTISCH_STORAGE_KEY } from "../utils/storage";

const STAMMTISCH_KEY = STAMMTISCH_STORAGE_KEY;
const STAMMTISCH_NAME_KEY = "st_active_stammtisch_name";
/** Nach dieser Zeit ohne Auth-Antwort startet die App mit gecachten Daten weiter. */
const AUTH_TIMEOUT_MS = 5000;

interface StammtischContextType {
  stammtischId: string | null;
  stammtischName: string | null;
  stammtischLoaded: boolean;
  setActiveStammtisch: (id: string, name: string) => Promise<void>;
  clearStammtisch: () => Promise<void>;
}

const StammtischContext = createContext<StammtischContextType>({
  stammtischId: null,
  stammtischName: null,
  stammtischLoaded: false,
  setActiveStammtisch: async () => {},
  clearStammtisch: async () => {},
});

export function StammtischProvider({ children }: { children: React.ReactNode }) {
  const [stammtischId, setStammtischId] = useState<string | null>(null);
  const [stammtischName, setStammtischName] = useState<string | null>(null);
  const [stammtischLoaded, setStammtischLoaded] = useState(false);

  useEffect(() => { resolveStammtisch(); }, []);

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
    if (id) {
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
  }

  return (
    <StammtischContext.Provider value={{
      stammtischId, stammtischName, stammtischLoaded,
      setActiveStammtisch, clearStammtisch,
    }}>
      {children}
    </StammtischContext.Provider>
  );
}

export function useStammtisch() {
  return useContext(StammtischContext);
}
