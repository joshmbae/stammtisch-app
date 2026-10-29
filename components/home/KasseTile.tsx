import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { MAX_FONT_SCALE, TYPE, ThemeColors, glow } from "../../constants/design";
import { useColors, useThemedStyles } from "../../contexts/ThemeContext";
import { formatEuro } from "../../utils/format";
import { PressableScale } from "../ui";

/**
 * Kassenstand als große Zahl, darunter Münzstapel pro Monat: je höher der
 * Stand, desto höher der Stapel; der laufende Monat ist dunkel bzw. leuchtet.
 */
export function KasseTile({ saldo, monate, onPress }: { saldo: number; monate: { stand: number }[]; onPress: () => void }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const werte = monate.map((m) => m.stand);
  const min = Math.min(...werte, 0);
  const max = Math.max(...werte, 1);
  const stapel = werte.map((v) => Math.round(2 + ((v - min) / (max - min || 1)) * 5));
  const betrag = formatEuro(saldo).replace(/,00$/, "");
  const dunkel = c.heroStyle === "outline";

  return (
    <PressableScale
      onPress={onPress}
      style={[styles.tile, { borderColor: c.mustardEdge }, glow(c.mustard, c, 18)]}
      accessibilityLabel={`Kasse: ${betrag} Euro`}
    >
      <View style={styles.kopf}>
        <Text style={[styles.label, { color: dunkel ? c.mustard : c.onMustard }]}>Kasse</Text>
        <View style={[styles.pfeil, { backgroundColor: dunkel ? c.cardAlt : c.textDark }]}>
          <Ionicons name="arrow-forward" size={12} color={dunkel ? c.mustard : c.mustardTile} style={{ transform: [{ rotate: "-45deg" }] }} />
        </View>
      </View>
      <Text style={[styles.betrag, { color: dunkel ? c.textDark : c.onMustard }, saldo < 0 && { color: c.coralText }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
        {betrag}
        <Text style={styles.euro}> €</Text>
      </Text>
      <View style={styles.stapelZeile} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {stapel.map((n, i) => {
          const aktuell = i === stapel.length - 1;
          return (
            <View key={i} style={styles.stapel}>
              {Array.from({ length: n }).map((_, k) => (
                <Animated.View
                  key={k}
                  entering={FadeInDown.delay(300 + i * 70 + k * 35).duration(260)}
                  style={[
                    styles.muenze,
                    {
                      backgroundColor: aktuell
                        ? (dunkel ? (k % 2 ? "#FFE08A" : c.mustard) : (k % 2 ? "#3A3631" : c.textDark))
                        : (dunkel ? "rgba(255,201,60,0.22)" : "rgba(28,27,25,0.24)"),
                    },
                  ]}
                />
              ))}
            </View>
          );
        })}
      </View>
    </PressableScale>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    tile: { flex: 1, minHeight: 132, borderRadius: 24, padding: 14, backgroundColor: c.mustardTile, borderWidth: 1 },
    kopf: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    label: { ...TYPE.label },
    pfeil: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
    betrag: { ...TYPE.num, fontSize: 24, lineHeight: 28, marginTop: 6 },
    euro: { fontSize: 18 },
    stapelZeile: { flexDirection: "row", alignItems: "flex-end", gap: 6, height: 40, marginTop: "auto" },
    stapel: { flex: 1, flexDirection: "column-reverse", gap: 1.5 },
    muenze: { height: 4, borderRadius: 3 },
  });
