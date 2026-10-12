import React from "react";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useColors } from "../../contexts/ThemeContext";

/** Kleine Krone für „führt" — als Vektor statt Emoji, damit sie überall gleich aussieht. */
export function Krone({ size = 14, color }: { size?: number; color?: string }) {
  const c = useColors();
  // Ausblenden für Screenreader an der View: Svg reicht die Props im Web ungefiltert an das DOM weiter.
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M3 18l2-11 5 5 2-7 2 7 5-5 2 11z" fill={color ?? c.mustard} />
      </Svg>
    </View>
  );
}
