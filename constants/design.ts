import type { TextStyle } from "react-native";

// ─── Stammtisch Design System „Kombi" ─────────────────────────────────────────
// Hell: cremig und warm (Creme, Tinte, Blau, Senf, Koralle).
// Dunkel: eigenständig und futuristisch (Tiefschwarz, Neon-Akzente, Leuchtkanten).
//
// Regeln:
// - Komponenten nutzen nur Rollen aus der Palette, keine Hex-Werte.
// - Text auf Farbflächen kommt aus dem passenden `on…`-Token, nie „weiß“ per Annahme.
// - Die alten Schlüssel (background, blue, gold, …) bleiben erhalten, damit noch
//   nicht umgebaute Screens automatisch die neuen Farben bekommen.

export const LIGHT_COLORS = {
  // Flächen
  background:    "#F2EEE6",      // Creme
  card:          "#FFFFFF",
  cardAlt:       "#EFEAE0",      // getönte Fläche (Chips, Felder, Säulen)
  hairline:      "rgba(28,27,25,0.07)", // feine Kante um Karten

  // Markenfarben (alte Rollen, auf Kombi umgestellt)
  blue:          "#2D4F9E",      // Primär: Links, aktive Elemente, Flächen mit onAccent
  blueDark:      "#1F3770",
  blueLight:     "#5B80C4",
  blueBg:        "#E2E7F3",
  gold:          "#8A6A14",      // als Text auf Weiß lesbar (5,1:1); Fläche: mustard
  goldLight:     "#E2B347",
  goldBg:        "#F3E3B5",

  // Text
  textDark:      "#1C1B19",      // Tinte
  textMid:       "#4F4A40",
  textMuted:     "#6E685D",
  textLight:     "#8A8478",      // nur Platzhalter/Deko, nie für Fließtext
  onAccent:      "#FFFFFF",      // Text/Icons auf blue, danger, success, purple
  onAvatar:      "#FFFFFF",      // Initialen auf Avatarfarben

  // Borders & Divider
  border:        "#E6E0D4",
  borderDark:    "#D9D2C4",

  // Bier-Farben (für Bier-Typen)
  bierHelles:    "#F5C842",
  bierWeißbier:  "#E8D5A0",
  bierDunkles:   "#8B4513",
  bierRadler:    "#A8D870",
  bierMaß:       "#D4A017",
  bierSonstiges: "#9B8B6E",

  // Status
  danger:        "#A94B36",      // Fläche mit onAccent und Text auf Weiß
  dangerBg:      "#F6DCD3",
  dangerText:    "#963F2C",      // Text auf dangerBg
  success:       "#2F7A4D",
  successBg:     "#E1EDE5",
  successText:   "#24553F",      // Text auf successBg
  warning:       "#A35A0B",

  // Termin-Art "Veranstaltung"
  purple:        "#6E4A8E",

  // Overlays (Modals, Sheets)
  overlay:       "rgba(28,27,25,0.5)",

  // Navigation (Bottom-Leiste)
  tabBar:        "#1C1B19",
  tabActive:     "#E2B347",
  tabInactive:   "#F2EEE6",
  navBorder:     "transparent",
  navActiveText: "#1C1B19",

  // Akzentfamilien: Fläche · Text darauf · Nebentext darauf · Kante · Glow
  // Hell = gefüllte Flächen ohne Glow; Dunkel = dunkle Fläche mit Leuchtkante.
  heroStyle:     "fill" as "fill" | "outline",
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
  coralEdge:     "transparent",
  greenSoft:     "#E1EDE5",
  greenText:     "#24553F",
  glowOpacity:   0,              // Hell: kein Leuchten

  // Diagramme (Ranglisten-Verlauf)
  chartSeries:   ["#2D4F9E", "#C9614A", "#2F7A4D"],
  chartMuted:    "#D9D2C4",
  chartGrid:     "#ECE6DB",
};

export type ThemeColors = typeof LIGHT_COLORS;

/**
 * Dunkel ist kein abgedunkeltes Hell: kühles Tiefschwarz, Akzente in
 * Neon-Sättigung, Karten mit Haarlinie statt Schatten, Hero-Flächen dunkel mit
 * leuchtender Kante. Auf hellen Neon-Flächen steht dunkler Text (onAccent).
 */
