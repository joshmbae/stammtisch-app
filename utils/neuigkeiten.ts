import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * „Was ist neu“ einmalig pro Gerät. Die Id gehört zum Inhalt des Screens:
 * für das nächste große Update eine neue Id vergeben, dann sehen alle den
 * Screen wieder einmal.
 */
export const NEUIGKEITEN_ID = "redesign-2026-10";
const KEY = `st_neuigkeiten_${NEUIGKEITEN_ID}`;

export async function neuigkeitenGesehen(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === "1";
  } catch {
    return true; // im Zweifel nicht stören
  }
}

export async function markiereNeuigkeitenGesehen(): Promise<void> {
  await AsyncStorage.setItem(KEY, "1").catch(() => {});
}
