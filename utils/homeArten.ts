import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getStammtischId } from "./storage";
import { HomeArten } from "./terminPhase";

/**
 * Welche Termine oben auf Home stehen (nur Stammtische oder auch
 * Veranstaltungen) – persönliche Wahl, pro Stammtisch und Gerät. Wird bei
 * jedem Fokus neu gelesen, weil sie in den Einstellungen geändert wird.
 */
async function schluessel(): Promise<string> {
  return `st_home_arten_${await getStammtischId()}`;
}

export function useHomeArten(): [HomeArten, (a: HomeArten) => void] {
  const [arten, setArten] = useState<HomeArten>("stammtische");
  useFocusEffect(
    useCallback(() => {
      let aktiv = true;
      schluessel()
        .then((k) => AsyncStorage.getItem(k))
        .then((v) => { if (aktiv && (v === "alle" || v === "stammtische")) setArten(v); })
        .catch(() => {});
      return () => { aktiv = false; };
    }, [])
  );
  function setzen(a: HomeArten) {
    setArten(a);
    schluessel().then((k) => AsyncStorage.setItem(k, a)).catch(() => {});
  }
  return [arten, setzen];
}
