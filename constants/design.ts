import type { TextStyle } from "react-native";

// ─── Stammtisch Design System „Kombi" ─────────────────────────────────────────
// Hell: cremig und warm (Creme, Tinte, Blau, Senf, Koralle).
// Dunkel: eigenständig und futuristisch (Tiefschwarz, Neon-Akzente, Leuchtkanten).
//
// Regeln:
// - Komponenten nutzen nur Rollen aus der Palette, keine Hex-Werte.
// - Text auf Farbflächen kommt aus dem passenden `on…`-Token, nie „weiß“ per Annahme.

export const LIGHT_COLORS = {
  // Flächen
  background:    "#F2EEE6",      // Creme
  card:          "#FFFFFF",
  cardAlt:       "#EFEAE0",      // getönte Fläche (Chips, Felder, Säulen)
  segmentBg:     "#E4DDCF",      // Leiste der Umschalter: hebt sich sichtbar von Creme ab
  hairline:      "rgba(28,27,25,0.07)", // feine Kante um Karten

  // Markenfarben (alte Rollen, auf Kombi umgestellt)
  blue:          "#2D4F9E",      // Primär: Links, aktive Elemente, Flächen mit onAccent
  blueBg:        "#E2E7F3",
  gold:          "#8A6A14",      // als Text auf Weiß lesbar (5,1:1); Fläche: mustard
  goldLight:     "#E2B347",

  // Text
  textDark:      "#1C1B19",      // Tinte
  textMid:       "#4F4A40",
  textMuted:     "#6E685D",
  textLight:     "#7D776B",      // nur Platzhalter/Deko, nie für Fließtext (3,7:1 auf cardAlt)
  onAccent:      "#FFFFFF",      // Text/Icons auf blue und success
  onAvatar:      "#FFFFFF",      // Initialen auf Avatarfarben

  // Borders & Divider
  border:        "#E6E0D4",
  borderDark:    "#D9D2C4",
  control:       "#8F887B",      // Rand antippbarer Kreise/Felder (Abhaken): 3,5:1 auf Karte

  // Status
  dangerBg:      "#F6DCD3",
  dangerText:    "#963F2C",      // Text auf dangerBg
  success:       "#2F7A4D",
  successText:   "#24553F",      // Text auf greenSoft

  // Overlays (Modals, Sheets)
  overlay:       "rgba(28,27,25,0.5)",

  // Navigation (Bottom-Leiste)
  tabBarGlass:   "rgba(28,27,25,0.6)", // Leiste über Unschärfe: sichtbar durchsichtig, Icons bleiben lesbar
  tabActive:     "#E2B347",
  tabInactive:   "#F2EEE6",
  navBorder:     "transparent",
  navActiveText: "#1C1B19",

  // Akzentfamilien: Fläche · Text darauf · Nebentext darauf · Kante · Leuchten
  // Beide Themes: gefüllte Flächen ohne Leuchten.
  /** Dunkler Grund: für Feinheiten, die ein Token allein nicht abdeckt (z. B. weiße statt schwarze Transparenz). */
  isDark:        false as boolean,
  heroBlue:      "#2D4F9E",
  heroBlueInner: "#1F3770",      // Flip-Kacheln, innere Flächen
  onHeroBlue:    "#FFFFFF",
  heroBlueSub:   "#F0D48C",      // Akzenttext auf Blau
  heroBlueEdge:  "transparent",
  live:          "#24553F",
  onLive:        "#FFFFFF",
  liveSub:       "#CFE0D5",
  liveAccent:    "#E2B347",      // Puls-Punkt
  liveEdge:      "transparent",
  mustard:       "#E2B347",      // Fläche (Buttons, aktive Tabs)
  onMustard:     "#1C1B19",
  mustardTile:   "#E8C46B",      // Kasse-Kachel
  mustardSoft:   "#F3E3B5",
  mustardText:   "#7A5E1C",      // Text auf mustardSoft
  mustardEdge:   "transparent",
  coral:         "#A94B36",      // Fläche mit onCoral
  onCoral:       "#FFFFFF",
  coralSoft:     "#F6DCD3",
  coralText:     "#963F2C",
  greenSoft:     "#E1EDE5",
  greenText:     "#24553F",
};

export type ThemeColors = typeof LIGHT_COLORS;

/**
 * Dunkel: ruhig und warm statt Neon. Warmes Graphit als Grund (passend zur
 * Creme im Hellen), Karten nur eine Stufe heller, keine Leuchtkanten. Die
 * Hero-Flächen bleiben gefüllt wie im Hellen (Markenblau, Live-Grün, Senf),
 * nur etwas tiefer. Texte und Akzente mind. 4,5:1 auf Karte und cardAlt.
 */
/** Negativer Betrag auf Senf-Flächen (Kasse) – die sind in beiden Themes gleich hell. */
export const MINUS_AUF_SENF = "#8A3422";

