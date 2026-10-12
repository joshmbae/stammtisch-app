import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  KassenEintrag,
  MemberProfile,
  Protokoll,
  Spiel,
  SpielEreignisTyp,
  SpielLog,
  StammtischTermin,
  StammtischVerordnung,
  StrafKategorieDef,
  StrafLog,
  VerspätungLog,
} from "../types";
import {
  addSpielLog,
  addStrafLog,
  addVerspätungLog,
  deleteSpielLog,
  deleteStrafLog,
  deleteTermin,
  deleteVerspätungLog,
  loadAgenda,
  loadAllSpielLogs,
  loadAllStrafLogs,
  loadAllVerspätungLogs,
  loadEreignisTypen,
  loadKasse,
  loadMembers,
  loadProtokoll,
  loadSpiele,
  loadStrafKategorien,
  loadTermine,
  loadVerordnung,
  logActivity,
  saveAgenda,
  setAnwesenheitAll,
  setRsvpStatus,
  toggleAnwesenheit,
  updateTermin,
  uploadTerminBild,
} from "./storage";
import { supabase } from "./supabase";
import { dedupeInsert, patchById, removeByIdEverywhere, subscribeToTerminChanges } from "./realtime";
import { setStrafeBeglichen, setStrafenBeglichen } from "./strafenActions";
import { useScreenLoad } from "./useScreenLoad";
import { useSession } from "../contexts/SessionContext";

export type RsvpStatus = "ja" | "nein" | null;

/** Felder aus dem Bearbeiten-Formular. Leere Felder werden gelöscht. */
export interface TerminEdit {
  titel?: string;
  datum: string;
  startZeit?: string;
  endZeit?: string;
  ort?: string;
  notizen?: string;
}

type ProMitglied<T> = Record<string, T[]>;

function nachMitglied<T extends { memberId: string }>(logs: T[], memberIds: string[]): ProMitglied<T> {
  const map: ProMitglied<T> = {};
  for (const id of memberIds) map[id] = [];
  for (const l of logs) (map[l.memberId] ??= []).push(l);
  return map;
}

/**
 * Alles, was ein Termin-Abend an Daten und Aktionen braucht: Laden, Live-Abgleich
 * über Realtime (solange der Screen sichtbar ist) und die Handler für Zusage,
 * Anwesenheit, Verspätung, Strafen, Spiel, Foto, Bearbeiten und Agenda.
 * Die Ansichten (Vorher, Live, Danach) sind damit reine Darstellung.
 */
