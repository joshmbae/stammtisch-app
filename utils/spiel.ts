import { SpielEreignisTyp } from "../types";

/**
 * Das Ereignis, um das sich ein Spiel dreht — bei Schocken „Schock-Aus":
 * das erste in der Reihenfolge, das keine Strafe kostet. Gibt es keins
 * ohne Strafe, das erste überhaupt.
 */
export function hauptEreignis(typen: SpielEreignisTyp[]): SpielEreignisTyp | null {
  const sortiert = [...typen].sort((a, b) => a.reihenfolge - b.reihenfolge);
  return sortiert.find((t) => !t.strafBetrag) ?? sortiert[0] ?? null;
}
