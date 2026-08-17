import { TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { COLORS } from "../constants/design";

/** Führt von jedem Menüpunkt (außer Übersicht selbst) zurück zur Übersicht. */
export function BackButton({ color = COLORS.textDark }: { color?: string }) {
  return (
    <TouchableOpacity
      onPress={() => router.replace("/(tabs)/home")}
      style={styles.btn}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Ionicons name="chevron-back" size={26} color={color} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: { padding: 4 },
});
