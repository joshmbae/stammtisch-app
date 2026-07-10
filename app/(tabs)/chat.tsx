import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, SHADOWS } from "../../constants/design";
import { HamburgerButton } from "../../components/HamburgerButton";

export default function ChatTab() {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <HamburgerButton />
        <View style={styles.headerTexts}>
          <Text style={styles.headerTitle}>Der Sepp</Text>
          <Text style={styles.headerSub}>Persönlicher KI-Stammtisch-Assistent</Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.emoji}>🧔</Text>
        <Text style={styles.title}>Bald verfügbar</Text>
        <Text style={styles.text}>
          Der Sepp macht noch Pause. Diese Funktion kommt in einem der nächsten Updates.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: COLORS.cardAlt, borderRadius: 20,
    padding: 16, margin: 20, marginBottom: 0, ...SHADOWS.card,
    borderWidth: 1, borderColor: COLORS.border,
  },
  headerTexts: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: COLORS.textDark },
  headerSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

  content: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  emoji: { fontSize: 56 },
  title: { fontSize: 20, fontWeight: "800", color: COLORS.textDark },
  text: { fontSize: 15, color: COLORS.textMuted, textAlign: "center", lineHeight: 22 },
});
