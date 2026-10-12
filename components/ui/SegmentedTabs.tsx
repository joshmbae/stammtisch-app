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
  /** "dark" = dunkle Leiste mit Senf-Daumen (Live), "light" = helle Leiste, "blue" = helle Leiste mit blauem Daumen (Kasse). */
  variant?: "dark" | "light" | "blue";
}

/** Große Bereichs-Tabs mit gleitendem Daumen. */
export function SegmentedTabs<K extends string>({ items, value, onChange, variant = "dark" }: Props<K>) {
  const styles = useThemedStyles(makeStyles);
  const [breite, setBreite] = useState(0);
  const index = Math.max(0, items.findIndex((i) => i.key === value));
  const x = useSharedValue(0);
  const segment = breite > 0 ? (breite - 10) / items.length : 0;
  React.useEffect(() => {
    x.value = withSpring(index * segment, MOTION.spring);
  }, [index, segment]);
  const daumen = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const onLayout = (e: LayoutChangeEvent) => setBreite(e.nativeEvent.layout.width);
  const dunkel = variant === "dark";
  const blau = variant === "blue";

  return (
    <View style={[styles.bar, dunkel ? styles.barDark : styles.barLight]} onLayout={onLayout} accessibilityRole="tablist">
      {segment > 0 ? <Animated.View style={[styles.thumb, dunkel ? styles.thumbDark : blau ? styles.thumbBlue : styles.thumbLight, { width: segment }, daumen]} /> : null}
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
          >
            <Text style={[styles.label, dunkel ? (aktiv ? styles.onThumbDark : styles.onBarDark) : aktiv ? (blau ? styles.onThumbBlue : styles.onThumbLight) : styles.onBarLight]} numberOfLines={1}>
              {it.label}
            </Text>
            {it.sub ? (
              <Text style={[styles.sub, dunkel ? (aktiv ? styles.onThumbDark : styles.onBarDark) : aktiv ? (blau ? styles.onThumbBlue : styles.onThumbLight) : styles.onBarLight]} numberOfLines={1}>
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
    bar: { flexDirection: "row", borderRadius: 20, padding: 5, minHeight: 56 },
    barDark: { backgroundColor: c.tabBar, borderWidth: 1, borderColor: c.navBorder },
    barLight: { backgroundColor: c.cardAlt },
    thumb: { position: "absolute", top: 5, bottom: 5, left: 5, borderRadius: 15 },
    thumbDark: { backgroundColor: c.mustard },
    thumbLight: { backgroundColor: c.card },
    thumbBlue: { backgroundColor: c.blue },
    item: { flex: 1, alignItems: "center", justifyContent: "center", minHeight: 46, paddingHorizontal: 4 },
    label: { fontFamily: FONT.w800, fontSize: 14 },
    sub: { fontFamily: FONT.w700, fontSize: 12, opacity: 0.8, fontVariant: ["tabular-nums"] },
    onBarDark: { color: c.tabInactive },
    onThumbDark: { color: c.onMustard },
    onBarLight: { color: c.textMuted },
    onThumbLight: { color: c.textDark },
    onThumbBlue: { color: c.onAccent },
  });
