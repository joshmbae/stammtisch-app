import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemeColors, FONT } from "../constants/design";
import { useColors, useThemedStyles } from "../contexts/ThemeContext";

/**
 * Sichtbarer Fehlerzustand mit Wiederholen-Knopf — Ersatz für den früheren
 * Dauerspinner, wenn ein Ladevorgang scheitert und auch kein Cache-Stand da ist.
 */
export default function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
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
        <Ionicons name="refresh" size={16} color={c.onAccent} />
        <Text style={styles.btnText}>Erneut versuchen</Text>
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 10 },
  icon: { fontFamily: FONT.w400, fontSize: 44 },
  title: { fontSize: 16, fontFamily: FONT.w800, color: c.textDark, textAlign: "center" },
  message: { fontFamily: FONT.w400, fontSize: 13, color: c.textMuted, textAlign: "center", lineHeight: 19 },
  btn: {
    flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8,
    backgroundColor: c.blue, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 14,
  },
  btnText: { fontSize: 14, fontFamily: FONT.w700, color: c.onAccent },
});
