/**
 * Die Agenda liegt als Text in `termine.agenda`. Früher war das ein freies
 * Textfeld; jetzt ist jede Zeile ein Punkt. Aufzählungszeichen und Nummern
 * aus altem Freitext werden beim Lesen entfernt.
 *
 * Wer einen Punkt eingetragen hat, steht als Markierung am Zeilenende:
 * `- Grillfest planen {von:<member-id>}`. Ohne Markierung (ältere Punkte)
 * ist der Autor unbekannt.
 */
export interface AgendaPunkt {
  text: string;
  /** Mitglieds-ID, wer den Punkt eingetragen hat. */
  von?: string;
}

const VON = /\s*\{von:([0-9a-zA-Z-]+)\}\s*$/;

export function agendaPunkte(text: string): AgendaPunkt[] {
  return text
    .split("\n")
    .map((z) => {
      const von = z.match(VON)?.[1];
      const ohne = z.replace(VON, "").replace(/^\s*(?:[-–•*]|\d+[.)])\s*/, "").trim();
      return { text: ohne, von };
    })
    .filter((p) => p.text.length > 0);
}

export function agendaText(punkte: AgendaPunkt[]): string {
  return punkte
    // Geschweifte Klammern im Text selbst würden sonst wie eine Markierung aussehen.
    .map((p) => `- ${p.text.replace(VON, "")}${p.von ? ` {von:${p.von}}` : ""}`)
    .join("\n");
}
