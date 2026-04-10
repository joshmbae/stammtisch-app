import { StyleSheet, View, Text } from "react-native";


let Logo: React.FC<{ width?: number; height?: number }> | null = null;

try {
  Logo = require("../assets/mia_logo.svg").default;
} catch {}

interface MiaLogoProps {
  size?: number;
}

export default function MiaLogo({ size = 58 }: MiaLogoProps) {

  if (Logo) {
    return <Logo width={size} height={size} />;
  }

  // Fallback bis mia_logo.svg in assets/ liegt
  return (
    <View
      style={[
        styles.fallback,
        { width: size, height: size, borderRadius: size * 0.28 },
      ]}
    >
      <Text style={[styles.text, { fontSize: size * 0.33 }]}>mia</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4A7C6F",
    shadowColor: "#4A7C6F",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  text: { fontWeight: "800", letterSpacing: 1.5, color: "#FFFFFF" },
});
