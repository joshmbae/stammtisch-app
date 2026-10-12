import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TYPE, ThemeColors } from "../../constants/design";
import { useColors, useThemedStyles } from "../../contexts/ThemeContext";
import { PressableScale } from "./PressableScale";

interface Props {
  children: string;
  /** Rechts daneben, z. B. „Alle" → Liste öffnen. */
  action?: { label: string; onPress: () => void };
  /** Zusatz rechts ohne Aktion, z. B. „6 von 8 Abenden". */
  meta?: string;
  tone?: "muted" | "blue";
}

export function SectionLabel({ children, action, meta, tone = "muted" }: Props) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  return (
    <View style={styles.row}>
      <Text style={[styles.label, tone === "blue" && { color: c.blue }]} accessibilityRole="header">
        {children}
      </Text>
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      {action ? (
        <PressableScale onPress={action.onPress} style={styles.action} hitSlop={10} accessibilityLabel={`${children}: ${action.label}`}>
          <Text style={styles.actionText}>{action.label}</Text>
          <Ionicons name="chevron-forward" size={14} color={c.blue} />
        </PressableScale>
      ) : null}
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    row: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 24 },
    label: { ...TYPE.label, color: c.textMuted, flex: 1 },
    meta: { ...TYPE.caption, color: c.textMuted },
    action: { flexDirection: "row", alignItems: "center", gap: 2, minHeight: 32 },
    actionText: { ...TYPE.caption, fontFamily: TYPE.label.fontFamily, color: c.blue },
  });
