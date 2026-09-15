import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/design";

/**
 * Sichtbarer Fehlerzustand mit Wiederholen-Knopf — Ersatz für den früheren
 * Dauerspinner, wenn ein Ladevorgang scheitert und auch kein Cache-Stand da ist.
 */
export default function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.icon}>🍺</Text>
      <Text style={styles.title}>Daten konnten nicht geladen werden</Text>
      <Text style={styles.message}>{message}</Text>
      <TouchableOpacity
        style={styles.btn}
        onPress={onRetry}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Erneut versuchen"
      >
        <Ionicons name="refresh" size={16} color="#FFFFFF" />
        <Text style={styles.btnText}>Erneut versuchen</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 10 },
  icon: { fontSize: 44 },
  title: { fontSize: 16, fontWeight: "800", color: COLORS.textDark, textAlign: "center" },
  message: { fontSize: 13, color: COLORS.textMuted, textAlign: "center", lineHeight: 19 },
  btn: {
    flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8,
    backgroundColor: COLORS.blue, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 14,
  },
  btnText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
});
