import { Linking } from "react-native";
import * as Clipboard from "expo-clipboard";
import { MemberProfile } from "../types";
import { displayName } from "./format";
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

/** „Geld senden“ bei PayPal – öffnet bei installierter App meist direkt die App. */
/** Name des (ersten) Kassenwarts – Empfänger für Strafen, wenn kein Zahlungslink hinterlegt ist. */
export function kassenwartName(members: MemberProfile[]): string | undefined {
  const m = members.find((x) => x.rollen?.some((r) => /kasse/i.test(r)));
  return m ? displayName(m) : undefined;
}

const PAYPAL_SENDEN = "https://www.paypal.com/myaccount/transfer/homepage/pay";

/**
 * Betrag für die Zwischenablage, so wie man ihn in PayPal einfügt: „12,37“
 * (deutsches Komma, ohne Währung).
 */
function betragZumEinfuegen(betrag: number): string {
  return betrag.toFixed(2).replace(".", ",");
}

/**
 * Begleichen mit optionalem Zahlungslink. Ohne Link: Rückfrage und abhaken.
 * Mit Link: „Mit PayPal bezahlen?“ – öffnet den Link und fragt nach der
 * Rückkehr, ob abgehakt werden soll; alternativ nur abhaken (z. B. bar bezahlt).
 * Bezahlt wird außerhalb der App; abgehakt wird nur nach Bestätigung. Bei
 * paypal.me ist der Betrag schon eingetragen, sonst steht er im Dialog.
 * Ohne Link gibt es trotzdem den Weg zu PayPal: Der Betrag wandert in die
 * Zwischenablage, PayPal öffnet „Geld senden“, man wählt den Empfänger und
 * fügt den Betrag ein (PayPal kennt keinen Link mit Betrag ohne Empfänger).
 */
export function begleichenDialog(opts: {
  link?: string;
  /** Betrag in Euro, um ihn bei paypal.me vorauszufüllen. */
  betrag?: number;
  betragText: string;
  beschreibung: string;
  /** Text der Rückfrage ohne Link; Standard: „… als bezahlt markiert und in die Kasse gebucht.“ */
  ohneLinkText?: string;
  /** Wer das Geld bekommt, z. B. „Andi“ – steht im Hinweis zur Zwischenablage. */
  empfaenger?: string;
  onBeglichen: () => Promise<void>;
}) {
  const { link, betrag, betragText, beschreibung, ohneLinkText, empfaenger, onBeglichen } = opts;
  const gueltig = link ? normalisiereZahlungsLink(link) : null;
  const nachRueckkehr = () =>
    // Erscheint, sobald man aus dem Browser/PayPal zurückkommt.
    showAlert("Bezahlt?", `Wenn du die ${betragText} überwiesen hast, hake sie jetzt ab.`, [
      { text: "Noch nicht", style: "cancel" },
      { text: "Abhaken", onPress: () => { onBeglichen(); } },
    ]);
  if (!gueltig) {
    const text = ohneLinkText ?? `${beschreibung} als bezahlt markiert und in die Kasse gebucht.`;
    showAlert(`${betragText} begleichen?`, betrag && betrag > 0
      ? `${text}\n\nOder per PayPal: Der Betrag kommt in die Zwischenablage, dann ${empfaenger ? `${empfaenger} als Empfänger wählen` : "Empfänger wählen"} und einfügen.`
      : text, [
      ...(betrag && betrag > 0 ? [{
        text: "Per PayPal senden",
        onPress: async () => {
          try {
            await Clipboard.setStringAsync(betragZumEinfuegen(betrag));
            await Linking.openURL(PAYPAL_SENDEN);
          } catch {
            showAlert("PayPal geht nicht auf", "PayPal konnte nicht geöffnet werden. Der Betrag liegt in der Zwischenablage.");
            return;
          }
          nachRueckkehr();
        },
      }] : []),
      { text: "Schon bezahlt – nur abhaken", onPress: () => { onBeglichen(); } },
      { text: "Abbrechen", style: "cancel" as const },
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
        nachRueckkehr();
      },
    },
    { text: "Schon bezahlt – nur abhaken", onPress: () => { onBeglichen(); } },
    { text: "Abbrechen", style: "cancel" },
    ],
  );
}
