/**
 * Seed-Datensatz für den Test-Stammtisch
 * Generiert Testdaten seit Gründung Okt 2024: 11 Mitglieder, monatliche Stammtische
 * (jeweils erster Donnerstag im Monat), Logs, Kasse, Protokolle.
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
import { AVATAR_COLORS } from "../constants/design";

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

// ─── Datums-Helfer ────────────────────────────────────────────────────────────

/** Erster Donnerstag eines Monats (monthIndex0: 0 = Januar) */
function firstThursday(year: number, monthIndex0: number): Date {
  const d = new Date(year, monthIndex0, 1);
  const offset = (4 - d.getDay() + 7) % 7;
  d.setDate(1 + offset);
  return d;
}

// ─── Batch-Insert-Helfer (PostgREST mag keine riesigen Payloads) ─────────────

async function insertInBatches(table: string, rows: any[], batchSize = 500): Promise<void> {
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from(table).insert(batch);
    if (error) throw new Error(`Insert in ${table} fehlgeschlagen: ${error.message}`);
  }
}

/** Erhöht den Wert für `targetId` so lange, bis er strikt über allen anderen liegt. */
function ensureStrictMax(
  counts: Record<string, number>,
  targetId: string,
  otherIds: string[],
  bump: () => boolean
): void {
  let maxOther = Math.max(...otherIds.map((id) => counts[id]));
  let guard = 0;
  while (counts[targetId] <= maxOther && guard < 2000) {
    guard++;
    if (!bump()) break;
    maxOther = Math.max(...otherIds.map((id) => counts[id]));
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
    key: string;
    name: string;
    rolle: MemberProfile["rolle"];
  }[] = [
    { key: "max",     name: "Max",     rolle: "Stammtischkönig" },
    { key: "tobi",    name: "Tobi",    rolle: "Kassenwart" },
    { key: "bene",    name: "Bene",    rolle: "Foto-Beauftragter" },
    { key: "basti",   name: "Basti",   rolle: "Reiseminister" },
    { key: "simon",   name: "Simon",   rolle: "Reserviermeister" },
    { key: "matthis", name: "Matthis", rolle: "Eventmanager" },
    { key: "jens",    name: "Jens",    rolle: "Vize-Eventmanager" },
    { key: "josh",    name: "Josh",    rolle: "Vize-Reserviermeister" },
    { key: "tom",     name: "Tom",     rolle: "Mitglied" },
    { key: "jan",     name: "Jan",     rolle: "Mitglied" },
    { key: "niklas",  name: "Niklas",  rolle: "Mitglied" },
  ];

  const GRUENDUNG = "2024-10-01";

  const members: MemberProfile[] = memberDefs.map((def, i) => ({
    id: nextId(),
    name: def.name,
    rolle: def.rolle,
    avatarColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
    mitgliedSeit: GRUENDUNG,
    createdAt: new Date(GRUENDUNG + "T10:00:00").toISOString(),
  }));

  const byKey: Record<string, MemberProfile> = {};
  memberDefs.forEach((def, i) => { byKey[def.key] = members[i]; });

  // ── Verordnung ───────────────────────────────────────────────────────────────
  const verordnung: StammtischVerordnung = {
    name: "Die Hellen",
    treffpunkt: "Ayinger am Rotkreuzplatz",
    stammtischTag: "Jeden ersten Donnerstag im Monat",
    stammtischzeit: "19:30 Uhr",
    gruendungsjahr: "2024-10",
    regeln: [
      "Entschuldigtes Fehlen (bis 23:59 Uhr Vortag oder triftiger Grund): 10 €.",
      "Unentschuldigtes Fehlen: 50 €.",
      "Entschuldigtes Zu-spät-kommen: straffrei bei <30 Min., sonst 5 €. Verspätungs-Tracker startet ab der angekündigten neuen Ankunftszeit.",
      "Unentschuldigtes Zu-spät-kommen: Trinkspruch ab 1 Min., 5 € ab 15 Min., 10 € ab 30 Min.",
      "Meiste unentschuldigte Verspätungsminuten des Jahres: Einladung zu sich nach Hause inkl. Bier + PowerPoint-Präsentation über die Runde.",
      "Neue Mitglieder erhalten die Verspätungsminuten des bisherigen Schlusslichts.",
      "Beim Schocken zahlt der Verlierer die Runde; Schock-Aus zahlt die gesamte Runde.",
      "Die Rechnung des Abends wird vom Kassenwart beglichen und durch alle geteilt.",
      "Schulden müssen bis zum Vortag des nächsten Stammtisches (19 Uhr) beglichen werden – sonst Getränkerunde.",
      "Verschiebungen nur bei >50 % Absagen per Umfrage des Reserviermeisters oder per Antrag.",
      "Alle Entscheidungen per offener Mehrheit. Aufnahme neuer Mitglieder: anonym und einstimmig.",
    ],
    sonstiges: undefined,
  };

  // ── Termine (monatlich, jeweils erster Donnerstag, seit Okt 2024) ──────────
  const termine: StammtischTermin[] = [];
  const today = new Date();
  today.setHours(23, 59, 59, 0);

  let y = 2024, mIdx = 9; // Oktober 2024
  while (true) {
    const d = firstThursday(y, mIdx);
    if (d > today) break;
    const datum = d.toISOString().slice(0, 10);
    termine.push({
      id: nextId(),
      art: "stammtisch",
      datum,
      startZeit: "19:30",
      endZeit: "23:00",
      ort: verordnung.treffpunkt,
      aktiv: false,
      startedAt: datum + "T19:30:00.000Z",
      endedAt:   datum + "T23:00:00.000Z",
      createdAt: datum + "T12:00:00.000Z",
      anwesenheit: [],
    });
    mIdx++; if (mIdx > 11) { mIdx = 0; y++; }
  }

  // Zukünftige Stammtische (nächste 6, ohne Anwesenheitsdaten)
  for (let i = 0; i < 6; i++) {
    const d = firstThursday(y, mIdx);
    const datum = d.toISOString().slice(0, 10);
    termine.push({
      id: nextId(),
      art: "stammtisch",
      datum,
      startZeit: "19:30",
      endZeit: "23:00",
      ort: verordnung.treffpunkt,
      aktiv: false,
      createdAt: new Date().toISOString(),
      anwesenheit: [],
    });
    mIdx++; if (mIdx > 11) { mIdx = 0; y++; }
  }

  // Spezial-Veranstaltungen
  const specials: { datum: string; titel: string; startZeit: string }[] = [
    { datum: "2024-12-19", titel: "Weihnachtsfeier", startZeit: "18:00" },
    { datum: "2025-07-17", titel: "Sommerfest",       startZeit: "17:00" },
    { datum: "2025-12-18", titel: "Weihnachtsfeier",  startZeit: "18:00" },
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
        ort: verordnung.treffpunkt,
        aktiv: false,
        startedAt: s.datum + `T${s.startZeit}:00.000Z`,
        endedAt:   s.datum + "T23:59:00.000Z",
        createdAt: s.datum + "T10:00:00.000Z",
        anwesenheit: [],
      });
    }
  }

  termine.sort((a, b) => a.datum.localeCompare(b.datum));
  const stammtischTermine = termine.filter((t) => t.art === "stammtisch");

  // ── Anwesenheit ──────────────────────────────────────────────────────────────
  // Tobi ist praktisch immer dabei (soll am öftesten anwesend sein), Rest variiert.
  const attendProb: Record<string, number> = {
    tobi: 0.95, max: 0.82, bene: 0.75, basti: 0.7, simon: 0.8,
    matthis: 0.78, jens: 0.74, josh: 0.76, tom: 0.7, jan: 0.68, niklas: 0.72,
  };

  for (const termin of termine) {
    const isEvent = termin.art === "veranstaltung";
    const anwesend: string[] = [];
    for (const def of memberDefs) {
      if (isEvent || rng.bool(attendProb[def.key])) anwesend.push(byKey[def.key].id);
    }
    termin.anwesenheit = anwesend;
  }

  const attendanceCounts: Record<string, number> = {};
  for (const def of memberDefs) attendanceCounts[def.key] = 0;
  for (const t of termine) for (const def of memberDefs) if (t.anwesenheit!.includes(byKey[def.key].id)) attendanceCounts[def.key]++;

  ensureStrictMax(
    attendanceCounts,
    "tobi",
    memberDefs.filter((d) => d.key !== "tobi").map((d) => d.key),
    () => {
      const t = stammtischTermine.find((t) => !t.anwesenheit!.includes(byKey.tobi.id));
      if (!t) return false;
      t.anwesenheit!.push(byKey.tobi.id);
      attendanceCounts.tobi++;
      return true;
    }
  );

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
    "Stau", "Überstunden im Betrieb", "Noch schnell was erledigt", "Zug verpasst",
    "Parkplatz gesucht", "Noch schnell getankt", "Falsche Abfahrtszeit",
    "Anruf verpasst", "Noch beim Sport", "Vergessen die Uhr zu stellen",
  ];

  // Jens & Josh sind bekanntermaßen schlecht im Schocken -> doppeltes Verlust-Gewicht
  const badSchocker = new Set(["jens", "josh"]);

  for (const termin of termine) {
    const isEvent = termin.art === "veranstaltung";
    const attendingIds = termin.anwesenheit!;
    const attending = members.filter((m) => attendingIds.includes(m.id));
    const absent = members.filter((m) => !attendingIds.includes(m.id));

    // Verspätung (ca. 20 % der Anwesenden, keine Verspätung bei Veranstaltungen)
    if (!isEvent) {
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

      // Fehlen (ca. 50 % der Abwesenden bekommen Strafe eingetragen)
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
    }

    // Schocken: 2–4 Runden, Jens & Josh verlieren überdurchschnittlich oft
    if (attending.length >= 2) {
      const rounds = rng.int(2, 4);
      for (let r = 0; r < rounds; r++) {
        const pool: MemberProfile[] = [];
        for (const m of attending) {
          const key = memberDefs.find((d) => byKey[d.key].id === m.id)!.key;
          pool.push(m);
          if (badSchocker.has(key)) pool.push(m);
        }
        const loser = rng.pick(pool);
        schockMap[loser.id].push({
          id: nextId(),
          memberId: loser.id,
          terminId: termin.id,
          typ: rng.bool(0.12) ? "schock_aus" : "niederlage",
          loggedAt: termin.datum + `T${20 + r}:00:00.000Z`,
        });
      }
    }
  }

  // Fixup: Josh muss die meisten Verspätungsminuten (in Summe) haben
  const verspätungMinuten: Record<string, number> = {};
  for (const def of memberDefs) {
    verspätungMinuten[def.key] = verspätungMap[byKey[def.key].id].reduce((s, l) => s + l.minutenVerspätet, 0);
  }
  ensureStrictMax(
    verspätungMinuten,
    "josh",
    memberDefs.filter((d) => d.key !== "josh").map((d) => d.key),
    () => {
      const t = stammtischTermine.find((t) => t.anwesenheit!.includes(byKey.josh.id));
      if (!t) return false;
      const minuten = rng.pick([20, 25, 30, 35, 40]);
      verspätungMap[byKey.josh.id].push({
        id: nextId(),
        memberId: byKey.josh.id,
        terminId: t.id,
        datum: t.datum,
        minutenVerspätet: minuten,
        grund: rng.pick(späteGründe),
      });
      verspätungMinuten.josh += minuten;
      return true;
    }
  );

  // Fixup: Jens & Josh müssen die zwei höchsten Niederlagen-Zahlen haben
  const niederlagenCount: Record<string, number> = {};
  for (const def of memberDefs) {
    niederlagenCount[def.key] = schockMap[byKey[def.key].id].filter((l) => l.typ === "niederlage").length;
  }
  {
    const top2 = () =>
      [...memberDefs].sort((a, b) => niederlagenCount[b.key] - niederlagenCount[a.key]).slice(0, 2).map((d) => d.key).sort().join(",");
    const target = ["jens", "josh"].sort().join(",");
    let guard = 0;
    while (top2() !== target && guard < 2000) {
      guard++;
      const lower = niederlagenCount.jens <= niederlagenCount.josh ? "jens" : "josh";
      const m = byKey[lower];
      const t = rng.pick(stammtischTermine.length ? stammtischTermine : termine);
      schockMap[m.id].push({
        id: nextId(), memberId: m.id, terminId: t.id, typ: "niederlage",
        loggedAt: t.datum + "T21:30:00.000Z",
      });
      niederlagenCount[lower]++;
    }
  }

  // Fixup: Niklas muss die meisten Schock-Aus haben
  const schockAusCount: Record<string, number> = {};
  for (const def of memberDefs) {
    schockAusCount[def.key] = schockMap[byKey[def.key].id].filter((l) => l.typ === "schock_aus").length;
  }
  ensureStrictMax(
    schockAusCount,
    "niklas",
    memberDefs.filter((d) => d.key !== "niklas").map((d) => d.key),
    () => {
      const t = rng.pick(stammtischTermine.length ? stammtischTermine : termine);
      schockMap[byKey.niklas.id].push({
        id: nextId(), memberId: byKey.niklas.id, terminId: t.id, typ: "schock_aus",
        loggedAt: t.datum + "T22:00:00.000Z",
      });
      schockAusCount.niklas++;
      return true;
    }
  );

  // ── Kasse ────────────────────────────────────────────────────────────────────
  const kasse: KassenEintrag[] = [];

  // Einnahmen (fest, keine Zufallswerte -> Saldo landet bei ca. 950 €)
  const einnahmen = [
    { beschreibung: "Gründungsbeitrag (11 x 30 €)",                        betrag: 330, datum: "2024-10-10" },
    { beschreibung: "Strafen eingesammelt",                                betrag: 70,  datum: "2024-12-19" },
    { beschreibung: "Strafen eingesammelt",                                betrag: 85,  datum: "2025-03-06" },
    { beschreibung: "Strafen eingesammelt",                                betrag: 60,  datum: "2025-06-05" },
    { beschreibung: "Strafen eingesammelt",                                betrag: 95,  datum: "2025-09-04" },
    { beschreibung: "Mitgliedsbeiträge Jahresabschluss 2025 (11 x 20 €)",  betrag: 220, datum: "2025-12-04" },
    { beschreibung: "Strafen eingesammelt",                                betrag: 90,  datum: "2026-03-05" },
    { beschreibung: "Strafen eingesammelt",                                betrag: 75,  datum: "2026-06-04" },
    { beschreibung: "Mitgliedsbeiträge laufendes Jahr 2026 (11 x 20 €)",   betrag: 220, datum: "2026-01-08" },
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
    { beschreibung: "Vereinskasse Startausstattung (Kassenbuch, Karten)", betrag: 30,  datum: "2024-10-10" },
    { beschreibung: "Weihnachtsfeier 2024 (Deko & Punsch)",               betrag: 60,  datum: "2024-12-19" },
    { beschreibung: "Neue Schock-Würfelbecher & Karten",                  betrag: 25,  datum: "2025-02-13" },
    { beschreibung: "Sommerfest 2025 (Grillgut & Getränke)",              betrag: 130, datum: "2025-07-17" },
    { beschreibung: "Weihnachtsfeier 2025 (Deko)",                        betrag: 55,  datum: "2025-12-18" },
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

  // Abendkosten (letzte 12 Stammtische) — Tobi übernimmt meistens die Rechnung fürs Essen
  const recentTermine = stammtischTermine.filter((t) => new Date(t.datum) <= today).slice(-12);
  const zahlerCounts: Record<string, number> = {};
  for (const def of memberDefs) zahlerCounts[def.key] = 0;
  for (const t of recentTermine) {
    let zahlerKey: string;
    if (rng.bool(0.6)) {
      zahlerKey = "tobi";
    } else {
      const pool = memberDefs.filter((d) => t.anwesenheit!.includes(byKey[d.key].id));
      zahlerKey = pool.length ? rng.pick(pool).key : "tobi";
    }
    zahlerCounts[zahlerKey]++;
    kasse.push({
      id: nextId(),
      typ: "abendkosten",
      betrag: rng.int(55, 150),
      beschreibung: "Abendrunde Essen & Getränke",
      terminId: t.id,
      bezahltVon: byKey[zahlerKey].id,
      datum: t.datum + "T23:05:00.000Z",
      beglichen: rng.bool(0.5),
    });
  }
  ensureStrictMax(
    zahlerCounts,
    "tobi",
    memberDefs.filter((d) => d.key !== "tobi").map((d) => d.key),
    () => {
      const entry = kasse.find(
        (k) => k.typ === "abendkosten" && k.bezahltVon !== byKey.tobi.id
      );
      if (!entry) return false;
      const prevKey = memberDefs.find((d) => byKey[d.key].id === entry.bezahltVon)!.key;
      zahlerCounts[prevKey]--;
      entry.bezahltVon = byKey.tobi.id;
      zahlerCounts.tobi++;
      return true;
    }
  );

  // ── Protokolle (letzte 8 Stammtische) ───────────────────────────────────────
  const protokolle: Protokoll[] = [];
  const protokollTermine = stammtischTermine.filter((t) => new Date(t.datum) <= today).slice(-8);

  const protokollInhalte = [
    "Anwesenheit fast vollständig. Kassenstand von Tobi vorgestellt. Beim Schocken hat es wieder Jens und Josh erwischt. Nächster Termin in vier Wochen.",
    "Basti schlägt einen Ausflug vor – wird von Simon organisiert. Josh war mal wieder zu spät. Drei Runden Schocken, Niklas holt sich Schock-Aus.",
    "Bene präsentiert die Fotos vom letzten Abend. Max eröffnet die Runde. Kassenstand von Tobi wird als solide bezeichnet. Matthis plant das nächste Event.",
    "Weihnachtsfeier-Planung: Termin fixiert. Matthis und Jens übernehmen die Organisation. Große Schocken-Runde zum Abschluss – Niklas hat wieder Schock-Aus.",
    "Neues Jahr, gute Vorsätze. Tobi wie immer pünktlich und übernimmt die Rechnung. Kurzes Schocken, früher Schluss.",
    "Simon organisiert die Reservierung für den nächsten Termin. Basti berichtet vom letzten Ausflug. Josh sammelt weiter Verspätungsminuten.",
    "Lebhafte Diskussion über die Schock-Regeln, ausgelöst durch Jens' Dauer-Pech. Drei Runden Schocken, Tom gewinnt überraschend alle.",
    "Kassenwart Tobi berichtet über den aktuellen Stand (ca. 950 €). Bene macht Gruppenfotos. Kurzes Schocken, früher Schluss.",
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
