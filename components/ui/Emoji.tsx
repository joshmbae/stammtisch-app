import React from "react";
import { StyleProp, Text, TextStyle } from "react-native";

/**
 * iPhone-Emoji als Symbol neben Text. Feste Größe und Zeilenhöhe, wächst
 * nicht mit der Systemschrift (sonst sprengt es Zeilen) und wird von
 * Screenreadern übersprungen – die Bedeutung steht im Text daneben.
 */
export function Emoji({ children, size = 16, style }: { children: string; size?: number; style?: StyleProp<TextStyle> }) {
  return (
    <Text
      style={[{ fontSize: size, lineHeight: Math.round(size * 1.3), textAlign: "center" }, style]}
      maxFontSizeMultiplier={1}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {children}
    </Text>
  );
}
