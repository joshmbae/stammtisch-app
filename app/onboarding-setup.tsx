import React from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { COLORS, SHADOWS } from "../constants/design";
import StammtischLogo from "../components/StammtischLogo";

export default function OnboardingSetupScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <StammtischLogo size={52} />
          <Text style={styles.title}>Fast geschafft! 🎉</Text>
          <Text style={styles.subtitle}>
            Euer Stammtisch ist angelegt. Bevor's losgeht: hinterlegt in Ruhe eure Stammtisch-Daten
            — Treffpunkt, Stammtischtag/-zeit und eure Regeln. Das geht unter „Einstellungen“ und
            könnt ihr jederzeit ändern.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.push("/(tabs)/guide")}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>Jetzt einrichten</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.replace("/mitglied-waehlen")}
          activeOpacity={0.75}
        >
          <Text style={styles.secondaryBtnText}>Später — erstmal Mitglied anlegen</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 24, paddingBottom: 40, alignItems: "center", flexGrow: 1, justifyContent: "center" },

  header: { alignItems: "center", marginBottom: 32, gap: 10 },
  title: { fontSize: 26, fontWeight: "800", color: COLORS.textDark, marginTop: 8 },
  subtitle: { fontSize: 15, color: COLORS.textMuted, textAlign: "center", lineHeight: 21 },

  primaryBtn: {
    width: "100%",
    backgroundColor: COLORS.blue,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOWS.card,
  },
  primaryBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },

  secondaryBtn: { marginTop: 16, paddingVertical: 8 },
  secondaryBtnText: { fontSize: 14, color: COLORS.textMuted, textDecorationLine: "underline" },
});
