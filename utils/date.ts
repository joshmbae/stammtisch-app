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

/** Formatiert einen ISO-Zeitstempel für den Aktivitäts-Feed als "Heute"/"Gestern"/Datum + Uhrzeit.
 *  Vergleicht Kalendertage (nicht rollierende 24h-Fenster), damit z.B. ein Eintrag von
 *  23:50 Uhr gestern schon kurz nach Mitternacht als "Gestern" statt "Heute" erscheint. */
export function formatActivityZeit(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const time = date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

  const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((nowDay.getTime() - dateDay.getTime()) / 86400000);

  if (diffDays === 0) return `Heute, ${time}`;
  if (diffDays === 1) return `Gestern, ${time}`;
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }) + `, ${time}`;
}

const WOCHENTAGE = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

/** "Do, 15.10." — Wochentag ohne Punkt (toLocaleDateString liefert je nach Engine "Do.," ). */
export function formatWochentagDatum(d: Date, mitJahr = false): string {
  const tag = String(d.getDate()).padStart(2, "0");
  const monat = String(d.getMonth() + 1).padStart(2, "0");
  return `${WOCHENTAGE[d.getDay()]}, ${tag}.${monat}.${mitJahr ? d.getFullYear() : ""}`;
}

/** Kalendertag-Schlüssel (lokal) eines ISO-Zeitstempels, z.B. zum Gruppieren im Feed. */
export function tagesSchluessel(iso: string): string {
  return toLocalIsoDate(new Date(iso));
}

/** Überschrift für eine Tagesgruppe im Feed: "Heute", "Gestern" oder "Do, 02.10." (mit Jahr, falls nicht aktuell). */
export function formatTagUeberschrift(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((nowDay.getTime() - dateDay.getTime()) / 86400000);
  if (diffDays === 0) return "Heute";
  if (diffDays === 1) return "Gestern";
  return formatWochentagDatum(date, date.getFullYear() !== now.getFullYear());
}

/** Nur die Uhrzeit "19:42" eines ISO-Zeitstempels. */
export function formatUhrzeit(iso: string): string {
  return new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}
