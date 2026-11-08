import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TYPE } from "../../constants/design";
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
 * Vorher › Live › Danach als ruhige Zeile im Kopf des Termins. Der Punkt
 * markiert, wo der Abend gerade steht (live pulsierend, immer voll sichtbar);
 * hell ist die offene Ansicht, die anderen sind ausgegraut. Antippen öffnet die jeweilige
 * Ansicht, z. B. während des Abends kurz die Zusagen oder danach Live
 * korrigieren.
 */
export function PhasenZeile({ phase, ansicht, onChange, farbe, punkt }: Phasen & {
  /** Textfarbe auf der jeweiligen Fläche. */
  farbe: string;
  /** Farbe des Punkts an der aktuellen Phase. */
  punkt: string;
}) {
  return (
    <View style={styles.zeile} accessibilityRole="tablist" accessibilityLabel="Phase des Abends">
      {PHASEN.map((p, i) => {
        const offen = p.key === ansicht;
        const jetzt = p.key === phase;
        return (
          <React.Fragment key={p.key}>
            {i > 0 ? <Ionicons name="chevron-forward" size={11} color={farbe} style={styles.pfeil} /> : null}
            <PressableScale
              onPress={() => onChange(p.key)}
              haptic="leicht"
              hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }}
              style={styles.phase}
              accessibilityRole="tab"
              accessibilityState={{ selected: offen }}
              accessibilityLabel={`${p.label}${jetzt ? (p.key === "live" ? ", läuft gerade" : ", aktuell") : ""}`}
            >
              {jetzt ? (p.key === "live" ? <PulseDot color={punkt} size={8} /> : <View style={[styles.punkt, { backgroundColor: punkt }]} />) : null}
              <Text style={[styles.label, { color: farbe, opacity: offen ? 1 : 0.5 }]}>{p.label}</Text>
            </PressableScale>
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  zeile: { flexDirection: "row", alignItems: "center", marginBottom: 2 },
  phase: { flexDirection: "row", alignItems: "center", gap: 6, height: 24 },
  pfeil: { marginHorizontal: 6, opacity: 0.45 },
  punkt: { width: 8, height: 8, borderRadius: 4 },
  label: { ...TYPE.label },
});