export function useTerminAbend(id: string) {
  const { activeMemberId } = useSession();

  const [termin, setTermin] = useState<StammtischTermin | null>(null);
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [verordnung, setVerordnung] = useState<StammtischVerordnung>({ name: "Mein Stammtisch", regeln: [] });
  const [protokoll, setProtokoll] = useState<Protokoll | null>(null);
  const [agendaText, setAgendaText] = useState("");
  const [strafKategorien, setStrafKategorien] = useState<StrafKategorieDef[]>([]);
  const [verspätungMap, setVerspätungMap] = useState<ProMitglied<VerspätungLog>>({});
  const [strafMap, setStrafMap] = useState<ProMitglied<StrafLog>>({});
  /** Eigene offene Strafen über alle Abende – zum Begleichen im Danach-Bereich. */
  const [meineOffen, setMeineOffen] = useState<StrafLog[]>([]);
  const ichRef = useRef(activeMemberId);
  ichRef.current = activeMemberId;
  const meineOffenPflegen = (log: StrafLog) => {
    if (log.memberId !== ichRef.current) return;
    setMeineOffen((prev) => {
      const ohne = prev.filter((l) => l.id !== log.id);
      return log.beglichen ? ohne : [log, ...ohne];
    });
  };
  const [spielLogMap, setSpielLogMap] = useState<ProMitglied<SpielLog>>({});
  const [aktivesSpiel, setAktivesSpiel] = useState<Spiel | null>(null);
  const [ereignisTypen, setEreignisTypen] = useState<SpielEreignisTyp[]>([]);
  const [uploadingBild, setUploadingBild] = useState(false);
  /** Stammtischrechnung zu diesem Abend (einer zahlt für alle), falls erfasst. */
  const [rechnung, setRechnung] = useState<KassenEintrag | null>(null);

  // Realtime-Callbacks laufen außerhalb des Render-Zyklus und brauchen das aktuelle Spiel.
  const aktivesSpielRef = useRef<Spiel | null>(null);
  useEffect(() => { aktivesSpielRef.current = aktivesSpiel; }, [aktivesSpiel]);

  async function load() {
    const [termine, ms, v, kats] = await Promise.all([loadTermine(), loadMembers(), loadVerordnung(), loadStrafKategorien()]);
    const t = termine.find((x) => x.id === id) ?? null;
    setTermin(t);
    setMembers(ms);
    setVerordnung(v);
    setStrafKategorien(kats);
    if (!t || ms.length === 0) return;

    let spiel: Spiel | null = null;
    let typen: SpielEreignisTyp[] = [];
    const memberIds = ms.map((m) => m.id);
    const [proto, agenda, alleSpiele, vLogs, spLogs, stLogs, kasse] = await Promise.all([
      loadProtokoll(t.id),
      loadAgenda(t.id),
      v.aktivesSpielId ? loadSpiele() : Promise.resolve([] as Spiel[]),
      loadAllVerspätungLogs(memberIds),
      loadAllSpielLogs(memberIds),
      loadAllStrafLogs(memberIds),
      loadKasse(),
    ]);
    if (v.aktivesSpielId) {
      spiel = alleSpiele.find((s) => s.id === v.aktivesSpielId) ?? null;
      if (spiel) typen = await loadEreignisTypen(spiel.id);
    }
    setRechnung(kasse.find((e) => e.typ === "abendkosten" && e.terminId === t.id) ?? null);
    setProtokoll(proto);
    setAgendaText(agenda);
    setAktivesSpiel(spiel);
    setEreignisTypen(typen);
    setVerspätungMap(nachMitglied(vLogs.filter((l) => l.terminId === t.id), memberIds));
    setSpielLogMap(nachMitglied(spLogs.filter((l) => l.terminId === t.id && (!spiel || l.spielId === spiel.id)), memberIds));
    setStrafMap(nachMitglied(stLogs.filter((l) => l.terminId === t.id), memberIds));
    setMeineOffen(stLogs.filter((l) => l.memberId === activeMemberId && !l.beglichen));
  }

  const screen = useScreenLoad(load, [id]);

  useFocusEffect(
    useCallback(() => {
      let hadDropped = false;
      const channel = subscribeToTerminChanges(
        id,
        {
          onSpielLogInsert: (log) => {
            if (aktivesSpielRef.current && log.spielId !== aktivesSpielRef.current.id) return;
            setSpielLogMap((prev) => dedupeInsert(prev, log, log.memberId));
          },
          onSpielLogDelete: (logId) => setSpielLogMap((prev) => removeByIdEverywhere(prev, logId)),
          onStrafLogInsert: (log) => { setStrafMap((prev) => dedupeInsert(prev, log, log.memberId)); meineOffenPflegen(log); },
          onStrafLogUpdate: (log) => { setStrafMap((prev) => patchById(prev, log, log.memberId)); meineOffenPflegen(log); },
          onStrafLogDelete: (logId) => { setStrafMap((prev) => removeByIdEverywhere(prev, logId)); setMeineOffen((prev) => prev.filter((l) => l.id !== logId)); },
          onVerspätungInsert: (log) => setVerspätungMap((prev) => dedupeInsert(prev, log, log.memberId)),
          onVerspätungDelete: (logId) => setVerspätungMap((prev) => removeByIdEverywhere(prev, logId)),
          onTerminUpdate: (t) => setTermin((prev) => (prev ? { ...prev, ...t } : t)),
        },
        (status) => {
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            hadDropped = true;
          } else if (status === "SUBSCRIBED" && hadDropped) {
            hadDropped = false;
            load().catch(() => { /* nächster Pull-to-Refresh holt es nach */ });
          }
        }
      );
      return () => { supabase.removeChannel(channel); };
    }, [id])
  );

  async function frischerTermin() {
    const fresh = (await loadTermine()).find((t) => t.id === id) ?? null;
    if (fresh) setTermin(fresh);
  }

  const actor = activeMemberId ?? undefined;

  // ── Zusage & Anwesenheit ──────────────────────────────────────────────────

  async function rsvp(status: RsvpStatus, grund?: string) {
    if (!termin || !activeMemberId) return;
    await setRsvpStatus(termin.id, activeMemberId, status, grund);
    await frischerTermin();
    if (status === "ja" || status === "nein") {
      await logActivity({
        actorMemberId: activeMemberId,
        subjectMemberId: activeMemberId,
        actionType: status === "ja" ? "termin_zusage" : "termin_absage",
        terminId: termin.id,
        meta: { terminDatum: termin.datum, terminTitel: termin.titel, terminArt: termin.art },
      });
    }
  }

  async function anwesenheitUmschalten(memberId: string) {
    if (!termin) return;
    const updated = await toggleAnwesenheit(termin.id, memberId);
    setTermin((prev) => (prev ? { ...prev, anwesenheit: updated } : prev));
  }

  /** Live: jemand ist da bzw. doch nicht (für jedes Mitglied, nicht nur sich selbst). */
  async function anwesenheitSetzen(memberId: string, da: boolean) {
    if (!termin) return;
    setTermin((prev) => prev ? {
      ...prev,
      anwesenheit: da ? [...(prev.anwesenheit ?? []).filter((x) => x !== memberId), memberId] : (prev.anwesenheit ?? []).filter((x) => x !== memberId),
      absagen: (prev.absagen ?? []).filter((x) => x !== memberId),
    } : prev);
    try {
      await setRsvpStatus(termin.id, memberId, da ? "ja" : null);
    } finally {
      await frischerTermin();
    }
  }

  async function alleAnwesend() {
    if (!termin) return;
    const alle = (termin.anwesenheit ?? []).length === members.length;
    const updated = alle ? [] : members.map((m) => m.id);
    await setAnwesenheitAll(termin.id, updated);
    setTermin((prev) => (prev ? { ...prev, anwesenheit: updated } : prev));
  }

  async function verspätungEintragen(memberId: string, minuten: number, grund?: string) {
    if (!termin) return;
    const log = await addVerspätungLog(memberId, {
      datum: new Date().toISOString(),
      minutenVerspätet: minuten,
      grund,
      terminId: termin.id,
    });
    setVerspätungMap((prev) => dedupeInsert(prev, log, memberId));
  }

  async function verspätungLöschen(memberId: string, logId: string) {
    await deleteVerspätungLog(memberId, logId);
    setVerspätungMap((prev) => removeByIdEverywhere(prev, logId));
  }

  // ── Spiel ─────────────────────────────────────────────────────────────────

  async function spielEreignisEintragen(memberId: string, ereignisTypId: string) {
    if (!termin || !aktivesSpiel) return;
    const typ = ereignisTypen.find((e) => e.id === ereignisTypId);
    if (!typ) return;

    // Ereignisse mit Strafe (z. B. „Verloren") legen die Strafe gleich mit an.
    let strafLogId: string | undefined;
    if (typ.strafKategorie) {
      const strafLog = await addStrafLog(memberId, {
        kategorie: typ.strafKategorie,
        betrag: typ.strafBetrag ?? 0,
        terminId: termin.id,
        loggedAt: new Date().toISOString(),
        beglichen: false,
      });
      strafLogId = strafLog.id;
      setStrafMap((prev) => dedupeInsert(prev, strafLog, memberId));
      await logActivity({
        actorMemberId: actor,
        subjectMemberId: memberId,
        actionType: "straf_log_created",
        terminId: termin.id,
        refId: strafLog.id,
        meta: { kategorie: strafLog.kategorie, betrag: strafLog.betrag },
      });
    }

    const log = await addSpielLog(memberId, {
      spielId: aktivesSpiel.id,
      ereignisTypId,
      terminId: termin.id,
      strafLogId,
      loggedAt: new Date().toISOString(),
    });
    setSpielLogMap((prev) => dedupeInsert(prev, log, memberId));
    await logActivity({
      actorMemberId: actor,
      subjectMemberId: memberId,
      actionType: "spiel_log_created",
      terminId: termin.id,
      refId: log.id,
      meta: { spielName: aktivesSpiel.name, spielEmoji: aktivesSpiel.emoji, ereignisLabel: typ.label, ereignisEmoji: typ.emoji },
    });
  }

  async function spielEreignisLöschen(memberId: string, logId: string) {
    const log = (spielLogMap[memberId] ?? []).find((l) => l.id === logId);
    const typ = ereignisTypen.find((e) => e.id === log?.ereignisTypId);
    await deleteSpielLog(memberId, logId);
    setSpielLogMap((prev) => removeByIdEverywhere(prev, logId));

    if (log?.strafLogId) {
      await deleteStrafLog(memberId, log.strafLogId);
      setStrafMap((prev) => removeByIdEverywhere(prev, log.strafLogId!));
      await logActivity({
        actorMemberId: actor,
        subjectMemberId: memberId,
        actionType: "straf_log_deleted",
        terminId: termin?.id,
        refId: log.strafLogId,
        meta: { kategorie: typ?.strafKategorie, betrag: typ?.strafBetrag ?? 0 },
      });
    }
    await logActivity({
      actorMemberId: actor,
      subjectMemberId: memberId,
      actionType: "spiel_log_deleted",
      terminId: termin?.id,
      refId: logId,
      meta: { spielName: aktivesSpiel?.name, spielEmoji: aktivesSpiel?.emoji, ereignisLabel: typ?.label, ereignisEmoji: typ?.emoji },
    });
  }

  // ── Strafen ───────────────────────────────────────────────────────────────

  async function strafeEintragen(memberId: string, kategorie: StrafKategorieDef, betrag: number, notiz?: string) {
    if (!termin) return;
    const log = await addStrafLog(memberId, {
      kategorie: kategorie.id,
      betrag,
      notiz,
      terminId: termin.id,
      loggedAt: new Date().toISOString(),
      beglichen: false,
    });
    setStrafMap((prev) => dedupeInsert(prev, log, memberId));
    await logActivity({
      actorMemberId: actor,
      subjectMemberId: memberId,
      actionType: "straf_log_created",
      terminId: termin.id,
      refId: log.id,
      meta: { kategorie: log.kategorie, betrag: log.betrag, notiz: log.notiz },
    });
  }

  async function strafeBeglichenUmschalten(memberId: string, logId: string) {
    const log = (strafMap[memberId] ?? []).find((l) => l.id === logId);
    if (!log) return;
    const next = !log.beglichen;
    await setStrafeBeglichen(log, next, {
      memberName: members.find((m) => m.id === memberId)?.name,
      kategorieLabel: strafKategorien.find((k) => k.id === log.kategorie)?.label,
      actorMemberId: activeMemberId,
    });
    setStrafMap((prev) => patchById(prev, { ...log, beglichen: next }, memberId));
    meineOffenPflegen({ ...log, beglichen: next });
  }

  /** Eigene offene Strafen (alle oder die übergebenen) auf einmal begleichen – eine Chronik-Meldung für alle. */
  async function meineStrafenBegleichen(logs: StrafLog[] = meineOffen) {
    if (!activeMemberId || logs.length === 0) return;
    await setStrafenBeglichen(logs, {
      memberName: members.find((m) => m.id === activeMemberId)?.name,
      kategorieLabel: (log) => strafKategorien.find((k) => k.id === log.kategorie)?.label,
      actorMemberId: activeMemberId,
      terminId: termin?.id,
    });
    const ids = new Set(logs.map((l) => l.id));
    setMeineOffen((prev) => prev.filter((l) => !ids.has(l.id)));
    setStrafMap((prev) => {
      let next = prev;
      for (const log of logs) if (log.terminId === termin?.id) next = patchById<StrafLog>(next, { ...log, beglichen: true }, log.memberId);
      return next;
    });
  }

  async function strafeLöschen(memberId: string, logId: string) {
    const log = (strafMap[memberId] ?? []).find((l) => l.id === logId);
    await deleteStrafLog(memberId, logId);
    setStrafMap((prev) => removeByIdEverywhere(prev, logId));
    await logActivity({
      actorMemberId: actor,
      subjectMemberId: memberId,
      actionType: "straf_log_deleted",
      terminId: termin?.id,
      refId: logId,
      meta: { kategorie: log?.kategorie, betrag: log?.betrag ?? 0 },
    });
  }

  // ── Termin selbst ─────────────────────────────────────────────────────────

  async function bildHochladen(localUri: string) {
    if (!termin) return;
    setUploadingBild(true);
    try {
      const url = await uploadTerminBild(termin.id, localUri);
      await updateTermin(termin.id, { bildUrl: url });
      setTermin((prev) => (prev ? { ...prev, bildUrl: url } : prev));
    } finally {
      setUploadingBild(false);
    }
  }

  async function bildEntfernen() {
    if (!termin) return;
    await updateTermin(termin.id, { bildUrl: undefined });
    setTermin((prev) => (prev ? { ...prev, bildUrl: undefined } : prev));
  }

  async function speichern(edit: TerminEdit) {
    if (!termin) return;
    const verlegt = edit.datum !== termin.datum || edit.startZeit !== termin.startZeit;
    await updateTermin(termin.id, {
      titel: edit.titel,
      datum: edit.datum,
      startZeit: edit.startZeit,
      endZeit: edit.endZeit,
      ort: edit.ort,
      notizen: edit.notizen,
    });
    if (verlegt) {
      await logActivity({
        actorMemberId: actor,
        actionType: "termin_verlegt",
        terminId: termin.id,
        meta: { terminDatum: edit.datum, terminTitel: edit.titel || termin.titel, terminArt: termin.art, altDatum: termin.datum },
      });
    }
    await frischerTermin();
  }

  async function löschen() {
    if (!termin) return;
    await deleteTermin(termin.id);
  }

  async function agendaSpeichern(text: string) {
    setAgendaText(text);
    await saveAgenda(id, text);
  }

  /** Abend vorzeitig bzw. ohne hinterlegte Uhrzeit starten. */
  async function abendStarten() {
    if (!termin) return;
    const startedAt = new Date().toISOString();
    await updateTermin(termin.id, { aktiv: true, startedAt, endedAt: undefined });
    setTermin((prev) => (prev ? { ...prev, aktiv: true, startedAt, endedAt: undefined } : prev));
  }

  async function abendBeenden() {
    if (!termin) return;
    const endedAt = new Date().toISOString();
    await updateTermin(termin.id, { aktiv: false, endedAt });
    setTermin((prev) => (prev ? { ...prev, aktiv: false, endedAt } : prev));
  }

  return {
    ...screen,
    reload: load,
    activeMemberId,
    termin, members, verordnung, protokoll, agendaText, strafKategorien,
    verspätungMap, strafMap, spielLogMap, aktivesSpiel, ereignisTypen, uploadingBild, rechnung,
    rsvp, anwesenheitUmschalten, anwesenheitSetzen, alleAnwesend, verspätungEintragen, verspätungLöschen,
    spielEreignisEintragen, spielEreignisLöschen,
    strafeEintragen, strafeBeglichenUmschalten, strafeLöschen, meineOffen, meineStrafenBegleichen,
    bildHochladen, bildEntfernen, speichern, löschen, agendaSpeichern, abendStarten, abendBeenden,
  };
}

export type TerminAbend = ReturnType<typeof useTerminAbend>;
