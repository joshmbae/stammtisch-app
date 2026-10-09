import { ActivityLogEntry, MemberProfile, StrafKategorieDef } from "../types";
import { renderActivity, terminBezeichnung } from "./activityFeed";
import { formatWochentagDatum } from "./date";

/**
 * Push-Texte für Aktivitäts-Einträge. Bewusst lockerer als der Feed: Titel
 * sagt in einem Satz, was passiert ist, der Text liefert den Kontext. Pro
 * Ereignis gibt's mehrere Formulierungen, damit's nicht jedes Mal gleich
 * klingt — leicht bayrisch, aber noch für jeden lesbar.
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

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Hängt "Eingetragen von X." an, wenn's nicht der Betroffene selbst war. */
function vonSatz(v: Vars): string {
  return v.vonAnders ? ` Eingetragen von ${v.von}.` : "";
}

function notizSatz(v: Vars): string {
  return v.notiz ? ` „${v.notiz}“` : "";
}

const VARIANTEN: Partial<Record<ActivityLogEntry["actionType"], Variante[]>> = {
  straf_log_created: [
    (v) => ({ title: `${v.katEmoji} ${v.wer} muss blechen`, body: `${v.kat} – ${v.betrag} wandern in d'Kass.${notizSatz(v)}${vonSatz(v)}` }),
    (v) => ({ title: `${v.katEmoji} Zack, Strafe für ${v.wer}`, body: `Wegen „${v.kat}“ san ${v.betrag} fällig.${notizSatz(v)}${vonSatz(v)}` }),
    (v) => ({ title: `${v.katEmoji} ${v.wer} hat's erwischt`, body: `${v.kat}: ${v.betrag} für d'Stammtischkasse. Vergelt's Gott!${notizSatz(v)}${vonSatz(v)}` }),
  ],
  straf_log_beglichen: [
    (v) => ({ title: `✅ ${v.wer} hat bezahlt`, body: `${v.kat} (${v.betrag}) is beglichen. Sauber!` }),
    (v) => ({ title: `✅ Sauber, ${v.wer}!`, body: `${v.betrag} für „${v.kat}“ san in da Kass.` }),
    (v) => ({ title: `💶 ${v.wer} hat d'Schulden beglichen`, body: `${v.kat} – ${v.betrag} bezahlt. Passt scho!` }),
  ],
  straf_log_deleted: [
    (v) => ({ title: `🍀 Glück ghabt, ${v.wer}!`, body: `Die Strafe „${v.kat}“ (${v.betrag}) is wieder gestrichen.${vonSatz(v)}` }),
    (v) => ({ title: `🗑️ Strafe zurückgenommen`, body: `${v.wer} kommt um „${v.kat}“ (${v.betrag}) herum.${vonSatz(v)}` }),
  ],
  kasse_einnahme_created: [
    (v) => ({ title: `💰 Geld in da Kass`, body: `${v.beschreibung ?? "Einnahme"}: +${v.betrag}. Eingetragen von ${v.von}.` }),
    (v) => ({ title: `➕ Neue Einnahme: ${v.betrag}`, body: `${v.beschreibung ?? "Ohne Beschreibung"} – ${v.von} hat's verbucht.` }),
  ],
  kasse_ausgabe_created: [
    (v) => ({ title: `💸 Ausgabe aus da Kass`, body: `${v.beschreibung ?? "Ausgabe"}: −${v.betrag}. Eingetragen von ${v.von}.` }),
    (v) => ({ title: `➖ ${v.betrag} ausgegeben`, body: `${v.beschreibung ?? "Ohne Beschreibung"} – ${v.von} hat's verbucht.` }),
  ],
  abendkosten_created: [
    (v) => ({ title: `🍺 ${v.wer} hat d'Zeche übernommen`, body: rechnungsText(v) }),
    (v) => ({ title: `🍺 ${v.wer} hat für alle gezahlt`, body: rechnungsText(v) }),
    (v) => ({ title: `🧾 Stammtischrechnung: ${v.betrag}`, body: `${v.wer} hat vorgestreckt. ${rechnungsText(v)}` }),
  ],
  kasse_beglichen: [
    (v) => v.meta.anteil
      ? { title: `✅ ${v.wer} hat zurückgezahlt`, body: `${v.betrag} Anteil an der Stammtischrechnung san beglichen.` }
      : { title: `✅ Rechnung beglichen`, body: `${v.wer} hat sei Geld z'ruck (${v.betrag}).` },
    (v) => v.meta.anteil
      ? { title: `💶 ${v.wer} is quitt`, body: `Den Anteil von ${v.betrag} an der Stammtischrechnung hat ${v.wer} beglichen.` }
      : { title: `💶 Alles quitt`, body: `Die Stammtischrechnung von ${v.wer} (${v.betrag}) is erledigt.` },
  ],
  kasse_eintrag_deleted: [
    (v) => ({ title: `🗑️ Kassen-Eintrag gelöscht`, body: `${v.beschreibung ?? "Eintrag"} (${v.betrag}) – gelöscht von ${v.von}.` }),
  ],
  spiel_log_created: [
    (v) => ({ title: `${v.meta.ereignisEmoji ?? v.meta.spielEmoji ?? "🎲"} ${v.meta.spielName ?? "Spiel"}: ${v.wer}`, body: `${v.meta.ereignisLabel ?? "Ereignis"}!${vonSatz(v)}` }),
    (v) => ({ title: `${v.meta.spielEmoji ?? "🎲"} Neues vom ${v.meta.spielName ?? "Spiel"}`, body: `${v.wer}: ${v.meta.ereignisLabel ?? "Ereignis"}.${vonSatz(v)}` }),
  ],
  spiel_log_deleted: [
    (v) => ({ title: `🗑️ ${v.meta.spielName ?? "Spiel"}-Eintrag gelöscht`, body: `„${v.meta.ereignisLabel ?? "Ereignis"}“ von ${v.wer} is wieder raus.${vonSatz(v)}` }),
  ],
  protokoll_updated: [
    (v) => ({ title: `📝 Neues im Protokoll`, body: `${v.von} hat ${v.meta.terminDatum ? `des Protokoll vom ${v.termin}` : "des Protokoll"} aktualisiert. Schau rein!` }),
    (v) => ({ title: `📝 Protokoll aktualisiert`, body: `${v.von} hat mitgschriebn${v.meta.terminDatum ? ` (${v.termin})` : ""}. Was is ganga?` }),
  ],
  termin_zusage: [
    (v) => ({ title: `🍻 ${v.wer} is dabei!`, body: `${v.termin}${zusagenSatz(v)}` }),
    (v) => ({ title: `🍻 ${v.wer} kimmt!`, body: `Zusage für ${v.termin}${zusagenSatz(v)}` }),
    (v) => ({ title: `🙌 Zusage von ${v.wer}`, body: `${v.termin} – i gfrei mi!${zusagenSatz(v)}` }),
  ],
  termin_absage: [
    (v) => ({ title: `😢 ${v.wer} kann ned`, body: `Absage für ${v.termin} Schad!` }),
    (v) => ({ title: `❌ Absage von ${v.wer}`, body: `${v.termin} – diesmal ohne ${v.wer}.` }),
    (v) => ({ title: `😢 ${v.wer} muss passen`, body: `${v.termin} wird ohne ${v.wer} stattfinden.` }),
  ],
  termin_erstellt: [
    (v) => ({ title: `📅 Neuer Termin`, body: `${terminErstelltText(v)} Sagt's zu oder ab!` }),
    (v) => ({ title: `📅 Merkt's eich des vor!`, body: `${terminErstelltText(v)} Wer is dabei?` }),
  ],
  termin_verlegt: [
    (v) => ({ title: `🔁 Termin verlegt`, body: `${v.termin} (statt ${kurzDatum(v.meta.altDatum)}). Bitte neu einplanen!` }),
    (v) => ({ title: `🔁 Achtung, neues Datum!`, body: `${v.von} hat verlegt: jetzt ${v.termin}, vorher ${kurzDatum(v.meta.altDatum)}` }),
  ],
};

function rechnungsText(v: Vars): string {
  const n = Number(v.meta.teilnehmerAnzahl ?? 0);
  if (n > 1) {
    const proKopf = euro(Number(v.meta.betrag ?? 0) / n);
    return `${v.betrag} für ${n} Leit – macht ${proKopf} pro Kopf. Bitte z'ruckzahln!`;
  }
  return `${v.betrag} hat ${v.wer} vorgestreckt. Bitte z'ruckzahln!`;
}

function zusagenSatz(v: Vars): string {
  const n = v.ctx.zusagenAnzahl;
  if (!n || n < 2) return "";
  return ` Jetzt san's scho ${n} Zusagen.`;
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
  ctx: PushContext = {}
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
  };
  return pick(varianten)(vars);
}
