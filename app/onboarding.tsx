import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { COLORS } from "../constants/design";

const { width } = Dimensions.get("window");

const slides = [
  {
    key: "1",
    emoji: "🍺",
    title: 'Servus bei \u201eDie Hellen\u201c!',
    text: "Die digitale Heimat eures Stammtischs. Mitglieder, Bier, Verspätungen — alles an einem Ort.",
  },
  {
    key: "2",
    emoji: "🧔",
    title: "Der Sepp kennt alles",
    text: "Unser KI-Stammtischkenner Sepp beantwortet Fragen zu Regeln, Traditionen und Bier — mit bayerischem Charme.",
  },
  {
    key: "3",
    emoji: "📜",
    title: "Eure Verordnung",
    text: "Tragt eure Stammtischverordnung ein — Regeln, Strafen, Treffpunkt. Sepp kennt sie dann auswendig.",
    hasCheckbox: true,
  },
];

export default function OnboardingScreen() {
  const [current, setCurrent] = useState(0);
  const [checked, setChecked] = useState(false);

  const slide = slides[current];
  const isLast = current === slides.length - 1;

  async function finish() {
    await AsyncStorage.setItem("st_onboarded", "true");
    router.replace("/mitglied-waehlen");
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.container}>

        {/* Progress dots */}
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View key={i} style={[styles.dot, i === current && styles.dotActive]} />
          ))}
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.emojiCircle}>
            <Text style={styles.emojiLarge}>{slide.emoji}</Text>
          </View>
          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.text}>{slide.text}</Text>

          {slide.hasCheckbox && (
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setChecked((v) => !v)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                {checked && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>Verstanden, auf geht's!</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Navigation */}
        {isLast ? (
          <TouchableOpacity
            style={[styles.btn, !checked && styles.btnDisabled]}
            onPress={finish}
            disabled={!checked}
          >
            <Text style={styles.btnText}>Prost — los geht's! 🍺</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.btn} onPress={() => setCurrent((c) => c + 1)}>
            <Text style={styles.btnText}>Weiter</Text>
          </TouchableOpacity>
        )}

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, paddingHorizontal: 28, paddingBottom: 24, justifyContent: "space-between" },

  dots: { flexDirection: "row", justifyContent: "center", gap: 8, paddingTop: 24 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.border },
  dotActive: { backgroundColor: COLORS.blue, width: 24 },

  content: { flex: 1, alignItems: "center", justifyContent: "center", gap: 20 },

  emojiCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: COLORS.blue,
    alignItems: "center", justifyContent: "center", marginBottom: 8,
    shadowColor: COLORS.blue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  emojiLarge: { fontSize: 48 },

  title: { fontSize: 28, fontWeight: "800", color: COLORS.textDark, textAlign: "center" },
  text: { fontSize: 17, color: COLORS.textMuted, textAlign: "center", lineHeight: 26, maxWidth: width - 80 },

  checkboxRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12, padding: 4 },
  checkbox: {
    width: 24, height: 24, borderRadius: 6,
    borderWidth: 2, borderColor: COLORS.blue,
    alignItems: "center", justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: COLORS.blue },
  checkmark: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  checkboxLabel: { fontSize: 15, color: COLORS.textDark },

  btn: {
    backgroundColor: COLORS.blue, borderRadius: 16, paddingVertical: 18, alignItems: "center",
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },
});
