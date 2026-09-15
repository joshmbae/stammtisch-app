import { Text, StyleSheet } from "react-native";
import { FuehrenderTitel } from "../utils/stats";

/**
 * Zeigt am oberen Rand des Profilbilds das Icon der Wertung, die diese Person
 * gerade anführt (bei mehreren die erstgenannte).
 *
 * Bewusst ohne Hintergrundkreis — Emojis füllen ihre Zeilenhöhe unterschiedlich
 * aus und ragten je nach Icon über den Kreis hinaus. Stattdessen ein heller
 * Schein, damit das Icon auch auf dunklen Avatarfarben lesbar bleibt.
 *
 * Absolut positioniert: gehört in einen Container, der das Profilbild
 * umschließt und kein `overflow: "hidden"` setzt.
 */
/**
 * Emojis füllen ihre Zeilenhöhe unterschiedlich aus: ✅ ist ein vollflächiges
 * Quadrat und wirkt bei gleicher Schriftgröße deutlich größer als luftig
 * gezeichnete wie ⏱️ oder 🎲. Damit die Badges nebeneinander gleich groß
 * wirken, werden solche Zeichen etwas kleiner gesetzt.
 */
const GROESSEN_AUSGLEICH: Record<string, number> = {
  "✅": -3,
};

export default function SiegerBadge({ titel, size = 16 }: { titel: FuehrenderTitel[]; size?: number }) {
  if (titel.length === 0) return null;
  const emoji = titel[0].emoji;
  return (
    <Text
      style={[styles.badge, { fontSize: size + (GROESSEN_AUSGLEICH[emoji] ?? 0) }]}
      accessibilityRole="image"
      accessibilityLabel={`Führt aktuell: ${titel.map((t) => t.titel).join(", ")}`}
    >
      {emoji}
    </Text>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: -3,
    right: -4,
    textShadowColor: "#FFFFFF",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
});
