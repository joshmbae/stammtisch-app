import { StrafLog } from "../types";
import { addKassenEintrag, logActivity, updateStrafLog } from "./storage";

/**
 * Strafe als bezahlt bzw. wieder offen markieren. Beim Bezahlen entsteht
 * genau eine Kassen-Einnahme und ein Eintrag in der Chronik; beim
 * Zurücknehmen wird nur der Status geändert.
 */
export async function setStrafeBeglichen(
  log: StrafLog,
  beglichen: boolean,
  ctx: { memberName?: string; kategorieLabel?: string; actorMemberId?: string | null }
): Promise<void> {
  await updateStrafLog(log.memberId, log.id, { beglichen });
  if (!beglichen) return;
  await addKassenEintrag({
    typ: "einnahme",
    betrag: log.betrag,
    beschreibung: `Strafe beglichen: ${ctx.memberName ?? "Unbekannt"} – ${ctx.kategorieLabel ?? log.kategorie}`,
    terminId: log.terminId,
    datum: new Date().toISOString(),
  });
  await logActivity({
    actorMemberId: ctx.actorMemberId ?? undefined,
    subjectMemberId: log.memberId,
    actionType: "straf_log_beglichen",
    terminId: log.terminId,
    refId: log.id,
    meta: { betrag: log.betrag, kategorie: log.kategorie },
  });
}
