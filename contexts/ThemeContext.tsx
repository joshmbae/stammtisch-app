import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DARK_COLORS, LIGHT_COLORS, ThemeColors } from "../constants/design";

/**
 * Hell/Glow pro Gerät (nicht pro Stammtisch). Standard ist Hell; "dark" ist
 * der leuchtende Glow-Look, "system" folgt der iOS-Einstellung. Die Wahl
 * liegt in AsyncStorage, damit sie den App-Neustart überlebt.
 */
export type ThemePreference = "system" | "light" | "dark";

/** Ohne gespeicherte Wahl startet die App hell. */
export const STANDARD_ERSCHEINUNGSBILD: ThemePreference = "light";

/** Auswahl in Runde und Einstellungen – eine Liste, damit beide gleich heißen. */
export const ERSCHEINUNGSBILD_OPTIONEN: { key: ThemePreference; label: string }[] = [
  { key: "light", label: "Hell" },
  { key: "dark", label: "Glow" },
  { key: "system", label: "System" },
];
export type ColorScheme = "light" | "dark";

const STORAGE_KEY = "st_theme_preference";

interface ThemeContextValue {
  colors: ThemeColors;
  scheme: ColorScheme;
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: LIGHT_COLORS,
  scheme: "light",
  preference: STANDARD_ERSCHEINUNGSBILD,
  setPreference: () => {},
});

/**
 * Überträgt die Wahl auch auf native Oberflächen (Tastatur, Alerts, Picker,
 * Modal-Chrome) — sonst bliebe bei "Dunkel" auf einem hellen iPhone die
 * Tastatur hell. null = wieder der Systemeinstellung folgen.
 */
function applyNativeScheme(p: ThemePreference) {
  if (typeof Appearance.setColorScheme === "function") {
    Appearance.setColorScheme(p === "system" ? null : p);
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>(STANDARD_ERSCHEINUNGSBILD);
  // Erst rendern, wenn die gespeicherte Wahl bekannt ist — sonst blitzt beim
  // Kaltstart kurz das falsche Farbschema auf.
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        const gewaehlt: ThemePreference = v === "light" || v === "dark" || v === "system" ? v : STANDARD_ERSCHEINUNGSBILD;
        setPreferenceState(gewaehlt);
        applyNativeScheme(gewaehlt);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  function setPreference(p: ThemePreference) {
    setPreferenceState(p);
    applyNativeScheme(p);
    AsyncStorage.setItem(STORAGE_KEY, p).catch(() => {});
  }

  const scheme: ColorScheme = preference === "system" ? (systemScheme === "dark" ? "dark" : "light") : preference;
  const value = useMemo(
    () => ({ colors: scheme === "dark" ? DARK_COLORS : LIGHT_COLORS, scheme, preference, setPreference }),
    [scheme, preference]
  );

  if (!loaded) return null;
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

/** Kurzform, wenn nur die Farben gebraucht werden. */
export function useColors(): ThemeColors {
  return useContext(ThemeContext).colors;
}

/**
 * Themenabhängige Styles: `const styles = useThemedStyles(makeStyles)` mit
 * `const makeStyles = (c: ThemeColors) => StyleSheet.create({...})` auf
 * Modulebene. Pro Palette wird das StyleSheet nur einmal gebaut und von
 * allen Instanzen geteilt.
 */
type StyleFactory<T> = (c: ThemeColors) => T;
const styleCache = new WeakMap<StyleFactory<any>, Map<ThemeColors, any>>();

export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(factory: StyleFactory<T>): T {
  const colors = useColors();
  let perFactory = styleCache.get(factory);
  if (!perFactory) {
    perFactory = new Map();
    styleCache.set(factory, perFactory);
  }
  let styles = perFactory.get(colors);
  if (!styles) {
    styles = factory(colors);
    perFactory.set(colors, styles);
  }
  return styles;
}
