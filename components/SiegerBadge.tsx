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
export default function SiegerBadge({ titel, size = 16 }: { titel: FuehrenderTitel[]; size?: number }) {
  if (titel.length === 0) return null;
  return (
    <Text
      style={[styles.badge, { fontSize: size }]}
      accessibilityRole="image"
      accessibilityLabel={`Führt aktuell: ${titel.map((t) => t.titel).join(", ")}`}
    >
      {titel[0].emoji}
    </Text>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: -5,
    right: -7,
    textShadowColor: "#FFFFFF",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
});
