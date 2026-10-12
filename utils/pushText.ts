import { ActivityLogEntry, MemberProfile, StrafKategorieDef } from "../types";
import { RenderedActivity, renderActivity, terminBezeichnung } from "./activityFeed";
import { formatWochentagDatum } from "./date";

/**
 * Push-Texte für Aktivitäts-Einträge. Bewusst lockerer als der Feed: Titel
 * sagt in einem Satz, was passiert ist, der Text liefert den Kontext. Pro
 * Ereignis gibt's mehrere Formulierungen, damit's nicht jedes Mal gleich
 * klingt — locker, aber Hochdeutsch (die App wird deutschlandweit genutzt).
 *
 * Dieselben Texte zeigt auch die Chronik (renderChronik). Die Variante wird
 * pro Eintrag fest aus seiner Id gewählt, damit Push und Chronik gleich
 * lauten. Im Log entfallen „Eingetragen von …“ (steht in der Meta-Zeile) und
 * Aufforderungen wie „Bitte zurückzahlen!“, die nur im Moment passen.
 */

export interface PushText {
  title: string;
  body: string;
}

/** Zusatzdaten, die erst beim Versand nachgeladen werden (nicht im Activity-Log). */
export interface PushContext {
  /** Anzahl Zusagen für den Termin, inkl. der gerade erfolgten. */
  zusagenAnzahl?: number;
}

type Variante = (v: Vars) => PushText;

interface Vars {
  wer: string;          // betroffenes Mitglied
  von: string;          // wer's eingetragen hat
  vonAnders: boolean;   // eingetragen von jemand anderem als dem Betroffenen
  betrag: string;
  kat: string;
  katEmoji: string;
  notiz?: string;
  beschreibung?: string;
  termin: string;
  meta: Record<string, any>;
  ctx: PushContext;
  /** Text für die Chronik statt für den Push. */
  log: boolean;
}

function name(m: MemberProfile | undefined): string {
  if (!m) return "Jemand";
  return m.spitzname ?? m.name.split(" ")[0];
}

/** "2 €" statt "2,00 €", aber "2,50 €" bleibt. */
function euro(n: number): string {
  const ganz = Number.isInteger(n);
  return n.toLocaleString("de-DE", { minimumFractionDigits: ganz ? 0 : 2, maximumFractionDigits: 2 }) + " €";
}

function kurzDatum(iso?: string): string {
  if (!iso) return "?";
  return formatWochentagDatum(new Date(iso + "T00:00:00"));
}

/** Feste Wahl aus der Id: derselbe Eintrag bekommt immer dieselbe Formulierung. */
function pick<T>(arr: T[], seed: string): T {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return arr[h % arr.length];
}

/** Hängt "Eingetragen von X." an, wenn's nicht der Betroffene selbst war. */
function vonSatz(v: Vars): string {
  return v.vonAnders && !v.log ? ` Eingetragen von ${v.von}.` : "";
}

/** „Eingetragen von X.“ auch ohne Betroffenen (z. B. Kassenbuchung); im Log steht das in der Meta-Zeile. */
function verbuchtSatz(v: Vars): string {
  return v.log ? "" : ` Eingetragen von ${v.von}.`;
}

/** Aufforderung, die nur im Push passt (im Log längst erledigt oder überholt). */
function aufruf(v: Vars, text: string): string {
  return v.log ? "" : ` ${text}`;
}

function notizSatz(v: Vars): string {
  return v.notiz ? ` „${v.notiz}“` : "";
}

