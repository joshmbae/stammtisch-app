import {
  MemberProfile,
  StammtischTermin,
  VerspätungLog,
  SpielLog,
  StrafLog,
  Spiel,
  SpielEreignisTyp,
} from "../types";
import { formatEuro } from "./format";

/**
 * Gemeinsame Rechenbasis für alle Ranglisten — genutzt von den Ranglisten,
 * vom Mitgliedsprofil (welche Jahrestitel hat jemand geholt) und von den
 * Sieger-Badges. Bewusst rein funktional und ohne Datenzugriff, damit alle
 * drei Stellen garantiert dieselben Zahlen zeigen.
 *
 * Gewertet wird nach Kalenderjahr (1.1.–31.12.).
 */

export const ALLZEIT = "allzeit";

/** Ein Kalenderjahr als "2026" oder ALLZEIT für die Gesamtwertung. */
export type JahrFilter = string;

export interface StatsDaten {
  members: MemberProfile[];
  termine: StammtischTermin[];
  verspätungLogs: VerspätungLog[];
  spielLogs: SpielLog[];
  strafLogs: StrafLog[];
  spiele: { spiel: Spiel; ereignisTypen: SpielEreignisTyp[] }[];
}

export interface RangEintrag {
  member: MemberProfile;
  wert: number;
  /** Aufbereiteter Wert für die Anzeige, z. B. "185,00 €" */
  anzeige: string;
  label: string;
  sub?: string;
  /**
   * Platz ab 1. Gleiche Werte teilen sich den Platz, der nächste Platz wird
   * entsprechend übersprungen (12, 12, 10 → 1., 1., 3.) — sonst bekäme bei
   * Gleichstand einer Gold und der andere Silber.
   */
  platz: number;
}

export interface Rangliste {
  key: string;
  emoji: string;
  titel: string;
  /** Kurzform für Badges und Titel-Chips, z. B. "Verspätung" */
  kurz: string;
  untertitel: string;
  eintraege: RangEintrag[];
}

/** Titel, den jemand in einem bestimmten Jahr geholt hat (Platz 1). */
export interface Jahrestitel {
  jahr: string;
  ranglisteKey: string;
  emoji: string;
  /** Kurzform für Badges, z. B. "Anwesenheit" */
  titel: string;
}

// ─── Jahr-Helfer ──────────────────────────────────────────────────────────────

const jahrVon = (iso: string): string => iso.slice(0, 4);

const imJahr = (iso: string | undefined, jahr: JahrFilter): boolean =>
  jahr === ALLZEIT || (!!iso && jahrVon(iso) === jahr);

export function aktuellesJahr(): string {
  return String(new Date().getFullYear());
}

/**
 * Alle Jahre, für die überhaupt Daten vorliegen — absteigend, das laufende
 * Jahr immer dabei, damit der Filter nicht leer wirkt, solange noch nichts
 * passiert ist.
 */
export function verfuegbareJahre(daten: StatsDaten): string[] {
  const jahre = new Set<string>([aktuellesJahr()]);
  daten.termine.forEach((t) => jahre.add(jahrVon(t.datum)));
  daten.verspätungLogs.forEach((l) => jahre.add(jahrVon(l.datum)));
  daten.spielLogs.forEach((l) => jahre.add(jahrVon(l.loggedAt)));
  daten.strafLogs.forEach((l) => jahre.add(jahrVon(l.loggedAt)));
  return [...jahre].sort((a, b) => b.localeCompare(a));
}

// ─── Ranglisten ───────────────────────────────────────────────────────────────

/** Vergibt Plätze auf einer bereits absteigend sortierten Liste (Gleichstand teilt den Platz). */
function mitPlatz<T extends { wert: number }>(eintraege: T[]): (T & { platz: number })[] {
  let letzterWert: number | null = null;
  let letzterPlatz = 0;
  return eintraege.map((e, i) => {
    if (letzterWert === null || e.wert !== letzterWert) {
      letzterPlatz = i + 1;
      letzterWert = e.wert;
    }
    return { ...e, platz: letzterPlatz };
  });
}

