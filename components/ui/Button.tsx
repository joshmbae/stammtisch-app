import React from "react";
import { ActivityIndicator, StyleProp, StyleSheet, Text, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FONT, ThemeColors } from "../../constants/design";
import { useColors, useThemedStyles } from "../../contexts/ThemeContext";
import { HapticArt, PressableScale } from "./PressableScale";

type Variant = "primary" | "dark" | "secondary" | "blue" | "danger" | "ghost";

interface Props {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  size?: "md" | "sm";
  loading?: boolean;
  disabled?: boolean;
  haptic?: HapticArt;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  /** Eigene Farben, z. B. halbtransparent auf einer Hero-Fläche. Hat Vorrang vor `variant`. */
  colors?: { bg: string; fg: string; border?: string };
}

/** Pillen-Button. Text- und Iconfarbe kommen immer aus dem passenden on…-Token. */
export function Button({ label, onPress, variant = "primary", icon, size = "md", loading, disabled, haptic = "leicht", style, accessibilityLabel, colors }: Props) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const farben: Record<Variant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: c.mustard, fg: c.onMustard },
    // Hell: Tinten-Pille. Dunkel: dunkle Fläche mit Kante statt einer weißen Pille.
    dark: c.heroStyle === "outline" ? { bg: c.cardAlt, fg: c.textDark, border: c.navBorder } : { bg: c.textDark, fg: c.background },
    secondary: { bg: c.card, fg: c.textDark, border: c.hairline },
    blue: { bg: c.blue, fg: c.onAccent },
    danger: { bg: c.coral, fg: c.onCoral },
    ghost: { bg: "transparent", fg: c.blue },
  };
  const f = colors ?? farben[variant];
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || loading}
      haptic={haptic}
      accessibilityLabel={accessibilityLabel ?? label}
      hitSlop={size === "sm" ? { top: 3, bottom: 3 } : undefined}
      style={[
        styles.btn,
        size === "sm" ? styles.sm : styles.md,
        { backgroundColor: f.bg, borderColor: f.border ?? "transparent" },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={f.fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={size === "sm" ? 16 : 18} color={f.fg} /> : null}
          <Text style={[styles.text, size === "sm" && styles.textSm, { color: f.fg }]} numberOfLines={1}>
            {label}
          </Text>
        </>
      )}
    </PressableScale>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    btn: { borderRadius: 999, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 18, borderWidth: StyleSheet.hairlineWidth },
    md: { minHeight: 48 },
    sm: { minHeight: 38, paddingHorizontal: 14 },
    text: { fontFamily: FONT.w700, fontSize: 16 },
    textSm: { fontSize: 14 },
  });
