import { KassenEintrag, StrafLog } from "../types";
import { addKassenEintrag, deleteKassenEintrag, loadKasse, logActivity, updateStrafLog } from "./storage";

/** Die Kassen-Einnahme einer bezahlten Strafe hat eine feste, aus der Strafe abgeleitete Id. */
export const zahlungsId = (strafLogId: string) => `${strafLogId}-bezahlt`;

const BESCHREIBUNG_PREFIX = "Strafe beglichen: ";

/**
 * Einnahme zu einer Strafe finden: über die feste Id, sonst (Einträge von vor
 * dieser Verknüpfung) über Text, Betrag und Termin. Gibt es dort mehrere
 * Treffer, sind sie gleichwertig – gleicher Betrag, gleiche Person.
 */
function zahlungZuStrafe(kasse: KassenEintrag[], log: StrafLog, memberName?: string): KassenEintrag | undefined {
  const direkt = kasse.find((e) => e.id === zahlungsId(log.id));
  if (direkt) return direkt;
  return kasse
    .filter((e) =>
      e.typ === "einnahme" &&
      e.betrag === log.betrag &&
      (e.terminId ?? null) === (log.terminId ?? null) &&
      e.datum >= log.loggedAt &&
      (e.beschreibung ?? "").startsWith(`${BESCHREIBUNG_PREFIX}${memberName ?? ""}`)
    )
    .sort((a, b) => b.datum.localeCompare(a.datum))[0];
}

/**
 * Strafe als bezahlt bzw. wieder offen markieren. Bezahlt: genau eine
 * Kassen-Einnahme plus Eintrag in der Chronik. Wieder offen: die Einnahme
 * wird aus der Kasse genommen. Rückgabe: ob die Kasse geändert wurde.
 */
export async function setStrafeBeglichen(
  log: StrafLog,
  beglichen: boolean,
  ctx: { memberName?: string; kategorieLabel?: string; actorMemberId?: string | null; ohneChronik?: boolean }
): Promise<boolean> {
  await updateStrafLog(log.memberId, log.id, { beglichen });

  if (!beglichen) {
    const zahlung = zahlungZuStrafe(await loadKasse(), log, ctx.memberName);
    if (!zahlung) return false;
    await deleteKassenEintrag(zahlung.id);
    return true;
  }

  await addKassenEintrag(
    {
      typ: "einnahme",
      betrag: log.betrag,
      beschreibung: `${BESCHREIBUNG_PREFIX}${ctx.memberName ?? "Unbekannt"} – ${ctx.kategorieLabel ?? log.kategorie}`,
      terminId: log.terminId,
      datum: new Date().toISOString(),
    },
    zahlungsId(log.id)
  );
  if (ctx.ohneChronik) return true;
  await logActivity({
    actorMemberId: ctx.actorMemberId ?? undefined,
    subjectMemberId: log.memberId,
    actionType: "straf_log_beglichen",
    terminId: log.terminId,
    refId: log.id,
    meta: { betrag: log.betrag, kategorie: log.kategorie },
  });
  return true;
}

/**
 * Mehrere Strafen einer Person auf einmal begleichen: pro Strafe die übliche
 * Kassen-Einnahme, aber nur ein Chronik-Eintrag (und damit eine Push) für alle.
 * Der Eintrag nutzt den bekannten Typ „straf_log_beglichen“; statt einer
 * Kategorie steht „N Strafen“ in meta.kategorie, das zeigen auch ältere App-Versionen an.
 */
export async function setStrafenBeglichen(
  logs: StrafLog[],
  ctx: { memberName?: string; kategorieLabel: (log: StrafLog) => string | undefined; actorMemberId?: string | null; terminId?: string }
): Promise<void> {
  const offen = logs.filter((l) => !l.beglichen);
  if (offen.length === 0) return;
  if (offen.length === 1) {
    await setStrafeBeglichen(offen[0], true, { memberName: ctx.memberName, kategorieLabel: ctx.kategorieLabel(offen[0]), actorMemberId: ctx.actorMemberId });
    return;
  }
  for (const log of offen) {
    await setStrafeBeglichen(log, true, { memberName: ctx.memberName, kategorieLabel: ctx.kategorieLabel(log), actorMemberId: ctx.actorMemberId, ohneChronik: true });
  }
  await logActivity({
    actorMemberId: ctx.actorMemberId ?? undefined,
    subjectMemberId: offen[0].memberId,
    actionType: "straf_log_beglichen",
    terminId: ctx.terminId,
    meta: { betrag: offen.reduce((s, l) => s + l.betrag, 0), kategorie: `${offen.length} Strafen`, anzahl: offen.length },
  });
}
