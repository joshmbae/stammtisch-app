import { View, Text, StyleSheet } from "react-native";
import { COLORS } from "../constants/design";

/**
 * Krönchen für Mitglieder, die aktuell mindestens eine Jahres-Rangliste
 * anführen. Führt jemand mehrere an, steht die Anzahl daneben.
 */
export default function SiegerBadge({ titel }: { titel: string[] }) {
  if (titel.length === 0) return null;
  return (
    <View
      style={styles.badge}
      accessibilityRole="image"
      accessibilityLabel={`Führt aktuell: ${titel.join(", ")}`}
    >
      <Text style={styles.krone}>👑</Text>
      {titel.length > 1 && <Text style={styles.count}>{titel.length}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row", alignItems: "center", gap: 2,
    backgroundColor: COLORS.goldBg, borderRadius: 8,
    borderWidth: 1, borderColor: COLORS.gold + "55",
    paddingHorizontal: 5, paddingVertical: 1,
  },
  krone: { fontSize: 11 },
  count: { fontSize: 10, fontWeight: "800", color: COLORS.gold },
});
