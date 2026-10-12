import { Linking } from "react-native";
import { showAlert } from "./alert";

/**
 * Zahlungslink prüfen und vereinheitlichen: nur https, „paypal.me/…“ ohne
 * Schema wird ergänzt. Ungültig → null.
 */
export function normalisiereZahlungsLink(eingabe: string): string | null {
  const roh = eingabe.trim();
  if (!roh) return null;
  const mitSchema = /^[a-z][a-z0-9+.-]*:/i.test(roh) ? roh : `https://${roh}`;
  try {
    const url = new URL(mitSchema);
    if (url.protocol !== "https:" || !url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Anzeigename für den Link: „PayPal“ bei PayPal-Adressen, sonst der Host. */
export function zahlungsAnbieter(link: string): string {
  try {
    const host = new URL(link).hostname.replace(/^www\./, "");
    return /(^|\.)paypal\.(com|me)$/i.test(host) ? "PayPal" : host;
  } catch {
    return "Zahlungslink";
  }
}

/**
 * Begleichen mit optionalem Zahlungslink. Ohne Link: Rückfrage und abhaken.
 * Mit Link: „Mit PayPal bezahlen?“ – öffnet den Link und fragt nach der
 * Rückkehr, ob abgehakt werden soll; alternativ nur abhaken (z. B. bar bezahlt).
 * Bezahlt wird außerhalb der App; abgehakt wird nur nach Bestätigung.
 */
export function begleichenDialog(opts: {
  link?: string;
  betragText: string;
  beschreibung: string;
  onBeglichen: () => Promise<void>;
}) {
  const { link, betragText, beschreibung, onBeglichen } = opts;
  const gueltig = link ? normalisiereZahlungsLink(link) : null;
  if (!gueltig) {
    showAlert(`${betragText} begleichen?`, `${beschreibung} als bezahlt markiert und in die Kasse gebucht.`, [
      { text: "Abbrechen", style: "cancel" },
      { text: "Begleichen", onPress: () => { onBeglichen(); } },
    ]);
    return;
  }
  const anbieter = zahlungsAnbieter(gueltig);
  showAlert(`Mit ${anbieter} bezahlen?`, `${betragText} – danach kannst du hier abhaken.`, [
    {
      text: `Zu ${anbieter}`,
      onPress: async () => {
        try {
          await Linking.openURL(gueltig);
        } catch {
          showAlert("Link geht nicht auf", "Der Zahlungslink konnte nicht geöffnet werden. Bitte in den Einstellungen prüfen.");
          return;
        }
        // Erscheint, sobald man aus dem Browser/PayPal zurückkommt.
        showAlert("Bezahlt?", `Wenn du die ${betragText} überwiesen hast, hake sie jetzt ab.`, [
          { text: "Noch nicht", style: "cancel" },
          { text: "Abhaken", onPress: () => { onBeglichen(); } },
        ]);
      },
    },
    { text: "Schon bezahlt – nur abhaken", onPress: () => { onBeglichen(); } },
    { text: "Abbrechen", style: "cancel" },
  ]);
}