export function computeRanglisten(daten: StatsDaten, jahr: JahrFilter): Rangliste[] {
  const { members, termine, verspätungLogs, spielLogs, strafLogs, spiele } = daten;
  if (members.length === 0) return [];

  const stammtische = termine.filter((t) => t.art === "stammtisch" && imJahr(t.datum, jahr));

  const listen: Rangliste[] = [];

  // Teilnahme — nur Termine ab Mitgliedsbeginn, damit später Beigetretene
  // nicht automatisch hinten liegen (gleiche Regel wie anwesenheitsQuote).
  const teilnahme = members
    .map((m) => {
      const seit = m.mitgliedSeit.slice(0, 10);
      const relevant = stammtische.filter((t) => t.datum >= seit);
      const dabei = relevant.filter((t) => (t.anwesenheit ?? []).includes(m.id)).length;
      const pct = relevant.length > 0 ? Math.round((dabei / relevant.length) * 100) : null;
      return {
        member: m,
        wert: dabei,
        anzeige: String(dabei),
        label: "Abende",
        sub: pct !== null ? `${pct} % Anwesenheit` : undefined,
      };
    })
    .sort((a, b) => b.wert - a.wert);
  listen.push({
    key: "teilnahme",
    emoji: "🏆",
    titel: "Teilnahme-Rangliste",
    kurz: "Teilnahme",
    untertitel: `${stammtische.length} ${stammtische.length === 1 ? "Stammtisch" : "Stammtische"}${jahr === ALLZEIT ? " insgesamt" : ""}`,
    eintraege: mitPlatz(teilnahme),
  });

  // Spiele — pro Spiel und Ereignistyp eine eigene Liste
  for (const { spiel, ereignisTypen } of spiele) {
    for (const et of ereignisTypen) {
      const eintraege = members
        .map((m) => ({
          member: m,
          wert: spielLogs.filter(
            (l) => l.memberId === m.id && l.spielId === spiel.id &&
                   l.ereignisTypId === et.id && imJahr(l.loggedAt, jahr)
          ).length,
        }))
        .filter((e) => e.wert > 0)
        .sort((a, b) => b.wert - a.wert)
        .map((e) => ({ ...e, anzeige: String(e.wert), label: et.label }));
      if (eintraege.length === 0) continue;
      listen.push({
        key: `spiel_${et.id}`,
        emoji: et.emoji ?? spiel.emoji ?? "🎮",
        titel: `${spiel.name} — ${et.label}`,
        kurz: et.label,
        untertitel: `Wer hat am meisten „${et.label}"`,
        eintraege: mitPlatz(eintraege),
      });
    }
  }

  // Verspätungen
  const verspaetung = members
    .map((m) => ({
      member: m,
      wert: verspätungLogs
        .filter((l) => l.memberId === m.id && imJahr(l.datum, jahr))
        .reduce((s, l) => s + l.minutenVerspätet, 0),
    }))
    .filter((e) => e.wert > 0)
    .sort((a, b) => b.wert - a.wert)
    .map((e) => ({ ...e, anzeige: String(e.wert), label: "Min." }));
  if (verspaetung.length > 0) {
    listen.push({
      key: "verspaetung",
      emoji: "⏱️",
      titel: "Verspätungs-Rangliste",
      kurz: "Verspätung",
      untertitel: "Verspätungsminuten",
      eintraege: mitPlatz(verspaetung),
    });
  }

  // Strafen
  const strafen = members
    .map((m) => {
      const eigene = strafLogs.filter((l) => l.memberId === m.id && imJahr(l.loggedAt, jahr));
      const offen = eigene.filter((l) => !l.beglichen).reduce((s, l) => s + l.betrag, 0);
      return {
        member: m,
        wert: eigene.reduce((s, l) => s + l.betrag, 0),
        offen,
      };
    })
    .filter((e) => e.wert > 0)
    .sort((a, b) => b.wert - a.wert)
    .map((e) => ({
      member: e.member,
      wert: e.wert,
      anzeige: `${formatEuro(e.wert)} €`,
      label: "Gesamt",
      sub: e.offen > 0 ? `⚠️ ${formatEuro(e.offen)} € noch offen` : "✅ alles beglichen",
    }));
  if (strafen.length > 0) {
    listen.push({
      key: "strafen",
      emoji: "💰",
      titel: "Strafen-Rangliste",
      kurz: "Strafen",
      untertitel: "Strafbeträge",
      eintraege: mitPlatz(strafen),
    });
  }

  return listen;
}

// ─── Sieger & Titel ───────────────────────────────────────────────────────────

/**
 * Wer steht in dieser Liste auf Platz 1? Bei Gleichstand gewinnen alle
 * Beteiligten den Titel — am Stammtisch wird darüber ohnehin diskutiert.
 * Ein Wert von 0 zählt nicht als Sieg.
 */
export function siegerIds(liste: Rangliste): string[] {
  const best = liste.eintraege[0];
  if (!best || best.wert <= 0) return [];
  return liste.eintraege.filter((e) => e.wert === best.wert).map((e) => e.member.id);
}

/** Alle abgeschlossenen und laufenden Jahrestitel eines Mitglieds, neueste zuerst. */
export function jahresTitelFuer(daten: StatsDaten, memberId: string): Jahrestitel[] {
  const titel: Jahrestitel[] = [];
  for (const jahr of verfuegbareJahre(daten)) {
    for (const liste of computeRanglisten(daten, jahr)) {
      if (siegerIds(liste).includes(memberId)) {
        titel.push({ jahr, ranglisteKey: liste.key, emoji: liste.emoji, titel: liste.kurz });
      }
    }
  }
  return titel;
}

/**
 * Mitglieds-Id -> Titel, die diese Person im angegebenen Jahr gerade anführt.
 * Grundlage für das Krönchen am Namen.
 */
export function fuehrendeTitel(daten: StatsDaten, jahr: JahrFilter): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const liste of computeRanglisten(daten, jahr)) {
    for (const id of siegerIds(liste)) {
      map.set(id, [...(map.get(id) ?? []), liste.kurz]);
    }
  }
  return map;
}
