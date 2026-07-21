import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { createStammtisch, findStammtischByName } from "../utils/storage";
import { hashStammtischPassword, verifyStammtischPassword } from "../utils/pin";
import { useStammtisch } from "../contexts/StammtischContext";
import { COLORS, SHADOWS } from "../constants/design";
import StammtischLogo from "../components/StammtischLogo";

type Mode = "join" | "create";

export default function StammtischWaehlenScreen() {
  const [mode, setMode] = useState<Mode>("join");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { setActiveStammtisch } = useStammtisch();

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setPassword("");
    setPasswordRepeat("");
  }

  async function handleCreate() {
    setError(null);
    if (!name.trim()) {
      setError("Bitte einen Namen für den Stammtisch eingeben.");
      return;
    }
    if (!password) {
      setError("Bitte ein Passwort vergeben.");
      return;
    }
    if (password !== passwordRepeat) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }
    setLoading(true);
    try {
      const passwordHash = await hashStammtischPassword(name, password);
      const { id } = await createStammtisch(name, passwordHash);
      await setActiveStammtisch(id, name.trim());
      router.replace("/mitglied-waehlen");
    } catch (e: any) {
      setError(e?.message ?? "Stammtisch konnte nicht angelegt werden.");
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    setError(null);
    if (!name.trim() || !password) {
      setError("Bitte Name und Passwort eingeben.");
      return;
    }
    setLoading(true);
    try {
      const found = await findStammtischByName(name);
      if (!found || !found.passwordHash) {
        setError("Stammtisch oder Passwort falsch.");
        return;
      }
      const valid = await verifyStammtischPassword(found.name, password, found.passwordHash);
      if (!valid) {
        setError("Stammtisch oder Passwort falsch.");
        return;
      }
      await setActiveStammtisch(found.id, found.name);
      router.replace("/mitglied-waehlen");
    } catch (e: any) {
      setError(e?.message ?? "Beitreten fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={0}>
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          <View style={styles.header}>
            <StammtischLogo size={52} />
            <Text style={styles.title}>Willkommen!</Text>
            <Text style={styles.subtitle}>Tritt deinem Stammtisch bei oder leg einen neuen an</Text>
          </View>

          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, mode === "join" && styles.toggleBtnActive]}
              onPress={() => switchMode("join")}
              activeOpacity={0.8}
            >
              <Text style={[styles.toggleText, mode === "join" && styles.toggleTextActive]}>Stammtisch beitreten</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, mode === "create" && styles.toggleBtnActive]}
              onPress={() => switchMode("create")}
              activeOpacity={0.8}
            >
              <Text style={[styles.toggleText, mode === "create" && styles.toggleTextActive]}>Stammtisch anlegen</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Name des Stammtischs</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="z.B. Die Hellen"
              placeholderTextColor={COLORS.textLight}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Passwort</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Passwort"
              placeholderTextColor={COLORS.textLight}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          {mode === "create" && (
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>Passwort wiederholen</Text>
              <TextInput
                style={styles.input}
                value={passwordRepeat}
                onChangeText={setPasswordRepeat}
                placeholder="Passwort wiederholen"
                placeholderTextColor={COLORS.textLight}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>
          )}

          {error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={mode === "create" ? handleCreate : handleJoin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitBtnText}>
                {mode === "create" ? "Stammtisch anlegen" : "Beitreten"}
              </Text>
            )}
          </TouchableOpacity>

        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 24, paddingBottom: 40, alignItems: "center" },

  header: { alignItems: "center", marginBottom: 28, marginTop: 8, gap: 10 },
  title: { fontSize: 28, fontWeight: "800", color: COLORS.textDark, marginTop: 8 },
  subtitle: { fontSize: 15, color: COLORS.textMuted, textAlign: "center" },

  toggleRow: {
    flexDirection: "row",
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    width: "100%",
  },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  toggleBtnActive: { backgroundColor: COLORS.blue },
  toggleText: { fontSize: 13, fontWeight: "700", color: COLORS.textMuted },
  toggleTextActive: { color: "#FFFFFF" },

  card: {
    width: "100%",
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  fieldLabel: { fontSize: 12, fontWeight: "700", color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  input: {
    backgroundColor: COLORS.background, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: COLORS.textDark,
  },

  error: { color: COLORS.danger, fontSize: 13, textAlign: "center", marginTop: 4, marginBottom: 8 },

  submitBtn: {
    width: "100%",
    backgroundColor: COLORS.blue,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});
