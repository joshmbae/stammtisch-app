import { TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "../contexts/ThemeContext";

/** Eine Ebene zurück; ohne Verlauf (z. B. nach Deep-Link) zur Übersicht. */
export function BackButton({ color }: { color?: string }) {
  const c = useColors();
  return (
    <TouchableOpacity
      onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/home"))}
      style={styles.btn}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      accessibilityRole="button"
      accessibilityLabel="Zurück"
    >
      <Ionicons name="chevron-back" size={26} color={color ?? c.textDark} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // 44 × 44 Bedienfläche, auch ohne hitSlop.
  btn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginLeft: -8 },
});