export const DARK_COLORS: ThemeColors = {
  background:    "#0A0B0F",
  card:          "#14161D",
  cardAlt:       "#1B1E27",
  hairline:      "rgba(255,255,255,0.08)",

  blue:          "#4D7CFF",      // Elektroblau: Text auf Karte 4,9:1, Fläche mit dunklem Text
  blueDark:      "#0F1424",
  blueLight:     "#7C9DFF",
  blueBg:        "#121A33",
  gold:          "#FFC93C",
  goldLight:     "#FFC93C",
  goldBg:        "#2A2108",

  textDark:      "#F4F6FB",
  textMid:       "#B5BBCB",
  textMuted:     "#8A90A2",
  textLight:     "#5C6274",
  onAccent:      "#0A0B0F",
  onAvatar:      "#FFFFFF",

  border:        "#232733",
  borderDark:    "#2E3340",

  bierHelles:    "#F5C842",
  bierWeißbier:  "#E8D5A0",
  bierDunkles:   "#B0652B",
  bierRadler:    "#A8D870",
  bierMaß:       "#D4A017",
  bierSonstiges: "#9B8B6E",

  danger:        "#FF6A4D",
  dangerBg:      "#2E1510",
  dangerText:    "#FF8A70",
  success:       "#3DDC97",
  successBg:     "#0E2A1E",
  successText:   "#3DDC97",
  warning:       "#FFA94D",

  purple:        "#B59CFF",

  overlay:       "rgba(0,0,0,0.7)",

  tabBar:        "#14161D",
  tabActive:     "#FFC93C",
  tabInactive:   "#B5BBCB",
  navBorder:     "rgba(255,255,255,0.10)",
  navActiveText: "#0A0B0F",

  heroStyle:     "outline",
  heroBlue:      "#0E1426",
  heroBlueInner: "#0A0F1D",
  onHeroBlue:    "#F4F6FB",
  heroBlueSub:   "#FFC93C",
  heroBlueEdge:  "rgba(77,124,255,0.55)",
  live:          "#0B1712",
  onLive:        "#F4F6FB",
  liveSub:       "#9FE8C6",
  liveAccent:    "#3DDC97",
  liveEdge:      "rgba(61,220,151,0.55)",
  mustard:       "#FFC93C",
  onMustard:     "#0A0B0F",
  mustardTile:   "#14161D",
  mustardSoft:   "#2A2108",
  mustardText:   "#FFC93C",
  mustardEdge:   "rgba(255,201,60,0.45)",
  coral:         "#FF6A4D",
  onCoral:       "#0A0B0F",
  coralSoft:     "#2E1510",
  coralText:     "#FF8A70",
  coralEdge:     "rgba(255,106,77,0.55)",
  greenSoft:     "#0E2A1E",
  greenText:     "#3DDC97",
  glowOpacity:   0.6,

  chartSeries:   ["#4D7CFF", "#FF6A4D", "#3DDC97"],
  chartMuted:    "#2E3340",
  chartGrid:     "#1B1E27",
};

export const SHADOWS = {
  card: {
    shadowColor: "#1C1B19",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  light: {
    shadowColor: "#1C1B19",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
};

/** Leuchten im Dunkel-Modus (im Hellen ist glowOpacity 0, also unsichtbar). */
export function glow(color: string, c: ThemeColors, radius = 22) {
  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: c.glowOpacity,
    shadowRadius: radius,
  };
}

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
  label: { fontFamily: FONT.w800, fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase" },
  title: { fontFamily: FONT.w800, fontSize: 22, letterSpacing: -0.4 },
  heading: { fontFamily: FONT.w800, fontSize: 17 },
  body: { fontFamily: FONT.w500, fontSize: 15 },
  bodyStrong: { fontFamily: FONT.w700, fontSize: 15 },
  caption: { fontFamily: FONT.w600, fontSize: 12 },
  num: { fontFamily: FONT.w800, fontVariant: ["tabular-nums"], letterSpacing: -0.4 },
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
