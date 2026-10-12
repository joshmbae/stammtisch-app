import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { FONT, ThemeColors } from "../../constants/design";
import { useThemedStyles } from "../../contexts/ThemeContext";
import { PressableScale } from "./PressableScale";
import { Ton, tonFarben } from "./ton";
import { useColors } from "../../contexts/ThemeContext";

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  /** Kleines Element links, z. B. ein Avatar. */
  leading?: React.ReactNode;
  accessibilityLabel?: string;
}

/** Auswahl-Pille (Person, Filter). Ausgewählt: Tinte bzw. helle Fläche im Dunkeln. */
export function Chip({ label, selected, onPress, leading, accessibilityLabel }: ChipProps) {
  const styles = useThemedStyles(makeStyles);
  return (
    <PressableScale
      onPress={onPress}
      haptic={onPress ? "leicht" : undefined}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      style={[styles.chip, selected && styles.chipOn]}
      hitSlop={{ top: 5, bottom: 5 }}
    >
      {leading}
      <Text style={[styles.text, selected && styles.textOn]} numberOfLines={1}>
        {label}
      </Text>
    </PressableScale>
  );
}

/** Kleiner Status, z. B. „offen", „bezahlt". Nicht antippbar. */
export function StatusPill({ label, ton = "neutral" }: { label: string; ton?: Ton }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const f = tonFarben(ton, c);
  return (
    <View style={[styles.pill, { backgroundColor: f.bg }]}>
      <Text style={[styles.pillText, { color: f.fg }]}>{label}</Text>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    chip: {
      minHeight: 34, paddingHorizontal: 14, borderRadius: 999,
      backgroundColor: c.card, borderWidth: StyleSheet.hairlineWidth, borderColor: c.hairline,
      flexDirection: "row", alignItems: "center", gap: 8,
    },
    // Hell: Tinte; dunkel: Signalgelb, damit die Auswahl leuchtet.
    chipOn: c.heroStyle === "outline" ? { backgroundColor: c.mustard, borderColor: c.mustard } : { backgroundColor: c.textDark, borderColor: c.textDark },
    text: { fontFamily: FONT.w600, fontSize: 14, color: c.textDark },
    textOn: { color: c.heroStyle === "outline" ? c.onMustard : c.background },
    pill: { alignSelf: "flex-start", height: 24, paddingHorizontal: 9, borderRadius: 999, justifyContent: "center" },
    pillText: { fontFamily: FONT.w600, fontSize: 12 },
  });
