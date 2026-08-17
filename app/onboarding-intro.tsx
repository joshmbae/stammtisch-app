import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { COLORS, SHADOWS } from "../constants/design";
import { useSession } from "../contexts/SessionContext";
import { markAppIntroSeen } from "../utils/onboarding";

interface Step {
  icon: string;
  title: string;
  text: string;
}

const STEPS: Step[] = [
  {
    icon: "🍻",
    title: "Willkommen bei DeinStammtisch!",
    text: "Ein kurzer Überblick über die wichtigsten Bereiche der App — dauert nur eine Minute.",
  },
  {
    icon: "📅",
    title: "Termine",
    text: "Im Kalender seht ihr alle Stammtische und Termine. Sagt zu oder ab, tragt Anwesenheit und Verspätungen ein — alles im Termin-Detail.",
  },
  {
    icon: "⚖️",
    title: "Strafen",
    text: "Wer absagt, zu spät kommt oder ein Spiel verliert, kassiert schon mal eine Strafe. Alle Strafen findet ihr gesammelt unter „Strafen“.",
  },
  {
    icon: "💶",
    title: "Kasse",
    text: "Einnahmen, Ausgaben und Abendkosten landen in der Kasse — inklusive Kostenteilung, wer schon bezahlt hat.",
  },
  {
    icon: "🔒",
    title: "Euer Profil + PIN",
    text: "Jede Person hat ihr eigenes Mitglied-Profil. Optional könnt ihr es mit einer 4-stelligen PIN schützen, damit nur ihr es bearbeiten oder löschen könnt.",
  },
];

export default function OnboardingIntroScreen() {
  const { replay } = useLocalSearchParams<{ replay?: string }>();
  const isReplay = replay === "1";
  const { activeMemberId } = useSession();
  const [step, setStep] = useState(0);

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  async function finish() {
    if (!isReplay && activeMemberId) {
      await markAppIntroSeen(activeMemberId);
    }
    if (isReplay) {
      router.back();
    } else {
      router.replace("/(tabs)/home");
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={finish}>
          <Text style={styles.skipText}>{isReplay ? "Schließen" : "Überspringen"}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.icon}>{current.icon}</Text>
        <Text style={styles.title}>{current.title}</Text>
        <Text style={styles.text}>{current.text}</Text>
      </View>

      <View style={styles.dots}>
        {STEPS.map((_, i) => (
          <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
        ))}
      </View>

      <View style={styles.footer}>
        {step > 0 && (
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep((s) => s - 1)} activeOpacity={0.8}>
            <Text style={styles.backBtnText}>Zurück</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.nextBtn}
          onPress={() => (isLast ? finish() : setStep((s) => s + 1))}
          activeOpacity={0.85}
        >
          <Text style={styles.nextBtnText}>
            {isLast ? (isReplay ? "Schließen" : "Los geht's") : "Weiter"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },

  header: { flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: 20, paddingTop: 8 },
  skipText: { fontSize: 14, color: COLORS.textMuted, fontWeight: "600" },

  content: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 14 },
  icon: { fontSize: 64 },
  title: { fontSize: 24, fontWeight: "800", color: COLORS.textDark, textAlign: "center" },
  text: { fontSize: 15, color: COLORS.textMuted, textAlign: "center", lineHeight: 22 },

  dots: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 24 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.border },
  dotActive: { backgroundColor: COLORS.blue, width: 20 },

  footer: { flexDirection: "row", gap: 10, paddingHorizontal: 24, paddingBottom: 24 },
  backBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  backBtnText: { fontSize: 15, fontWeight: "700", color: COLORS.textMuted },
  nextBtn: {
    flex: 2,
    backgroundColor: COLORS.blue,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    ...SHADOWS.card,
  },
  nextBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});
