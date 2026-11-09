import React, { useState } from "react";
import { StyleSheet, Text, View, Platform, KeyboardAvoidingView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { createStammtisch, findStammtischByName } from "../utils/storage";
import { hashStammtischPassword } from "../utils/pin";
import { useStammtisch } from "../contexts/StammtischContext";
import { FONT, MOTION, RADIUS, TYPE, ThemeColors } from "../constants/design";
import { useColors, useThemedStyles } from "../contexts/ThemeContext";
import { Button, Card, Emoji, Field, PressableScale, SegmentedTabs, tonFarben, tonFuer } from "../components/ui";
import Animated, { FadeInDown } from "react-native-reanimated";
import { EinstiegScreen } from "../components/einstieg/Einstieg";
import StammtischLogo from "../components/StammtischLogo";
import { SYMBOL } from "../constants/symbole";

type Mode = "join" | "create";

const MODI: { key: Mode; label: string }[] = [
  { key: "join", label: "Beitreten" },
  { key: "create", label: "Anlegen" },
];

const VORTEILE: { emoji: string; titel: string; kurz: string }[] = [
  { emoji: SYMBOL.termin, titel: "Termine & Zusagen", kurz: "Termine" },
  { emoji: SYMBOL.kasse, titel: "Kasse & Strafen", kurz: "Kasse & Strafen" },
  { emoji: SYMBOL.pokal, titel: "Tabelle & Rückblick", kurz: "Tabelle" },
];

export default function StammtischWaehlenScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const [mode, setMode] = useState<Mode>("join");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { setActiveStammtisch, meineStammtische, stammtischBetreten, stammtischVergessen } = useStammtisch();
  const [bearbeiten, setBearbeiten] = useState(false);
  const zurueck = meineStammtische.length > 0;
  const ein = (i: number) => FadeInDown.duration(MOTION.base).delay(i * MOTION.stagger * 2);

  async function betreten(s: (typeof meineStammtische)[number]) {
    const mitProfil = await stammtischBetreten(s);
    router.replace(mitProfil ? "/(tabs)/home" : "/mitglied-waehlen");
  }

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
      <EinstiegScreen contentStyle={{ gap: 0 }}>
        {/* Kopf: blaue Karte wie auf Home und nach dem Anlegen. */}
        <Animated.View entering={ein(0)} style={[styles.hero, { backgroundColor: c.heroBlue }]}>
          <View style={[styles.ring, { borderColor: "rgba(255,255,255,0.07)" }]} pointerEvents="none" />
          {zurueck ? (
            // Wiederkehrend: kompakt, damit Liste und Formular schnell erreichbar sind.
            <View style={styles.kompakt}>
              <StammtischLogo size={52} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.kicker, { color: c.heroBlueSub, marginTop: 0 }]}>DeinStammtisch</Text>
                <Text style={[styles.heroTitel, { color: c.onHeroBlue, fontSize: 26, lineHeight: 30 }]} accessibilityRole="header">Willkommen zurück.</Text>
              </View>
            </View>
          ) : (
            <>
              <StammtischLogo size={56} />
              <Text style={[styles.kicker, { color: c.heroBlueSub }]}>DeinStammtisch</Text>
              <Text style={[styles.heroTitel, { color: c.onHeroBlue }]} accessibilityRole="header">{"Euer Stammtisch.\nAlles an einem Ort."}</Text>
              <Text style={[styles.heroText, { color: "rgba(255,255,255,0.8)" }]}>Termine, Kasse und Tabelle – für alle am Tisch.</Text>
            </>
          )}
          {!zurueck ? (
            <View style={styles.chips}>
              {VORTEILE.map((v) => (
                <View key={v.titel} style={styles.chip}>
                  <Emoji size={14}>{v.emoji}</Emoji>
                  <Text style={styles.chipText} numberOfLines={1}>{v.kurz}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </Animated.View>

        {zurueck ? (
          <Animated.View entering={ein(1)}>
            <View style={styles.abschnittZeile}>
              <Text style={styles.abschnitt}>Deine Stammtische</Text>
              <PressableScale onPress={() => setBearbeiten((v) => !v)} hitSlop={8} accessibilityRole="button" accessibilityLabel={bearbeiten ? "Fertig" : "Liste bearbeiten"}>
                <Text style={[styles.abschnittLink, { color: c.blue }]}>{bearbeiten ? "Fertig" : "Bearbeiten"}</Text>
              </PressableScale>
            </View>
            <Card style={styles.meine}>
              {meineStammtische.map((s, i) => {
                const ton = tonFarben(tonFuer(s.id), c);
                return (
                  <View key={s.id} style={[styles.meinZeile, i > 0 && styles.trenner]}>
                    <PressableScale onPress={() => (bearbeiten ? undefined : betreten(s))} disabled={bearbeiten} scaleTo={0.98} style={styles.meinInfo} accessibilityLabel={`${s.name} öffnen`}>
                      <View style={[styles.initiale, { backgroundColor: ton.bg }]}>
                        <Text style={[styles.initialeText, { color: ton.fg }]}>{s.name.trim().charAt(0).toUpperCase()}</Text>
                      </View>
                      <Text style={styles.meinName} numberOfLines={1}>{s.name}</Text>
                      {!bearbeiten ? <Ionicons name="chevron-forward" size={18} color={c.textMuted} /> : null}
                    </PressableScale>
                    {bearbeiten ? (
                      <PressableScale onPress={() => stammtischVergessen(s.id)} hitSlop={8} style={[styles.vergessen, { backgroundColor: c.coralSoft }]} accessibilityLabel={`${s.name} aus der Liste entfernen`}>
                        <Ionicons name="remove" size={18} color={c.coralText} />
                      </PressableScale>
                    ) : null}
                  </View>
                );
              })}
            </Card>
            {bearbeiten ? <Text style={styles.klein}>Entfernen nimmt den Stammtisch nur von diesem Gerät. Mit Name und Passwort kommst du jederzeit wieder rein.</Text> : null}
          </Animated.View>
        ) : null}

        {/* Beitreten / Anlegen als eine Karte: Umschalter oben, Formular darunter. */}
        <Animated.View entering={ein(2)}>
          <Text style={styles.abschnitt}>{zurueck ? "Weiterer Stammtisch" : "Los geht's"}</Text>
          <Card style={styles.form}>
            <SegmentedTabs variant="light" items={MODI} value={mode} onChange={switchMode} />
            <Text style={styles.formText}>
              {anlegen ? "Du gründest die Runde und lädst danach ein." : "Name und Passwort bekommst du von deiner Runde."}
            </Text>
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
                  autoComplete="off"
                  textContentType="none"
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
                  autoComplete="off"
                  textContentType="none"
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
                placeholder="Passwort der Runde"
                secureTextEntry
                autoCapitalize="none"
                autoComplete="current-password"
                style={styles.feld}
                onSubmitEditing={absenden}
              />
            )}

            {anlegen ? (
              <View style={[styles.hinweis, { backgroundColor: c.mustardSoft }]}>
                <Emoji size={14}>{SYMBOL.pin}</Emoji>
                <Text style={[styles.hinweisText, { color: c.textMid }]}>
                  Das Passwort gibst du an deine Runde weiter – also kein persönliches nehmen.
                </Text>
              </View>
            ) : null}
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
        </Animated.View>
      </EinstiegScreen>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    hero: { borderRadius: RADIUS.hero, padding: 22, overflow: "hidden", marginTop: 8 },
    ring: { position: "absolute", width: 260, height: 260, borderRadius: 130, borderWidth: 40, right: -90, top: -100 },
    kicker: { ...TYPE.label, marginTop: 18 },
    kompakt: { flexDirection: "row", alignItems: "center", gap: 14 },
    heroTitel: { fontFamily: FONT.w800, fontSize: 30, lineHeight: 34, letterSpacing: -0.7, marginTop: 4 },
    heroText: { fontFamily: FONT.w500, fontSize: 15, lineHeight: 21, marginTop: 8 },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 },
    chip: { flexDirection: "row", alignItems: "center", gap: 6, height: 32, paddingHorizontal: 12, borderRadius: RADIUS.pill, backgroundColor: "rgba(255,255,255,0.14)" },
    chipText: { fontFamily: FONT.w700, fontSize: 13, color: "#FFFFFF" },

    abschnittZeile: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    abschnitt: { ...TYPE.label, color: c.textMuted, marginTop: 26, marginBottom: 10 },
    abschnittLink: { fontFamily: FONT.w600, fontSize: 14, marginTop: 16 },
    klein: { ...TYPE.caption, fontSize: 13, lineHeight: 18, color: c.textMuted, marginTop: 8, paddingHorizontal: 4 },

    meine: { paddingVertical: 4 },
    meinZeile: { flexDirection: "row", alignItems: "center", gap: 10 },
    meinInfo: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12, minHeight: 60 },
    initiale: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
    initialeText: { fontFamily: FONT.w800, fontSize: 17 },
    meinName: { flex: 1, fontFamily: FONT.w700, fontSize: 16, color: c.textDark },
    vergessen: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
    trenner: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },

    form: { gap: 12 },
    formText: { ...TYPE.caption, fontSize: 13, lineHeight: 18, color: c.textMuted, marginTop: -2 },
    feld: { backgroundColor: c.cardAlt, borderColor: "transparent" },
    zeile: { flexDirection: "row", gap: 10 },
    spalte: { flex: 1, minWidth: 0 },
    hinweis: { flexDirection: "row", gap: 8, alignItems: "center", borderRadius: RADIUS.md, paddingVertical: 10, paddingHorizontal: 12 },
    hinweisText: { ...TYPE.caption, fontSize: 13, lineHeight: 18, flex: 1 },
    error: { ...TYPE.caption, fontSize: 14, lineHeight: 19, color: c.dangerText },
  });
