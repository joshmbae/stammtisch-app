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

/** Schuldner einer Stammtischrechnung: alle Teilnehmer außer dem Zahler. */
export function schuldnerVon(e: KassenEintrag): string[] {
  return (e.teilnehmerIds ?? []).filter((id) => id !== e.bezahltVon);
}

/** Anteil pro Kopf einer Stammtischrechnung (ohne Teilnehmerliste: der ganze Betrag). */
export function anteilProKopf(e: KassenEintrag): number {
  return e.teilnehmerIds && e.teilnehmerIds.length > 0 ? e.betrag / e.teilnehmerIds.length : e.betrag;
}

/**
 * Ist eine Stammtischrechnung komplett zurückgezahlt? Altbestand ohne
 * Teilnehmerliste nutzt den einfachen beglichen-Schalter.
 */
export function rechnungBeglichen(e: KassenEintrag): boolean {
  if (e.teilnehmerIds && e.teilnehmerIds.length > 0) {
    return schuldnerVon(e).every((id) => (e.beglichenIds ?? []).includes(id));
  }
  return !!e.beglichen;
}

/** Was an einer Stammtischrechnung noch offen ist (an den Zahler). */
export function rechnungOffen(e: KassenEintrag): number {
  if (e.teilnehmerIds && e.teilnehmerIds.length > 0) {
    const offen = schuldnerVon(e).filter((id) => !(e.beglichenIds ?? []).includes(id));
    return offen.length * anteilProKopf(e);
  }
  return e.beglichen ? 0 : e.betrag;
}
