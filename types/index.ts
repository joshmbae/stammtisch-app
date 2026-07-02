export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface MemberProfile {
  id: string;
  name: string;
  spitzname?: string;
  mitgliedSeit: string;
  geburtsdatum?: string;                     // ISO date "1990-03-15"
  rolle: "Stammtischkönig" | "Schriftführer" | "Kassenwart" | "Bierwart" | "Eventmanager" | "Reserviermeister" | "Kameramann" | "Mitglied" | "Gast";
  lieblingsgetraenk?: string;
  beruf?: string;
  avatarColor: string;
  photoUri?: string;
  notizen?: string;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  memberId: string;
  createdAt: string;
  updatedAt: string;
  preview: string;
}

// ─── Stammtisch-Termin ────────────────────────────────────────────────────────

export type TerminArt = "stammtisch" | "veranstaltung" | "geburtstag";

export interface StammtischTermin {
  id: string;
  art: TerminArt;
  titel?: string;                           // Pflicht bei "veranstaltung"/"geburtstag", optional bei "stammtisch"
  datum: string;                            // ISO date "2025-05-01"
  datumBis?: string;                        // ISO date — Ende bei mehrtägigen Events
  startZeit?: string;                       // "19:30"
  endZeit?: string;
  ort?: string;
  notizen?: string;
  aktiv: boolean;                           // läuft gerade
  startedAt?: string;                       // ISO datetime — wenn gestartet
  endedAt?: string;                         // ISO datetime — wenn beendet
  createdAt: string;
  anwesenheit?: string[];                   // memberId-Liste der Anwesenden (Zusagen)
  absagen?: string[];                        // memberId-Liste der Absagen
}

// ─── Bier-Logs ────────────────────────────────────────────────────────────────

export type BierTyp = "helles" | "weißbier" | "dunkles" | "radler" | "maß" | "sonstiges";

export interface BierLog {
  id: string;
  memberId: string;
  terminId?: string;
  bierTyp: BierTyp;
  anzahl: number;
  loggedAt: string;
  note?: string;
}

// ─── Verspätungs-Logs ─────────────────────────────────────────────────────────

export interface VerspätungLog {
  id: string;
  memberId: string;
  terminId?: string;
  datum: string;
  minutenVerspätet: number;
  grund?: string;
}

// ─── Schock-Logs ──────────────────────────────────────────────────────────────

export type SchockTyp = "niederlage" | "schock_aus";

export interface SchockLog {
  id: string;
  memberId: string;
  terminId?: string;
  typ: SchockTyp;
  loggedAt: string;
}

// ─── Wetten ───────────────────────────────────────────────────────────────────

export interface Wette {
  id: string;
  memberId: string;         // wer wettet
  terminId?: string;
  gegenMemberId: string;    // auf wen gewettet wird
  betrag: number;           // in Euro
  loggedAt: string;
  gewonnen?: boolean;       // undefined = offen
}

// ─── Stammtisch-Erinnerungen ──────────────────────────────────────────────────

export type ErinnerungsKategorie = "bier" | "verspätung" | "anekdote" | "strafe" | "allgemein" | "stimmung";

export interface Erinnerung {
  id: string;
  memberId: string;
  content: string;
  category: ErinnerungsKategorie;
  createdAt: string;
}

// ─── Protokoll ────────────────────────────────────────────────────────────────

export interface Protokoll {
  id: string;
  terminId: string;
  titel?: string;
  inhalt: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Strafen ──────────────────────────────────────────────────────────────────

export type StrafKategorie =
  | "fehlen_entschuldigt"
  | "fehlen_unentschuldigt"
  | "spaet_entschuldigt"
  | "spaet_15min"
  | "spaet_30min"
  | "maennlicher_gast"
  | "sonstiges";

export const STRAF_KATEGORIEN: {
  key: StrafKategorie;
  label: string;
  betrag: number;
  emoji: string;
  beschreibung?: string;
}[] = [
  { key: "fehlen_entschuldigt",   label: "Fehlen (entschuld.)",   betrag: 10,  emoji: "📵", beschreibung: "Angekündigt bis 23:59 Uhr Vortag oder triftiger Grund" },
  { key: "fehlen_unentschuldigt", label: "Fehlen (unentschuld.)", betrag: 50,  emoji: "🚫" },
  { key: "spaet_entschuldigt",    label: "Zu spät (entschuld.)",  betrag: 5,   emoji: "⏰", beschreibung: "Straffrei <30 Min., sonst 5 € – Tracker ab neuer Ankunftszeit" },
  { key: "spaet_15min",           label: "Zu spät 15–30 Min.",    betrag: 5,   emoji: "⏱️", beschreibung: "Unentschuldigt – Trinkspruch ab 1 Min., 5 € ab 15 Min." },
  { key: "spaet_30min",           label: "Zu spät >30 Min.",      betrag: 10,  emoji: "⏱️", beschreibung: "Unentschuldigt" },
  { key: "maennlicher_gast",      label: "Männl. Gast",           betrag: 20,  emoji: "👨", beschreibung: "Pro Gast – weibliche Gäste nur am Valentinsstammtisch" },
  { key: "sonstiges",             label: "Sonstiges",             betrag: 0,   emoji: "💰" },
];

export interface StrafLog {
  id: string;
  memberId: string;
  terminId?: string;
  kategorie: StrafKategorie;
  betrag: number;               // in Euro
  notiz?: string;
  loggedAt: string;
  beglichen: boolean;
}

// ─── Kasse ────────────────────────────────────────────────────────────────────

export type KassenEintragTyp = "einnahme" | "ausgabe" | "abendkosten";

export interface KassenEintrag {
  id: string;
  typ: KassenEintragTyp;
  betrag: number;              // Euro, always positive
  beschreibung?: string;
  terminId?: string;
  bezahltVon?: string;         // memberId — nur bei abendkosten
  datum: string;               // ISO datetime
  beglichen?: boolean;         // abendkosten: alle haben zurückgezahlt
}

// ─── Stammtischverordnung (Settings) ─────────────────────────────────────────

export interface StammtischVerordnung {
  name: string;
  treffpunkt?: string;
  stammtischTag?: string;
  stammtischzeit?: string;
  gruendungsjahr?: string;
  regeln: string[];
  sonstiges?: string;
}
