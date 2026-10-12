import { ThemeColors } from "../../constants/design";

export type Ton = "blue" | "mustard" | "coral" | "green" | "neutral";

/** Getönte Fläche + lesbare Vordergrundfarbe darauf, pro Theme. */
export function tonFarben(ton: Ton, c: ThemeColors): { bg: string; fg: string } {
  switch (ton) {
    case "blue": return { bg: c.blueBg, fg: c.blue };
    case "mustard": return { bg: c.mustardSoft, fg: c.mustardText };
    case "coral": return { bg: c.coralSoft, fg: c.coralText };
    case "green": return { bg: c.greenSoft, fg: c.greenText };
    default: return { bg: c.cardAlt, fg: c.textMid };
  }
}

const TOENE: Ton[] = ["blue", "mustard", "coral", "green"];

/**
 * Feste Farbe pro Kategorie ohne eigene Spalte in der Datenbank: aus der Id
 * abgeleitet, bleibt also bei jedem Öffnen gleich.
 */
export function tonFuer(schluessel: string): Ton {
  let h = 0;
  for (let i = 0; i < schluessel.length; i++) h = (h * 31 + schluessel.charCodeAt(i)) >>> 0;
  return TOENE[h % TOENE.length];
}

/** Feste Töne für die eingebauten Ranglisten, damit Badges sprechend gefärbt sind. */
export function tonFuerRangliste(key: string): Ton {
  if (key === "teilnahme") return "green";
  if (key === "strafen") return "blue";
  if (key === "verspaetung") return "coral";
  return tonFuer(key);
}
