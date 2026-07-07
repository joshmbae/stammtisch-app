/**
 * Seed-Datensatz für "Die Hellen"
 * Generiert 2 Jahre Testdaten: 10 Mitglieder, ~52 Stammtische, Logs, Kasse, Protokolle
 */

import { supabase } from "./supabase";
import { getStammtischId } from "./storage";
import {
  MemberProfile,
  StammtischTermin,
  VerspätungLog,
  SchockLog,
  StrafLog,
  KassenEintrag,
  Protokoll,
  StammtischVerordnung,
} from "../types";

// ─── Seeded PRNG (deterministisch, reproduzierbar) ────────────────────────────

function createRng(seed: number) {
  let s = seed >>> 0;
  return {
    next(): number {
      s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
      s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
      s = s ^ (s >>> 16);
      return (s >>> 0) / 0xffffffff;
    },
    int(min: number, max: number): number {
      return Math.floor(this.next() * (max - min + 1)) + min;
    },
    pick<T>(arr: T[]): T {
      return arr[Math.floor(this.next() * arr.length)];
    },
    bool(prob = 0.5): boolean {
      return this.next() < prob;
    },
    shuffle<T>(arr: T[]): T[] {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(this.next() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
  };
}

// ─── ID-Generator ─────────────────────────────────────────────────────────────

let _idCounter = 1_700_000_000_000;
function nextId(): string {
  return (++_idCounter).toString();
}

// ─── Batch-Insert-Helfer (PostgREST mag keine riesigen Payloads) ─────────────

async function insertInBatches(table: string, rows: any[], batchSize = 500): Promise<void> {
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from(table).insert(batch);
    if (error) throw new Error(`Insert in ${table} fehlgeschlagen: ${error.message}`);
  }
}

// ─── Hauptfunktion ────────────────────────────────────────────────────────────

export async function seedTestData(): Promise<void> {
  _idCounter = 1_700_000_000_000;
  const rng = createRng(1337);
  const stammtischId = await getStammtischId();

  await clearAllData();

  // ── Mitglieder ──────────────────────────────────────────────────────────────
  const memberDefs: {
    name: string;
    spitzname: string;
    rolle: MemberProfile["rolle"];
    lieblingsgetraenk: string;
    beruf: string;
    avatarColor: string;
    mitgliedSeit: string;
  }[] = [
    { name: "Markus Huber",    spitzname: "Maxl",    rolle: "Stammtischkönig", lieblingsgetraenk: "Helles",       beruf: "Metzger",          avatarColor: "#1A4480", mitgliedSeit: "2022-04-01" },
    { name: "Thomas Bauer",    spitzname: "Tombo",   rolle: "Schriftführer",   lieblingsgetraenk: "Weißbier",     beruf: "Gymnasiallehrer",  avatarColor: "#6D28D9", mitgliedSeit: "2022-04-01" },
    { name: "Klaus Wagner",    spitzname: "Klausel", rolle: "Kassenwart",      lieblingsgetraenk: "Helles",       beruf: "Buchhalter",       avatarColor: "#065F46", mitgliedSeit: "2022-04-01" },
    { name: "Stefan Müller",   spitzname: "Stefi",   rolle: "Bierwart",        lieblingsgetraenk: "Radler",       beruf: "Elektriker",       avatarColor: "#92400E", mitgliedSeit: "2022-04-01" },
    { name: "Franz Schneider", spitzname: "Franzl",  rolle: "Mitglied",        lieblingsgetraenk: "Helles",       beruf: "Landwirt",         avatarColor: "#1D4ED8", mitgliedSeit: "2022-05-05" },
    { name: "Peter Mayer",     spitzname: "Petro",   rolle: "Mitglied",        lieblingsgetraenk: "Dunkles",      beruf: "Polizist",         avatarColor: "#B91C1C", mitgliedSeit: "2022-07-14" },
    { name: "Andreas Lehner",  spitzname: "Andi",    rolle: "Mitglied",        lieblingsgetraenk: "Helles",       beruf: "Schreiner",        avatarColor: "#0F766E", mitgliedSeit: "2022-09-01" },
    { name: "Michael Gruber",  spitzname: "Michi",   rolle: "Mitglied",        lieblingsgetraenk: "Weißbier",     beruf: "Arzt",             avatarColor: "#7C3AED", mitgliedSeit: "2023-01-12" },
    { name: "Josef Reitmaier", spitzname: "Sepp",    rolle: "Mitglied",        lieblingsgetraenk: "Maß",          beruf: "Wirt",             avatarColor: "#C8900E", mitgliedSeit: "2023-03-02" },
    { name: "Wolfgang Fischer",spitzname: "Wolle",   rolle: "Mitglied",        lieblingsgetraenk: "Helles",       beruf: "Kfz-Mechaniker",   avatarColor: "#374151", mitgliedSeit: "2023-06-01" },
  ];

  const members: MemberProfile[] = memberDefs.map((def) => ({
    id: nextId(),
    name: def.name,
    spitzname: def.spitzname,
    rolle: def.rolle,
    lieblingsgetraenk: def.lieblingsgetraenk,
    beruf: def.beruf,
    avatarColor: def.avatarColor,
    mitgliedSeit: def.mitgliedSeit,
    createdAt: new Date(def.mitgliedSeit + "T10:00:00").toISOString(),
  }));

  // ── Verordnung ───────────────────────────────────────────────────────────────
  const verordnung: StammtischVerordnung = {
    name: "Die Hellen",
    treffpunkt: "Gasthof Zur Linde, Stammtischzimmer",
    stammtischTag: "Jeden zweiten Donnerstag",
    stammtischzeit: "19:30 Uhr",
    gruendungsjahr: "2022",
    regeln: [
      "Entschuldigtes Fehlen (bis 23:59 Uhr Vortag oder triftiger Grund): 10 €.",
      "Unentschuldigtes Fehlen: 50 €.",
      "Entschuldigtes Zu-spät-kommen: straffrei bei <30 Min., sonst 5 €. Verspätungs-Tracker startet ab der angekündigten neuen Ankunftszeit.",
      "Unentschuldigtes Zu-spät-kommen: Trinkspruch ab 1 Min., 5 € ab 15 Min., 10 € ab 30 Min.",
      "Meiste unentschuldigte Verspätungsminuten des Jahres: Einladung zu sich nach Hause inkl. Bier + PowerPoint-Präsentation über die Hellen.",
      "Neue Mitglieder erhalten die Verspätungsminuten des bisherigen Schlusslichts.",
      "Männlichen Gast mitbringen: 20 € (vom Hellen). Weibliche Gäste nur beim Valentinsstammtisch.",
      "Beim Schocken zahlt der Verlierer die Runde; Schock-Aus zahlt die gesamte Runde.",
      "Die Rechnung des Abends wird vom Finanzminister beglichen und durch alle geteilt.",
      "Schulden müssen bis zum Vortag des nächsten Stammtisches (19 Uhr) beglichen werden – sonst Getränkerunde.",
      "Verschiebungen nur bei >50 % Absagen per WhatsApp-Umfrage des Reserviermeisters oder per Antrag.",
      "Alle Entscheidungen per offener Mehrheit. Aufnahme neuer Mitglieder: anonym und einstimmig. Wahl der Stammkneipe: 2/3-Mehrheit aller Hellen.",
    ],
    sonstiges: "Weibliche Gäste sind beim Valentinsstammtisch herzlich willkommen.",
  };

  // ── Termine (alle 2 Wochen Donnerstag, Apr 2024 – heute + 6 zukünftige) ─────
  const termine: StammtischTermin[] = [];
  const startDate = new Date("2024-04-04");
  const today = new Date();
  today.setHours(23, 59, 59, 0);

  const cur = new Date(startDate);
  while (cur <= today) {
    const datum = cur.toISOString().slice(0, 10);
    termine.push({
      id: nextId(),
      art: "stammtisch",
      datum,
      startZeit: "19:30",
      endZeit: "23:00",
      ort: "Gasthof Zur Linde",
      aktiv: false,
      startedAt: datum + "T19:30:00.000Z",
      endedAt:   datum + "T23:00:00.000Z",
      createdAt: datum + "T12:00:00.000Z",
      anwesenheit: [],
    });
    cur.setDate(cur.getDate() + 14);
  }

  // Zukünftige Stammtische (nächste 6, ohne Anwesenheitsdaten)
  for (let i = 0; i < 6; i++) {
    const datum = cur.toISOString().slice(0, 10);
    termine.push({
      id: nextId(),
      art: "stammtisch",
      datum,
      startZeit: "19:30",
      endZeit: "23:00",
      ort: "Gasthof Zur Linde",
      aktiv: false,
      createdAt: new Date().toISOString(),
      anwesenheit: [],
    });
    cur.setDate(cur.getDate() + 14);
  }

  // Spezial-Veranstaltungen
  const specials: { datum: string; titel: string; startZeit: string }[] = [
    { datum: "2024-07-20", titel: "Sommerfest",       startZeit: "17:00" },
    { datum: "2024-12-21", titel: "Weihnachtsfeier",  startZeit: "18:00" },
    { datum: "2025-07-19", titel: "Sommerfest",       startZeit: "17:00" },
    { datum: "2025-12-20", titel: "Weihnachtsfeier",  startZeit: "18:00" },
  ];
  for (const s of specials) {
    if (new Date(s.datum) <= today) {
      termine.push({
        id: nextId(),
        art: "veranstaltung",
        titel: s.titel,
        datum: s.datum,
        startZeit: s.startZeit,
        endZeit: "23:59",
        ort: "Gasthof Zur Linde, großer Saal",
        aktiv: false,
        startedAt: s.datum + `T${s.startZeit}:00.000Z`,
        endedAt:   s.datum + "T23:59:00.000Z",
        createdAt: s.datum + "T10:00:00.000Z",
        anwesenheit: [],
      });
    }
  }

  termine.sort((a, b) => a.datum.localeCompare(b.datum));

  // ── Logs pro Termin ──────────────────────────────────────────────────────────
  const verspätungMap: Record<string, VerspätungLog[]> = {};
  const schockMap:     Record<string, SchockLog[]>     = {};
  const strafMap:      Record<string, StrafLog[]>      = {};

  for (const m of members) {
    verspätungMap[m.id] = [];
    schockMap[m.id]     = [];
    strafMap[m.id]      = [];
  }

  const späteGründe = [
    "Stau auf der B17", "Überstunden im Betrieb", "Kind krank", "Zug verpasst",
    "Parkplatz gesucht", "Noch schnell getankt", "Falsche Abfahrtszeit",
    "Anruf vom Chef", "Noch beim Sport", "Vergessen die Uhr zu stellen",
  ];

  for (const termin of termine) {
    // Veranstaltungen: alle kommen
    const isEvent = termin.art === "veranstaltung";
    const shuffled = rng.shuffle(members);
    const attendCount = isEvent ? members.length : rng.int(6, 9);
    const attending = shuffled.slice(0, attendCount);
    const absent    = shuffled.slice(attendCount);

    termin.anwesenheit = attending.map((m) => m.id);

    // Verspätung (ca. 20 % der Anwesenden)
    for (const m of attending) {
      if (!rng.bool(0.20)) continue;
      const minuten = rng.pick([5, 8, 10, 12, 15, 18, 20, 25, 30, 40, 45, 60]);
      verspätungMap[m.id].push({
        id: nextId(),
        memberId: m.id,
        terminId: termin.id,
        datum: termin.datum,
        minutenVerspätet: minuten,
        grund: rng.bool(0.5) ? rng.pick(späteGründe) : undefined,
      });
      strafMap[m.id].push({
        id: nextId(),
        memberId: m.id,
        terminId: termin.id,
        kategorie: minuten > 30 ? "spaet_30min" : "spaet_15min",
        betrag: minuten > 30 ? 10 : 5,
        loggedAt: termin.datum + "T19:45:00.000Z",
        beglichen: rng.bool(0.65),
      });
    }

    // Fehlen (ca. 50 % der Abwesenden bekommen Straf eingetragen)
    for (const m of absent) {
      if (!rng.bool(0.55)) continue;
      const entschuldigt = rng.bool(0.45);
      strafMap[m.id].push({
        id: nextId(),
        memberId: m.id,
        terminId: termin.id,
        kategorie: entschuldigt ? "fehlen_entschuldigt" : "fehlen_unentschuldigt",
        betrag: entschuldigt ? 10 : 50,
        loggedAt: termin.datum + "T20:00:00.000Z",
        beglichen: rng.bool(0.60),
      });
    }

    // Schocken: 2–4 Runden
    const rounds = rng.int(2, 4);
    for (let r = 0; r < rounds; r++) {
      const pool = rng.shuffle(attending);
      const loserCount = rng.int(1, Math.min(2, pool.length));
      for (let l = 0; l < loserCount; l++) {
        const loser = pool[l];
        schockMap[loser.id].push({
          id: nextId(),
          memberId: loser.id,
          terminId: termin.id,
          typ: rng.bool(0.12) ? "schock_aus" : "niederlage",
          loggedAt: termin.datum + `T${20 + r}:00:00.000Z`,
        });
      }
    }

    // Männlicher Gast (ca. 10 %)
    if (rng.bool(0.10) && attending.length > 0) {
      const host = rng.pick(attending);
      const gastNamen = ["Bernd", "Klaus", "Hansi", "Rudi", "Günther", "Norbert"];
      strafMap[host.id].push({
        id: nextId(),
        memberId: host.id,
        terminId: termin.id,
        kategorie: "maennlicher_gast",
        betrag: 20,
        notiz: `Hat ${rng.pick(gastNamen)} mitgebracht`,
        loggedAt: termin.datum + "T19:35:00.000Z",
        beglichen: rng.bool(0.65),
      });
    }
  }

  // ── Kasse ────────────────────────────────────────────────────────────────────
  const kasse: KassenEintrag[] = [];

  // Einnahmen: Strafen eingesammelt (alle 4 Termine)
  for (let i = 0; i < termine.length; i += 4) {
    if (!rng.bool(0.75)) continue;
    kasse.push({
      id: nextId(),
      typ: "einnahme",
      betrag: rng.int(25, 180),
      beschreibung: "Strafen eingesammelt",
      terminId: termine[i].id,
      datum: termine[i].datum + "T23:00:00.000Z",
    });
  }

  // Fixe Einnahmen
  const einnahmen = [
    { beschreibung: "Mitgliedsbeiträge Jahresabschluss 2024", betrag: 240, datum: "2025-01-09" },
    { beschreibung: "Mitgliedsbeiträge Jahresabschluss 2025", betrag: 250, datum: "2026-01-08" },
    { beschreibung: "Gewinn Preisschießen", betrag: 50, datum: "2024-09-14" },
  ];
  for (const e of einnahmen) {
    if (new Date(e.datum) <= today) {
      kasse.push({
        id: nextId(),
        typ: "einnahme",
        betrag: e.betrag,
        beschreibung: e.beschreibung,
        datum: e.datum + "T12:00:00.000Z",
      });
    }
  }

  // Ausgaben
  const ausgaben = [
    { beschreibung: "Vereinsregistrierung",           betrag: 25,  datum: "2022-04-15" },
    { beschreibung: "Bierkrug-Gravuren (10 Stück)",   betrag: 85,  datum: "2022-10-13" },
    { beschreibung: "Stammtischtafel (Holzschild)",   betrag: 120, datum: "2023-03-09" },
    { beschreibung: "Druckkostenbeitrag Satzung",     betrag: 22,  datum: "2023-09-14" },
    { beschreibung: "Vereinsausflug Herbstvolksfest", betrag: 180, datum: "2024-09-19" },
    { beschreibung: "Weihnachtsfeier 2024 (Deko)",    betrag: 65,  datum: "2024-12-21" },
    { beschreibung: "Neue Spielkarten + Würfelbecher",betrag: 28,  datum: "2025-02-06" },
    { beschreibung: "Vereinsausflug Sommerfest",      betrag: 220, datum: "2025-07-19" },
    { beschreibung: "Weihnachtsfeier 2025 (Deko)",    betrag: 70,  datum: "2025-12-20" },
  ];
  for (const a of ausgaben) {
    if (new Date(a.datum) <= today) {
      kasse.push({
        id: nextId(),
        typ: "ausgabe",
        betrag: a.betrag,
        beschreibung: a.beschreibung,
        datum: a.datum + "T20:00:00.000Z",
      });
    }
  }

  // Abendkosten (letzte 6 Termine)
  const recentTermine = termine.slice(-6);
  for (const t of recentTermine) {
    const zahler = rng.pick(members);
    kasse.push({
      id: nextId(),
      typ: "abendkosten",
      betrag: rng.int(55, 150),
      beschreibung: "Abendrunde Getränke & Snacks",
      terminId: t.id,
      bezahltVon: zahler.id,
      datum: t.datum + "T23:05:00.000Z",
      beglichen: rng.bool(0.5),
    });
  }

  // ── Protokolle (letzte 8 Stammtische) ───────────────────────────────────────
  const protokolle: Protokoll[] = [];
  const stammtischTermine = termine.filter((t) => t.art === "stammtisch");
  const protokollTermine = stammtischTermine.slice(-8);

  const protokollInhalte = [
    "Anwesenheit vollständig. Kassenstand besprochen. Sepp hat beim Schocken die Runde geschmissen – wieder mal. Strafen des letzten Termins wurden größtenteils eingesammelt. Nächster Termin in zwei Wochen.",
    "Franz zu spät (20 Min.). Drei Runden Schocken, Wolle verliert zweimal. Verspätungsregel nochmal erläutert. Tombo führt Protokoll. Kassenstand bleibt positiv.",
    "Klausel präsentiert aktuellen Kassenstand: 214 €. Andi schlägt Vereinsausflug vor – Abstimmung: 7:0 dafür. Datum wird per WhatsApp koordiniert. Markus erinnert alle an offene Strafen.",
    "Weihnachtsfeier-Planung: Termin fixiert, Saal reserviert. Tombo übernimmt Einladungen. Große Schocken-Runde zum Abschluss – Petro hat Schock-Aus, zahlt die Runde.",
    "Neues Jahr, gute Vorsätze. Alle pünktlich. Markus begrüßt das Jahr offiziell. Schnelles Schocken, früher Schluss. Kassenstand +180 €.",
    "Michi feiert 1-jährige Mitgliedschaft – Sonderrunde auf Kosten der Kasse. Standing Ovations. Wolle bringt seine Frau mit (kein Strafbetrag – sie ist weiblich).",
    "Lebhafte Diskussion über die Schock-Regeln. Klausel schlägt vor, eine Satzungsänderung zu beantragen. Vertagung auf nächsten Termin. Drei Runden Schocken, Sepp gewinnt alle.",
    "Ausflug zum Herbstvolksfest besprochen. Budget: 200 € aus Kasse. Andi organisiert Fahrgemeinschaften. Alle stimmen zu. Kurzes Schocken. Früher Schluss wegen Fußball.",
  ];

  for (let i = 0; i < protokollTermine.length; i++) {
    const t = protokollTermine[i];
    const datum = new Date(t.datum).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });
    protokolle.push({
      id: nextId(),
      terminId: t.id,
      titel: `Protokoll ${datum}`,
      inhalt: protokollInhalte[i % protokollInhalte.length],
      createdAt: t.datum + "T23:30:00.000Z",
      updatedAt: t.datum + "T23:30:00.000Z",
    });
  }

  // ── In Supabase schreiben ────────────────────────────────────────────────────
  await insertInBatches(
    "members",
    members.map((m) => ({
      id: m.id,
      stammtisch_id: stammtischId,
      name: m.name,
      spitzname: m.spitzname ?? null,
      mitglied_seit: m.mitgliedSeit,
      rolle: m.rolle,
      lieblingsgetraenk: m.lieblingsgetraenk ?? null,
      beruf: m.beruf ?? null,
      avatar_color: m.avatarColor,
      created_at: m.createdAt,
    }))
  );

  const { error: vError } = await supabase.from("verordnung").update({
    name: verordnung.name,
    treffpunkt: verordnung.treffpunkt ?? null,
    stammtisch_tag: verordnung.stammtischTag ?? null,
    stammtischzeit: verordnung.stammtischzeit ?? null,
    gruendungsjahr: verordnung.gruendungsjahr ?? null,
    regeln: verordnung.regeln,
    sonstiges: verordnung.sonstiges ?? null,
  }).eq("stammtisch_id", stammtischId);
  if (vError) throw new Error("Verordnung-Update fehlgeschlagen: " + vError.message);

  await insertInBatches(
    "termine",
    termine.map((t) => ({
      id: t.id,
      stammtisch_id: stammtischId,
      art: t.art,
      titel: t.titel ?? null,
      datum: t.datum,
      start_zeit: t.startZeit ?? null,
      end_zeit: t.endZeit ?? null,
      ort: t.ort ?? null,
      aktiv: false,
      started_at: t.startedAt ?? null,
      ended_at: t.endedAt ?? null,
      created_at: t.createdAt,
      anwesenheit: t.anwesenheit ?? [],
    }))
  );

  await insertInBatches(
    "protokolle",
    protokolle.map((p) => ({
      id: p.id,
      termin_id: p.terminId,
      titel: p.titel ?? null,
      inhalt: p.inhalt,
      created_at: p.createdAt,
      updated_at: p.updatedAt,
    }))
  );

  await insertInBatches(
    "kasse",
    kasse.map((k) => ({
      id: k.id,
      stammtisch_id: stammtischId,
      typ: k.typ,
      betrag: k.betrag,
      beschreibung: k.beschreibung ?? null,
      termin_id: k.terminId ?? null,
      bezahlt_von: k.bezahltVon ?? null,
      datum: k.datum,
      beglichen: k.beglichen ?? null,
    }))
  );

  const alleVerspätung = Object.values(verspätungMap).flat();
  await insertInBatches(
    "verspaetung_logs",
    alleVerspätung.map((v) => ({
      id: v.id,
      member_id: v.memberId,
      termin_id: v.terminId ?? null,
      datum: v.datum,
      minuten_verspaetet: v.minutenVerspätet,
      grund: v.grund ?? null,
    }))
  );

  const alleSchock = Object.values(schockMap).flat();
  await insertInBatches(
    "schock_logs",
    alleSchock.map((s) => ({
      id: s.id,
      member_id: s.memberId,
      termin_id: s.terminId ?? null,
      typ: s.typ,
      logged_at: s.loggedAt,
    }))
  );

  const alleStraf = Object.values(strafMap).flat();
  await insertInBatches(
    "straf_logs",
    alleStraf.map((s) => ({
      id: s.id,
      member_id: s.memberId,
      termin_id: s.terminId ?? null,
      kategorie: s.kategorie,
      betrag: s.betrag,
      notiz: s.notiz ?? null,
      logged_at: s.loggedAt,
      beglichen: s.beglichen,
    }))
  );
}

// ─── Alle Stammtisch-Daten löschen ────────────────────────────────────────────

export async function clearAllData(): Promise<void> {
  const stammtischId = await getStammtischId();

  await supabase.from("chat_sessions").delete().eq("stammtisch_id", stammtischId);
  await supabase.from("kasse").delete().eq("stammtisch_id", stammtischId);
  await supabase.from("termine").delete().eq("stammtisch_id", stammtischId);
  await supabase.from("members").delete().eq("stammtisch_id", stammtischId);
  await supabase.from("verordnung").update({
    name: "Mein Stammtisch",
    treffpunkt: null,
    stammtisch_tag: null,
    stammtischzeit: null,
    gruendungsjahr: null,
    regeln: [],
    sonstiges: null,
  }).eq("stammtisch_id", stammtischId);
}