const VARIANTEN: Partial<Record<ActivityLogEntry["actionType"], Variante[]>> = {
  straf_log_created: [
    (v) => ({ title: `${v.katEmoji} ${v.wer} muss zahlen`, body: `${v.kat} – ${v.betrag} wandern in die Kasse.${notizSatz(v)}${vonSatz(v)}` }),
    (v) => ({ title: `${v.katEmoji} Zack, Strafe für ${v.wer}`, body: `Wegen „${v.kat}“ sind ${v.betrag} fällig.${notizSatz(v)}${vonSatz(v)}` }),
    (v) => ({ title: `${v.katEmoji} ${v.wer} hat's erwischt`, body: `${v.kat}: ${v.betrag} für die Stammtischkasse. Danke für die Spende!${notizSatz(v)}${vonSatz(v)}` }),
  ],
  straf_log_beglichen: [
    (v) => ({ title: `✅ ${v.wer} hat bezahlt`, body: `${v.kat} (${v.betrag}) ist beglichen. Sauber!` }),
    (v) => ({ title: `✅ Sauber, ${v.wer}!`, body: `${v.betrag} für „${v.kat}“ sind in der Kasse.` }),
    (v) => ({ title: `💶 ${v.wer} ist die Strafe los`, body: `${v.kat} – ${v.betrag} bezahlt. Passt!` }),
  ],
  straf_log_deleted: [
    (v) => ({ title: `🍀 Glück gehabt, ${v.wer}!`, body: `Die Strafe „${v.kat}“ (${v.betrag}) ist wieder gestrichen.${vonSatz(v)}` }),
    (v) => ({ title: `🗑️ Strafe zurückgenommen`, body: `${v.wer} kommt um „${v.kat}“ (${v.betrag}) herum.${vonSatz(v)}` }),
  ],
  kasse_einnahme_created: [
    (v) => ({ title: `💰 Geld in der Kasse`, body: `${v.beschreibung ?? "Einnahme"}: +${v.betrag}.${verbuchtSatz(v)}` }),
    (v) => ({ title: `➕ Neue Einnahme: ${v.betrag}`, body: `${v.beschreibung ?? "Ohne Beschreibung"}${v.log ? "" : ` – ${v.von} hat's verbucht.`}` }),
  ],
  kasse_ausgabe_created: [
    (v) => ({ title: `💸 Ausgabe aus der Kasse`, body: `${v.beschreibung ?? "Ausgabe"}: −${v.betrag}.${verbuchtSatz(v)}` }),
    (v) => ({ title: `➖ ${v.betrag} ausgegeben`, body: `${v.beschreibung ?? "Ohne Beschreibung"}${v.log ? "" : ` – ${v.von} hat's verbucht.`}` }),
  ],
  abendkosten_created: [
    (v) => ({ title: `🍺 ${v.wer} hat die Rechnung übernommen`, body: rechnungsText(v) }),
    (v) => ({ title: `🍺 ${v.wer} hat für alle gezahlt`, body: rechnungsText(v) }),
    (v) => ({ title: `🧾 Stammtischrechnung: ${v.betrag}`, body: `${v.wer} hat vorgestreckt. ${rechnungsText(v)}` }),
  ],
  kasse_beglichen: [
    (v) => v.meta.anteil
      ? { title: `✅ ${v.wer} hat zurückgezahlt`, body: `${v.betrag} Anteil an der Stammtischrechnung sind beglichen.` }
      : { title: `✅ Rechnung beglichen`, body: `${v.wer} hat das Geld zurück (${v.betrag}).` },
    (v) => v.meta.anteil
      ? { title: `💶 ${v.wer} ist quitt`, body: `Den Anteil von ${v.betrag} an der Stammtischrechnung hat ${v.wer} beglichen.` }
      : { title: `💶 Alles quitt`, body: `Die Stammtischrechnung von ${v.wer} (${v.betrag}) ist erledigt.` },
  ],
  kasse_eintrag_deleted: [
    (v) => ({ title: `🗑️ Kassen-Eintrag gelöscht`, body: `${v.beschreibung ?? "Eintrag"} (${v.betrag})${v.log ? "." : ` – gelöscht von ${v.von}.`}` }),
  ],
  spiel_log_created: [
    (v) => ({ title: `${v.meta.ereignisEmoji ?? v.meta.spielEmoji ?? "🎲"} ${v.meta.spielName ?? "Spiel"}: ${v.wer}`, body: `${v.meta.ereignisLabel ?? "Ereignis"}!${vonSatz(v)}` }),
    (v) => ({ title: `${v.meta.spielEmoji ?? "🎲"} Neues vom ${v.meta.spielName ?? "Spiel"}`, body: `${v.wer}: ${v.meta.ereignisLabel ?? "Ereignis"}.${vonSatz(v)}` }),
  ],
  spiel_log_deleted: [
    (v) => ({ title: `🗑️ ${v.meta.spielName ?? "Spiel"}-Eintrag gelöscht`, body: `„${v.meta.ereignisLabel ?? "Ereignis"}“ von ${v.wer} ist wieder raus.${vonSatz(v)}` }),
  ],
  protokoll_updated: [
    (v) => ({ title: `📝 Neues im Protokoll`, body: `${v.von} hat ${v.meta.terminDatum ? `das Protokoll vom ${v.termin}` : "das Protokoll"} aktualisiert.${aufruf(v, "Schau rein!")}` }),
    (v) => ({ title: `📝 Protokoll aktualisiert`, body: `${v.von} hat mitgeschrieben${v.meta.terminDatum ? ` (${v.termin})` : ""}.${aufruf(v, "Was ist passiert?")}` }),
  ],
  termin_zusage: [
    (v) => ({ title: `🍻 ${v.wer} ist dabei!`, body: `${v.termin}${zusagenSatz(v)}` }),
    (v) => ({ title: `🍻 ${v.wer} kommt!`, body: `Zusage für ${v.termin}${zusagenSatz(v)}` }),
    (v) => ({ title: `🙌 Zusage von ${v.wer}`, body: `${v.termin} – das wird gut!${zusagenSatz(v)}` }),
  ],
  termin_absage: [
    (v) => ({ title: `😢 ${v.wer} kann nicht`, body: `Absage für ${v.termin} Schade!` }),
    (v) => ({ title: `❌ Absage von ${v.wer}`, body: `${v.termin} – diesmal ohne ${v.wer}.` }),
    (v) => ({ title: `😢 ${v.wer} muss passen`, body: `${v.termin} findet ohne ${v.wer} statt.` }),
  ],
  termin_erstellt: [
    (v) => ({ title: `📅 Neuer Termin`, body: `${terminErstelltText(v)}${aufruf(v, "Sagt zu oder ab!")}` }),
    (v) => ({ title: `📅 Vormerken!`, body: `${terminErstelltText(v)}${aufruf(v, "Wer ist dabei?")}` }),
  ],
  termin_verlegt: [
    (v) => ({ title: `🔁 Termin verlegt`, body: `${v.termin} (statt ${kurzDatum(v.meta.altDatum)}).${aufruf(v, "Bitte neu einplanen!")}` }),
    (v) => ({ title: `🔁 Achtung, neues Datum!`, body: `${v.von} hat verlegt: jetzt ${v.termin}, vorher ${kurzDatum(v.meta.altDatum)}` }),
  ],
};

function rechnungsText(v: Vars): string {
  const n = Number(v.meta.teilnehmerAnzahl ?? 0);
  if (n > 1) {
    const proKopf = euro(Number(v.meta.betrag ?? 0) / n);
    return `${v.betrag} für ${n} Leute – macht ${proKopf} pro Kopf.${aufruf(v, "Bitte zurückzahlen!")}`;
  }
  return `${v.betrag} hat ${v.wer} vorgestreckt.${aufruf(v, "Bitte zurückzahlen!")}`;
}

function zusagenSatz(v: Vars): string {
  const n = v.ctx.zusagenAnzahl;
  if (!n || n < 2) return "";
  return ` Damit sind's schon ${n} Zusagen.`;
}

function terminErstelltText(v: Vars): string {
  const anzahl = Number(v.meta.anzahl ?? 1);
  if (anzahl > 1) {
    return `${v.von} hat ${anzahl} Termine angelegt, ab ${v.termin}${v.meta.letztesDatum ? ` bis ${kurzDatum(v.meta.letztesDatum)}` : ""}`;
  }
  return `${v.von} hat ${v.termin} angelegt.`;
}

export function renderPushText(
  entry: ActivityLogEntry,
  membersById: Map<string, MemberProfile>,
  strafKategorien: StrafKategorieDef[] = [],
  ctx: PushContext = {},
  log = false
): PushText {
  const meta = entry.meta ?? {};
  const varianten = VARIANTEN[entry.actionType];
  if (!varianten) {
    // Unbekannte/Altbestand-Typen: Feed-Text als Fallback.
    const rendered = renderActivity(entry, membersById, strafKategorien);
    return { title: `${rendered.emoji} Neues am Stammtisch`, body: rendered.text };
  }

  const kat = strafKategorien.find((k) => k.id === meta.kategorie);
  const vars: Vars = {
    wer: name(entry.subjectMemberId ? membersById.get(entry.subjectMemberId) : undefined),
    von: name(entry.actorMemberId ? membersById.get(entry.actorMemberId) : undefined),
    vonAnders: !!entry.actorMemberId && entry.actorMemberId !== entry.subjectMemberId,
    betrag: euro(Number(meta.betrag ?? 0)),
    kat: kat?.label ?? meta.kategorie ?? "Sonstiges",
    katEmoji: kat?.emoji ?? "💰",
    notiz: meta.notiz || undefined,
    beschreibung: meta.beschreibung || undefined,
    termin: terminBezeichnung(meta, true),
    meta,
    ctx,
    log,
  };
  return pick(varianten, entry.id)(vars);
}

/**
 * Chronik-Text mit denselben Formulierungen wie der Push: der Titel wird zur
 * Hauptzeile, sein vorangestelltes Emoji zum Symbol, der Push-Text zur
 * Zusatzzeile. Typen ohne eigene Formulierung (Altbestand) bleiben beim
 * nüchternen Feed-Text. Alle Push-Titel beginnen mit „<Emoji> “.
 */
export function renderChronik(
  entry: ActivityLogEntry,
  membersById: Map<string, MemberProfile>,
  strafKategorien: StrafKategorieDef[] = []
): RenderedActivity {
  const basis = renderActivity(entry, membersById, strafKategorien);
  if (!VARIANTEN[entry.actionType]) return basis;
  const { title, body } = renderPushText(entry, membersById, strafKategorien, {}, true);
  const leer = title.indexOf(" ");
  return {
    emoji: leer > 0 ? title.slice(0, leer) : basis.emoji,
    text: leer > 0 ? title.slice(leer + 1) : title,
    detail: body.trim() || undefined,
    actorText: basis.actorText,
  };
}
