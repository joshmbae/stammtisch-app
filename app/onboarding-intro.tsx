import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  SharedValue,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { FONT, ThemeColors } from "../constants/design";
import { useColors, useThemedStyles } from "../contexts/ThemeContext";
import { useSession } from "../contexts/SessionContext";
import { markAppIntroSeen } from "../utils/onboarding";
import { markiereNeuigkeitenGesehen } from "../utils/neuigkeiten";
import { loadSpiele, loadVerordnung } from "../utils/storage";
import { Button, PressableScale } from "../components/ui";
import { BUEHNE_HOEHE, BuehneKasse, BuehneLive, BuehneTabelle, BuehneWillkommen, BuehneZusagen } from "../components/einstieg/TutorialBuehnen";

interface Seite {
  key: string;
  /** Kleine Überschrift: wann das im Stammtisch-Leben passiert. */
  wann: string;
  titel: string;
  text: string;
  tipp?: string;
}

const SEITEN: Seite[] = [
  {
    key: "willkommen",
    wann: "Willkommen",
    titel: "Euer Stammtisch in einer App",
    text: "Termine, Strafen, Kasse und Tabelle – alle am Tisch sehen dasselbe, und zwar sofort.",
  },
  {
    key: "zusagen",
    wann: "Vor dem Abend",
    titel: "Sag zu – mit einem Tipp",
    text: "Auf Home steht immer der nächste Stammtisch. Ein Tipp auf „Bin dabei“, und alle sehen, wer kommt.",
  },
  {
    key: "live",
    wann: "Am Abend",
    titel: "Live eintragen",
    text: "Zur Startzeit öffnet die App direkt den laufenden Abend. Strafen und Spiel trägst du mit einem Tipp ein – alles lässt sich rückgängig machen.",
  },
  {
    key: "kasse",
    wann: "Danach",
    titel: "Die Kasse rechnet mit",
    text: "Strafen landen automatisch in der Kasse. Bezahlt? Abhaken. Übernimmt einer die Rechnung, sieht jeder seinen Anteil.",
  },
  {
    key: "tabelle",
    wann: "Das ganze Jahr",
    titel: "Wer führt?",
    text: "Ranglisten für Teilnahme, Strafen und euer Spiel. Wer vorn liegt, trägt die Krone – am Jahresende gibt’s den Titel.",
    tipp: "Tipp: Unter „Profil bearbeiten“ schützt du dein Profil mit einer PIN.",
  },
];

/**
 * Tutorial: fünf kurze Seiten entlang eines Stammtisch-Abends, jede mit einem
 * kleinen Nachbau der echten Oberfläche. Wischen oder „Weiter“; die Punkte
 * und Vorschaukarten folgen dem Wischen.
 */
