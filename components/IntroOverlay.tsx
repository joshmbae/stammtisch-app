import React, { useEffect, useRef, useState } from "react";
import { Image, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  SharedValue,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import * as SplashScreen from "expo-splash-screen";
import { FONT } from "../constants/design";
import { useColors } from "../contexts/ThemeContext";
import { useStammtisch } from "../contexts/StammtischContext";
import { loadVerordnung } from "../utils/storage";
import { IntroZiel, introAbonnieren, introStatus, introVorbei } from "../utils/intro";
import { haptik } from "./ui";

/** Muss zum nativen Splash passen (app.json → expo-splash-screen), sonst springt der Übergang. */
const SPLASH_BG = "#F2EEE6";
const SPLASH_GROESSE = 200;
/** Ecken wie beim Logo im App (StammtischLogo: 22 % der Kantenlänge). */
const RUNDUNG = SPLASH_GROESSE * 0.22;
const RUHE_SKALA = 0.78;
/** So lange läuft das Intro mindestens, auch wenn alles schon geladen ist. */
const MIN_DAUER = 1300;
/** Spätestens dann geht es weiter, auch wenn der Screen dahinter noch lädt. */
const MAX_DAUER = 4500;

/**
 * Start-Intro beim Kaltstart: übernimmt nahtlos vom nativen Splash (gleicher
 * Hintergrund, gleiches Logo an gleicher Stelle), stößt einmal an – Logo
 * kippt, Ringe laufen aus, der Stammtischname gleitet herein – und fliegt,
 * sobald Home bereit ist, an seinen Platz im Home-Kopf. `inhaltSkala` zoomt
 * die App darunter beim Aufdecken sanft auf 1.
 */
export function IntroOverlay({ onFertig, inhaltSkala }: { onFertig: () => void; inhaltSkala: SharedValue<number> }) {
  const c = useColors();
  const reduce = useReducedMotion();
  const { width: W, height: H } = useWindowDimensions();
  const { stammtischId } = useStammtisch();
  const [name, setName] = useState<string | null>(null);
  const [zielUri, setZielUri] = useState<string | undefined>(undefined);
  const [beruehrbar, setBeruehrbar] = useState(true);
  const start = useRef(Date.now());
  const gestartet = useRef(false);
  const ausgang = useRef(false);
  const aufraeumen = useRef<() => void>(() => {});

  const skala = useSharedValue(1);
  const rundung = useSharedValue(0);
  const drehung = useSharedValue(0);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const logoDeckkraft = useSharedValue(1);
  const zielDeckkraft = useSharedValue(0);
  const ring1 = useSharedValue(0);
  const ring2 = useSharedValue(0);
  const farbe = useSharedValue(0);
  const hintergrund = useSharedValue(1);
  const nameDeckkraft = useSharedValue(0);
  const nameY = useSharedValue(14);

  // Name des Stammtischs (aus dem Cache meist sofort da); ohne Stammtisch der App-Name.
  useEffect(() => {
    if (!stammtischId) { setName("DeinStammtisch"); return; }
    loadVerordnung().then((v) => setName(v.name || "DeinStammtisch")).catch(() => setName("DeinStammtisch"));
  }, [stammtischId]);

  useEffect(() => {
    if (!name || reduce) return;
    nameDeckkraft.value = withDelay(450, withTiming(1, { duration: 380 }));
    nameY.value = withDelay(450, withSpring(0, { damping: 14, stiffness: 160 }));
  }, [name]);

  /** Erst wenn unser Logo steht, den nativen Splash wegnehmen – sonst blitzt es. */
  function logoGeladen() {
    if (gestartet.current) return;
    gestartet.current = true;
    SplashScreen.hideAsync().catch(() => {});
    start.current = Date.now();
    if (reduce) { warten(); return; }

    farbe.value = withDelay(150, withTiming(1, { duration: 500 }));
    skala.value = withSpring(RUHE_SKALA, { damping: 11, stiffness: 140, mass: 0.8 });
    rundung.value = withTiming(RUNDUNG, { duration: 450, easing: Easing.out(Easing.cubic) });
    // Anstoßen: einmal kippen und nachwippen.
    drehung.value = withDelay(260, withSequence(
      withTiming(-9, { duration: 140, easing: Easing.out(Easing.quad) }),
      withTiming(6, { duration: 150 }),
      withTiming(-3, { duration: 120 }),
      withTiming(0, { duration: 140 }),
    ));
    setTimeout(() => haptik("leicht"), 400);
    ring1.value = withDelay(380, withTiming(1, { duration: 950, easing: Easing.out(Easing.cubic) }));
    ring2.value = withDelay(540, withTiming(1, { duration: 950, easing: Easing.out(Easing.cubic) }));
    warten();
  }

  /** Auf „bereit“ warten (mind. MIN_DAUER, max. MAX_DAUER); solange lädt, atmet das Logo. */
  function warten() {
    let atmet = false;
    const pruefen = () => {
      if (ausgang.current) return;
      const vergangen = Date.now() - start.current;
      const { bereit, ziel } = introStatus();
      if ((bereit && vergangen >= MIN_DAUER) || vergangen >= MAX_DAUER) {
        aufdecken(bereit ? ziel : null);
        return;
      }
      if (!atmet && !reduce && vergangen >= MIN_DAUER) {
        atmet = true;
        skala.value = withRepeat(withSequence(
          withTiming(RUHE_SKALA * 1.05, { duration: 650, easing: Easing.inOut(Easing.sin) }),
          withTiming(RUHE_SKALA, { duration: 650, easing: Easing.inOut(Easing.sin) }),
        ), -1);
        ring1.value = 0;
        ring1.value = withRepeat(withTiming(1, { duration: 1300, easing: Easing.out(Easing.cubic) }), -1);
      }
    };
    const timer = setInterval(pruefen, 80);
    const abmelden = introAbonnieren(pruefen);
    aufraeumen.current = () => { clearInterval(timer); abmelden(); };
  }
  useEffect(() => () => aufraeumen.current(), []);

  function aufdecken(ziel: IntroZiel | null) {
    ausgang.current = true;
    aufraeumen.current();
    setBeruehrbar(false);
    const fertig = () => { introVorbei(); onFertig(); };

    if (reduce) {
      hintergrund.value = withTiming(0, { duration: 250 });
      logoDeckkraft.value = withTiming(0, { duration: 250 }, (ok) => { if (ok) runOnJS(fertig)(); });
      return;
    }

    nameDeckkraft.value = withTiming(0, { duration: 180 });
    nameY.value = withTiming(-8, { duration: 180 });
    ring1.value = withTiming(1, { duration: 150 });
    // App darunter: kurz größer, dann sanft auf ihre Größe.
    inhaltSkala.value = 1.04;
    inhaltSkala.value = withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) });
    hintergrund.value = withDelay(140, withTiming(0, { duration: 380 }));

    if (ziel) {
      // An den Platz des Logos im Home-Kopf fliegen und ins echte Logo überblenden.
      setZielUri(ziel.uri);
      const dauer = 560;
      const kurve = Easing.bezier(0.65, 0, 0.25, 1);
      tx.value = withTiming(ziel.x + ziel.size / 2 - W / 2, { duration: dauer, easing: kurve });
      ty.value = withTiming(ziel.y + ziel.size / 2 - H / 2, { duration: dauer, easing: kurve });
      skala.value = withTiming(ziel.size / SPLASH_GROESSE, { duration: dauer, easing: kurve });
      drehung.value = withTiming(0, { duration: 200 });
      zielDeckkraft.value = withDelay(150, withTiming(1, { duration: 300 }));
      logoDeckkraft.value = withDelay(dauer, withTiming(0, { duration: 140 }, (ok) => { if (ok) runOnJS(fertig)(); }));
    } else {
      // Kein Ziel (z. B. Profil wählen): Logo zoomt durch und verschwindet.
      skala.value = withTiming(1.6, { duration: 420, easing: Easing.in(Easing.cubic) });
      logoDeckkraft.value = withTiming(0, { duration: 420 }, (ok) => { if (ok) runOnJS(fertig)(); });
    }
  }

  const hintergrundStil = useAnimatedStyle(() => ({
    opacity: hintergrund.value,
    backgroundColor: interpolateColor(farbe.value, [0, 1], [SPLASH_BG, c.background]),
  }));
  const logoStil = useAnimatedStyle(() => ({
    opacity: logoDeckkraft.value,
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: skala.value },
      { rotate: `${drehung.value}deg` },
    ],
  }));
  const rundungStil = useAnimatedStyle(() => ({ borderRadius: rundung.value }));
  const zielStil = useAnimatedStyle(() => ({ opacity: zielDeckkraft.value }));
  // Ring läuft von der Logogröße nach außen aus und wird dabei durchsichtig.
  const ring1Stil = useAnimatedStyle(() => ({
    opacity: ring1.value > 0 ? (1 - ring1.value) * 0.55 : 0,
    transform: [{ scale: RUHE_SKALA + ring1.value * 1.1 }],
  }));
  const ring2Stil = useAnimatedStyle(() => ({
    opacity: ring2.value > 0 ? (1 - ring2.value) * 0.55 : 0,
    transform: [{ scale: RUHE_SKALA + ring2.value * 1.1 }],
  }));
  const nameStil = useAnimatedStyle(() => ({ opacity: nameDeckkraft.value, transform: [{ translateY: nameY.value }] }));

  const mitte = { left: W / 2 - SPLASH_GROESSE / 2, top: H / 2 - SPLASH_GROESSE / 2 };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={beruehrbar ? "auto" : "none"} accessibilityLabel="Wird geladen" accessibilityRole="progressbar">
      <Animated.View style={[StyleSheet.absoluteFill, hintergrundStil]} />
      <Animated.View style={[styles.ring, mitte, { borderColor: c.mustard }, ring1Stil]} pointerEvents="none" />
      <Animated.View style={[styles.ring, mitte, { borderColor: c.mustard }, ring2Stil]} pointerEvents="none" />
      <Animated.View style={[styles.logo, mitte, logoStil]}>
        <Animated.View style={[styles.logoInnen, rundungStil]}>
          {/* Feste Größe: mit absoluteFill zeichnet iOS das 1024-px-Bild in Originalgröße und schneidet es ab. */}
          <Image source={require("../assets/splash-icon.png")} style={styles.bild} resizeMode="cover" onLoad={logoGeladen} onError={logoGeladen} />
          <Animated.View style={[StyleSheet.absoluteFill, zielStil]}>
            <Image source={zielUri ? { uri: zielUri } : require("../assets/logo.png")} style={styles.bild} resizeMode="contain" />
          </Animated.View>
        </Animated.View>
      </Animated.View>
      <Animated.View style={[styles.nameBox, { top: H / 2 + (SPLASH_GROESSE * RUHE_SKALA) / 2 + 26 }, nameStil]} pointerEvents="none">
        <Text style={[styles.name, { color: c.textDark }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>{name ?? ""}</Text>
        <Text style={[styles.prost, { color: c.mustardText }]} maxFontSizeMultiplier={1.2}>Prost!</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { position: "absolute", width: SPLASH_GROESSE, height: SPLASH_GROESSE, borderRadius: SPLASH_GROESSE / 2, borderWidth: 3 },
  logo: {
    position: "absolute", width: SPLASH_GROESSE, height: SPLASH_GROESSE,
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 18,
  },
  logoInnen: { flex: 1, overflow: "hidden" },
  bild: { width: SPLASH_GROESSE, height: SPLASH_GROESSE },
  nameBox: { position: "absolute", left: 24, right: 24, alignItems: "center", gap: 2 },
  name: { fontFamily: FONT.w800, fontSize: 28, letterSpacing: -0.5 },
  prost: { fontFamily: FONT.w700, fontSize: 13, letterSpacing: 2, textTransform: "uppercase" },
});
