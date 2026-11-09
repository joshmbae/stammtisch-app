import React, { useEffect } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { FONT, MOTION, TYPE, ThemeColors } from "../constants/design";
import { SYMBOL } from "../constants/symbole";
import { useColors, useThemedStyles } from "../contexts/ThemeContext";
import { markiereNeuigkeitenGesehen } from "../utils/neuigkeiten";
import StammtischLogo from "../components/StammtischLogo";
import { Button, Card, IconSquircle, Ton } from "../components/ui";

const NEU: { emoji: string; ton: Ton; titel: string; text: string }[] = [
  { emoji: SYMBOL.live, ton: "green", titel: "Live-Abend aufgeräumt", text: "Oben siehst du, ob Vorher, Live oder Danach. Darunter Heute, Strafen und euer Spiel – mit dem Foto vom Abend." },
  { emoji: SYMBOL.strafe, ton: "coral", titel: "Strafen mit zwei Tipps", text: "Der ganze Katalog als Kacheln: Strafe antippen, Person antippen, fertig. Vertippt? Einfach rückgängig." },
  { emoji: SYMBOL.zuSpaet, ton: "coral", titel: "Verspätung eintragen", text: "Unter Heute siehst du, wer da ist. Wer zu spät kam: antippen, Minuten eintragen." },
  { emoji: SYMBOL.protokoll, ton: "blue", titel: "Agenda am Abend", text: "Die Agenda gibt's jetzt auch live – mit Namen, wer den Punkt eingetragen hat." },
  { emoji: SYMBOL.einnahme, ton: "green", titel: "Direkt bezahlen", text: "Offene Strafen mit einem Tipp per PayPal zahlen, der Betrag ist schon eingetragen." },
  { emoji: SYMBOL.pokal, ton: "mustard", titel: "Rückblick und Profil", text: "Der Rückblick zeigt alle Sieger und die Anwesenheit. Im Profil: Bilanz fürs Jahr oder Allzeit." },
  { emoji: SYMBOL.bearbeiten, ton: "blue", titel: "Dein Profilbild oben", text: "Ein Tipp darauf: dein Profil, was du noch offen hast, Hell/Dunkel und die Einstellungen." },
];

/**
 * „Was ist neu“ für alle, die die App schon kennen: einmal nach dem Update,
 * eine Seite mit den wichtigsten Änderungen. Gilt beim Öffnen als gesehen,
 * damit es auch nach Wegwischen nicht wiederkommt.
 */
export default function NeuigkeitenScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);

  useEffect(() => {
    markiereNeuigkeitenGesehen();
  }, []);

  const schliessen = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/home"));
  const ein = (i: number) => FadeInDown.duration(MOTION.base).delay(120 + i * MOTION.stagger * 2);

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.inhalt} showsVerticalScrollIndicator={false}>
        <Animated.View entering={ein(0)} style={styles.kopf}>
          <View style={{ alignSelf: "flex-start" }}>
            <StammtischLogo size={72} />
            <View style={[styles.badge, { backgroundColor: c.mustard }]}>
              <Text style={[styles.badgeText, { color: c.onMustard }]}>NEU</Text>
            </View>
          </View>
          <Text style={styles.titel} accessibilityRole="header">Neu in 1.9</Text>
          <Text style={styles.text}>Der Abend geht noch schneller von der Hand. Das Wichtigste auf einen Blick:</Text>
        </Animated.View>

        <Card style={styles.liste}>
          {NEU.map((n, i) => (
            <Animated.View key={n.titel} entering={ein(i + 1)} style={[styles.zeile, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border }]}>
              <IconSquircle emoji={n.emoji} ton={n.ton} size={40} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.zeilenTitel}>{n.titel}</Text>
                <Text style={styles.zeilenText}>{n.text}</Text>
              </View>
            </Animated.View>
          ))}
        </Card>
      </ScrollView>

      <View style={styles.fuss}>
        <Button label="Los geht’s" variant="blue" haptic="erfolg" onPress={schliessen} style={{ height: 56 }} />
        <Button label="Kurze Tour ansehen" variant="ghost" onPress={() => router.replace("/onboarding-intro?replay=1")} />
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    inhalt: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, gap: 18 },
    kopf: { gap: 10 },
    badge: { position: "absolute", right: -14, top: -8, height: 24, paddingHorizontal: 8, borderRadius: 12, justifyContent: "center", transform: [{ rotate: "8deg" }] },
    badgeText: { fontFamily: FONT.w800, fontSize: 12, letterSpacing: 0.6 },
    titel: { fontFamily: FONT.w800, fontSize: 30, lineHeight: 35, letterSpacing: -0.6, color: c.textDark, marginTop: 8 },
    text: { fontFamily: FONT.w500, fontSize: 16, lineHeight: 23, color: c.textMid },
    liste: { paddingVertical: 4, paddingHorizontal: 16 },
    zeile: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 10 },
    zeilenTitel: { ...TYPE.bodyStrong, fontFamily: FONT.w700, color: c.textDark },
    zeilenText: { fontFamily: FONT.w500, fontSize: 14, lineHeight: 19, color: c.textMuted, marginTop: 1 },
    fuss: { paddingHorizontal: 20, paddingBottom: 8, paddingTop: 8, gap: 2 },
  });
