import { StammtischTermin } from "../types";

/**
 * In welcher Phase ist ein Termin? Wird aus der Uhrzeit berechnet, nicht
 * gespeichert: Zur Startzeit wird ein Abend von selbst „live", um 4 Uhr am
 * Folgetag ist er von selbst vorbei. Gespeichert wird nur, was jemand aktiv
 * tut („Abend starten" → startedAt, „Abend beenden" → endedAt).
 */
export type TerminPhase = "vorher" | "live" | "danach";

function amTag(iso: string, zeit: string): Date | null {
  const m = zeit.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const d = new Date(`${iso}T00:00:00`);
  d.setHours(parseInt(m[1], 10), parseInt(m[2], 10), 0, 0);
  return d;
}

/** Beginn: tatsächlich gestartet, sonst geplante Uhrzeit, sonst die Stammtischzeit. */
export function terminStart(t: StammtischTermin, stammtischzeit?: string): Date | null {
  if (t.startedAt) return new Date(t.startedAt);
  const zeit = t.startZeit || stammtischzeit;
  return zeit ? amTag(t.datum, zeit) : null;
}

/** Spätestes Ende ohne „Abend beenden": 4 Uhr am Morgen nach dem (letzten) Tag. */
export function terminAutoEnde(t: StammtischTermin): Date {
  const d = new Date(`${t.datumBis ?? t.datum}T00:00:00`);
  d.setDate(d.getDate() + 1);
  d.setHours(4, 0, 0, 0);
  return d;
}

/** Wann der Abend vorbei war bzw. ist — für „danach"-Anzeigen. */
export function terminEnde(t: StammtischTermin): Date {
  return t.endedAt ? new Date(t.endedAt) : terminAutoEnde(t);
}

export function terminPhase(t: StammtischTermin, now: Date, stammtischzeit?: string): TerminPhase {
  if (t.endedAt && new Date(t.endedAt) <= now) return "danach";
  if (now >= terminAutoEnde(t)) return "danach";
  const start = terminStart(t, stammtischzeit);
  if (start && now >= start) return "live";
  return "vorher";
}

export type HomeHero =
  | { phase: "live"; termin: StammtischTermin }
  | { phase: "danach"; termin: StammtischTermin }
  | { phase: "vorher"; termin: StammtischTermin }
  | { phase: "leer" };

/**
 * Welcher Termin oben auf Home steht: ein laufender Abend hat Vorrang, dann
 * der gerade vergangene (bis zum Ende des Folgetags), sonst der nächste.
 */
export function homeHero(termine: StammtischTermin[], now: Date, stammtischzeit?: string): HomeHero {
  const stammtische = termine.filter((t) => t.art === "stammtisch");
  const live = stammtische.find((t) => terminPhase(t, now, stammtischzeit) === "live");
  if (live) return { phase: "live", termin: live };

  const kuerzlich = stammtische
    .filter((t) => terminPhase(t, now, stammtischzeit) === "danach")
    .filter((t) => {
      const bis = terminEnde(t);
      const ende = new Date(bis);
      ende.setDate(ende.getDate() + 1);
      ende.setHours(23, 59, 59, 999);
      return now <= ende;
    })
    .sort((a, b) => terminEnde(b).getTime() - terminEnde(a).getTime())[0];
  if (kuerzlich) return { phase: "danach", termin: kuerzlich };

  const naechster = stammtische
    .filter((t) => terminPhase(t, now, stammtischzeit) === "vorher")
    .sort((a, b) => a.datum.localeCompare(b.datum) || (a.startZeit ?? "").localeCompare(b.startZeit ?? ""))[0];
  return naechster ? { phase: "vorher", termin: naechster } : { phase: "leer" };
}

/** Zuletzt vergangener Stammtisch ohne Zeitfenster – für „Letzter“ auf Home. */
export function letzterStammtisch(termine: StammtischTermin[], now: Date, stammtischzeit?: string): StammtischTermin | null {
  return termine
    .filter((t) => t.art === "stammtisch" && terminPhase(t, now, stammtischzeit) === "danach")
    .sort((a, b) => terminEnde(b).getTime() - terminEnde(a).getTime())[0] ?? null;
}

/**
 * Hero für Home mit Umschalter: ohne Wahl wie homeHero, sonst der nächste
 * bzw. letzte Stammtisch. Ein laufender Abend hat immer Vorrang.
 */
export function homeHeroMitWahl(
  termine: StammtischTermin[],
  now: Date,
  stammtischzeit: string | undefined,
  wahl: "naechster" | "letzter" | null
): { hero: HomeHero; umschaltbar: boolean } {
  const standard = homeHero(termine, now, stammtischzeit);
  if (standard.phase === "live") return { hero: standard, umschaltbar: false };
  const letzter = letzterStammtisch(termine, now, stammtischzeit);
  if (!letzter) return { hero: standard, umschaltbar: false };
  if (wahl === "letzter") return { hero: { phase: "danach", termin: letzter }, umschaltbar: true };
  if (wahl === "naechster") {
    const naechster = homeHero(termine.filter((t) => terminPhase(t, now, stammtischzeit) !== "danach"), now, stammtischzeit);
    return { hero: naechster, umschaltbar: true };
  }
  return { hero: standard, umschaltbar: true };
}