export const DARK_COLORS: ThemeColors = {
  background:    "#121110",      // warmes Graphit
  card:          "#1C1B19",
  cardAlt:       "#262422",
  segmentBg:     "#2A2825",
  hairline:      "rgba(255,255,255,0.06)",

  blue:          "#8AA5F0",      // helles Markenblau: Text auf Karte 7,2:1; als Fläche mit dunklem Text (onAccent)
  blueBg:        "#1F2434",
  gold:          "#E9C46A",
  goldLight:     "#E9C46A",

  textDark:      "#F3F0EA",      // warmes Weiß
  textMid:       "#CFC9BF",
  textMuted:     "#A29C91",      // 5,7:1 auf cardAlt
  textLight:     "#807A70",      // nur Platzhalter/Deko
  onAccent:      "#121110",
  onAvatar:      "#FFFFFF",

  border:        "#2F2D2A",
  borderDark:    "#3B3834",
  control:       "#8A847A",

  dangerBg:      "#3A2220",
  dangerText:    "#F4A28F",
  success:       "#5DBB86",
  successText:   "#8ED3AA",

  overlay:       "rgba(0,0,0,0.6)",

  tabBarGlass:   "rgba(38,36,34,0.72)",
  tabActive:     "#E2B347",
  tabInactive:   "#CFC9BF",
  navBorder:     "rgba(255,255,255,0.08)",
  navActiveText: "#1C1B19",

  isDark:        true,
  heroBlue:      "#2B4689",      // Markenblau, eine Stufe tiefer
  heroBlueInner: "#1F3466",
  onHeroBlue:    "#FFFFFF",
  heroBlueSub:   "#F0D48C",
  heroBlueEdge:  "transparent",
  live:          "#23503C",
  onLive:        "#FFFFFF",
  liveSub:       "#CFE0D5",
  liveAccent:    "#E2B347",
  liveEdge:      "transparent",
  mustard:       "#E2B347",
  onMustard:     "#1C1B19",
  mustardTile:   "#D9AA45",
  mustardSoft:   "#352C1A",
  mustardText:   "#EBC970",
  mustardEdge:   "transparent",
  coral:         "#B4503A",      // Weiß darauf 5,1:1
  onCoral:       "#FFFFFF",
  coralSoft:     "#3A2420",
  coralText:     "#F4A28F",
  greenSoft:     "#1E3127",
  greenText:     "#8ED3AA",
};

export const SHADOWS = {
  light: {
    shadowColor: "#1C1B19",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
};

// ─── Form & Abstand ───────────────────────────────────────────────────────────

export const RADIUS = { sm: 10, md: 14, tile: 22, card: 24, hero: 28, pill: 999 } as const;
export const SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 } as const;
export const ICON = { sm: 16, md: 20, lg: 24 } as const;

// ─── Schrift (Figtree) ────────────────────────────────────────────────────────
// Eigene Schriften brauchen auf iOS einen Familiennamen pro Stärke; fontWeight
// allein wählt keinen Schnitt. Daher immer FONT.wNNN statt fontWeight.

export const FONT = {
  w400: "Figtree_400Regular",
  w400i: "Figtree_400Regular_Italic",
  w500: "Figtree_500Medium",
  w600: "Figtree_600SemiBold",
  w700: "Figtree_700Bold",
  w800: "Figtree_800ExtraBold",
  w900: "Figtree_900Black",
} as const;

/** Schriftrollen. Zahlen haben gleich breite Ziffern, damit Timer nicht springen. */
export const TYPE = {
  label: { fontFamily: FONT.w700, fontSize: 12, letterSpacing: 0.6, textTransform: "uppercase" },
  title: { fontFamily: FONT.w700, fontSize: 22, letterSpacing: -0.4 },
  heading: { fontFamily: FONT.w700, fontSize: 17 },
  body: { fontFamily: FONT.w400, fontSize: 15 },
  bodyStrong: { fontFamily: FONT.w600, fontSize: 15 },
  caption: { fontFamily: FONT.w500, fontSize: 12 },
  num: { fontFamily: FONT.w700, fontVariant: ["tabular-nums"], letterSpacing: -0.4 },
} satisfies Record<string, TextStyle>;

/** Höchstfaktor für die Systemschriftgröße bei großen Zahlen und Hero-Inhalten. */
export const MAX_FONT_SCALE = 1.3;

// ─── Bewegung ─────────────────────────────────────────────────────────────────

export const MOTION = {
  tapScale: 0.96,
  spring: { damping: 16, stiffness: 260, mass: 0.6 },
  fast: 180,
  base: 280,
  slow: 600,
  stagger: 40,
  /** Takt für wechselnde Anzeigen auf Home (Bilanz-Platzierung, Ranglisten). */
  wechsel: 5000,
} as const;

// ─── Avatar-Farben für Mitglieder ─────────────────────────────────────────────
// Weiße Initialen haben auf allen Farben mindestens 4,5:1.

export const AVATAR_COLORS = [
  "#2D4F9E",   // Blau
  "#8F6620",   // Senf-Braun
  "#2F7A4D",   // Grün
  "#7A5232",   // Braun
  "#6E4A8E",   // Lila
  "#A94B36",   // Koralle
  "#3E6B6B",   // Petrol
  "#8C5A6E",   // Beere
];

/** Alte Avatarfarben (vor Kombi) → neue Entsprechung. Wird beim Laden angewendet. */
const LEGACY_AVATAR: Record<string, string> = {
  "#1A4480": "#2D4F9E",
  "#C8900E": "#8F6620",
  "#2E7D52": "#2F7A4D",
  "#8B4513": "#7A5232",
  "#6B3A8A": "#6E4A8E",
  "#C0392B": "#A94B36",
  "#2C6E8A": "#3E6B6B",
  "#7A5C1E": "#8C5A6E",
};

export function kombiAvatarFarbe(hex: string | undefined | null): string {
  if (!hex) return AVATAR_COLORS[0];
  return LEGACY_AVATAR[hex.toUpperCase()] ?? hex;
}

// ─── Rollen am Stammtisch ─────────────────────────────────────────────────────
// Die Rollen-Optionen sind pro Stammtisch konfigurierbar, siehe
// StammtischVerordnung.rollenOptionen (types/index.ts) — kein fester Export mehr.
