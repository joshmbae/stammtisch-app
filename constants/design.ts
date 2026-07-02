// ─── Stammtisch Design System ─────────────────────────────────────────────────
// "Die Hellen" — Bayrisches Stammtisch-Design
// Farbpalette: Bayrisch Blau + Bier-Gold + warmes Holz

export const COLORS = {
  // Hintergründe
  background:    "#F5ECD7",      // warmes Pergament / Biergartenholz
  card:          "#FFFFFF",
  cardAlt:       "#FBF5E6",      // leicht getöntes Kartenalternativ

  // Markenfarben
  blue:          "#1A4480",      // Bayrisch Blau (Primär)
  blueDark:      "#0F2D5A",      // dunkleres Blau
  blueLight:     "#2E5FA3",      // helleres Blau für Highlights
  gold:          "#C8900E",      // Bier-Amber / Gold (Akzent)
  goldLight:     "#E8AB3A",      // helleres Gold
  goldBg:        "#FFF3D6",      // Gold-Hintergrund für Badges

  // Text
  textDark:      "#1A1208",      // fast Schwarz (warmer Ton)
  textMid:       "#4A3B28",      // mittleres Braun
  textMuted:     "#7A6B54",      // gedimmtes Braun
  textLight:     "#B09A7A",      // helles Braun

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
  success:       "#2E7D52",
  warning:       "#E8890C",

  // Tabs
  tabBar:        "#1A1208",      // dunkles Holz
  tabActive:     "#C8900E",      // Gold für aktiven Tab
  tabInactive:   "#7A6B54",      // gedimmt für inaktiven Tab
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

export const ROLLEN = [
  "Stammtischkönig",
  "Schriftführer",
  "Kassenwart",
  "Bierwart",
  "Eventmanager",
  "Reserviermeister",
  "Kameramann",
  "Mitglied",
  "Gast",
] as const;

// ─── Bier-Typen ───────────────────────────────────────────────────────────────

export const BIER_TYPEN = [
  { key: "helles",    label: "Helles",    emoji: "🍺", color: "#F5C842" },
  { key: "weißbier",  label: "Weißbier",  emoji: "🍺", color: "#E8D5A0" },
  { key: "dunkles",   label: "Dunkles",   emoji: "🍺", color: "#8B4513" },
  { key: "radler",    label: "Radler",    emoji: "🍋", color: "#A8D870" },
  { key: "maß",       label: "Maß",       emoji: "🍺", color: "#D4A017" },
  { key: "sonstiges", label: "Sonstiges", emoji: "🥤", color: "#9B8B6E" },
] as const;

export type BierTypKey = typeof BIER_TYPEN[number]["key"];
