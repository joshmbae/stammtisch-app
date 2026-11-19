import { Share } from "react-native";
import { loadEinladungscode } from "./storage";

/**
 * Einladung in die Runde über das Teilen-Menü (WhatsApp & Co.) – mit dem
 * Einladungscode, damit niemand das Passwort weitergeben muss. Klappt das
 * Laden des Codes nicht (offline), steht wie früher „Passwort bekommst du
 * von mir“ drin.
 */
export async function rundeEinladen(stammtischName: string): Promise<void> {
  let code: string | null = null;
  try {
    code = await loadEinladungscode();
  } catch {
    // ohne Code weiter
  }
  const text = code
    ? [
        `Komm in unseren Stammtisch „${stammtischName}“ in der App DeinStammtisch!`,
        "",
        "So geht's:",
        "1. App öffnen und „Beitreten“ wählen",
        "2. „Mit Einladungscode beitreten“ antippen",
        `3. Code: ${code}`,
        "4. Dich in der Liste auswählen oder selbst anlegen",
      ]
    : [
        `Komm in unseren Stammtisch „${stammtischName}“ in der App DeinStammtisch!`,
        "",
        "So geht's:",
        "1. App öffnen und „Beitreten“ wählen",
        `2. Name: ${stammtischName}`,
        "3. Passwort: bekommst du von mir",
        "4. Dich in der Liste auswählen oder selbst anlegen",
      ];
  try {
    await Share.share({ message: text.join("\n") });
  } catch {
    // Abgebrochen – nichts zu tun.
  }
}
