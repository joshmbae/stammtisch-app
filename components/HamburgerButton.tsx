import { TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMenu } from "../contexts/MenuContext";
import { useColors } from "../contexts/ThemeContext";

export function HamburgerButton({ color }: { color?: string }) {
  const c = useColors();
  const { openMenu } = useMenu();
  return (
    <TouchableOpacity
      onPress={openMenu}
      style={styles.btn}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      accessibilityRole="button"
      accessibilityLabel="Menü öffnen"
    >
      <Ionicons name="menu" size={26} color={color ?? c.textDark} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: { padding: 4 },
});
