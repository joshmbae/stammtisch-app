/** Wandelt ein Date in "YYYY-MM-DD" um, basierend auf den lokalen Kalenderfeldern
 *  (nicht über toISOString(), da das auf UTC normalisiert und so bei negativer
 *  UTC-Differenz zu einem Tag Verschiebung führt). */
export function toLocalIsoDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
