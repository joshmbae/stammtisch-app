import { View, Text, StyleSheet } from "react-native";
import { COLORS, SHADOWS } from "../constants/design";
import { FuehrenderTitel } from "../utils/stats";

/**
 * Sitzt als kleiner Kreis am Rand des Profilbilds und zeigt das Icon der
 * Wertung, die diese Person gerade anführt (bei mehreren die erstgenannte).
 *
 * Absolut positioniert — gehört in einen Container, der das Profilbild
 * umschließt und nicht `overflow: "hidden"` setzt.
 */
export default function SiegerBadge({ titel, size = 18 }: { titel: FuehrenderTitel[]; size?: number }) {
  if (titel.length === 0) return null;
  return (
    <View
      style={[styles.badge, { width: size, height: size, borderRadius: size / 2 }]}
      accessibilityRole="image"
      accessibilityLabel={`Führt aktuell: ${titel.map((t) => t.titel).join(", ")}`}
    >
      <Text style={{ fontSize: Math.round(size * 0.58) }}>{titel[0].emoji}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    right: -2,
    top: -2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.gold,
    ...SHADOWS.light,
  },
});
