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
import { toLocalIsoDate } from "./date";

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
 * Nur Termine, die schon stattgefunden haben. `anwesenheit` führt zugleich die
 * RSVP-Zusagen — ohne diesen Schnitt zählten Zusagen für kommende Abende als
 * Teilnahme, und ein Dezember-Termin mit zehn Zusagen hätte die Jahreswertung
 * entschieden, bevor jemand dort war.
 */
function stattgefunden(termine: StammtischTermin[]): StammtischTermin[] {
  const heute = toLocalIsoDate(new Date());
  return termine.filter((t) => t.datum <= heute);
}

/**
 * Alle Jahre, für die überhaupt Daten vorliegen — absteigend, das laufende
 * Jahr immer dabei, damit der Filter nicht leer wirkt, solange noch nichts
 * passiert ist.
 */
export function verfuegbareJahre(daten: StatsDaten): string[] {
  const jahre = new Set<string>([aktuellesJahr()]);
  stattgefunden(daten.termine).forEach((t) => jahre.add(jahrVon(t.datum)));
  daten.verspätungLogs.forEach((l) => jahre.add(jahrVon(l.datum)));
  daten.spielLogs.forEach((l) => jahre.add(jahrVon(l.loggedAt)));
  daten.strafLogs.forEach((l) => jahre.add(jahrVon(l.loggedAt)));
  // Künftige Jahre gehören nicht in den Filter — sie entstehen nur durch
  // vorausgeplante Termine, für die es noch nichts zu werten gibt.
  const jetzt = aktuellesJahr();
  return [...jahre].filter((j) => j <= jetzt).sort((a, b) => b.localeCompare(a));
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

  const stammtische = stattgefunden(termine).filter((t) => t.art === "stammtisch" && imJahr(t.datum, jahr));

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
    emoji: "✅",
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

/** Eine Wertung, die jemand gerade anführt — Emoji für das Badge, Titel für die Vorlesehilfe. */
export interface FuehrenderTitel {
  /** Ranglisten-Key, bestimmt die feste Farbe des Badges. */
  key: string;
  emoji: string;
  titel: string;
}

/**
 * Mitglieds-Id -> Wertungen, die diese Person im angegebenen Jahr anführt,
 * in der Reihenfolge der Ranglisten. Grundlage für das Badge am Profilbild;
 * angezeigt wird das Icon der erstgenannten Wertung.
 */
export function fuehrendeTitel(daten: StatsDaten, jahr: JahrFilter): Map<string, FuehrenderTitel[]> {
  const map = new Map<string, FuehrenderTitel[]>();
  for (const liste of computeRanglisten(daten, jahr)) {
    for (const id of siegerIds(liste)) {
      map.set(id, [...(map.get(id) ?? []), { key: liste.key, emoji: liste.emoji, titel: liste.kurz }]);
    }
  }
  return map;
}

// ─── Verlauf ──────────────────────────────────────────────────────────────────

export interface VerlaufPunkt {
  /** Stichtag "YYYY-MM-DD" — gewertet wird alles bis einschließlich dieses Tages. */
  datum: string;
  /** true für den nachgezogenen Stand "heute" nach dem letzten Stammtisch. */
  heute: boolean;
  /** true für den Endstand 31.12. eines abgeschlossenen Jahres. */
  jahresende?: boolean;
}

export interface RangVerlauf {
  punkte: VerlaufPunkt[];
  /** Ranglisten-Key -> Mitglieds-Id -> Platz je Punkt (null = an dem Tag noch nicht in der Liste). */
  plaetze: Map<string, Map<string, (number | null)[]>>;
}

/** Alle Daten, die bis einschließlich `bis` bekannt waren — Basis für den Stand an einem Stichtag. */
function datenBis(daten: StatsDaten, bis: string): StatsDaten {
  const bisTag = (iso: string) => iso.slice(0, 10) <= bis;
  return {
    ...daten,
    members: daten.members.filter((m) => bisTag(m.mitgliedSeit)),
    termine: daten.termine.filter((t) => t.datum <= bis),
    verspätungLogs: daten.verspätungLogs.filter((l) => bisTag(l.datum)),
    spielLogs: daten.spielLogs.filter((l) => bisTag(l.loggedAt)),
    strafLogs: daten.strafLogs.filter((l) => bisTag(l.loggedAt)),
  };
}

/**
 * Wie haben sich die Plätze über die Zeit entwickelt? Stichtage sind die
 * Stammtische im gewählten Zeitraum; liegt danach noch etwas (z. B. eine
 * nachgetragene Strafe), kommt ein Punkt "heute" dazu. Jeder Stichtag nutzt
 * exakt dieselbe Rechnung wie die Rangliste selbst (computeRanglisten), nur
 * auf den bis dahin bekannten Daten — der letzte Punkt entspricht also immer
 * der angezeigten Liste.
 */
export function computeRangVerlauf(daten: StatsDaten, jahr: JahrFilter): RangVerlauf {
  const heute = toLocalIsoDate(new Date());
  const stichtage = [...new Set(
    stattgefunden(daten.termine)
      .filter((t) => t.art === "stammtisch" && imJahr(t.datum, jahr))
      .map((t) => t.datum)
  )].sort();

  const punkte: VerlaufPunkt[] = stichtage.map((datum) => ({ datum, heute: false }));
  const stande = stichtage.map((datum) => computeRanglisten(datenBis(daten, datum), jahr));

  // Endstand anhängen, wenn sich nach dem letzten Stammtisch noch etwas getan
  // hat (z. B. Strafen bei einer Veranstaltung): im laufenden Jahr als "heute",
  // bei abgeschlossenen Jahren als 31.12. — so entspricht der letzte Punkt
  // immer der angezeigten Liste.
  const endstand = computeRanglisten(daten, jahr);
  const letzter = stande[stande.length - 1];
  const signatur = (listen: Rangliste[]) =>
    JSON.stringify(listen.map((l) => [l.key, l.eintraege.map((e) => [e.member.id, e.platz])]));
  const laufendesJahr = jahr === ALLZEIT || jahr === aktuellesJahr();
  const enddatum = laufendesJahr ? heute : `${jahr}-12-31`;
  if ((!letzter || signatur(letzter) !== signatur(endstand)) && enddatum !== stichtage[stichtage.length - 1]) {
    punkte.push({ datum: enddatum, heute: laufendesJahr, jahresende: !laufendesJahr });
    stande.push(endstand);
  }

  const plaetze = new Map<string, Map<string, (number | null)[]>>();
  stande.forEach((listen, i) => {
    for (const liste of listen) {
      let proMember = plaetze.get(liste.key);
      if (!proMember) {
        proMember = new Map();
        plaetze.set(liste.key, proMember);
      }
      for (const e of liste.eintraege) {
        let reihe = proMember.get(e.member.id);
        if (!reihe) {
          reihe = new Array(punkte.length).fill(null);
          proMember.set(e.member.id, reihe);
        }
        reihe[i] = e.platz;
      }
    }
  });

  return { punkte, plaetze };
}

// ─── Anzeige & Führung ────────────────────────────────────────────────────────

/** Kurze Anzeige eines Ranglisten-Werts: „9×", „45′", „36 €", „7". */
export function wertKurz(key: string, wert: number): string {
  if (key.startsWith("spiel_")) return `${wert}×`;
  if (key === "verspaetung") return `${wert}′`;
  if (key === "strafen") return `${formatEuro(wert).replace(",00", "")} €`;
  return String(wert);
}

/** Platz-Reihe einer Person in einer Rangliste über die Stichtage (null = nicht gelistet). */
export function platzReihe(verlauf: RangVerlauf, key: string, memberId: string): (number | null)[] {
  return verlauf.plaetze.get(key)?.get(memberId) ?? new Array(verlauf.punkte.length).fill(null);
}

/** Wer stand an jedem Stichtag auf Platz 1 (bei Gleichstand alle)? */
export function fuehrendeJePunkt(verlauf: RangVerlauf, key: string): string[][] {
  const proMember = verlauf.plaetze.get(key);
  return verlauf.punkte.map((_, i) => {
    const ids: string[] = [];
    proMember?.forEach((reihe, id) => { if (reihe[i] === 1) ids.push(id); });
    return ids;
  });
}

/** Seit welchem Stichtag führt jemand ununterbrochen (null = führt gerade nicht)? */
export function vornSeit(verlauf: RangVerlauf, key: string, memberId: string): string | null {
  const reihe = platzReihe(verlauf, key, memberId);
  let i = reihe.length - 1;
  if (i < 0 || reihe[i] !== 1) return null;
  while (i > 0 && reihe[i - 1] === 1) i--;
  return verlauf.punkte[i].datum;
}

/** Platzveränderung seit dem vorletzten Stichtag: >0 = aufgestiegen, <0 = abgerutscht. */
export function trend(verlauf: RangVerlauf, key: string, memberId: string): number {
  const reihe = platzReihe(verlauf, key, memberId).filter((p): p is number => p !== null);
  if (reihe.length < 2) return 0;
  return reihe[reihe.length - 2] - reihe[reihe.length - 1];
}
