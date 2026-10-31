import React, { forwardRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { FONT } from "../../constants/design";

export interface RueckblickKachel {
  emoji: string;
  /** Groß: wer bzw. wie viel, z. B. „Sepp“ oder „18 €“. */
  wert: string;
  /** Klein darunter, z. B. „Schock-Aus · 3×“. */
  text: string;
}

interface Props {
  datum: string;
  titel: string;
  zeile: string;
  kacheln: RueckblickKachel[];
  fehlten: string[];
  stammtisch: string;
}

/** Feste Größe 4:5, wird mit 3-facher Auflösung als Bild gespeichert (1080 × 1350). */
export const RUECKBLICK_BREITE = 360;

/**
 * Rückblick auf einen Abend als Bild für die WhatsApp-Gruppe. Bewusst feste
 * Farben (Live-Grün der App, egal ob Hell oder Dunkel): es ist ein Bild, das
 * außerhalb der App gezeigt wird. Ohne runde Ecken, sonst werden sie im Bild
 * schwarz. Wird unsichtbar gerendert und nur abfotografiert.
 */
export const RueckblickBild = forwardRef<View, Props>(function RueckblickBild({ datum, titel, zeile, kacheln, fehlten, stammtisch }, ref) {
  return (
    <View ref={ref} collapsable={false} style={styles.bild}>
      <View style={styles.ring} />
      <Text style={styles.kicker}>{`RÜCKBLICK · ${datum.toUpperCase()}`}</Text>
      <Text style={styles.titel} numberOfLines={2}>{titel}</Text>
      <Text style={styles.zeile}>{zeile}</Text>
      <View style={styles.kacheln}>
        {kacheln.slice(0, 4).map((k) => (
          <View key={`${k.emoji}${k.text}`} style={styles.kachel}>
            <Text style={styles.emoji}>{k.emoji}</Text>
            <Text style={styles.wert} numberOfLines={1}>{k.wert}</Text>
            <Text style={styles.text} numberOfLines={2}>{k.text}</Text>
          </View>
        ))}
      </View>
      <View style={styles.fuss}>
        <Text style={styles.fussText} numberOfLines={1}>
          {fehlten.length === 0 ? "Alle waren da 🎉" : `${fehlten.join(", ")} ${fehlten.length === 1 ? "hat" : "haben"} gefehlt`}
        </Text>
        <Text style={[styles.fussText, styles.fussRechts]} numberOfLines={1}>{`🍻 ${stammtisch}`}</Text>
      </View>
    </View>
  );
});

const GRUEN = "#24553F";
const SENF = "#E2B347";
const HELL = "#CFE0D5";

const styles = StyleSheet.create({
  bild: { width: RUECKBLICK_BREITE, height: RUECKBLICK_BREITE * 1.25, backgroundColor: GRUEN, padding: 24, gap: 10, overflow: "hidden" },
  ring: { position: "absolute", right: -70, top: -70, width: 220, height: 220, borderRadius: 110, borderWidth: 28, borderColor: "rgba(255,255,255,0.06)" },
  kicker: { fontFamily: FONT.w700, fontSize: 12, letterSpacing: 1.2, color: SENF },
  titel: { fontFamily: FONT.w800, fontSize: 28, lineHeight: 32, letterSpacing: -0.5, color: "#FFFFFF" },
  zeile: { fontFamily: FONT.w600, fontSize: 14, color: HELL },
  kacheln: { marginTop: "auto", flexDirection: "row", flexWrap: "wrap", gap: 8 },
  kachel: { width: (RUECKBLICK_BREITE - 48 - 8) / 2, minHeight: 92, borderRadius: 16, padding: 12, gap: 2, backgroundColor: "rgba(255,255,255,0.1)" },
  emoji: { fontSize: 22 },
  wert: { fontFamily: FONT.w800, fontSize: 17, color: "#FFFFFF" },
  text: { fontFamily: FONT.w500, fontSize: 12, lineHeight: 15, color: HELL },
  fuss: { flexDirection: "row", gap: 8, marginTop: 4 },
  fussText: { fontFamily: FONT.w600, fontSize: 12, color: HELL, flexShrink: 1 },
  fussRechts: { marginLeft: "auto" },
});
