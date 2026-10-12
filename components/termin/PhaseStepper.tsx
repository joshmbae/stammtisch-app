import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { FONT, RADIUS, ThemeColors } from "../../constants/design";
import { useColors, useThemedStyles } from "../../contexts/ThemeContext";
import { TerminPhase } from "../../utils/terminPhase";
import { PressableScale, PulseDot } from "../ui";

const PHASEN: { key: TerminPhase; label: string }[] = [
  { key: "vorher", label: "Vorher" },
  { key: "live", label: "Live" },
  { key: "danach", label: "Danach" },
];

/**
 * Vorher — Live — Danach. Zeigt, wo der Abend gerade steht (`phase`), und
 * lässt jede Ansicht öffnen (`ansicht`), z. B. nachträglich Live korrigieren.
 */
export function PhaseStepper({ phase, ansicht, onChange }: { phase: TerminPhase; ansicht: TerminPhase; onChange: (p: TerminPhase) => void }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  // Dunkel ist die Live-Fläche fast schwarz, deshalb dort der Mint-Rand.
  const farben: Record<TerminPhase, { bg: string; rand: string; fg: string; punkt: string; punktAktiv: string }> = {
    vorher: { bg: c.blue, rand: c.blue, fg: c.onAccent, punkt: c.blue, punktAktiv: c.mustard },
    live: { bg: c.live, rand: c.heroStyle === "outline" ? c.liveEdge : c.live, fg: c.onLive, punkt: c.success, punktAktiv: c.liveAccent },
    danach: { bg: c.mustard, rand: c.mustard, fg: c.onMustard, punkt: c.mustard, punktAktiv: c.onMustard },
  };

  return (
    <View style={styles.leiste} accessibilityRole="tablist" accessibilityLabel="Phase des Abends">
      {PHASEN.map((p, i) => {
        const gewaehlt = p.key === ansicht;
        const f = farben[p.key];
        const jetzt = p.key === phase;
        return (
          <React.Fragment key={p.key}>
            {i > 0 ? <View style={styles.linie} /> : null}
            <PressableScale
              onPress={() => onChange(p.key)}
              haptic="leicht"
              accessibilityRole="tab"
              accessibilityState={{ selected: gewaehlt }}
              accessibilityLabel={`${p.label}${jetzt ? ", aktuell" : ""}`}
              style={[styles.pill, gewaehlt ? { backgroundColor: f.bg, borderColor: f.rand, borderWidth: 1 } : null]}
            >
              {jetzt && p.key === "live" ? (
                <PulseDot color={gewaehlt ? f.punktAktiv : f.punkt} size={8} />
              ) : (
                <View style={[styles.punkt, { backgroundColor: gewaehlt ? f.punktAktiv : f.punkt }]} />
              )}
              <Text style={[styles.text, gewaehlt && { color: f.fg }]}>{p.label}</Text>
            </PressableScale>
          </React.Fragment>
        );
      })}
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    leiste: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 },
    linie: { flex: 1, height: 2, borderRadius: 1, backgroundColor: c.borderDark, marginHorizontal: 6, minWidth: 10 },
    pill: {
      height: 44, paddingHorizontal: 16, borderRadius: RADIUS.pill, flexDirection: "row", alignItems: "center", gap: 8,
      backgroundColor: c.card, borderWidth: StyleSheet.hairlineWidth, borderColor: c.hairline,
    },
    punkt: { width: 8, height: 8, borderRadius: 4 },
    text: { fontFamily: FONT.w700, fontSize: 14, color: c.textDark },
  });
