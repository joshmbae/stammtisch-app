/**
 * Die Agenda liegt als Text in `termine.agenda`. Früher war das ein freies
 * Textfeld; jetzt ist jede Zeile ein Punkt. Aufzählungszeichen und Nummern
 * aus altem Freitext werden beim Lesen entfernt.
 */
export function agendaPunkte(text: string): string[] {
  return text
    .split("\n")
    .map((z) => z.replace(/^\s*(?:[-–•*]|\d+[.)])\s*/, "").trim())
    .filter((z) => z.length > 0);
}

export function agendaText(punkte: string[]): string {
  return punkte.map((p) => `- ${p}`).join("\n");
}