export default function OnboardingIntroScreen() {
  const styles = useThemedStyles(makeStyles);
  const { width } = useWindowDimensions();
  const { replay } = useLocalSearchParams<{ replay?: string }>();
  const isReplay = replay === "1";
  const { activeMemberId } = useSession();
  const [index, setIndex] = useState(0);
  const [spielName, setSpielName] = useState("Spiel");
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
  // Seitenhöhe = Höhe des Wischbereichs, damit der Inhalt vertikal mittig sitzen kann.
  const [hoehe, setHoehe] = useState(0);
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const x = useSharedValue(0);
  const beendet = useRef(false);

  // Mit dem echten Spielnamen und Logo des Stammtischs; ohne Verbindung bleibt es beim Beispiel.
  useEffect(() => {
    Promise.all([loadVerordnung(), loadSpiele()])
      .then(([v, spiele]) => {
        const aktiv = spiele.find((s) => s.id === v?.aktivesSpielId);
        if (aktiv) setSpielName(aktiv.name);
        if (v?.logoUrl) setLogoUrl(v.logoUrl);
      })
      .catch(() => {});
  }, []);

  const onScroll = useAnimatedScrollHandler((e) => {
    x.value = e.contentOffset.x;
  });

  const letzte = index === SEITEN.length - 1;

  async function fertig() {
    if (beendet.current) return;
    beendet.current = true;
    if (!isReplay && activeMemberId) await markAppIntroSeen(activeMemberId);
    // Wer das neue Tutorial gesehen hat, braucht „Was ist neu“ nicht mehr.
    await markiereNeuigkeitenGesehen();
    if (isReplay) router.back();
    else router.replace("/(tabs)/home");
  }

  function weiter() {
    if (letzte) return fertig();
    const n = index + 1;
    scrollRef.current?.scrollTo({ x: n * width, animated: true });
    setIndex(n);
  }

  function buehne(key: string) {
    switch (key) {
      case "willkommen": return <BuehneWillkommen logoUrl={logoUrl} />;
      case "zusagen": return <BuehneZusagen />;
      case "live": return <BuehneLive spielName={spielName} />;
      case "kasse": return <BuehneKasse />;
      default: return <BuehneTabelle />;
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <View style={styles.kopf}>
        <PressableScale onPress={fertig} style={styles.skip} hitSlop={8} accessibilityLabel={isReplay ? "Tutorial schließen" : "Tutorial überspringen"}>
          <Text style={styles.skipText}>{isReplay ? "Schließen" : "Überspringen"}</Text>
        </PressableScale>
      </View>

      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        onLayout={(e) => setHoehe(e.nativeEvent.layout.height)}
        style={{ flex: 1 }}
      >
        {SEITEN.map((s, i) => (
          <SeiteAnsicht key={s.key} seite={s} i={i} x={x} breite={width} hoehe={hoehe} nummer={`${i + 1} von ${SEITEN.length}`}>
            {buehne(s.key)}
          </SeiteAnsicht>
        ))}
      </Animated.ScrollView>

      <View style={styles.fuss}>
        <View style={styles.punkte} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {SEITEN.map((s, i) => <Punkt key={s.key} i={i} x={x} breite={width} />)}
        </View>
        <Button
          label={letzte ? (isReplay ? "Fertig" : "Los geht’s") : "Weiter"}
          icon={letzte ? undefined : "arrow-forward"}
          variant="blue"
          haptic={letzte ? "erfolg" : "leicht"}
          onPress={weiter}
          style={{ height: 56 }}
        />
      </View>
    </SafeAreaView>
  );
}

/** Platz für Überschrift und Text unter der Vorschau (längste Seite). */
const TEXT_HOEHE = 210;

/**
 * Abstand oben: Vorschau und Text als Block mittig, aber auf allen Seiten an
 * derselben Stelle – sonst springt die Vorschau beim Wischen je nach Textlänge.
 */
const oben = (hoehe: number) => (hoehe > 0 ? Math.max(8, (hoehe - BUEHNE_HOEHE - 28 - TEXT_HOEHE) / 2) : 8);

/** Eine Seite: Vorschau oben (skaliert beim Hereinwischen), Text darunter. */
function SeiteAnsicht({ seite, i, x, breite, hoehe, nummer, children }: {
  seite: Seite; i: number; x: SharedValue<number>; breite: number; hoehe: number; nummer: string; children: React.ReactNode;
}) {
  const styles = useThemedStyles(makeStyles);
  const buehnenStil = useAnimatedStyle(() => {
    const p = (x.value - i * breite) / breite;
    return {
      opacity: interpolate(p, [-1, 0, 1], [0.3, 1, 0.3], Extrapolation.CLAMP),
      transform: [
        { translateX: interpolate(p, [-1, 0, 1], [-breite * 0.18, 0, breite * 0.18], Extrapolation.CLAMP) },
        { scale: interpolate(p, [-1, 0, 1], [0.86, 1, 0.86], Extrapolation.CLAMP) },
      ],
    };
  });
  const textStil = useAnimatedStyle(() => {
    const p = (x.value - i * breite) / breite;
    return { opacity: interpolate(Math.abs(p), [0, 0.6], [1, 0], Extrapolation.CLAMP) };
  });
  return (
    <View style={[styles.seite, { width: breite, paddingTop: oben(hoehe) }, hoehe > 0 && { height: hoehe }]} accessible accessibilityLabel={`${nummer}. ${seite.wann}. ${seite.titel}. ${seite.text}${seite.tipp ? ` ${seite.tipp}` : ""}`}>
      <Animated.View style={buehnenStil}>{children}</Animated.View>
      <Animated.View style={[styles.texte, textStil]}>
        <Text style={styles.wann}>{seite.wann}</Text>
        <Text style={styles.titel}>{seite.titel}</Text>
        <Text style={styles.text}>{seite.text}</Text>
        {seite.tipp ? <Text style={styles.tipp}>{seite.tipp}</Text> : null}
      </Animated.View>
    </View>
  );
}

/** Fortschrittspunkt: wächst und färbt sich, je näher die Seite ist. */
function Punkt({ i, x, breite }: { i: number; x: SharedValue<number>; breite: number }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const stil = useAnimatedStyle(() => {
    const nah = 1 - Math.min(1, Math.abs(x.value / breite - i));
    return {
      width: 8 + nah * 18,
      backgroundColor: interpolateColor(nah, [0, 1], [c.borderDark, c.blue]),
    };
  });
  return <Animated.View style={[styles.punkt, stil]} />;
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    kopf: { flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: 20, height: 44 },
    skip: { minHeight: 44, justifyContent: "center" },
    skipText: { fontFamily: FONT.w600, fontSize: 15, color: c.blue },
    seite: { paddingHorizontal: 20, gap: 28 },
    texte: { gap: 8, paddingHorizontal: 4 },
    wann: { fontFamily: FONT.w700, fontSize: 13, letterSpacing: 0.6, textTransform: "uppercase", color: c.blue },
    titel: { fontFamily: FONT.w800, fontSize: 30, lineHeight: 35, letterSpacing: -0.6, color: c.textDark },
    text: { fontFamily: FONT.w500, fontSize: 16, lineHeight: 23, color: c.textMid },
    tipp: { fontFamily: FONT.w600, fontSize: 14, lineHeight: 20, color: c.textMuted, marginTop: 6 },
    fuss: { paddingHorizontal: 20, paddingBottom: 12, gap: 18 },
    punkte: { flexDirection: "row", justifyContent: "center", gap: 6 },
    punkt: { height: 8, borderRadius: 4 },
  });
