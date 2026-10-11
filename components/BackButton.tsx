import { TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "../contexts/ThemeContext";

/** Führt von jedem Menüpunkt (außer Übersicht selbst) zurück zur Übersicht. */
export function BackButton({ color }: { color?: string }) {
  const c = useColors();
  return (
    <TouchableOpacity
      onPress={() => router.replace("/(tabs)/home")}
      style={styles.btn}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      accessibilityRole="button"
      accessibilityLabel="Zurück zur Übersicht"
    >
      <Ionicons name="chevron-back" size={26} color={color ?? c.textDark} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: { padding: 4 },
});
