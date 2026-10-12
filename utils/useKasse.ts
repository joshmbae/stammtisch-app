import { useState } from "react";
import { KassenEintrag, MemberProfile, StammtischTermin, StrafKategorieDef, StrafLog } from "../types";
import {
  addKassenEintrag,
  addStrafLog,
  deleteKassenEintrag,
  deleteStrafLog,
  loadActivityFeed,
  loadAllStrafLogs,
  loadKasse,
  loadMembers,
  loadStrafKategorien,
  loadTermine,
  loadVerordnung,
  logActivity,
  updateKassenEintrag,
} from "./storage";
import { setStrafeBeglichen, setStrafenBeglichen } from "./strafenActions";
import { anteilProKopf } from "./kasse";
import { useScreenLoad } from "./useScreenLoad";
import { useSession } from "../contexts/SessionContext";

export type NeueBuchung =
  | { typ: "einnahme" | "ausgabe"; betrag: number; beschreibung?: string; terminId?: string }
  | { typ: "abendkosten"; betrag: number; beschreibung?: string; terminId?: string; bezahltVon: string; teilnehmerIds: string[] }
  | { typ: "strafe"; betrag: number; memberId: string; kategorie: StrafKategorieDef; notiz?: string; terminId?: string };

/**
 * Daten und Aktionen der Kasse: Einträge, Stammtischrechnungen mit Anteilen
 * und die Strafen aller Mitglieder (ein Ort für alles Geld).
 */
