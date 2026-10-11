// ─── Stammtisch Design System ─────────────────────────────────────────────────
// DeinStammtisch — Bayrisches Stammtisch-Design
// Farbpalette: Bayrisch Blau + Bier-Gold + warmes Holz

export const LIGHT_COLORS = {
  // Hintergründe
  background:    "#F5ECD7",      // warmes Pergament / Biergartenholz
  card:          "#FFFFFF",
  cardAlt:       "#FBF5E6",      // leicht getöntes Kartenalternativ

  // Markenfarben
  blue:          "#1A4480",      // Bayrisch Blau (Primär)
  blueDark:      "#0F2D5A",      // dunkleres Blau
  blueLight:     "#2E5FA3",      // helleres Blau für Highlights
  blueBg:        "#E8EEF7",      // Blau-Hintergrund für Hinweise/Chips
  gold:          "#C8900E",      // Bier-Amber / Gold (Akzent)
  goldLight:     "#E8AB3A",      // helleres Gold
  goldBg:        "#FFF3D6",      // Gold-Hintergrund für Badges

  // Text
  textDark:      "#1A1208",      // fast Schwarz (warmer Ton)
  textMid:       "#4A3B28",      // mittleres Braun
  textMuted:     "#7A6B54",      // gedimmtes Braun
  textLight:     "#B09A7A",      // helles Braun
  onAccent:      "#FFFFFF",      // Text/Icons auf Blau, Gold, Avataren

  // Borders & Divider
  border:        "#E0CFA8",      // Holz-Beige Border
  borderDark:    "#C4AD82",      // dunklere Border

  // Bier-Farben (für Bier-Typen)
  bierHelles:    "#F5C842",      // Helles — Gold
  bierWeißbier:  "#E8D5A0",      // Weißbier — Hellgelb
  bierDunkles:   "#8B4513",      // Dunkles — Dunkelbraun
  bierRadler:    "#A8D870",      // Radler — Hellgrün
  bierMaß:       "#D4A017",      // Maß — Tiefgold
  bierSonstiges: "#9B8B6E",      // Sonstiges — Neutral

  // Status-Farben
  danger:        "#C0392B",
  dangerBg:      "#FDF0EF",
  success:       "#2E7D52",
  successBg:     "#EDF7F2",
  warning:       "#E8890C",

  // Termin-Art "Veranstaltung"
  purple:        "#7C3AED",

  // Overlays (Modals, Drawer)
  overlay:       "rgba(26,18,8,0.5)",

  // Tabs
  tabBar:        "#1A1208",      // dunkles Holz
  tabActive:     "#C8900E",      // Gold für aktiven Tab
  tabInactive:   "#7A6B54",      // gedimmt für inaktiven Tab

  // Diagramme (Ranglisten-Verlauf): Hervorhebungen + neutrale Linien
  chartSeries:   ["#2a78d6", "#eb6834", "#1baf7a"],
  chartMuted:    "#D2C3A3",
  chartGrid:     "#EFE4CB",
};

export type ThemeColors = typeof LIGHT_COLORS;


/**
 * Dunkles Holz statt Schwarz: gleiche Rollen wie LIGHT_COLORS, jede Stufe für
 * den dunklen Hintergrund gewählt (nicht automatisch invertiert). Akzente sind
 * heller, damit sie auf dunklen Karten genug Kontrast haben.
 */
export const DARK_COLORS: ThemeColors = {
  background:    "#15110B",
  card:          "#221C14",
  cardAlt:       "#2A2319",

  blue:          "#4F82CC",
  blueDark:      "#1E3A66",
  blueLight:     "#7AA3E0",
  blueBg:        "#1B2A40",
  gold:          "#B8860B",      // dunkler als nötig für Text, damit weiße Schrift darauf lesbar bleibt
  goldLight:     "#E0A82E",
  goldBg:        "#3A2C10",

  textDark:      "#F3EBDD",
  textMid:       "#D8CBB4",
  textMuted:     "#A8977C",
  textLight:     "#7D6E58",
  onAccent:      "#FFFFFF",

  border:        "#3A3025",
  borderDark:    "#4D4133",

  bierHelles:    "#F5C842",
  bierWeißbier:  "#E8D5A0",
  bierDunkles:   "#B0652B",
  bierRadler:    "#A8D870",
  bierMaß:       "#D4A017",
  bierSonstiges: "#9B8B6E",

  danger:        "#E5675A",
  dangerBg:      "#3A1A16",
  success:       "#2F8A57",
  successBg:     "#16301F",
  warning:       "#F0A040",

  purple:        "#A78BFA",

  overlay:       "rgba(0,0,0,0.6)",

  tabBar:        "#0E0B07",
  tabActive:     "#B8860B",
  tabInactive:   "#A8977C",

  chartSeries:   ["#3987e5", "#d95926", "#199e70"],
  chartMuted:    "#4A3F31",
  chartGrid:     "#2E271D",
};

export const SHADOWS = {
  card: {
    shadowColor: "#1A1208",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  light: {
    shadowColor: "#1A1208",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
};

// ─── Avatar-Farben für Mitglieder ─────────────────────────────────────────────

export const AVATAR_COLORS = [
  "#1A4480",   // Bayrisch Blau
  "#C8900E",   // Bier-Gold
  "#2E7D52",   // Wiesn-Grün
  "#8B4513",   // Brauerei-Braun
  "#6B3A8A",   // Trachtenlila
  "#C0392B",   // Feuerwehr-Rot
  "#2C6E8A",   // Bergsee-Blau
  "#7A5C1E",   // Holz-Braun
];

// ─── Rollen am Stammtisch ─────────────────────────────────────────────────────
// Die Rollen-Optionen sind pro Stammtisch konfigurierbar, siehe
// StammtischVerordnung.rollenOptionen (types/index.ts) — kein fester Export mehr.
