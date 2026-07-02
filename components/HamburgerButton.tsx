import { TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMenu } from "../contexts/MenuContext";
import { COLORS } from "../constants/design";

export function HamburgerButton({ color = COLORS.textDark }: { color?: string }) {
  const { openMenu } = useMenu();
  return (
    <TouchableOpacity
      onPress={openMenu}
      style={styles.btn}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Ionicons name="menu" size={26} color={color} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: { padding: 4 },
});
