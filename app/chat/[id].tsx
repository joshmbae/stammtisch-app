import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { COLORS } from "../../constants/design";

export default function ChatScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerName}>Der Sepp</Text>
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
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    gap: 12, backgroundColor: COLORS.card,
  },
  backBtn: { padding: 4 },
  backText: { fontSize: 32, color: COLORS.blue, lineHeight: 36 },
  headerName: { fontSize: 17, fontWeight: "700", color: COLORS.textDark },

  content: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  emoji: { fontSize: 56 },
  title: { fontSize: 20, fontWeight: "800", color: COLORS.textDark },
  text: { fontSize: 15, color: COLORS.textMuted, textAlign: "center", lineHeight: 22 },
});
