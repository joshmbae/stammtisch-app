import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { FONT } from "../../constants/design";
import { TerminPhase } from "../../utils/terminPhase";
import { PressableScale, PulseDot } from "../ui";

const PHASEN: { key: TerminPhase; label: string }[] = [
  { key: "vorher", label: "Vorher" },
  { key: "live", label: "Live" },
  { key: "danach", label: "Danach" },
];

export interface Phasen {
  /** Wo der Abend gerade steht (aus der Uhrzeit). */
  phase: TerminPhase;
  /** Welche Ansicht gerade offen ist. */
  ansicht: TerminPhase;
  onChange: (p: TerminPhase) => void;
}

/**
 * Vorher · Live · Danach als Kapsel im Kopf des Termins. Die offene Ansicht
 * sitzt als heller Chip in der Kapsel, die anderen stehen daneben. Der Punkt
 * markiert, wo der Abend gerade steht (live pulsierend). Antippen öffnet die
 * jeweilige Ansicht, z. B. während des Abends kurz die Zusagen oder danach
 * Live korrigieren.
 */
export function PhasenZeile({ phase, ansicht, onChange, farbe, punkt, aktivText, grund }: Phasen & {
  /** Textfarbe der nicht gewählten Phasen auf der jeweiligen Fläche. */
  farbe: string;
  /** Farbe des Punkts an der aktuellen Phase, wenn sie nicht gewählt ist. */
  punkt: string;
  /** Text- und Punktfarbe im hellen Chip der gewählten Phase. */
  aktivText: string;
  /** Untergrund: Foto (dunkles Glas), Farbfläche (helles Glas) oder helle Fläche (Senf, dunkel getönt). */
  grund: "foto" | "farbe" | "hell";
}) {
  return (
    <View
      style={[styles.kapsel, grund === "foto" ? styles.kapselFoto : grund === "hell" ? styles.kapselHell : styles.kapselGlas]}
      accessibilityRole="tablist"
      accessibilityLabel="Phase des Abends"
    >
      {PHASEN.map((p) => {
        const offen = p.key === ansicht;
        const jetzt = p.key === phase;
        const punktFarbe = offen ? aktivText : punkt;
        return (
          <PressableScale
            key={p.key}
            onPress={() => onChange(p.key)}
            haptic="leicht"
            hitSlop={{ top: 6, bottom: 6 }}
            style={[styles.segment, offen && styles.segmentOffen]}
            accessibilityRole="tab"
            accessibilityState={{ selected: offen }}
            accessibilityLabel={`${p.label}${jetzt ? (p.key === "live" ? ", läuft gerade" : ", aktuell") : ""}`}
          >
            {jetzt ? (p.key === "live" ? <PulseDot color={punktFarbe} size={8} /> : <View style={[styles.punkt, { backgroundColor: punktFarbe }]} />) : null}
            <Text style={[styles.label, { color: offen ? aktivText : farbe }, !offen && styles.labelZu]} maxFontSizeMultiplier={1.3}>{p.label}</Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  kapsel: { flexDirection: "row", alignSelf: "flex-start", alignItems: "center", padding: 3, borderRadius: 999, marginBottom: 8, borderWidth: StyleSheet.hairlineWidth },
  kapselGlas: { backgroundColor: "rgba(255,255,255,0.14)", borderColor: "rgba(255,255,255,0.22)" },
  kapselFoto: { backgroundColor: "rgba(20,18,16,0.45)", borderColor: "rgba(255,255,255,0.22)" },
  kapselHell: { backgroundColor: "rgba(60,40,0,0.08)", borderColor: "rgba(60,40,0,0.10)" },
  segment: { flexDirection: "row", alignItems: "center", gap: 6, height: 32, paddingHorizontal: 14, borderRadius: 999 },
  segmentOffen: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2,
  },
  punkt: { width: 8, height: 8, borderRadius: 4 },
  label: { fontFamily: FONT.w700, fontSize: 14 },
  labelZu: { opacity: 0.85 },
});
