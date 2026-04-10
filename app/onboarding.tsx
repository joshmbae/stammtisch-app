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

const { width } = Dimensions.get("window");

const slides = [
  {
    key: "1",
    icon: null,
    title: "Hallo, ich bin Mia",
    text: "Deine persönliche Begleiterin für die erste Zeit mit deinem Baby.",
  },
  {
    key: "2",
    icon: "💡",
    title: "Was ich kann",
    text: "Ich helfe bei Schlafen, Stillen, Wochenbett und allen Alltagsfragen — rund um die Uhr, sofort.",
  },
  {
    key: "3",
    icon: "🛡️",
    title: "Wichtig zu wissen",
    text: "Ich bin keine Ärztin und kein Ersatz für deine Hebamme oder deinen Kinderarzt. Bei Notfällen immer 112 anrufen.",
    hasCheckbox: true,
  },
];

export default function OnboardingScreen() {
  const [current, setCurrent] = useState(0);
  const [checked, setChecked] = useState(false);

  const slide = slides[current];
  const isLast = current === slides.length - 1;

  async function finish() {
    await AsyncStorage.setItem("mia_onboarded", "true");
    router.replace("/(tabs)/home");
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.container}>
        {/* Progress dots */}
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === current && styles.dotActive]}
            />
          ))}
        </View>

        {/* Slide content */}
        <View style={styles.content}>
          {current === 0 ? (
            <View style={styles.miaAvatar}>
              <Text style={styles.miaAvatarText}>M</Text>
            </View>
          ) : (
            <Text style={styles.icon}>{slide.icon}</Text>
          )}

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
              <Text style={styles.checkboxLabel}>Ich habe das verstanden</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Navigation button */}
        {isLast ? (
          <TouchableOpacity
            style={[styles.btn, !checked && styles.btnDisabled]}
            onPress={finish}
            disabled={!checked}
          >
            <Text style={styles.btnText}>Loslegen</Text>
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
  safe: { flex: 1, backgroundColor: "#FDFAF6" },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    paddingBottom: 24,
    justifyContent: "space-between",
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    paddingTop: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D9D4CE",
  },
  dotActive: {
    backgroundColor: "#4A7C6F",
    width: 24,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
  miaAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#4A7C6F",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  miaAvatarText: {
    fontSize: 48,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  icon: {
    fontSize: 72,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#2D2A26",
    textAlign: "center",
  },
  text: {
    fontSize: 17,
    color: "#7A7269",
    textAlign: "center",
    lineHeight: 26,
    maxWidth: width - 80,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 12,
    padding: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#4A7C6F",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#4A7C6F",
  },
  checkmark: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  checkboxLabel: { fontSize: 15, color: "#2D2A26" },
  btn: {
    backgroundColor: "#4A7C6F",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },
});
