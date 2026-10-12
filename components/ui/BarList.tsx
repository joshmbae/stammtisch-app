import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { FONT, TYPE, ThemeColors } from "../../constants/design";
import { useThemedStyles } from "../../contexts/ThemeContext";

export interface BarRow {
  id: string;
  label: string;
  sub?: string;
  value: number;
  display: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
}

/** Waagerechte Balken pro Person; die Breite wächst beim Erscheinen. */
export function BarList({ rows, color, max }: { rows: BarRow[]; color: string; max?: number }) {
  const styles = useThemedStyles(makeStyles);
  const top = max ?? Math.max(1, ...rows.map((r) => r.value));
  return (
    <View>
      {rows.map((r, i) => (
        <View key={r.id} style={[styles.row, i > 0 && styles.rowLine]} accessible accessibilityLabel={`${r.label}: ${r.display}`}>
          {r.leading}
          <View style={styles.nameCol}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>{r.label}</Text>
              {r.trailing}
            </View>
            {r.sub ? <Text style={styles.sub} numberOfLines={1}>{r.sub}</Text> : null}
          </View>
          <Balken anteil={r.value / top} color={color} delay={i * 70} />
          <Text style={styles.value}>{r.display}</Text>
        </View>
      ))}
    </View>
  );
}

function Balken({ anteil, color, delay }: { anteil: number; color: string; delay: number }) {
  const styles = useThemedStyles(makeStyles);
  const w = useSharedValue(0);
  useEffect(() => {
    w.value = withDelay(delay, withTiming(anteil, { duration: 700, easing: Easing.out(Easing.cubic) }));
  }, [anteil]);
  const fill = useAnimatedStyle(() => ({ width: `${Math.round(w.value * 100)}%` }));
  return (
    <View style={styles.track}>
      <Animated.View style={[styles.fill, { backgroundColor: color }, fill]} />
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    row: { minHeight: 50, flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
    rowLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
    nameCol: { width: 112 },
    nameRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    name: { fontFamily: FONT.w800, fontSize: 15, color: c.textDark, flexShrink: 1 },
    sub: { ...TYPE.caption, color: c.textMuted },
    track: { flex: 1, height: 10, borderRadius: 999, backgroundColor: c.cardAlt, overflow: "hidden" },
    fill: { height: "100%", borderRadius: 999 },
    value: { ...TYPE.num, fontSize: 17, color: c.textDark, minWidth: 44, textAlign: "right" },
  });
