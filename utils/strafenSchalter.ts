import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Nutzt dieser Stammtisch Strafen? (Spalte verordnung.tab_strafen_aktiv)
 *
 * Nicht jede Runde verteilt Strafen. Ist der Schalter aus, verschwinden
 * Strafen überall: Strafen-Tab am Abend und in der Kasse, Strafen in Bilanz,
 * Tabelle, Rückblick und Spielen, „+ Strafe“ auf Home, Strafenkatalog und
 * Zahlungslink in den Einstellungen. Bereits erfasste Strafen bleiben in der
 * Datenbank und tauchen nach dem Wiedereinschalten wieder auf.
 *
 * Der Wert kommt mit der Verordnung (loadVerordnung/saveVerordnung setzen ihn)
 * und wird pro Stammtisch gemerkt, damit beim Kaltstart nichts aufblitzt.
 */

let aktiv = true;
let geladenFuer: string | null = null;
const hoerer = new Set<(v: boolean) => void>();
const schluessel = (stammtischId: string) => `st_strafen_aktiv_${stammtischId}`;

/** Von loadVerordnung/saveVerordnung aufgerufen. */
export function setzeStrafenAktiv(stammtischId: string | null, wert: boolean): void {
  if (stammtischId) {
    geladenFuer = stammtischId;
    AsyncStorage.setItem(schluessel(stammtischId), wert ? "1" : "0").catch(() => {});
  }
  if (wert === aktiv) return;
  aktiv = wert;
  hoerer.forEach((h) => h(wert));
}

/** Gemerkten Wert beim Start bzw. Stammtischwechsel vorab laden. */
export async function strafenAktivVorladen(stammtischId: string | null): Promise<void> {
  if (!stammtischId || geladenFuer === stammtischId) return;
  try {
    const v = await AsyncStorage.getItem(schluessel(stammtischId));
    if (geladenFuer && geladenFuer !== stammtischId) return;
    setzeStrafenAktiv(null, v !== "0");
  } catch { /* bleibt beim Standard: an */ }
}

/** Für Code außerhalb von Komponenten. */
export function strafenAktiv(): boolean {
  return aktiv;
}

/** true, solange der Stammtisch Strafen nutzt. Aktualisiert sich beim Umschalten. */
export function useStrafenAktiv(): boolean {
  const [wert, setWert] = useState(aktiv);
  useEffect(() => {
    hoerer.add(setWert);
    setWert(aktiv);
    return () => { hoerer.delete(setWert); };
  }, []);
  return wert;
}
