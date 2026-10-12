import React from "react";
import { StyleSheet } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

/**
 * Dunkler Verlauf über Fotos, damit Text darauf lesbar bleibt. Ein Verlauf
 * ist hier kein Deko-Effekt, sondern Lesbarkeit; oben leicht, unten kräftig.
 */
export function Scrim({ top = 0.35, bottom = 0.82 }: { top?: number; bottom?: number }) {
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#141210" stopOpacity={top} />
          <Stop offset="0.35" stopColor="#141210" stopOpacity={0} />
          <Stop offset="0.5" stopColor="#141210" stopOpacity={0} />
          <Stop offset="1" stopColor="#141210" stopOpacity={bottom} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#scrim)" />
    </Svg>
  );
}
