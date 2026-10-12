import React, { useState } from "react";
import { StyleSheet, Text, View, Platform, KeyboardAvoidingView } from "react-native";
import { router } from "expo-router";
import { createStammtisch, findStammtischByName } from "../utils/storage";
import { hashStammtischPassword } from "../utils/pin";
import { useStammtisch } from "../contexts/StammtischContext";
import { TYPE, ThemeColors } from "../constants/design";
import { useThemedStyles } from "../contexts/ThemeContext";
import { Button, Card, Field, SegmentedTabs } from "../components/ui";
import { EinstiegHero, EinstiegScreen, Vorteil } from "../components/einstieg/Einstieg";
import { SYMBOL } from "../constants/symbole";

type Mode = "join" | "create";

const MODI: { key: Mode; label: string }[] = [
  { key: "join", label: "Beitreten" },
  { key: "create", label: "Anlegen" },
];

const VORTEILE: Vorteil[] = [
  { emoji: SYMBOL.termin, ton: "blue", titel: "Termine & Zusagen", text: "Wer kommt zum nächsten Abend?" },
  { emoji: SYMBOL.kasse, ton: "mustard", titel: "Kasse & Strafen", text: "Jeder Euro nachvollziehbar" },
  { emoji: SYMBOL.tabelle, ton: "green", titel: "Tabelle & Rückblick", text: "Wer führt und was war los" },
];

export default function StammtischWaehlenScreen() {
  const styles = useThemedStyles(makeStyles);
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
      router.replace("/onboarding-setup");
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
      const passwordHash = await hashStammtischPassword(name, password);
      const found = await findStammtischByName(name, passwordHash);
      if (!found) {
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

  const anlegen = mode === "create";
  const absenden = anlegen ? handleCreate : handleJoin;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={0}>
      <EinstiegScreen>
        <EinstiegHero titel={"Euer Stammtisch.\nAlles an einem Ort."} text="Termine, Kasse und Tabelle – für alle am Tisch." vorteile={VORTEILE} />

        <View style={styles.modi}>
          <SegmentedTabs variant="blue" items={MODI} value={mode} onChange={switchMode} />
        </View>

        <Card style={styles.form}>
          <Field
            label="Name des Stammtischs"
            value={name}
            onChangeText={setName}
            placeholder="z. B. Die Hellen"
            autoCapitalize="words"
            autoCorrect={false}
            style={styles.feld}
          />
          {anlegen ? (
            <View style={styles.zeile}>
              <Field
                label="Passwort"
                value={password}
                onChangeText={setPassword}
                placeholder="Passwort"
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                style={styles.feld}
                containerStyle={styles.spalte}
              />
              <Field
                label="Wiederholen"
                value={passwordRepeat}
                onChangeText={setPasswordRepeat}
                placeholder="Passwort"
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                style={styles.feld}
                containerStyle={styles.spalte}
                onSubmitEditing={absenden}
              />
            </View>
          ) : (
            <Field
              label="Passwort"
              value={password}
              onChangeText={setPassword}
              placeholder="Bekommst du von deiner Runde"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="current-password"
              style={styles.feld}
              onSubmitEditing={absenden}
            />
          )}

          {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}

          <Button
            label={anlegen ? "Stammtisch anlegen" : "Beitreten"}
            icon={anlegen ? "add" : "log-in-outline"}
            variant="blue"
            onPress={absenden}
            loading={loading}
            style={{ marginTop: 2 }}
          />
        </Card>
      </EinstiegScreen>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    modi: { marginTop: 16 },
    form: { gap: 12 },
    feld: { backgroundColor: c.cardAlt, borderColor: "transparent" },
    zeile: { flexDirection: "row", gap: 10 },
    spalte: { flex: 1, minWidth: 0 },
    error: { ...TYPE.caption, fontSize: 14, lineHeight: 19, color: c.dangerText },
  });