export function useKasse() {
  const { activeMemberId } = useSession();
  const [eintraege, setEintraege] = useState<KassenEintrag[]>([]);
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [termine, setTermine] = useState<StammtischTermin[]>([]);
  const [strafen, setStrafen] = useState<StrafLog[]>([]);
  const [strafKategorien, setStrafKategorien] = useState<StrafKategorieDef[]>([]);
  /** Wer welchen Kassen-Eintrag angelegt hat (aus der Chronik). */
  const [actorByRefId, setActorByRefId] = useState<Map<string, string>>(new Map());
  const [zahlungsLink, setZahlungsLink] = useState<string | undefined>(undefined);

  async function load() {
    const [k, ms, activity, ts, kats, v] = await Promise.all([loadKasse(), loadMembers(), loadActivityFeed(300), loadTermine(), loadStrafKategorien(), loadVerordnung()]);
    setZahlungsLink(v.zahlungsLink);
    const logs = await loadAllStrafLogs(ms.map((m) => m.id));
    setEintraege(k);
    setMembers(ms);
    setTermine(ts);
    setStrafKategorien(kats);
    setStrafen(logs.sort((a, b) => b.loggedAt.localeCompare(a.loggedAt)));
    const map = new Map<string, string>();
    for (const a of activity) {
      if ((a.actionType === "kasse_einnahme_created" || a.actionType === "kasse_ausgabe_created" || a.actionType === "abendkosten_created") && a.refId && a.actorMemberId) {
        map.set(a.refId, a.actorMemberId);
      }
    }
    setActorByRefId(map);
  }

  const screen = useScreenLoad(load, []);
  const actor = activeMemberId ?? undefined;

  async function buchen(b: NeueBuchung) {
    if (b.typ === "strafe") {
      const log = await addStrafLog(b.memberId, {
        kategorie: b.kategorie.id,
        betrag: b.betrag,
        notiz: b.notiz,
        terminId: b.terminId,
        loggedAt: new Date().toISOString(),
        beglichen: false,
      });
      setStrafen((prev) => [log, ...prev]);
      await logActivity({
        actorMemberId: actor,
        subjectMemberId: b.memberId,
        actionType: "straf_log_created",
        terminId: b.terminId,
        refId: log.id,
        meta: { kategorie: log.kategorie, betrag: log.betrag, notiz: log.notiz },
      });
      return;
    }
    const rechnung = b.typ === "abendkosten";
    // Wer gezahlt hat, war auch dabei – auch wenn er nicht extra angetippt wurde.
    const teilnehmer = rechnung && !b.teilnehmerIds.includes(b.bezahltVon) ? [...b.teilnehmerIds, b.bezahltVon] : rechnung ? b.teilnehmerIds : undefined;
    const eintrag = await addKassenEintrag({
      typ: b.typ,
      betrag: b.betrag,
      beschreibung: b.beschreibung,
      bezahltVon: rechnung ? b.bezahltVon : undefined,
      terminId: b.terminId,
      datum: new Date().toISOString(),
      teilnehmerIds: teilnehmer,
      beglichenIds: rechnung ? [] : undefined,
    });
    setEintraege((prev) => [eintrag, ...prev]);
    if (actor) setActorByRefId((prev) => new Map(prev).set(eintrag.id, actor));
    await logActivity({
      actorMemberId: actor,
      subjectMemberId: eintrag.bezahltVon,
      actionType: rechnung ? "abendkosten_created" : eintrag.typ === "einnahme" ? "kasse_einnahme_created" : "kasse_ausgabe_created",
      terminId: eintrag.terminId,
      refId: eintrag.id,
      meta: { betrag: eintrag.betrag, beschreibung: eintrag.beschreibung, teilnehmerAnzahl: eintrag.teilnehmerIds?.length },
    });
  }

  async function eintragLoeschen(id: string) {
    const e = eintraege.find((x) => x.id === id);
    await deleteKassenEintrag(id);
    setEintraege((prev) => prev.filter((x) => x.id !== id));
    await logActivity({
      actorMemberId: actor,
      subjectMemberId: e?.bezahltVon,
      actionType: "kasse_eintrag_deleted",
      terminId: e?.terminId,
      refId: id,
      meta: { betrag: e?.betrag ?? 0, beschreibung: e?.beschreibung },
    });
  }

  /** Altbestand ohne Teilnehmerliste: Rechnung als Ganzes erledigt/offen. */
  async function rechnungUmschalten(id: string) {
    const e = eintraege.find((x) => x.id === id);
    if (!e) return;
    const next = !e.beglichen;
    await updateKassenEintrag(id, { beglichen: next });
    setEintraege((prev) => prev.map((x) => (x.id === id ? { ...x, beglichen: next } : x)));
    if (next) {
      await logActivity({ actorMemberId: actor, subjectMemberId: e.bezahltVon, actionType: "kasse_beglichen", refId: id, meta: { betrag: e.betrag } });
    }
  }

  /** Ein Teilnehmer hat seinen Anteil an den Zahler zurückgezahlt (oder doch nicht). */
  async function anteilUmschalten(id: string, memberId: string) {
    const e = eintraege.find((x) => x.id === id);
    if (!e) return;
    const bisher = e.beglichenIds ?? [];
    const bezahlt = !bisher.includes(memberId);
    const next = bezahlt ? [...bisher, memberId] : bisher.filter((x) => x !== memberId);
    setEintraege((prev) => prev.map((x) => (x.id === id ? { ...x, beglichenIds: next } : x)));
    try {
      await updateKassenEintrag(id, { beglichenIds: next });
    } catch (err) {
      setEintraege((prev) => prev.map((x) => (x.id === id ? { ...x, beglichenIds: bisher } : x)));
      throw err;
    }
    if (bezahlt) {
      await logActivity({ actorMemberId: actor, subjectMemberId: memberId, actionType: "kasse_beglichen", refId: id, meta: { betrag: anteilProKopf(e), anteil: true } });
    }
  }

  async function strafeUmschalten(logId: string) {
    const log = strafen.find((l) => l.id === logId);
    if (!log) return;
    const next = !log.beglichen;
    const kasseGeaendert = await setStrafeBeglichen(log, next, {
      memberName: members.find((m) => m.id === log.memberId)?.name,
      kategorieLabel: strafKategorien.find((k) => k.id === log.kategorie)?.label,
      actorMemberId: activeMemberId,
    });
    setStrafen((prev) => prev.map((l) => (l.id === logId ? { ...l, beglichen: next } : l)));
    // Einnahme kam dazu bzw. ist wieder raus: neu laden, damit Übersicht und Verlauf stimmen.
    if (kasseGeaendert) setEintraege(await loadKasse());
  }

  async function strafeLoeschen(logId: string) {
    const log = strafen.find((l) => l.id === logId);
    if (!log) return;
    await deleteStrafLog(log.memberId, log.id);
    setStrafen((prev) => prev.filter((l) => l.id !== logId));
    await logActivity({
      actorMemberId: actor,
      subjectMemberId: log.memberId,
      actionType: "straf_log_deleted",
      terminId: log.terminId,
      refId: log.id,
      meta: { kategorie: log.kategorie, betrag: log.betrag },
    });
  }

  /** Eigene offene Strafen auf einmal begleichen (eine Chronik-Meldung). */
  async function meineStrafenBegleichen() {
    const offen = strafen.filter((l) => l.memberId === activeMemberId && !l.beglichen);
    if (!activeMemberId || offen.length === 0) return;
    await setStrafenBeglichen(offen, {
      memberName: members.find((m) => m.id === activeMemberId)?.name,
      kategorieLabel: (log) => strafKategorien.find((k) => k.id === log.kategorie)?.label,
      actorMemberId: activeMemberId,
    });
    const ids = new Set(offen.map((l) => l.id));
    setStrafen((prev) => prev.map((l) => (ids.has(l.id) ? { ...l, beglichen: true } : l)));
    setEintraege(await loadKasse());
  }

  return {
    ...screen,
    activeMemberId,
    eintraege, members, termine, strafen, strafKategorien, actorByRefId, zahlungsLink,
    buchen, eintragLoeschen, rechnungUmschalten, anteilUmschalten, strafeUmschalten, strafeLoeschen, meineStrafenBegleichen,
  };
}

export type Kasse = ReturnType<typeof useKasse>;
