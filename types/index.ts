export type Rolle = "Stammtischkönig" | "Schriftführer" | "Kassenwart" | "Bierwart" | "Eventmanager" | "Vize-Eventmanager" | "Reserviermeister" | "Vize-Reserviermeister" | "Kameramann" | "Foto-Beauftragter" | "Reiseminister" | "Mitglied" | "Gast";

export interface MemberProfile {
  id: string;
  name: string;
  spitzname?: string;
  mitgliedSeit: string;
  geburtsdatum?: string;                     // ISO date "1990-03-15"
  rollen: Rolle[];                           // mind. 1 Rolle
  lieblingsgetraenk?: string;
  beruf?: string;
  avatarColor: string;
  photoUri?: string;
  notizen?: string;
  createdAt: string;
  pinHash?: string;                          // gehashter 4-stelliger PIN zum Schutz des Profils vor fremden Änderungen/Löschen
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

// ─── Verspätungs-Logs ─────────────────────────────────────────────────────────

export interface VerspätungLog {
  id: string;
  memberId: string;
  terminId?: string;
  datum: string;
  minutenVerspätet: number;
  grund?: string;
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
  | "schock_niederlage"
  | "spiel_ereignis"
  | "wette_verloren"
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
  { key: "schock_niederlage",     label: "Schock-Niederlage",     betrag: 5,   emoji: "🎲", beschreibung: "Wird automatisch bei jeder Schock-Niederlage eingetragen" },
  { key: "spiel_ereignis",        label: "Spiel-Ereignis",        betrag: 0,   emoji: "🎮", beschreibung: "Wird automatisch bei einem konfigurierten Spiel-Ereignis eingetragen" },
  { key: "wette_verloren",        label: "Verlorene Wette",        betrag: 0,   emoji: "🤝", beschreibung: "Wird automatisch bei einer verlorenen Wette eingetragen, Betrag = Wetteinsatz" },
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

// ─── Spiele ───────────────────────────────────────────────────────────────────

export interface Spiel {
  id: string;
  name: string;
  emoji?: string;
  createdAt: string;
}

export interface SpielEreignisTyp {
  id: string;
  spielId: string;
  label: string;
  emoji?: string;
  reihenfolge: number;              // 1-4, Anzeigereihenfolge der Buttons
  strafKategorie?: StrafKategorie;  // optionale Kopplung an eine Strafe
  strafBetrag?: number;             // in Euro — nur relevant wenn strafKategorie gesetzt
}

export interface SpielLog {
  id: string;
  memberId: string;
  spielId: string;
  ereignisTypId: string;
  terminId?: string;
  strafLogId?: string;              // gesetzt, wenn dieser Log automatisch eine Strafe erzeugt hat
  loggedAt: string;
}

export const SPIEL_VORLAGEN: {
  name: string;
  emoji: string;
  ereignisTypen: { label: string; emoji: string; strafKategorie?: StrafKategorie; strafBetrag?: number }[];
}[] = [
  {
    name: "Schocken",
    emoji: "🎲",
    ereignisTypen: [
      { label: "Niederlage", emoji: "💀", strafKategorie: "schock_niederlage", strafBetrag: 5 },
      { label: "Schock-Aus", emoji: "🎲" },
    ],
  },
  {
    name: "Skat",
    emoji: "🃏",
    ereignisTypen: [
      { label: "Verloren", emoji: "🃏", strafKategorie: "spiel_ereignis", strafBetrag: 3 },
      { label: "Schwarz gespielt", emoji: "🖤" },
    ],
  },
  {
    name: "Kegeln",
    emoji: "🎳",
    ereignisTypen: [
      { label: "Nullwurf", emoji: "😅", strafKategorie: "spiel_ereignis", strafBetrag: 2 },
      { label: "Alle Neune", emoji: "🎳" },
    ],
  },
];

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
  beglichen?: boolean;         // Altbestand ohne teilnehmerIds: alle haben zurückgezahlt
  teilnehmerIds?: string[];    // abendkosten: wer war dabei (inkl. Zahler) — Grundlage der Kostenteilung
  beglichenIds?: string[];     // abendkosten: welche Teilnehmer (außer Zahler) ihren Anteil schon zurückgezahlt haben
}

// ─── Activity-Feed ────────────────────────────────────────────────────────────

export type ActivityActionType =
  | "straf_log_created"
  | "straf_log_beglichen"
  | "straf_log_deleted"
  | "kasse_einnahme_created"
  | "kasse_ausgabe_created"
  | "abendkosten_created"
  | "kasse_beglichen"
  | "kasse_eintrag_deleted"
  | "spiel_log_created"
  | "spiel_log_deleted"
  | "wette_created"
  | "wette_resolved"
  | "wette_deleted"
  | "protokoll_updated"
  | "termin_zusage"
  | "termin_absage";

export interface ActivityLogEntry {
  id: string;
  createdAt: string;
  actorMemberId?: string;      // wer hat's eingetragen
  subjectMemberId?: string;    // wen betrifft's
  actionType: ActivityActionType;
  terminId?: string;
  refId?: string;              // id des betroffenen Datensatzes
  meta: Record<string, any>;
}

// ─── Stammtischverordnung (Settings) ─────────────────────────────────────────

export interface StammtischVerordnung {
  name: string;
  logoUrl?: string;
  treffpunkt?: string;
  stammtischTag?: string;
  stammtischzeit?: string;
  gruendungsjahr?: string;
  regeln: string[];
  sonstiges?: string;
  aktivesSpielId?: string;
}
