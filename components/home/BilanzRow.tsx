import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";
import { FONT, MAX_FONT_SCALE, MOTION, TYPE, ThemeColors } from "../../constants/design";
import { SYMBOL } from "../../constants/symbole";
import { useColors, useThemedStyles } from "../../contexts/ThemeContext";
import { Card, IconSquircle, Krone, Ring, SectionLabel, tonFuerRangliste } from "../ui";

export interface Platzierung {
  key: string;
  emoji: string;
  kurz: string;
  platz: number;
}

export interface BilanzWerte {
  jahr: string;
  /** null = in diesem Jahr noch kein Stammtisch seit Mitgliedsbeginn */
  quote: number | null;
  dabei: number;
  abende: number;
  offen: number;
  /** Eigene Plätze in den Ranglisten des Jahres, beste zuerst. */
  platzierungen: Platzierung[];
}
const RING_GROESSE = 46;
const SYMBOL_GROESSE = 28;

/**
 * Jahresbilanz in drei gleich gewichteten Spalten: Anwesenheit (Ring),
 * offene Strafen und die eigenen Platzierungen, die reihum wechseln (beste
 * zuerst). Bewusst flach gehalten.
 */
export function BilanzRow({ werte, onPress }: { werte: BilanzWerte; onPress: () => void }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const fokus = useIsFocused();
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const anzahl = werte.platzierungen.length;

  useEffect(() => {
    if (!fokus || reduce || anzahl < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % anzahl), MOTION.wechsel);
    return () => clearInterval(id);
  }, [fokus, reduce, anzahl]);

  const platz = anzahl ? werte.platzierungen[index % anzahl] : null;
  const offenText = `${werte.offen.toLocaleString("de-DE", { maximumFractionDigits: 2 })} €`;
  const label = [
    `Deine Bilanz ${werte.jahr}`,
    werte.abende ? `${werte.dabei} von ${werte.abende} Abenden dabei, ${werte.quote ?? 0} Prozent` : "noch kein Abend",
    `${offenText} offen`,
    ...werte.platzierungen.map((p) => `${p.kurz}: Platz ${p.platz}`),
  ].join(", ");

  return (
    <Card onPress={onPress} enterIndex={1} accessibilityLabel={label} style={{ paddingTop: 12, paddingBottom: 14 }}>
      <SectionLabel>{`Deine Bilanz ${werte.jahr}`}</SectionLabel>
      <View style={styles.row}>
        <View style={styles.spalte}>
          <Ring progress={(werte.quote ?? 0) / 100} size={RING_GROESSE} stroke={5}>
            <Text style={styles.ringText} maxFontSizeMultiplier={1}>{werte.quote === null ? "–" : `${werte.quote}%`}</Text>
          </Ring>
          <Text style={[styles.label, { marginTop: 4 }]} numberOfLines={1}>{werte.abende ? "dabei" : "noch kein Abend"}</Text>
        </View>

        <View style={styles.trenner} />

        <View style={styles.spalte}>
          <IconSquircle emoji={SYMBOL.strafe} ton={werte.offen > 0 ? "coral" : "green"} size={SYMBOL_GROESSE} />
          <Text style={[styles.wert, { color: werte.offen > 0 ? c.coralText : c.success }]} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE}>{offenText}</Text>
          <Text style={styles.label} numberOfLines={1}>offen</Text>
        </View>

        <View style={styles.trenner} />

        {platz ? (
          <Animated.View key={platz.key} entering={reduce ? undefined : FadeIn.duration(300)} style={styles.spalte}>
            <IconSquircle emoji={platz.emoji} ton={tonFuerRangliste(platz.key)} size={SYMBOL_GROESSE} />
            <View style={styles.wertZeile}>
              {platz.platz === 1 ? <Krone size={12} /> : null}
              <Text style={[styles.wert, { marginTop: 0 }]} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE}>{`Platz ${platz.platz}`}</Text>
            </View>
            <Text style={styles.label} numberOfLines={1}>{platz.kurz}</Text>
          </Animated.View>
        ) : (
          <View style={styles.spalte}>
            <IconSquircle emoji={SYMBOL.pokal} size={SYMBOL_GROESSE} />
            <Text style={styles.wert} numberOfLines={1}>–</Text>
            <Text style={styles.label} numberOfLines={1}>noch kein Platz</Text>
          </View>
        )}
      </View>
    </Card>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    row: { flexDirection: "row", alignItems: "stretch", marginTop: 10 },
    spalte: { flex: 1, minWidth: 0, alignItems: "center", justifyContent: "center", gap: 1 },
    trenner: { width: StyleSheet.hairlineWidth, backgroundColor: c.border, marginVertical: 4 },
    ringText: { ...TYPE.num, fontSize: 13, color: c.textDark },
    wertZeile: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 4 },
    wert: { ...TYPE.num, fontSize: 16, color: c.textDark, marginTop: 4 },
    label: { fontFamily: FONT.w600, fontSize: 12, color: c.textMuted },
  });
