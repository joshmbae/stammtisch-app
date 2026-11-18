import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { Button, Emoji, PressableScale, haptik } from "../components/ui";
import { EinstiegScreen } from "../components/einstieg/Einstieg";
import StammtischLogo from "../components/StammtischLogo";
import { FONT, MOTION, RADIUS, TYPE, ThemeColors } from "../constants/design";
import { useColors, useThemedStyles } from "../contexts/ThemeContext";
import { useStammtisch } from "../contexts/StammtischContext";
import { SPIEL_VORLAGEN } from "../types";
import { instantiateSpielVorlage, loadVerordnung, saveVerordnung } from "../utils/storage";
import { formatBetrag } from "../utils/format";
import { showAlert } from "../utils/alert";
import { SYMBOL } from "../constants/symbole";

type Vorlage = (typeof SPIEL_VORLAGEN)[number];

/**
 * Direkt nach dem Anlegen, nur für den, der gründet: oben der neue
 * Stammtisch als Karte (mit Haken), darunter zwei Fragen, die die ganze App
 * prägen – gibt es Strafen, und welches Spiel spielt ihr? Beides lässt sich
 * später in den Einstellungen ändern. Danach legt man sich selbst an (als
 * Admin); der Rest steht auf Home als Checkliste.
 */
export default function OnboardingSetupScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const { stammtischName } = useStammtisch();
  const name = stammtischName ?? "Euer Stammtisch";
  const ein = (i: number) => FadeInDown.duration(MOTION.base).delay(120 + i * MOTION.stagger * 2);
  const [strafen, setStrafen] = useState(true);
  /** null = kein Spiel. */
  const [spiel, setSpiel] = useState<Vorlage | null>(null);
  const [busy, setBusy] = useState(false);

  async function weiter() {
    if (busy) return;
    setBusy(true);
    try {
      const v = await loadVerordnung();
      let aktivesSpielId = v.aktivesSpielId;
      if (spiel) {
        // Ohne Strafen kein Betrag an den Ereignissen – sonst würde z. B. „Niederlage“ Geld kosten.
        const vorlage = strafen ? spiel : { ...spiel, ereignisTypen: spiel.ereignisTypen.map(({ strafBetrag: _, ...rest }) => rest) };
        aktivesSpielId = (await instantiateSpielVorlage(vorlage)).id;
      }
      await saveVerordnung({ ...v, tabStrafenAktiv: strafen, aktivesSpielId });
      router.replace("/mitglied-waehlen");
    } catch (e: any) {
      showAlert(
        "Nicht gespeichert",
        "Das hat gerade nicht geklappt. Du kannst es nochmal versuchen oder später in den Einstellungen festlegen.",
        [
          { text: "Nochmal", style: "cancel" },
          { text: "Später", onPress: () => router.replace("/mitglied-waehlen") },
        ],
      );
    } finally {
      setBusy(false);
    }
  }

  const strafeImSpiel = strafen && spiel ? spiel.ereignisTypen.find((e) => e.strafBetrag) : undefined;

  return (
    <EinstiegScreen contentStyle={{ gap: 0 }}>
      {/* Stammtisch-Karte: das Ergebnis des Anlegens, mit Haken. */}
      <Animated.View entering={ein(0)} style={[styles.karte, { backgroundColor: c.heroBlue }]}>
        <View style={[styles.ring, { borderColor: "rgba(255,255,255,0.07)" }]} pointerEvents="none" />
        <View style={styles.karteZeile}>
          <View>
            <StammtischLogo size={48} />
            <Animated.View entering={ZoomIn.delay(350).springify().damping(12)} style={[styles.haken, { backgroundColor: c.success, borderColor: c.heroBlue }]}>
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            </Animated.View>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.kicker, { color: c.heroBlueSub }]}>Stammtisch angelegt</Text>
            <Text style={[styles.name, { color: c.onHeroBlue }]} numberOfLines={2} accessibilityRole="header">{name}</Text>
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={ein(1)}>
        <Text style={styles.titel}>Wie läuft eure Runde?</Text>
        <Text style={styles.untertitel}>Beides lässt sich später in den Einstellungen ändern.</Text>
      </Animated.View>

      {/* Frage 1: Strafen ja oder nein. */}
      <Animated.View entering={ein(2)}>
        <Text style={styles.frage}>Gibt's bei euch Strafen?</Text>
        <View style={styles.zeile} accessibilityRole="radiogroup">
          <Wahl
            emoji={SYMBOL.strafe}
            titel="Mit Strafen"
            text="Wer zu spät kommt, zahlt"
            gewaehlt={strafen}
            onPress={() => setStrafen(true)}
          />
          <Wahl
            emoji={SYMBOL.ohneStrafen}
            titel="Ohne Strafen"
            text="Termine, Kasse, Spiel"
            gewaehlt={!strafen}
            onPress={() => setStrafen(false)}
          />
        </View>
      </Animated.View>

      {/* Frage 2: welches Spiel – Vorlagen oder keins. */}
      <Animated.View entering={ein(3)}>
        <Text style={styles.frage}>Spielt ihr was?</Text>
        <View style={styles.raster} accessibilityRole="radiogroup">
          {SPIEL_VORLAGEN.map((v) => (
            <Wahl key={v.name} emoji={v.emoji} titel={v.name} gewaehlt={spiel?.name === v.name} onPress={() => setSpiel(v)} klein />
          ))}
          <Wahl emoji={SYMBOL.keinSpiel} titel="Kein Spiel" gewaehlt={!spiel} onPress={() => setSpiel(null)} klein />
        </View>
        <Text style={styles.hinweis}>
          {strafeImSpiel
            ? `${strafeImSpiel.label} kostet ${formatBetrag(strafeImSpiel.strafBetrag!)} und landet in der Kasse. Anderes Spiel? Legst du später in den Einstellungen an.`
            : spiel
              ? `Am Abend zählt ihr ${spiel.ereignisTypen.map((e) => e.label).join(" und ")} pro Person. Anderes Spiel? Legst du später in den Einstellungen an.`
              : "Anderes Spiel? Legst du später in den Einstellungen an."}
        </Text>
      </Animated.View>

      <View style={{ flex: 1, minHeight: 20 }} />
      <Animated.View entering={ein(4)} style={{ gap: 8 }}>
        <Button label="Weiter – mich anlegen" icon="arrow-forward" variant="blue" loading={busy} onPress={weiter} />
        <Text style={styles.fuss}>Als erstes Mitglied wirst du Admin. Der Rest steht auf Home als Checkliste.</Text>
      </Animated.View>
    </EinstiegScreen>
  );
}

