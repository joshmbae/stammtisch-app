/**
 * Ein Emoji pro Begriff, überall gleich. Inhalte (Menüpunkte, Kategorien,
 * Kassenarten, Chronik) zeigen iPhone-Emojis; Bedienelemente (Pfeile, Plus,
 * Schließen, Tab-Leiste, Icons in Buttons) bleiben Linien-Icons.
 */
export const SYMBOL = {
  // Stammtisch & Runde
  name: "🏷️",
  logo: "🖼️",
  treffpunkt: "📍",
  stammtischtag: "🗓️",
  gegruendet: "🏁",
  satzung: "📜",
  rollen: "👥",
  einladung: "🎟️",
  protokoll: "📝",
  einstellungen: "⚙️",
  erscheinungsbild: "🌗",
  profilWechseln: "🔄",
  abmelden: "🚪",
  tutorial: "🎬",
  neu: "✨",
  navigation: "🧭",
  live: "⚡",
  erinnern: "🔔",
  krone: "👑",
  loeschen: "🗑️",
  bearbeiten: "✏️",
  pin: "🔒",
  offline: "📡",
  chronik: "🕰️",

  // Termine
  termin: "📅",
  stammtisch: "🍻",
  veranstaltung: "🎉",
  geburtstag: "🎁",
  serie: "🔁",
  zusage: "🙋",

  // Kasse & Strafen
  kasse: "💰",
  einnahme: "💶",
  ausgabe: "💸",
  rechnung: "🧾",
  strafenkatalog: "💰",
  strafe: "💰",
  ohneStrafen: "🕊️",
  zuSpaet: "⏰",
  sonstiges: "📌",
  liveErfassen: "✍️",

  // Spiele & Tabelle
  spiele: "🎲",
  strichliste: "✏️",
  keinSpiel: "🚫",
  tabelle: "📈",
  teilnahme: "✅",
  pokal: "🏆",
} as const;
