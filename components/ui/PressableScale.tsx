import React from "react";
import { Platform, Pressable, PressableProps, StyleProp, ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { MOTION } from "../../constants/design";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type HapticArt = "leicht" | "mittel" | "erfolg";

export function haptik(art: HapticArt) {
  if (Platform.OS === "web") return;
  if (art === "erfolg") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  else Haptics.impactAsync(art === "mittel" ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

interface Props extends Omit<PressableProps, "style"> {
  style?: StyleProp<ViewStyle>;
  /** Kurzes Vibrieren beim Antippen (nur auf dem Gerät). */
  haptic?: HapticArt;
  /** Wie stark die Fläche beim Drücken einfedert, 1 = gar nicht. */
  scaleTo?: number;
}

/**
 * Basis für alles Antippbare: federt beim Drücken leicht ein. Das ist ein
 * Transform, die Layout-Größe bleibt also gleich und nichts daneben springt.
 */
export function PressableScale({ style, haptic, scaleTo = MOTION.tapScale, onPressIn, onPressOut, onPress, disabled, ...rest }: Props) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPressIn={(e) => {
        scale.value = withSpring(scaleTo, MOTION.spring);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, MOTION.spring);
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic) haptik(haptic);
        onPress?.(e);
      }}
      style={[style, animated, disabled ? { opacity: 0.45 } : null]}
      {...rest}
    />
  );
}