/** Auswahl-Kachel: Emoji, Titel, optional ein Satz; gewählt mit blauem Rand. */
function Wahl({ emoji, titel, text, gewaehlt, onPress, klein }: {
  emoji: string;
  titel: string;
  text?: string;
  gewaehlt: boolean;
  onPress: () => void;
  klein?: boolean;
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <PressableScale
      onPress={() => { haptik("leicht"); onPress(); }}
      scaleTo={0.97}
      style={[
        styles.wahl,
        klein ? styles.wahlKlein : { flex: 1 },
        { backgroundColor: c.card, borderColor: gewaehlt ? c.blue : c.hairline },
        gewaehlt && { backgroundColor: c.blueBg },
      ]}
      accessibilityRole="radio"
      accessibilityState={{ checked: gewaehlt }}
      accessibilityLabel={text ? `${titel}. ${text}` : titel}
    >
      <View style={styles.wahlKopf}>
        <Emoji size={klein ? 22 : 26}>{emoji}</Emoji>
        <View style={[styles.punkt, { borderColor: gewaehlt ? c.blue : c.control }, gewaehlt && { backgroundColor: c.blue }]}>
          {gewaehlt ? <Ionicons name="checkmark" size={12} color={c.onAccent} /> : null}
        </View>
      </View>
      <Text style={[styles.wahlTitel, gewaehlt && { color: c.blue }]} numberOfLines={1}>{titel}</Text>
      {text ? <Text style={styles.wahlText} numberOfLines={2}>{text}</Text> : null}
    </PressableScale>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    karte: { borderRadius: RADIUS.hero, padding: 18, overflow: "hidden", marginTop: 8 },
    ring: { position: "absolute", width: 220, height: 220, borderRadius: 110, borderWidth: 34, right: -80, top: -90 },
    karteZeile: { flexDirection: "row", alignItems: "center", gap: 16 },
    haken: {
      position: "absolute", right: -8, bottom: -6, width: 26, height: 26, borderRadius: 13, borderWidth: 3,
      alignItems: "center", justifyContent: "center",
    },
    kicker: { ...TYPE.label },
    name: { fontFamily: FONT.w800, fontSize: 26, lineHeight: 30, letterSpacing: -0.6, marginTop: 2 },

    titel: { ...TYPE.title, color: c.textDark, marginTop: 26 },
    untertitel: { ...TYPE.caption, fontSize: 14, color: c.textMuted, marginTop: 4 },
    frage: { ...TYPE.label, color: c.textMuted, marginTop: 22, marginBottom: 10 },
    zeile: { flexDirection: "row", gap: 10 },
    raster: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    wahl: { borderRadius: RADIUS.tile, borderWidth: 1.5, padding: 14, gap: 4, minHeight: 64 },
    wahlKlein: { width: "47.5%", flexGrow: 1 },
    wahlKopf: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
    punkt: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
    wahlTitel: { fontFamily: FONT.w700, fontSize: 16, color: c.textDark },
    wahlText: { ...TYPE.caption, fontSize: 13, lineHeight: 17, color: c.textMuted },
    hinweis: { ...TYPE.caption, fontSize: 13, lineHeight: 18, color: c.textMuted, marginTop: 10 },
    fuss: { ...TYPE.caption, fontSize: 13, color: c.textMuted, textAlign: "center" },
  });
