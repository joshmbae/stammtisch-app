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

/** paypal.me-Link mit genau einem Namen? Dann lässt sich der Betrag anhängen. */
function istPaypalMe(link: string): boolean {
  try {
    const url = new URL(link);
    return /(^|\.)paypal\.me$/i.test(url.hostname) && url.pathname.split("/").filter(Boolean).length === 1;
  } catch {
    return false;
  }
}

/**
 * Betrag vorausfüllen, wo es geht: bei paypal.me/<name> wird „/12.50EUR“
 * angehängt. Pools und andere Links bleiben, wie sie sind.
 */
export function linkMitBetrag(link: string, betrag?: number): string {
  if (!betrag || betrag <= 0 || !istPaypalMe(link)) return link;
  return `${link.replace(/\/+$/, "")}/${betrag.toFixed(2)}EUR`;
}

/**
 * Begleichen mit optionalem Zahlungslink. Ohne Link: Rückfrage und abhaken.
 * Mit Link: „Mit PayPal bezahlen?“ – öffnet den Link und fragt nach der
 * Rückkehr, ob abgehakt werden soll; alternativ nur abhaken (z. B. bar bezahlt).
 * Bezahlt wird außerhalb der App; abgehakt wird nur nach Bestätigung. Bei
 * paypal.me ist der Betrag schon eingetragen, sonst steht er im Dialog.
 */
export function begleichenDialog(opts: {
  link?: string;
  /** Betrag in Euro, um ihn bei paypal.me vorauszufüllen. */
  betrag?: number;
  betragText: string;
  beschreibung: string;
  onBeglichen: () => Promise<void>;
}) {
  const { link, betrag, betragText, beschreibung, onBeglichen } = opts;
  const gueltig = link ? normalisiereZahlungsLink(link) : null;
  if (!gueltig) {
    showAlert(`${betragText} begleichen?`, `${beschreibung} als bezahlt markiert und in die Kasse gebucht.`, [
      { text: "Abbrechen", style: "cancel" },
      { text: "Begleichen", onPress: () => { onBeglichen(); } },
    ]);
    return;
  }
  const anbieter = zahlungsAnbieter(gueltig);
  const ziel = linkMitBetrag(gueltig, betrag);
  const vorausgefuellt = ziel !== gueltig;
  showAlert(
    `Mit ${anbieter} bezahlen?`,
    vorausgefuellt
      ? `${betragText} sind schon eingetragen. Danach kannst du hier abhaken.`
      : `Bitte ${betragText} überweisen. Danach kannst du hier abhaken.`,
    [
    {
      text: `Zu ${anbieter}`,
      onPress: async () => {
        try {
          await Linking.openURL(ziel);
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
    ],
  );
}
