import React from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "../../contexts/ThemeContext";
import { Ton, tonFarben } from "./ton";

interface Props {
  /** Entweder ein Emoji (Kategorie, Spiel) … */
  emoji?: string;
  /** … oder ein Ionicons-Name für System-Elemente. */
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  ton?: Ton;
  size?: number;
}

/** Getöntes Quadrat mit runden Ecken für Kategorie- und Bereichssymbole. */
export function IconSquircle({ emoji, icon, ton = "neutral", size = 36 }: Props) {
  const c = useColors();
  const f = tonFarben(ton, c);
  return (
    <View
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.32), backgroundColor: f.bg, alignItems: "center", justifyContent: "center" }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {emoji ? (
        <Text style={{ fontSize: Math.round(size * 0.5) }} maxFontSizeMultiplier={1}>{emoji}</Text>
      ) : icon ? (
        <Ionicons name={icon} size={Math.round(size * 0.52)} color={f.fg} />
      ) : null}
    </View>
  );
}
