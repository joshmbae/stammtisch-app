import { useEffect, useState } from "react";
import { AppState } from "react-native";

/** Ab so langer Pause im Hintergrund zählt das Zurückkommen als neues Öffnen. */
const PAUSE_MS = 5 * 60_000;

let offen = true; // Kaltstart zählt als Öffnen
let imHintergrundSeit: number | null = null;
const hoerer = new Set<() => void>();

AppState.addEventListener("change", (status) => {
  if (status === "background") {
    imHintergrundSeit = Date.now();
  } else if (status === "active") {
    if (imHintergrundSeit !== null && Date.now() - imHintergrundSeit >= PAUSE_MS) {
      offen = true;
      hoerer.forEach((h) => h());
    }
    imHintergrundSeit = null;
  }
});

/**
 * Wurde die App gerade (neu) geöffnet? Für zeitgesteuertes Landen, z. B.
 * direkt im laufenden Abend. Wer reagiert, ruft erledigt() auf, damit es
 * nur einmal pro Öffnen passiert.
 */
export function useAppGeoeffnet(): [boolean, () => void] {
  const [, neuZeichnen] = useState(0);
  useEffect(() => {
    const h = () => neuZeichnen((n) => n + 1);
    hoerer.add(h);
    return () => { hoerer.delete(h); };
  }, []);
  return [offen, () => { offen = false; }];
}
