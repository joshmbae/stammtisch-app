import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { FONT, MAX_FONT_SCALE, TYPE, ThemeColors } from "../../constants/design";
import { useColors, useThemedStyles } from "../../contexts/ThemeContext";
import { Card, Emoji, Krone, Ring, SectionLabel } from "../ui";
import { SYMBOL } from "../../constants/symbole";

export interface BilanzWerte {
  jahr: string;
  /** null = in diesem Jahr noch kein Stammtisch seit Mitgliedsbeginn */
  quote: number | null;
  dabei: number;
  abende: number;
  haupt: { label: string; emoji?: string; anzahl: number; fuehrt: boolean } | null;
  offen: number;
}

/**
 * Kompakte Jahresbilanz in einer Zeile. Links die Anwesenheit als eine
 * Einheit (Ring mit Quote, daneben „6 von 8 Abenden“), rechts die offenen
 * Strafen und ganz außen der Wert im Hauptspiel.
 */
export function BilanzRow({ werte, onPress }: { werte: BilanzWerte; onPress: () => void }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const offenText = `${werte.offen.toLocaleString("de-DE", { maximumFractionDigits: 2 })} €`;
  const dabeiText = werte.abende ? `${werte.dabei} von ${werte.abende}` : "–";
  const label = [
    `Deine Bilanz ${werte.jahr}`,
    werte.abende ? `${werte.dabei} von ${werte.abende} Abenden dabei, ${werte.quote ?? 0} Prozent` : "noch kein Abend",
    `${offenText} offen`,
    werte.haupt ? `${werte.haupt.anzahl} ${werte.haupt.label}${werte.haupt.fuehrt ? ", du führst" : ""}` : null,
  ].filter(Boolean).join(", ");

  return (
    <Card onPress={onPress} enterIndex={1} accessibilityLabel={label} style={{ paddingTop: 12, paddingBottom: 14 }}>
      <SectionLabel>{`Deine Bilanz ${werte.jahr}`}</SectionLabel>
      <View style={styles.row}>
        <View style={styles.dabei}>
          <Ring progress={(werte.quote ?? 0) / 100} size={52} stroke={7}>
            <Text style={styles.ringText} maxFontSizeMultiplier={1.1}>{werte.quote === null ? "–" : `${werte.quote}%`}</Text>
          </Ring>
          <View style={{ flexShrink: 1, minWidth: 0 }}>
            <Text style={styles.wert} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE}>{dabeiText}</Text>
            <Text style={styles.label} numberOfLines={1}>{werte.abende ? "dabei" : "noch kein Abend"}</Text>
          </View>
        </View>
        <View style={styles.trenner} />
        <Wert
          wert={offenText}
          label="offen"
          emoji={SYMBOL.geld}
          farbe={werte.offen > 0 ? c.coralText : c.success}
        />
        {werte.haupt ? (
          <Wert wert={`${werte.haupt.anzahl}×`} label={werte.haupt.label} emoji={werte.haupt.emoji} krone={werte.haupt.fuehrt} />
        ) : null}
      </View>
    </Card>
  );
}

/** Rechtsbündiger Wert mit kleiner Beschriftung darunter. */
function Wert({ wert, label, emoji, krone, farbe }: {
  wert: string; label: string; emoji?: string; krone?: boolean; farbe?: string;
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.wertBox}>
      <View style={styles.wertZeile}>
        {krone ? <Krone size={14} /> : null}
        <Text style={[styles.wert, farbe ? { color: farbe } : null]} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE}>{wert}</Text>
      </View>
      <View style={styles.labelZeile}>
        {emoji ? <Emoji size={13}>{emoji}</Emoji> : null}
        <Text style={styles.label} numberOfLines={1}>{label}</Text>
      </View>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    row: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 8 },
    dabei: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 10 },
    ringText: { ...TYPE.num, fontSize: 14, color: c.textDark },
    trenner: { width: StyleSheet.hairlineWidth, alignSelf: "stretch", backgroundColor: c.border },
    wertBox: { alignItems: "flex-end", maxWidth: 96 },
    wertZeile: { flexDirection: "row", alignItems: "center", gap: 3 },
    wert: { ...TYPE.num, fontSize: 20, color: c.textDark },
    labelZeile: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 1 },
    label: { fontFamily: FONT.w600, fontSize: 12, color: c.textMuted, flexShrink: 1 },
  });
