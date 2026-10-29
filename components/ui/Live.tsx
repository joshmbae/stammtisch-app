import React, { useEffect, useState } from "react";
import { StyleProp, StyleSheet, Text, TextStyle, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { FONT, MAX_FONT_SCALE, ThemeColors } from "../../constants/design";
import { useThemedStyles } from "../../contexts/ThemeContext";

/** Pulsierender Punkt für „läuft gerade". Steht still bei „Bewegung reduzieren". */
export function PulseDot({ color, size = 9 }: { color: string; size?: number }) {
  const reduce = useReducedMotion();
  const s = useSharedValue(1);
  useEffect(() => {
    if (reduce) return;
    s.value = withRepeat(withSequence(withTiming(1.8, { duration: 800 }), withTiming(1, { duration: 800 })), -1);
  }, [reduce]);
  const halo = useAnimatedStyle(() => ({ transform: [{ scale: s.value }], opacity: (1.8 - s.value) / 0.8 * 0.45 }));
  return (
    <View style={{ width: size, height: size }} accessibilityElementsHidden>
      <Animated.View style={[{ position: "absolute", width: size, height: size, borderRadius: size, backgroundColor: color }, halo]} />
      <View style={{ width: size, height: size, borderRadius: size, backgroundColor: color }} />
    </View>
  );
}

const zwei = (n: number) => String(n).padStart(2, "0");

/** h:mm:ss seit `start`. `now` kommt aus useNow(), damit nur ein Takt pro Screen läuft. */
export function LiveTimer({ start, now, style }: { start: Date; now: Date; style?: StyleProp<TextStyle> }) {
  const sek = Math.max(0, Math.floor((now.getTime() - start.getTime()) / 1000));
  const text = `${Math.floor(sek / 3600)}:${zwei(Math.floor(sek / 60) % 60)}:${zwei(sek % 60)}`;
  return (
    <Text style={[{ fontFamily: FONT.w700, fontVariant: ["tabular-nums"] }, style]} accessibilityRole="timer" accessibilityLabel={`läuft seit ${text}`} maxFontSizeMultiplier={MAX_FONT_SCALE}>
      {text}
    </Text>
  );
}

interface FlipProps {
  ziel: Date;
  now: Date;
  tileColor: string;
  digitColor: string;
  labelColor: string;
}

/** Countdown in drei Fallblatt-Karten (Tage, Stunden, Minuten). */
export function FlipCountdown({ ziel, now, tileColor, digitColor, labelColor }: FlipProps) {
  const styles = useThemedStyles(makeStyles);
  // Auf die Minute aufgerundet: 19:29:30 vor 19:30 zeigt noch „1 Min“, nicht „0“.
  const rest = Math.max(0, Math.ceil((ziel.getTime() - now.getTime()) / 60000));
  const teile = [
    { wert: String(Math.floor(rest / 1440)), label: "Tage" },
    { wert: zwei(Math.floor(rest / 60) % 24), label: "Std" },
    { wert: zwei(rest % 60), label: "Min" },
  ];
  return (
    <View style={styles.flipRow} accessibilityRole="timer" accessibilityLabel={`Noch ${teile.map((t) => `${t.wert} ${t.label}`).join(", ")}`}>
      {teile.map((t) => (
        <View key={t.label} style={styles.flipCol}>
          <FallblattKarte wert={t.wert} tileColor={tileColor} digitColor={digitColor} />
          <Text style={[styles.flipLabel, { color: labelColor }]}>{t.label}</Text>
        </View>
      ))}
    </View>
  );
}

const KARTE_HOEHE = 52;
const HALB = KARTE_HOEHE / 2;
const KLAPP_DAUER = 600;

/**
 * Eine Fallblatt-Karte wie an alten Bahnhofsanzeigen: Beim Wechsel klappt
 * die obere Hälfte mit dem alten Wert nach unten weg, dahinter liegt oben
 * schon der neue Wert, und die untere Hälfte mit dem neuen Wert klappt nach.
 * Bei „Bewegung reduzieren“ wechselt der Wert ohne Klappen.
 */
function FallblattKarte({ wert, tileColor, digitColor }: { wert: string; tileColor: string; digitColor: string }) {
  const styles = useThemedStyles(makeStyles);
  const reduce = useReducedMotion();
  const [alt, setAlt] = useState(wert);
  useEffect(() => {
    if (reduce) setAlt(wert);
  }, [wert, reduce]);

  const klappt = alt !== wert;
  const ziffer = (text: string, unten: boolean) => (
    <View style={[styles.halbInnen, unten && { top: -HALB }]}>
      <Text style={[styles.flipDigit, { color: digitColor }]} maxFontSizeMultiplier={1.15}>{text}</Text>
    </View>
  );

  return (
    <View style={styles.karte}>
      {/* Liegende Hälften: oben schon der neue Wert, unten bis zum Ende der alte. */}
      <View style={[styles.halb, styles.oben, { backgroundColor: tileColor }]}>{ziffer(wert, false)}</View>
      <View style={[styles.halb, styles.unten, { backgroundColor: tileColor }]}>
        {ziffer(klappt ? alt : wert, true)}
        <View style={styles.schatten} />
      </View>
      {klappt && !reduce ? (
        // Neu gemountet pro Wechsel, damit die Klappen im ersten Bild sicher oben stehen.
        <Klappen key={wert} onFertig={() => setAlt(wert)}>
          {(p) => (
            <>
              <Klappe p={p} oben style={[styles.halb, styles.oben, styles.klappe, { backgroundColor: tileColor }]}>{ziffer(alt, false)}</Klappe>
              <Klappe p={p} oben={false} style={[styles.halb, styles.unten, styles.klappe, { backgroundColor: tileColor }]}>
                {ziffer(wert, true)}
                <View style={styles.schatten} />
              </Klappe>
            </>
          )}
        </Klappen>
      ) : null}
      <View style={styles.fuge} />
    </View>
  );
}

/** Ein Klappvorgang: startet beim Einhängen, meldet sich nach dem Ende. */
function Klappen({ onFertig, children }: { onFertig: () => void; children: (p: SharedValue<number>) => React.ReactNode }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(1, { duration: KLAPP_DAUER, easing: Easing.inOut(Easing.quad) });
    const id = setTimeout(onFertig, KLAPP_DAUER);
    return () => clearTimeout(id);
  }, []);
  return <>{children(p)}</>;
}

