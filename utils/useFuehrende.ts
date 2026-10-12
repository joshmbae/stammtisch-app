import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";
import { FuehrenderTitel, aktuellesJahr, fuehrendeTitel } from "./stats";
import { loadStatsDaten } from "./statsDaten";
import { getStammtischId } from "./storage";

/**
 * Wer führt gerade welche Wertung an? Für die Badges am Profilbild auf allen
 * Screens. Das Ergebnis liegt pro Stammtisch und Jahr im Speicher und wird
 * höchstens alle 60 Sekunden neu berechnet, damit nicht jeder Screen alle
 * Logs lädt.
 */
type Fuehrende = Map<string, FuehrenderTitel[]>;

const MAX_ALTER_MS = 60_000;
let cache: { schluessel: string; zeit: number; wert: Fuehrende } | null = null;
let laufend: Promise<Fuehrende> | null = null;
const abonnenten = new Set<(w: Fuehrende) => void>();

async function berechne(): Promise<Fuehrende> {
  const schluessel = `${await getStammtischId()}:${aktuellesJahr()}`;
  if (cache && cache.schluessel === schluessel && Date.now() - cache.zeit < MAX_ALTER_MS) return cache.wert;
  if (!laufend) {
    laufend = loadStatsDaten()
      .then((daten) => {
        const wert = fuehrendeTitel(daten, aktuellesJahr());
        cache = { schluessel, zeit: Date.now(), wert };
        abonnenten.forEach((fn) => fn(wert));
        return wert;
      })
      .finally(() => {
        laufend = null;
      });
  }
  return laufend;
}

/** Nach Änderungen (neue Strafe, Spiel-Eintrag) neu rechnen lassen. */
export function fuehrendeVeraltet() {
  cache = null;
}

export function useFuehrende(): Fuehrende {
  const [wert, setWert] = useState<Fuehrende>(() => cache?.wert ?? new Map());

  useEffect(() => {
    abonnenten.add(setWert);
    return () => {
      abonnenten.delete(setWert);
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      berechne().then(setWert).catch(() => {});
    }, [])
  );

  return wert;
}
