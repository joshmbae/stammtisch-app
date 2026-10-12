import { KassenEintrag } from "../types";

/**
 * Kassenstand: Einnahmen minus Ausgaben. Stammtischrechnungen (abendkosten)
 * laufen nicht über die Kasse — einer zahlt, die anderen zahlen ihm zurück.
 */
export function saldo(eintraege: KassenEintrag[], bis?: Date): number {
  return eintraege.reduce((s, e) => {
    if (bis && new Date(e.datum) > bis) return s;
    if (e.typ === "einnahme") return s + e.betrag;
    if (e.typ === "ausgabe") return s - e.betrag;
    return s;
  }, 0);
}

/** Kassenstand am Ende der letzten `anzahl` Monate (der laufende zählt bis jetzt), älteste zuerst. */
export function monatsSalden(eintraege: KassenEintrag[], anzahl = 6, now = new Date()): { monat: Date; stand: number }[] {
  const ergebnis: { monat: Date; stand: number }[] = [];
  for (let i = anzahl - 1; i >= 0; i--) {
    const monat = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ende = i === 0 ? now : new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
    ergebnis.push({ monat, stand: saldo(eintraege, ende) });
  }
  return ergebnis;
}
