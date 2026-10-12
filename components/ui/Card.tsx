import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { MOTION, RADIUS, SHADOWS, ThemeColors } from "../../constants/design";
import { useTheme, useThemedStyles } from "../../contexts/ThemeContext";
import { PressableScale } from "./PressableScale";

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** "alt" = getönte Fläche statt Weiß bzw. Kartenfarbe. */
  tone?: "default" | "alt";
  onPress?: () => void;
  accessibilityLabel?: string;
  /** Reihenfolge für das gestaffelte Einblenden beim Laden; ohne Wert kein Einblenden. */
  enterIndex?: number;
}

/**
 * Grundkarte: hell mit sehr leichtem Schatten und feiner Kante (Weiß hebt
 * sich auf Creme sonst kaum ab), dunkel nur mit Haarlinie.
 */
export function Card({ children, style, tone = "default", onPress, accessibilityLabel, enterIndex }: Props) {
  const styles = useThemedStyles(makeStyles);
  const { scheme } = useTheme();
  const base = [styles.card, tone === "alt" && styles.alt, scheme === "light" && tone === "default" && SHADOWS.light, style];
  const entering = enterIndex === undefined ? undefined : FadeInDown.duration(MOTION.base).delay(enterIndex * MOTION.stagger);

  if (onPress) {
    // Die Hülle trägt das Einblenden; Layout-Angaben (flex, Breite, Abstand
    // nach außen) gehören an sie, sonst nimmt die Karte in einer Zeile nur
    // ihre Inhaltsbreite ein.
    const { aussen, innen } = teileLayout(StyleSheet.flatten(base));
    return (
      <Animated.View entering={entering} style={aussen}>
        <PressableScale onPress={onPress} accessibilityLabel={accessibilityLabel} style={innen}>
          {children}
        </PressableScale>
      </Animated.View>
    );
  }
  return (
    <Animated.View entering={entering} style={base} accessibilityLabel={accessibilityLabel}>
      {children}
    </Animated.View>
  );
}

const AUSSEN_KEYS = [
  "flex", "flexGrow", "flexShrink", "flexBasis", "alignSelf", "width", "minWidth", "maxWidth",
  "margin", "marginTop", "marginBottom", "marginLeft", "marginRight", "marginHorizontal", "marginVertical",
] as const;

function teileLayout(style: ViewStyle) {
  const aussen: ViewStyle = {};
  const innen: ViewStyle = { ...style };
  for (const k of AUSSEN_KEYS) {
    if (k in innen) {
      (aussen as any)[k] = innen[k];
      delete innen[k];
    }
  }
  // Wächst die Hülle, füllt die Karte sie aus.
  if (aussen.flex || aussen.flexGrow || aussen.alignSelf === "stretch") innen.flexGrow = 1;
  return { aussen, innen };
}

/** Für Inhalte, die keine eigene Karte brauchen, aber den Kartenabstand. */
export function CardGap() {
  return <View style={{ height: 12 }} />;
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.card,
      borderRadius: RADIUS.card,
      padding: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.hairline,
    },
    alt: { backgroundColor: c.cardAlt, borderColor: "transparent" },
  });
