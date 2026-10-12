import React from "react";
import { Text, View } from "react-native";
import { useColors } from "../../contexts/ThemeContext";
import { Ton, tonFarben } from "./ton";

interface Props {
  /** iPhone-Emoji als Symbol (Kategorie, Spiel, Menüpunkt, Kassenart …). */
  emoji: string;
  ton?: Ton;
  size?: number;
}

/**
 * Getöntes Quadrat mit runden Ecken und einem Emoji darin – das eine
 * Symbol-Format der App für Inhalte. Bedienelemente (Pfeile, Plus, Schließen)
 * bleiben Linien-Icons.
 */
export function IconSquircle({ emoji, ton = "neutral", size = 36 }: Props) {
  const c = useColors();
  const f = tonFarben(ton, c);
  return (
    <View
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.32), backgroundColor: f.bg, alignItems: "center", justifyContent: "center" }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Text style={{ fontSize: Math.round(size * 0.52), lineHeight: Math.round(size * 0.7), textAlign: "center" }} maxFontSizeMultiplier={1}>{emoji}</Text>
    </View>
  );
}
