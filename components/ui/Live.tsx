import React, { useEffect, useState } from "react";
import { StyleProp, StyleSheet, Text, TextStyle, View } from "react-native";
import Animated, {
  Easing,
  FlipInXDown,
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

/** Countdown in drei Kacheln (Tage, Stunden, Minuten); jede Ziffer klappt beim Wechsel neu ein. */
export function FlipCountdown({ ziel, now, tileColor, digitColor, labelColor }: FlipProps) {
  const styles = useThemedStyles(makeStyles);
  const reduce = useReducedMotion();
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
          <View style={[styles.flipTile, { backgroundColor: tileColor }]}>
            <Animated.Text
              key={t.wert}
              entering={reduce ? undefined : FlipInXDown.duration(350)}
              style={[styles.flipDigit, { color: digitColor }]}
              maxFontSizeMultiplier={1.15}
            >
              {t.wert}
            </Animated.Text>
          </View>
          <Text style={[styles.flipLabel, { color: labelColor }]}>{t.label}</Text>
        </View>
      ))}
    </View>
  );
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
    flipTile: { alignSelf: "stretch", minHeight: 46, borderRadius: 12, alignItems: "center", justifyContent: "center", overflow: "hidden" },
    flipDigit: { fontFamily: FONT.w700, fontSize: 24, fontVariant: ["tabular-nums"] },
    flipLabel: { fontFamily: FONT.w600, fontSize: 12 },
  });
