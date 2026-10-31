import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";
import { FONT, TYPE, ThemeColors } from "../../../constants/design";
import { useColors, useThemedStyles } from "../../../contexts/ThemeContext";
import { Card, PressableScale, haptik } from "../../ui";

export interface VerlaufEintrag {
  id: string;
  /** Uhrzeit, z. B. „20:45"; fehlt, wenn es keine gibt. */
  zeit?: string;
  symbol?: React.ReactNode;
  wer: string;
  was?: string;
  /** Rechts, z. B. der Betrag. */
  rechts?: string;
  /** × zum Zurücknehmen; ohne gibt es keins. */
  loeschen?: () => Promise<void>;
}

/**
 * Verlauf eines Live-Bereichs (Anwesenheit, Strafen, Spiel) als schlichte
 * Liste: Uhrzeit, wer, was, ggf. Betrag und × zum Zurücknehmen.
 */
export function VerlaufListe({ titel, eintraege, leer, fuss }: { titel: string; eintraege: VerlaufEintrag[]; leer?: string; fuss?: React.ReactNode }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  if (eintraege.length === 0 && !leer && !fuss) return null;

  return (
    <View style={{ gap: 8, marginTop: 4 }}>
      <Text style={styles.label}>{eintraege.length > 0 ? `${titel} · ${eintraege.length}` : titel}</Text>
      <Card style={{ paddingVertical: 2, paddingHorizontal: 12 }}>
        {eintraege.length === 0 && leer ? <Text style={styles.leer}>{leer}</Text> : null}
        {eintraege.map((e, i) => (
          <Animated.View key={e.id} entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} layout={LinearTransition} style={[styles.zeile, i > 0 && styles.trenner]}>
            <Text style={styles.zeit}>{e.zeit ?? "–"}</Text>
            {e.symbol}
            <Text style={styles.text} numberOfLines={2}>
              <Text style={styles.wer}>{e.wer}</Text>
              {e.was ? ` · ${e.was}` : ""}
            </Text>
            {e.rechts ? <Text style={styles.rechts}>{e.rechts}</Text> : null}
            {e.loeschen ? (
              <PressableScale
                onPress={() => { haptik("leicht"); e.loeschen!().catch(() => {}); }}
                style={styles.x}
                hitSlop={8}
                accessibilityLabel={`${e.wer}${e.was ? `: ${e.was}` : ""} zurücknehmen`}
              >
                <Ionicons name="close" size={15} color={c.textMuted} />
              </PressableScale>
            ) : null}
          </Animated.View>
        ))}
        {fuss}
      </Card>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    label: { ...TYPE.label, color: c.textMuted },
    leer: { ...TYPE.body, fontSize: 14, color: c.textMuted, paddingVertical: 12 },
    zeile: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44, paddingVertical: 4 },
    trenner: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
    zeit: { fontFamily: FONT.w500, fontSize: 13, color: c.textMuted, width: 40, fontVariant: ["tabular-nums"] },
    text: { flex: 1, fontFamily: FONT.w400, fontSize: 14, color: c.textMid },
    wer: { fontFamily: FONT.w600, color: c.textDark },
    rechts: { ...TYPE.num, fontSize: 14, color: c.textDark },
    x: {
      width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center",
      backgroundColor: c.isDark ? "rgba(255,255,255,0.08)" : "rgba(28,27,25,0.06)",
    },
  });
