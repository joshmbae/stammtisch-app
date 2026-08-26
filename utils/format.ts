export function formatEuro(n: number): string {
  return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function getInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

/** Zeigt nur den Spitznamen, falls einer gesetzt ist — nie beides zusammen. */
export function displayName(member: { name: string; spitzname?: string }): string {
  return member.spitzname || member.name;
}

/** Parst "YYYY" oder "YYYY-MM" und liefert die vergangene Zeit als Jahre + Monate. */
export function gruendungsDauer(gruendungsjahr: string): { jahre: number; monate: number } | null {
  const match = gruendungsjahr.match(/^(\d{4})(?:-(\d{2}))?/);
  if (!match) return null;
  const jahr = parseInt(match[1], 10);
  const monat = match[2] ? parseInt(match[2], 10) - 1 : 0;
  const start = new Date(jahr, monat, 1);
  const now = new Date();
  const totalMonate = Math.max(0, (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()));
  return { jahre: Math.floor(totalMonate / 12), monate: totalMonate % 12 };
}

export function formatDauer(d: { jahre: number; monate: number }): string {
  const parts: string[] = [];
  if (d.jahre > 0) parts.push(`${d.jahre} ${d.jahre === 1 ? "Jahr" : "Jahre"}`);
  if (d.monate > 0 || d.jahre === 0) parts.push(`${d.monate} ${d.monate === 1 ? "Monat" : "Monate"}`);
  return parts.join(" ");
}

/** Zählt nur Termine ab Mitgliedsbeginn, damit neuere Mitglieder nicht durch Termine vor ihrem Beitritt schlechter dastehen. */
export function anwesenheitsQuote(
  termine: { datum: string; anwesenheit?: string[]; art?: string }[],
  memberId: string,
  mitgliedSeit: string
): { count: number; total: number; pct: number | null } {
  const seitDatum = mitgliedSeit.slice(0, 10);
  const relevante = termine.filter((t) => t.datum >= seitDatum && t.art === "stammtisch");
  const count = relevante.filter((t) => (t.anwesenheit ?? []).includes(memberId)).length;
  const total = relevante.length;
  return { count, total, pct: total > 0 ? Math.round((count / total) * 100) : null };
}

export function formatGruendungMonat(gruendungsjahr: string): string {
  const match = gruendungsjahr.match(/^(\d{4})(?:-(\d{2}))?/);
  if (!match) return gruendungsjahr;
  const jahr = parseInt(match[1], 10);
  const monat = match[2] ? parseInt(match[2], 10) - 1 : 0;
  return new Date(jahr, monat, 1).toLocaleDateString("de-DE", { month: "long", year: "numeric" });
}
