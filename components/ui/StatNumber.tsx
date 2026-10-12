import React from "react";
import { StyleSheet, Text, TextStyle, View } from "react-native";
import { MAX_FONT_SCALE, TYPE, ThemeColors } from "../../constants/design";
import { useThemedStyles } from "../../contexts/ThemeContext";

interface Props {
  value: string;
  /** Kleinere Einheit direkt dahinter, z. B. „€" oder „%". */
  unit?: string;
  label?: string;
  size?: number;
  color?: string;
  labelColor?: string;
  align?: TextStyle["textAlign"];
}

/** Große Zahl mit gleich breiten Ziffern und kleiner Beschriftung darunter. */
export function StatNumber({ value, unit, label, size = 24, color, labelColor, align }: Props) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View>
      <Text
        style={[styles.num, { fontSize: size, lineHeight: Math.round(size * 1.1), textAlign: align }, color ? { color } : null]}
        maxFontSizeMultiplier={MAX_FONT_SCALE}
      >
        {value}
        {unit ? <Text style={{ fontSize: Math.round(size * 0.62) }}>{` ${unit}`}</Text> : null}
      </Text>
      {label ? (
        <Text style={[styles.label, { textAlign: align }, labelColor ? { color: labelColor } : null]} numberOfLines={1}>
          {label}
        </Text>
      ) : null}
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    num: { ...TYPE.num, color: c.textDark },
    label: { ...TYPE.caption, color: c.textMuted, marginTop: 1 },
  });
