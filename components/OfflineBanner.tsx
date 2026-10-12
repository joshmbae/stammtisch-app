import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FONT, RADIUS, ThemeColors } from "../constants/design";
import { useColors, useThemedStyles } from "../contexts/ThemeContext";
import { useOffline } from "../utils/cache";

/**
 * Dezenter Hinweis, dass gerade der zuletzt gespeicherte Stand angezeigt wird
 * (siehe utils/cache.ts). Rendert nichts, solange die Verbindung steht.
 */
export default function OfflineBanner() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const offline = useOffline();
  if (!offline) return null;
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Ionicons name="cloud-offline-outline" size={16} color={c.mustardText} />
      <Text style={styles.text}>Offline — angezeigt wird der zuletzt geladene Stand.</Text>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  banner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: c.mustardSoft, borderRadius: RADIUS.md,
    paddingVertical: 10, paddingHorizontal: 14,
  },
  text: { flex: 1, fontSize: 13, fontFamily: FONT.w600, color: c.mustardText },
});
