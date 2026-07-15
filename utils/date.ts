/** Wandelt ein Date in "YYYY-MM-DD" um, basierend auf den lokalen Kalenderfeldern
 *  (nicht über toISOString(), da das auf UTC normalisiert und so bei negativer
 *  UTC-Differenz zu einem Tag Verschiebung führt). */
export function toLocalIsoDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Formatiert ein Date als "HH:MM" (24h, lokale Zeit). */
export function toTimeString(d: Date): string {
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/** Parst "HH:MM" zu einem Date (heutiges Datum, nur Uhrzeit relevant). */
export function parseTimeString(time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const d = new Date();
  d.setHours(hours || 0, minutes || 0, 0, 0);
  return d;
}
