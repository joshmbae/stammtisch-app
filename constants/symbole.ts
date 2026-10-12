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
  protokoll: "📝",
  einstellungen: "⚙️",
  erscheinungsbild: "🌗",
  profilWechseln: "🔄",
  tutorial: "🎬",
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
  geld: "💶",
  einnahme: "💶",
  ausgabe: "💸",
  rechnung: "🧾",
  strafenkatalog: "💸",
  strafe: "⚠️",
  zuSpaet: "⏰",
  sonstiges: "📌",
  liveErfassen: "✍️",

  // Spiele & Tabelle
  spiele: "🎲",
  keinSpiel: "🚫",
  tabelle: "📈",
  teilnahme: "✅",
  pokal: "🏆",
} as const;
