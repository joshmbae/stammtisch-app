import React from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { SHADOWS, ThemeColors, FONT } from "../constants/design";
import { useThemedStyles } from "../contexts/ThemeContext";
import StammtischLogo from "../components/StammtischLogo";

export default function OnboardingSetupScreen() {
  const styles = useThemedStyles(makeStyles);
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

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background },
  content: { padding: 24, paddingBottom: 40, alignItems: "center", flexGrow: 1, justifyContent: "center" },

  header: { alignItems: "center", marginBottom: 32, gap: 10 },
  title: { fontSize: 26, fontFamily: FONT.w800, color: c.textDark, marginTop: 8 },
  subtitle: { fontFamily: FONT.w400, fontSize: 15, color: c.textMuted, textAlign: "center", lineHeight: 21 },

  primaryBtn: {
    width: "100%",
    backgroundColor: c.blue,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOWS.card,
  },
  primaryBtnText: { color: c.onAccent, fontSize: 16, fontFamily: FONT.w700 },

  secondaryBtn: { marginTop: 16, paddingVertical: 8 },
  secondaryBtnText: { fontFamily: FONT.w400, fontSize: 14, color: c.textMuted, textDecorationLine: "underline" },
});
