import { StyleSheet, View, Text } from "react-native";
import { COLORS } from "../constants/design";

interface Props {
  size?: number;
}

export default function StammtischLogo({ size = 58 }: Props) {
  return (
    <View
      style={[
        styles.container,
        { width: size, height: size, borderRadius: size * 0.28 },
      ]}
    >
      <Text style={[styles.emoji, { fontSize: size * 0.48 }]}>🍺</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.blue,
    shadowColor: COLORS.blue,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emoji: { lineHeight: undefined },
});
