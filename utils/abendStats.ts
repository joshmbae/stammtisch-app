import { MemberProfile, SpielLog, StammtischTermin, StrafLog } from "../types";

/** Kennzahlen eines einzelnen Abends — für Home und den Termin-Screen. */
export interface AbendStats {
  /** Wer zum Termin gehörte (Mitglied seit spätestens dem Termintag). */
  mitglieder: MemberProfile[];
  da: MemberProfile[];
  fehlten: MemberProfile[];
  /** 0 … 1 */
  quote: number;
  strafenSumme: number;
  strafenOffen: number;
  /** Ereignistyp-Id → Mitglieds-Id → Anzahl */
  spielZaehler: Map<string, Map<string, number>>;
}

export function abendStats(
  termin: StammtischTermin,
  members: MemberProfile[],
  strafLogs: StrafLog[],
  spielLogs: SpielLog[]
): AbendStats {
  const mitglieder = members.filter((m) => m.mitgliedSeit.slice(0, 10) <= termin.datum);
  const daIds = new Set(termin.anwesenheit ?? []);
  const da = mitglieder.filter((m) => daIds.has(m.id));
  const fehlten = mitglieder.filter((m) => !daIds.has(m.id));
  const strafen = strafLogs.filter((l) => l.terminId === termin.id);
  const spielZaehler = new Map<string, Map<string, number>>();
  for (const l of spielLogs) {
    if (l.terminId !== termin.id) continue;
    const proTyp = spielZaehler.get(l.ereignisTypId) ?? new Map<string, number>();
    proTyp.set(l.memberId, (proTyp.get(l.memberId) ?? 0) + 1);
    spielZaehler.set(l.ereignisTypId, proTyp);
  }
  return {
    mitglieder,
    da,
    fehlten,
    quote: mitglieder.length ? da.length / mitglieder.length : 0,
    strafenSumme: strafen.reduce((s, l) => s + l.betrag, 0),
    strafenOffen: strafen.filter((l) => !l.beglichen).reduce((s, l) => s + l.betrag, 0),
    spielZaehler,
  };
}

/** Gesamtzahl eines Ereignistyps an dem Abend. */
export function ereignisGesamt(stats: AbendStats, typId: string): number {
  let n = 0;
  stats.spielZaehler.get(typId)?.forEach((v) => { n += v; });
  return n;
}

/** Wer hatte das Ereignis am häufigsten? Bei Gleichstand alle Namen. */
export function meisteBei(stats: AbendStats, typId: string, members: MemberProfile[]): { members: MemberProfile[]; anzahl: number } | null {
  const proTyp = stats.spielZaehler.get(typId);
  if (!proTyp || proTyp.size === 0) return null;
  const max = Math.max(...proTyp.values());
  if (max <= 0) return null;
  const ids = [...proTyp.entries()].filter(([, v]) => v === max).map(([id]) => id);
  return { members: members.filter((m) => ids.includes(m.id)), anzahl: max };
}
