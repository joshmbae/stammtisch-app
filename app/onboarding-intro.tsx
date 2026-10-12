import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { FONT, ThemeColors } from "../constants/design";
import { useThemedStyles } from "../contexts/ThemeContext";
import { useSession } from "../contexts/SessionContext";
import { markAppIntroSeen } from "../utils/onboarding";
import { Button, PressableScale, Ton } from "../components/ui";
import { EinstiegHero, EinstiegScreen } from "../components/einstieg/Einstieg";
import { SYMBOL } from "../constants/symbole";

interface Step {
  emoji: string;
  ton: Ton;
  title: string;
  text: string;
}

const STEPS: Step[] = [
  {
    emoji: SYMBOL.stammtisch,
    ton: "mustard",
    title: "Willkommen bei DeinStammtisch!",
    text: "Ein kurzer Überblick über die wichtigsten Bereiche der App – dauert nur eine Minute.",
  },
  {
    emoji: SYMBOL.termin,
    ton: "blue",
    title: "Termine",
    text: "Unter „Termine“ seht ihr alle Stammtische und Termine. Sagt zu oder ab, tragt Anwesenheit und Verspätungen ein – alles im Termin-Detail.",
  },
  {
    emoji: SYMBOL.strafenkatalog,
    ton: "coral",
    title: "Strafen",
    text: "Wer absagt, zu spät kommt oder ein Spiel verliert, kassiert schon mal eine Strafe. Alle Strafen findet ihr gesammelt in der „Kasse“.",
  },
  {
    emoji: SYMBOL.kasse,
    ton: "mustard",
    title: "Kasse",
    text: "Einnahmen, Ausgaben und Abendkosten landen in der Kasse – inklusive Kostenteilung, wer schon bezahlt hat.",
  },
  {
    emoji: SYMBOL.pin,
    ton: "green",
    title: "Euer Profil + PIN",
    text: "Jede Person hat ihr eigenes Mitglied-Profil. Optional könnt ihr es mit einer 4-stelligen PIN schützen, damit nur ihr es bearbeiten oder löschen könnt.",
  },
];

export default function OnboardingIntroScreen() {
  const styles = useThemedStyles(makeStyles);
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
    <EinstiegScreen contentStyle={{ paddingTop: 8 }}>
      <View style={styles.kopf}>
        <Text style={styles.zaehler}>{`${step + 1} von ${STEPS.length}`}</Text>
        <PressableScale onPress={finish} style={styles.skip} accessibilityLabel={isReplay ? "Schließen" : "Überspringen"}>
          <Text style={styles.skipText}>{isReplay ? "Schließen" : "Überspringen"}</Text>
        </PressableScale>
      </View>

      {/* key: bei jedem Schritt neu einblenden */}
      <EinstiegHero key={step} symbol={{ emoji: current.emoji, ton: current.ton }} titel={current.title} text={current.text} />

      <View style={{ flex: 1, minHeight: 24 }} />

      <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {STEPS.map((_, i) => (
          <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
        ))}
      </View>

      <View style={styles.footer}>
        {step > 0 ? (
          <Button label="Zurück" variant="secondary" onPress={() => setStep((s) => s - 1)} style={{ flex: 1 }} />
        ) : null}
        <Button
          label={isLast ? (isReplay ? "Schließen" : "Los geht's") : "Weiter"}
          variant="blue"
          onPress={() => (isLast ? finish() : setStep((s) => s + 1))}
          style={{ flex: 2 }}
        />
      </View>
    </EinstiegScreen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    kopf: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
    zaehler: { fontFamily: FONT.w600, fontSize: 13, color: c.textMuted, fontVariant: ["tabular-nums"] },
    skip: { minHeight: 44, justifyContent: "center", paddingHorizontal: 8, marginRight: -8 },
    skipText: { fontFamily: FONT.w600, fontSize: 15, color: c.blue },
    dots: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 8 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.borderDark },
    dotActive: { backgroundColor: c.blue, width: 20 },
    footer: { flexDirection: "row", gap: 10 },
  });
