export function formatEuro(n: number): string {
  return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function getInitial(name: string): string {
  return name.charAt(0).toUpperCase();
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

export function formatGruendungMonat(gruendungsjahr: string): string {
  const match = gruendungsjahr.match(/^(\d{4})(?:-(\d{2}))?/);
  if (!match) return gruendungsjahr;
  const jahr = parseInt(match[1], 10);
  const monat = match[2] ? parseInt(match[2], 10) - 1 : 0;
  return new Date(jahr, monat, 1).toLocaleDateString("de-DE", { month: "long", year: "numeric" });
}
