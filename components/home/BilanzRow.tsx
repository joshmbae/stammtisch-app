import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FONT, MAX_FONT_SCALE, TYPE, ThemeColors } from "../../constants/design";
import { useColors, useThemedStyles } from "../../contexts/ThemeContext";
import { Card, Krone, Ring, SectionLabel } from "../ui";

export interface BilanzWerte {
  jahr: string;
  /** null = in diesem Jahr noch kein Stammtisch seit Mitgliedsbeginn */
  quote: number | null;
  dabei: number;
  abende: number;
  haupt: { label: string; emoji?: string; anzahl: number; fuehrt: boolean } | null;
  verspaetungMin: number;
  offen: number;
}

/** Kompakte Jahresbilanz in einer Zeile: Ring für „dabei", daneben drei Werte. */
export function BilanzRow({ werte, onPress }: { werte: BilanzWerte; onPress: () => void }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const offenText = werte.offen > 0 ? `${werte.offen.toLocaleString("de-DE", { maximumFractionDigits: 2 })} €` : "0 €";
  const label = `Deine Bilanz ${werte.jahr}: ${werte.quote ?? 0} Prozent dabei, ${werte.haupt ? `${werte.haupt.anzahl} ${werte.haupt.label}, ` : ""}${werte.verspaetungMin} Minuten zu spät, ${offenText} offen`;
  return (
    <Card onPress={onPress} enterIndex={1} accessibilityLabel={label} style={{ paddingTop: 12, paddingBottom: 14 }}>
      <SectionLabel meta={werte.abende ? `${werte.dabei} von ${werte.abende} Abenden dabei` : "noch kein Abend"}>{`Deine Bilanz ${werte.jahr}`}</SectionLabel>
      <View style={styles.row}>
        <Ring progress={(werte.quote ?? 0) / 100} size={52} stroke={7}>
          <Text style={styles.ringText} maxFontSizeMultiplier={1.1}>{werte.quote === null ? "–" : `${werte.quote}%`}</Text>
        </Ring>
        <View style={styles.trenner} />
        <View style={styles.werte}>
          {werte.haupt ? (
            <Wert wert={`${werte.haupt.anzahl}×`} label={werte.haupt.label} emoji={werte.haupt.emoji} krone={werte.haupt.fuehrt} flex={1.25} />
          ) : null}
          <Wert wert={`${werte.verspaetungMin}′`} label="zu spät" icon="time-outline" iconColor={c.coralText} flex={1} />
          <Wert wert={offenText} label="offen" icon="cash-outline" iconColor={werte.offen > 0 ? c.coralText : c.success} farbe={werte.offen > 0 ? c.coralText : c.success} flex={0.9} />
        </View>
      </View>
    </Card>
  );
}

function Wert({ wert, label, emoji, icon, iconColor, krone, farbe, flex }: {
  wert: string; label: string; emoji?: string; icon?: React.ComponentProps<typeof Ionicons>["name"]; iconColor?: string; krone?: boolean; farbe?: string; flex: number;
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={{ flex, minWidth: 0 }}>
      <View style={styles.wertZeile}>
        <Text style={[styles.wert, farbe ? { color: farbe } : null]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{wert}</Text>
        {krone ? <Krone size={14} /> : null}
      </View>
      <View style={styles.labelZeile}>
        {emoji ? <Text style={styles.emoji}>{emoji}</Text> : icon ? <Ionicons name={icon} size={12} color={iconColor ?? c.textMuted} /> : null}
        <Text style={styles.label} numberOfLines={1}>{label}</Text>
      </View>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    row: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8 },
    ringText: { ...TYPE.num, fontSize: 14, color: c.textDark },
    trenner: { width: StyleSheet.hairlineWidth, alignSelf: "stretch", backgroundColor: c.border },
    werte: { flex: 1, flexDirection: "row", gap: 10 },
    wertZeile: { flexDirection: "row", alignItems: "center", gap: 3 },
    wert: { ...TYPE.num, fontSize: 20, color: c.textDark },
    labelZeile: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 1 },
    emoji: { fontSize: 11 },
    label: { fontFamily: FONT.w600, fontSize: 12, color: c.textMuted, flexShrink: 1 },
  });
