import {
  loadAllEreignisTypen,
  loadAllSpielLogs,
  loadAllStrafLogs,
  loadAllVerspätungLogs,
  loadMembers,
  loadSpiele,
  loadTermine,
  loadVerordnung,
} from "./storage";
import { StatsDaten } from "./stats";

/**
 * Alles, was Ranglisten, Titel und Badges brauchen, in einem Zug: erst die
 * Stammdaten, dann je eine Sammelabfrage pro Log-Art (nicht pro Mitglied).
 */
export async function loadStatsDaten(): Promise<StatsDaten> {
  const [members, termine, spiele, verordnung] = await Promise.all([loadMembers(), loadTermine(), loadSpiele(), loadVerordnung()]);
  const typen = spiele.length ? await loadAllEreignisTypen(spiele.map((s) => s.id)) : [];
  const ids = members.map((m) => m.id);
  const [verspätungLogs, spielLogs, strafLogs] = ids.length
    ? await Promise.all([loadAllVerspätungLogs(ids), loadAllSpielLogs(ids), loadAllStrafLogs(ids)])
    : [[], [], []];
  return {
    members,
    termine,
    verspätungLogs,
    spielLogs,
    strafLogs,
    spiele: spiele.map((spiel) => ({ spiel, ereignisTypen: typen.filter((t) => t.spielId === spiel.id) })),
    richtung: verordnung.ranglistenRichtung,
  };
}
