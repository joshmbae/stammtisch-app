import React, { useState } from "react";
import { LayoutChangeEvent, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { FONT, MOTION, ThemeColors } from "../../constants/design";
import { useThemedStyles } from "../../contexts/ThemeContext";
import { PressableScale } from "./PressableScale";

export interface TabItem<K extends string> {
  key: K;
  label: string;
  /** Kleine Zahl unter dem Label, z. B. „7 von 9". */
  sub?: string;
}

interface Props<K extends string> {
  items: TabItem<K>[];
  value: K;
  onChange: (k: K) => void;
  /** Alle mit heller Leiste; der Daumen: "light" = Karte, "blue" = Blau (Kasse), "live" = Live-Grün (laufender Abend). */
  variant?: "light" | "blue" | "live";
}

const INNEN = 3;

/** Bereichs-Tabs mit gleitendem Daumen. */
export function SegmentedTabs<K extends string>({ items, value, onChange, variant = "light" }: Props<K>) {
  const styles = useThemedStyles(makeStyles);
  const [breite, setBreite] = useState(0);
  const index = Math.max(0, items.findIndex((i) => i.key === value));
  const x = useSharedValue(0);
  const segment = breite > 0 ? (breite - 2 * INNEN) / items.length : 0;
  React.useEffect(() => {
    x.value = withSpring(index * segment, MOTION.spring);
  }, [index, segment]);
  const daumen = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const onLayout = (e: LayoutChangeEvent) => setBreite(e.nativeEvent.layout.width);
  const thumb = variant === "blue" ? styles.thumbBlue : variant === "live" ? styles.thumbLive : styles.thumbLight;
  const aufThumb = variant === "blue" ? styles.onThumbBlue : variant === "live" ? styles.onThumbLive : styles.onThumbLight;

  return (
    <View style={styles.bar} onLayout={onLayout} accessibilityRole="tablist">
      {segment > 0 ? <Animated.View style={[styles.thumb, thumb, { width: segment }, daumen]} /> : null}
      {items.map((it) => {
        const aktiv = it.key === value;
        return (
          <PressableScale
            key={it.key}
            onPress={() => onChange(it.key)}
            haptic="leicht"
            scaleTo={0.97}
            accessibilityRole="tab"
            accessibilityState={{ selected: aktiv }}
            accessibilityLabel={it.sub ? `${it.label}, ${it.sub}` : it.label}
            style={styles.item}
            hitSlop={{ top: 4, bottom: 4 }}
          >
            <Text style={[styles.label, aktiv ? aufThumb : styles.onBar]} numberOfLines={1}>
              {it.label}
            </Text>
            {it.sub ? (
              <Text style={[styles.sub, aktiv ? aufThumb : styles.onBar]} numberOfLines={1}>
                {it.sub}
              </Text>
            ) : null}
          </PressableScale>
        );
      })}
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    bar: { flexDirection: "row", borderRadius: 14, padding: INNEN, minHeight: 40, backgroundColor: c.cardAlt },
    thumb: { position: "absolute", top: INNEN, bottom: INNEN, left: INNEN, borderRadius: 11 },
    thumbLight: { backgroundColor: c.card },
    thumbBlue: { backgroundColor: c.blue },
    // Im Dunkeln ist c.live eine dunkle Fläche – dort leuchtet der Daumen in Mint.
    thumbLive: { backgroundColor: c.heroStyle === "outline" ? c.liveAccent : c.live },
    item: { flex: 1, alignItems: "center", justifyContent: "center", minHeight: 34, paddingHorizontal: 4 },
    label: { fontFamily: FONT.w600, fontSize: 14 },
    sub: { fontFamily: FONT.w500, fontSize: 11, opacity: 0.8, fontVariant: ["tabular-nums"] },
    onBar: { color: c.textMuted },
    onThumbLight: { color: c.textDark },
    onThumbBlue: { color: c.onAccent },
    onThumbLive: { color: c.heroStyle === "outline" ? c.onAccent : c.onLive },
  });
