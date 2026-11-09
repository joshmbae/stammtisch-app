import { Share } from "react-native";

/**
 * Einladung in die Runde über das Teilen-Menü (WhatsApp & Co.). Das Passwort
 * steht bewusst nicht drin: gespeichert ist nur sein Hash, und es soll
 * getrennt weitergegeben werden (persönlich oder in einer eigenen Nachricht).
 */
export async function rundeEinladen(stammtischName: string): Promise<void> {
  const text = [
    `Komm in unseren Stammtisch „${stammtischName}“ in der App DeinStammtisch!`,
    "",
    "So geht's:",
    "1. App öffnen und „Beitreten“ wählen",
    `2. Name: ${stammtischName}`,
    "3. Passwort: bekommst du von mir",
    "4. Dich in der Liste auswählen oder selbst anlegen",
  ].join("\n");
  try {
    await Share.share({ message: text });
  } catch {
    // Abgebrochen – nichts zu tun.
  }
}