/** Obere Klappe: 0° → −90° in der ersten Hälfte; untere: 90° → 0° in der zweiten. */
function Klappe({ p, oben, style, children }: { p: SharedValue<number>; oben: boolean; style: any; children: React.ReactNode }) {
  const a = useAnimatedStyle(() => {
    const winkel = oben
      ? interpolate(p.value, [0, 0.5, 1], [0, -90, -90])
      : interpolate(p.value, [0, 0.5, 1], [90, 90, 0]);
    const sichtbar = oben ? p.value < 0.5 : p.value >= 0.5;
    return {
      opacity: sichtbar ? 1 : 0,
      transform: [{ perspective: 400 }, { rotateX: `${winkel}deg` }],
    };
  });
  return <Animated.View style={[style, { transformOrigin: oben ? "bottom" : "top" }, a]}>{children}</Animated.View>;
}

/** „+1" o. ä., das kurz aufsteigt, sobald sich `trigger` erhöht. */
export function CountBurst({ trigger, text, color }: { trigger: number; text: string; color: string }) {
  const [sichtbar, setSichtbar] = useState(false);
  const y = useSharedValue(0);
  const o = useSharedValue(0);
  const erster = React.useRef(true);
  useEffect(() => {
    if (erster.current) { erster.current = false; return; }
    setSichtbar(true);
    y.value = 6;
    o.value = 0;
    y.value = withTiming(-26, { duration: 900, easing: Easing.out(Easing.cubic) });
    o.value = withSequence(withTiming(1, { duration: 180 }), withTiming(0, { duration: 700 }));
  }, [trigger]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }], opacity: o.value }));
  if (!sichtbar) return null;
  return (
    <Animated.Text pointerEvents="none" style={[{ position: "absolute", top: 4, right: 10, fontFamily: FONT.w700, fontSize: 16, color }, st]} accessibilityElementsHidden>
      {text}
    </Animated.Text>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    flipRow: { flexDirection: "row", gap: 8 },
    flipCol: { flex: 1, alignItems: "center", gap: 4 },
    karte: { alignSelf: "stretch", height: KARTE_HOEHE },
    halb: { position: "absolute", left: 0, right: 0, height: HALB, overflow: "hidden" },
    oben: { top: 0, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
    unten: { top: HALB, borderBottomLeftRadius: 12, borderBottomRightRadius: 12 },
    klappe: { backfaceVisibility: "hidden" },
    // Volle Kartenhöhe in jeder Hälfte, damit die Ziffer an der Fuge genau durchgeschnitten wird.
    halbInnen: { position: "absolute", left: 0, right: 0, top: 0, height: KARTE_HOEHE, alignItems: "center", justifyContent: "center" },
    // Untere Hälfte etwas dunkler, wie bei echten Fallblättern.
    schatten: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.12)" },
    fuge: { position: "absolute", left: 0, right: 0, top: HALB - 0.75, height: 1.5, backgroundColor: "rgba(0,0,0,0.28)" },
    flipDigit: { fontFamily: FONT.w700, fontSize: 26, lineHeight: 32, fontVariant: ["tabular-nums"] },
    flipLabel: { fontFamily: FONT.w600, fontSize: 12 },
  });
