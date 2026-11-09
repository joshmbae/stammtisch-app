import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { Button, Emoji } from "../components/ui";
import { EinstiegScreen } from "../components/einstieg/Einstieg";
import StammtischLogo from "../components/StammtischLogo";
import { FONT, MOTION, RADIUS, TYPE, ThemeColors } from "../constants/design";
import { useColors, useThemedStyles } from "../contexts/ThemeContext";
import { useStammtisch } from "../contexts/StammtischContext";
import { rundeEinladen } from "../utils/einladen";
import { SYMBOL } from "../constants/symbole";

const SCHRITTE: { emoji: string; titel: string; text: string }[] = [
  { emoji: SYMBOL.zusage, titel: "Dich selbst anlegen", text: "Als erstes Mitglied, am besten als Admin" },
  { emoji: SYMBOL.rollen, titel: "Runde einladen", text: "Name und Passwort weitergeben" },
  { emoji: SYMBOL.treffpunkt, titel: "Grunddaten eintragen", text: "Treffpunkt, Stammtischtag, eure Regeln" },
];

/**
 * Direkt nach dem Anlegen: oben der neue Stammtisch als Karte (mit Haken),
 * darunter die nächsten Schritte als nummerierter Weg – der erste ist „Jetzt“.
 * Einladen geht hier schon; die Schritte stehen auf Home als Checkliste.
 */
export default function OnboardingSetupScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const { stammtischName } = useStammtisch();
  const name = stammtischName ?? "Euer Stammtisch";
  const ein = (i: number) => FadeInDown.duration(MOTION.base).delay(120 + i * MOTION.stagger * 2);

  return (
    <EinstiegScreen contentStyle={{ gap: 0 }}>
      {/* Stammtisch-Karte: das Ergebnis des Anlegens, groß und mit Haken. */}
      <Animated.View entering={ein(0)} style={[styles.karte, { backgroundColor: c.heroBlue }]}>
        <View style={[styles.ring, { borderColor: "rgba(255,255,255,0.07)" }]} pointerEvents="none" />
        <View style={styles.karteKopf}>
          <StammtischLogo size={56} />
          <Animated.View entering={ZoomIn.delay(350).springify().damping(12)} style={[styles.haken, { backgroundColor: c.success, borderColor: c.heroBlue }]}>
            <Ionicons name="checkmark" size={20} color="#FFFFFF" />
          </Animated.View>
        </View>
        <Text style={[styles.kicker, { color: c.heroBlueSub }]}>Stammtisch angelegt</Text>
        <Text style={[styles.name, { color: c.onHeroBlue }]} numberOfLines={2} accessibilityRole="header">{name}</Text>
        <Text style={[styles.karteText, { color: "rgba(255,255,255,0.8)" }]}>
          Mit diesem Namen und eurem Passwort treten die anderen bei.
        </Text>
      </Animated.View>

      <Animated.View entering={ein(1)}>
        <Text style={styles.abschnitt}>So geht's weiter</Text>
      </Animated.View>

      {/* Nummerierter Weg: Kreise verbunden durch eine Linie, Schritt 1 hervorgehoben. */}
      <Animated.View entering={ein(2)} style={[styles.weg, { backgroundColor: c.card }]}>
        {SCHRITTE.map((s, i) => {
          const jetzt = i === 0;
          const letzter = i === SCHRITTE.length - 1;
          return (
            <View key={s.titel} style={styles.schritt}>
              <View style={styles.spalte}>
                <View style={[styles.nummer, jetzt ? { backgroundColor: c.heroBlue } : { backgroundColor: c.cardAlt }]}>
                  <Text style={[styles.nummerText, { color: jetzt ? "#FFFFFF" : c.textMid }]}>{i + 1}</Text>
                </View>
                {!letzter ? <View style={[styles.linie, { backgroundColor: c.border }]} /> : null}
              </View>
              <View style={[styles.schrittText, !letzter && { paddingBottom: 18 }]}>
                <View style={styles.titelZeile}>
                  <Text style={[styles.schrittTitel, !jetzt && { color: c.textMid }]}>{s.titel}</Text>
                  {jetzt ? (
                    <View style={[styles.jetzt, { backgroundColor: c.blueBg }]}>
                      <Text style={[styles.jetztText, { color: c.blue }]}>Jetzt</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.schrittSub}>{s.text}</Text>
              </View>
              <Emoji size={20}>{s.emoji}</Emoji>
            </View>
          );
        })}
      </Animated.View>

      <Animated.View entering={ein(3)}>
        <Text style={styles.fuss}>Die Schritte findest du auf Home als Checkliste wieder.</Text>
      </Animated.View>

      <View style={{ flex: 1, minHeight: 20 }} />
      <Animated.View entering={ein(4)} style={{ gap: 6 }}>
        <Button label="Weiter – mich anlegen" icon="arrow-forward" variant="blue" onPress={() => router.replace("/mitglied-waehlen")} />
        <Button label="Runde schon jetzt einladen" icon="share-outline" variant="ghost" onPress={() => rundeEinladen(name)} />
      </Animated.View>
    </EinstiegScreen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    karte: { borderRadius: RADIUS.hero, padding: 22, overflow: "hidden", marginTop: 8 },
    ring: { position: "absolute", width: 260, height: 260, borderRadius: 130, borderWidth: 40, right: -90, top: -100 },
    karteKopf: { flexDirection: "row", alignSelf: "flex-start", marginBottom: 18 },
    haken: {
      position: "absolute", right: -10, bottom: -8, width: 30, height: 30, borderRadius: 15, borderWidth: 3,
      alignItems: "center", justifyContent: "center",
    },
    kicker: { ...TYPE.label },
    name: { fontFamily: FONT.w800, fontSize: 32, lineHeight: 36, letterSpacing: -0.8, marginTop: 4 },
    karteText: { fontFamily: FONT.w500, fontSize: 14, lineHeight: 20, marginTop: 8 },

    abschnitt: { ...TYPE.label, color: c.textMuted, marginTop: 28, marginBottom: 10 },
    weg: { borderRadius: RADIUS.card, paddingVertical: 18, paddingHorizontal: 16 },
    schritt: { flexDirection: "row", gap: 14 },
    spalte: { alignItems: "center", width: 30 },
    nummer: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
    nummerText: { fontFamily: FONT.w800, fontSize: 14 },
    linie: { width: 2, flex: 1, marginVertical: 4, borderRadius: 1 },
    schrittText: { flex: 1, minWidth: 0, paddingTop: 4 },
    titelZeile: { flexDirection: "row", alignItems: "center", gap: 8 },
    schrittTitel: { fontFamily: FONT.w700, fontSize: 16, color: c.textDark },
    schrittSub: { ...TYPE.caption, fontSize: 13, lineHeight: 18, color: c.textMuted, marginTop: 2 },
    jetzt: { height: 22, paddingHorizontal: 8, borderRadius: RADIUS.pill, justifyContent: "center" },
    jetztText: { fontFamily: FONT.w700, fontSize: 12 },
    fuss: { ...TYPE.caption, fontSize: 13, color: c.textMuted, textAlign: "center", marginTop: 14 },
  });
