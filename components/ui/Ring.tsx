import React, { useEffect } from "react";
import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import Animated, { useAnimatedProps, useSharedValue, withTiming, Easing } from "react-native-reanimated";
import { useColors } from "../../contexts/ThemeContext";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  /** 0 … 1 */
  progress: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: React.ReactNode;
}

/** Fortschrittsring, der beim Erscheinen auf seinen Wert läuft. */
export function Ring({ progress, size = 96, stroke = 10, color, track, children }: Props) {
  const c = useColors();
  const r = (size - stroke) / 2;
  const umfang = 2 * Math.PI * r;
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(Math.max(0, Math.min(1, progress)), { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [progress]);
  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: umfang * (1 - p.value) }));
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track ?? c.greenSoft} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color ?? c.success}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${umfang} ${umfang}`}
          animatedProps={animatedProps}
        />
      </Svg>
      {children}
    </View>
  );
}
