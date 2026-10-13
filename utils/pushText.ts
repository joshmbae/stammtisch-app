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
  /** Eintrags-Id – wählt Variante und Spruch, damit Push und Chronik gleich lauten. */
  id: string;
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
  return arr[hash(seed) % arr.length];
}

/** Hängt "Eingetragen von X." an, wenn's nicht der Betroffene selbst war. */
function vonSatz(v: Vars, verb = "Eingetragen"): string {
  return v.vonAnders && !v.log ? ` ${verb} von ${v.von}.` : "";
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

// ─── Stammtischsprüche ────────────────────────────────────────────────────────
// Etwa jede zweite Meldung bekommt einen Spruch angehängt, passend zur
// Kategorie. Welcher und ob, hängt fest an der Eintrags-Id (Push = Chronik).

const SPRUECHE = {
  strafe: ["Strafe muss sein.", "Ordnung muss sein.", "Die Kasse lacht."],
  kleinvieh: ["Kleinvieh macht auch Mist."],
  spaet: ["Wer zu spät kommt, den bestraft die Kasse.", "Pünktlich ist anders."],
  fehlen: ["Wer nicht kommt, zahlt trotzdem.", "Aus den Augen, nicht aus der Kasse."],
  bezahlt: ["Ehrlich währt am längsten.", "Passt scho.", "Geld allein macht nicht glücklich – die Kasse schon."],
  gestrichen: ["Gnade vor Recht.", "Noch mal gut gegangen."],
  einnahme: ["Die Kasse lacht.", "Kleinvieh macht auch Mist."],
  ausgabe: ["Man gönnt sich ja sonst nichts.", "Wer nicht genießt, wird ungenießbar."],
  rechnung: ["Einer für alle, alle für einen!"],
  niederlage: ["Pech im Spiel, Glück in der Liebe.", "Der Klügere gibt nach.", "Dabei sein ist alles."],
  zusage: ["Hopfen und Malz, Gott erhalt's!", "Auf einem Bein kann man nicht stehen.", "Durst ist schlimmer als Heimweh.", "Oans, zwoa, g'suffa!"],
  absage: ["Wir trinken eins mit.", "Aus den Augen, nicht aus dem Sinn."],
  termin: ["Ein Prosit der Gemütlichkeit!", "Vorfreude ist die schönste Freude."],
  verlegt: ["Aufgeschoben ist nicht aufgehoben."],
  protokoll: ["Wer schreibt, der bleibt."],
} as const;

/** FNV-1a mit Nachmischung: gut verteilt, auch für ähnliche Ids (Zeitstempel). */
function hash(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  return h >>> 0;
}

/** Satzende: Punkt anhängen, außer der Text endet schon mit einem („05.11.“, „Min.“). */
function satz(text: string): string {
  return /[.!?…]$/.test(text) ? text : `${text}.`;
}

/** „ Spruch“ für etwa jede zweite Meldung, sonst leer. */
function spruch(v: Vars, liste: readonly string[]): string {
  if (liste.length === 0 || hash(`${v.id}:spruch`) % 2 !== 0) return "";
  return ` ${liste[hash(`${v.id}:welcher`) % liste.length]}`;
}

/** Sprüche zur Strafkategorie: Verspätung und Fehlen haben eigene, kleine Beträge den Kleinvieh-Spruch. */
function strafSprueche(v: Vars): readonly string[] {
  if (/spät|spaet|verspät/i.test(v.kat)) return SPRUECHE.spaet;
  if (/fehl/i.test(v.kat)) return SPRUECHE.fehlen;
  return Number(v.meta.betrag ?? 0) <= 5 ? [...SPRUECHE.strafe, ...SPRUECHE.kleinvieh] : SPRUECHE.strafe;
}

const istNiederlage = (v: Vars) => /niederlage|verlor|verloren|aus\b|-aus/i.test(String(v.meta.ereignisLabel ?? ""));

const VARIANTEN: Partial<Record<ActivityLogEntry["actionType"], Variante[]>> = {
  straf_log_created: [
    (v) => ({ title: `${v.katEmoji} ${v.wer} zahlt ${v.betrag}`, body: `${satz(v.kat)}${notizSatz(v)}${spruch(v, strafSprueche(v))}${vonSatz(v)}` }),
    (v) => ({ title: `${v.katEmoji} Strafe für ${v.wer}`, body: `${v.kat} – ${v.betrag} für die Kasse.${notizSatz(v)}${spruch(v, strafSprueche(v))}${vonSatz(v)}` }),
    (v) => ({ title: `${v.katEmoji} ${v.wer} hat's erwischt`, body: `${v.kat}: ${v.betrag}.${notizSatz(v)}${spruch(v, strafSprueche(v))}${vonSatz(v)}` }),
  ],
  straf_log_beglichen: [
    (v) => Number(v.meta.anzahl ?? 1) > 1
      ? { title: `✅ ${v.wer} hat alles bezahlt`, body: `${v.meta.anzahl} Strafen, zusammen ${v.betrag}. Reinen Tisch gemacht!` }
      : { title: `✅ ${v.wer} hat bezahlt`, body: `${v.kat} (${v.betrag}) ist beglichen.${spruch(v, SPRUECHE.bezahlt)}` },
    (v) => Number(v.meta.anzahl ?? 1) > 1
      ? { title: `✅ ${v.wer} macht reinen Tisch`, body: `${v.meta.anzahl} Strafen über ${v.betrag} beglichen.${spruch(v, SPRUECHE.bezahlt)}` }
      : { title: `✅ Sauber, ${v.wer}!`, body: `${v.betrag} für „${v.kat}“ sind in der Kasse.${spruch(v, SPRUECHE.bezahlt)}` },
    (v) => Number(v.meta.anzahl ?? 1) > 1
      ? { title: `💰 ${v.wer} ist schuldenfrei`, body: `${v.meta.anzahl} Strafen, ${v.betrag} – alles drin.${spruch(v, SPRUECHE.bezahlt)}` }
      : { title: `💰 ${v.wer} ist die Strafe los`, body: `${v.kat} – ${v.betrag} bezahlt.${spruch(v, SPRUECHE.bezahlt)}` },
  ],
  straf_log_deleted: [
    (v) => ({ title: `🐷 Schwein gehabt, ${v.wer}!`, body: `„${v.kat}“ (${v.betrag}) ist gestrichen.${spruch(v, SPRUECHE.gestrichen)}${vonSatz(v, "Gestrichen")}` }),
    (v) => ({ title: `🍀 Glück gehabt, ${v.wer}!`, body: `Die Strafe „${v.kat}“ (${v.betrag}) ist wieder weg.${spruch(v, SPRUECHE.gestrichen)}${vonSatz(v, "Gestrichen")}` }),
    (v) => ({ title: `🗑️ Strafe zurückgenommen`, body: `${v.wer} kommt um „${v.kat}“ (${v.betrag}) herum.${spruch(v, SPRUECHE.gestrichen)}${vonSatz(v, "Gestrichen")}` }),
  ],
  kasse_einnahme_created: [
    (v) => ({ title: `💶 ${v.betrag} für die Kasse`, body: `${satz(v.beschreibung ?? "Einnahme")}${spruch(v, SPRUECHE.einnahme)}${verbuchtSatz(v)}` }),
    (v) => ({ title: `💶 Neue Einnahme: ${v.betrag}`, body: `${satz(v.beschreibung ?? "Ohne Beschreibung")}${spruch(v, SPRUECHE.einnahme)}${v.log ? "" : ` ${v.von} hat's verbucht.`}` }),
  ],
  kasse_ausgabe_created: [
    (v) => ({ title: `💸 ${v.betrag} aus der Kasse`, body: `${satz(v.beschreibung ?? "Ausgabe")}${spruch(v, SPRUECHE.ausgabe)}${verbuchtSatz(v)}` }),
    (v) => ({ title: `💸 ${v.betrag} ausgegeben`, body: `${satz(v.beschreibung ?? "Ohne Beschreibung")}${spruch(v, SPRUECHE.ausgabe)}${v.log ? "" : ` ${v.von} hat's verbucht.`}` }),
  ],
  abendkosten_created: [
    (v) => ({ title: `🍺 ${v.wer} schmeißt die Rechnung`, body: rechnungsText(v) }),
    (v) => ({ title: `🍺 ${v.wer} hat für alle gezahlt`, body: rechnungsText(v) }),
    (v) => ({ title: `🧾 Stammtischrechnung: ${v.betrag}`, body: `${v.wer} hat vorgestreckt. ${rechnungsText(v)}` }),
  ],
  kasse_beglichen: [
    (v) => v.meta.anteil
      ? { title: `✅ ${v.wer} hat zurückgezahlt`, body: `${v.betrag} Anteil an der Stammtischrechnung sind beglichen.${spruch(v, SPRUECHE.bezahlt)}` }
      : { title: `✅ Rechnung beglichen`, body: `${v.wer} hat das Geld zurück (${v.betrag}).${spruch(v, SPRUECHE.bezahlt)}` },
    (v) => v.meta.anteil
      ? { title: `💶 ${v.wer} ist quitt`, body: `Den Anteil von ${v.betrag} an der Stammtischrechnung hat ${v.wer} beglichen.${spruch(v, SPRUECHE.bezahlt)}` }
      : { title: `💶 Alles quitt`, body: `Die Stammtischrechnung von ${v.wer} (${v.betrag}) ist erledigt.${spruch(v, SPRUECHE.bezahlt)}` },
  ],
  kasse_eintrag_deleted: [
    (v) => ({ title: `🗑️ Kassen-Eintrag gelöscht`, body: `${v.beschreibung ?? "Eintrag"} (${v.betrag})${v.log ? "." : ` – gelöscht von ${v.von}.`}` }),
  ],
  spiel_log_created: [
    (v) => ({
      title: `${v.meta.ereignisEmoji ?? v.meta.spielEmoji ?? "🎲"} ${v.wer}: ${v.meta.ereignisLabel ?? "Ereignis"}`,
      body: `${satz(`Beim ${v.meta.spielName ?? "Spiel"}`)}${istNiederlage(v) ? spruch(v, SPRUECHE.niederlage) : ""}${vonSatz(v)}`,
    }),
    (v) => ({
      title: `${v.meta.spielEmoji ?? "🎲"} Neues vom ${v.meta.spielName ?? "Spiel"}`,
      body: `${satz(`${v.wer}: ${v.meta.ereignisLabel ?? "Ereignis"}`)}${istNiederlage(v) ? spruch(v, SPRUECHE.niederlage) : ""}${vonSatz(v)}`,
    }),
  ],
  spiel_log_deleted: [
    (v) => ({ title: `🗑️ ${v.meta.spielName ?? "Spiel"}-Eintrag gelöscht`, body: `„${v.meta.ereignisLabel ?? "Ereignis"}“ von ${v.wer} ist wieder raus.${vonSatz(v)}` }),
  ],
  protokoll_updated: [
    (v) => ({ title: `📝 ${v.von} hat mitgeschrieben`, body: `${v.meta.terminDatum ? satz(`Protokoll vom ${v.termin}`) : "Das Protokoll ist aktualisiert."}${spruch(v, SPRUECHE.protokoll)}${aufruf(v, "Schau rein!")}` }),
    (v) => ({ title: `📝 Neues im Protokoll`, body: `${v.von} hat ${v.meta.terminDatum ? `das Protokoll vom ${v.termin}` : "das Protokoll"} aktualisiert.${spruch(v, SPRUECHE.protokoll)}${aufruf(v, "Was ist passiert?")}` }),
  ],
  termin_zusage: [
    (v) => (v.ctx.zusagenAnzahl ?? 0) >= 2
      ? { title: `🍻 ${v.wer} ist dabei – Nummer ${v.ctx.zusagenAnzahl}!`, body: `${satz(v.termin)}${spruch(v, SPRUECHE.zusage)}` }
      : { title: `🍻 ${v.wer} ist dabei!`, body: `${satz(v.termin)}${spruch(v, SPRUECHE.zusage)}` },
    (v) => ({ title: `🍻 ${v.wer} kommt!`, body: `${satz(`Zusage für ${v.termin}`)}${zusagenSatz(v)}${spruch(v, SPRUECHE.zusage)}` }),
    (v) => ({ title: `🙌 Zusage von ${v.wer}`, body: `${v.termin} – das wird gut!${zusagenSatz(v)}${spruch(v, SPRUECHE.zusage)}` }),
  ],
  termin_absage: [
    (v) => ({ title: `😢 ${v.wer} kann nicht`, body: `${satz(`Absage für ${v.termin}`)}${spruch(v, SPRUECHE.absage)}` }),
    (v) => ({ title: `😢 ${v.wer} muss passen`, body: `${v.termin} ohne ${v.wer}.${spruch(v, SPRUECHE.absage)}` }),
    (v) => ({ title: `❌ Absage von ${v.wer}`, body: `${v.termin} – diesmal nicht.${spruch(v, SPRUECHE.absage)}` }),
  ],
  termin_erstellt: [
    (v) => ({ title: `📅 Neuer Termin`, body: `${terminErstelltText(v)}${spruch(v, SPRUECHE.termin)}${aufruf(v, "Sagt zu oder ab!")}` }),
    (v) => ({ title: `📅 Vormerken!`, body: `${terminErstelltText(v)}${spruch(v, SPRUECHE.termin)}${aufruf(v, "Wer ist dabei?")}` }),
  ],
  termin_verlegt: [
    (v) => ({ title: `🔁 Neuer Termin: ${v.termin}`, body: `${satz(`Statt ${kurzDatum(v.meta.altDatum)}`)}${spruch(v, SPRUECHE.verlegt)}${aufruf(v, "Bitte neu einplanen!")}` }),
    (v) => ({ title: `🔁 Achtung, neues Datum!`, body: `${satz(`${v.von} hat verlegt: jetzt ${v.termin}, vorher ${kurzDatum(v.meta.altDatum)}`)}${spruch(v, SPRUECHE.verlegt)}` }),
  ],
};

function rechnungsText(v: Vars): string {
  const n = Number(v.meta.teilnehmerAnzahl ?? 0);
  if (n > 1) {
    const proKopf = euro(Number(v.meta.betrag ?? 0) / n);
    return `${v.betrag} für ${n} Leute – macht ${proKopf} pro Kopf.${rechnungsSchluss(v)}`;
  }
  return `${v.betrag} hat ${v.wer} vorgestreckt.${rechnungsSchluss(v)}`;
}

/** Im Push „Bitte zurückzahlen“ (ggf. mit Spruch verbunden), in der Chronik nur der Spruch. */
function rechnungsSchluss(v: Vars): string {
  const sp = spruch(v, SPRUECHE.rechnung).trim();
  if (v.log) return sp ? ` ${sp}` : "";
  return sp ? ` Bitte zurückzahlen – ${sp.charAt(0).toLowerCase()}${sp.slice(1)}` : " Bitte zurückzahlen!";
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
    id: entry.id,
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
