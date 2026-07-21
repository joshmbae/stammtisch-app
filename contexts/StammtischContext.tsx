import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLegacySingleStammtischId, setActiveStammtischId as cacheStammtischId } from "../utils/storage";

const STAMMTISCH_KEY = "st_active_stammtisch";
const STAMMTISCH_NAME_KEY = "st_active_stammtisch_name";

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
    const legacyId = await getLegacySingleStammtischId();
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
    await AsyncStorage.removeItem(STAMMTISCH_KEY);
    await AsyncStorage.removeItem(STAMMTISCH_NAME_KEY);
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
