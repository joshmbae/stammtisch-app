import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useThemedStyles } from "../../../contexts/ThemeContext";
import { ThemeColors } from "../../../constants/design";
import { TerminAbend } from "../../../utils/useTerminAbend";
import { abendStats } from "../../../utils/abendStats";
import { showAlert } from "../../../utils/alert";
import { Button, SegmentedTabs, TabItem } from "../../ui";
import { Heute } from "./Heute";
import { StrafenErfassen } from "./StrafenErfassen";
import { SpielZaehler } from "./SpielZaehler";

export type LiveBereich = "anwesend" | "strafen" | "spiel";
type Bereich = LiveBereich;

/** Zuletzt genutzter Bereich je Termin: wer zurückkommt, landet wieder dort (z. B. direkt beim Spiel). */
const zuletzt = new Map<string, Bereich>();

/**
 * Während des Abends: Heute (Agenda, wer dabei ist, Verspätungen), Strafen,
 * Spiel – jeder Bereich mit eigenem Verlauf darunter. Der Schlüssel
 * „anwesend" bleibt für bestehende Links. startBereich kommt aus dem Link (z. B. Home → „Schocken“).
 */
export function LiveView({ abend, start, now, startBereich, onZusagen }: {
  abend: TerminAbend; start: Date | null; now: Date; startBereich?: Bereich;
  /** Zur Vorher-Ansicht (Zusagen), dort wird geregelt, wer dabei ist. */
  onZusagen: () => void;
}) {
  const t = abend.termin!;
  const [bereich, setBereichState] = useState<Bereich>(() => {
    const b = startBereich ?? zuletzt.get(t.id) ?? "anwesend";
    zuletzt.set(t.id, b);
    return b;
  });
  const setBereich = (b: Bereich) => { zuletzt.set(t.id, b); setBereichState(b); };
  const [strafeFuer, setStrafeFuer] = useState<string | null>(null);
  const { mitglieder } = abendStats(t, abend.members, [], []);
  const da = mitglieder.filter((m) => t.anwesenheit?.includes(m.id));
  // Für Strafen auch, wer nicht da ist (z. B. „unentschuldigt fehlen“).
  const nichtDa = mitglieder.filter((m) => !t.anwesenheit?.includes(m.id));

  // Nur die Überbegriffe; Zahlen stehen in den Bereichen selbst.
  const items: TabItem<Bereich>[] = [{ key: "anwesend", label: "Heute" }];
  if (abend.verordnung.tabStrafenAktiv !== false) items.push({ key: "strafen", label: "Strafen" });
  if (abend.aktivesSpiel) items.push({ key: "spiel", label: abend.aktivesSpiel.name });
  const aktiv = items.some((i) => i.key === bereich) ? bereich : "anwesend";
  const strafenAn = items.some((i) => i.key === "strafen");
  const wechseln = (b: Bereich) => { setStrafeFuer(null); setBereich(b); };

  return (
    <>
      <SegmentedTabs variant="live" items={items} value={aktiv} onChange={wechseln} />
      {aktiv === "anwesend" ? <Heute
          abend={abend} dabei={da} start={start} onZusagen={onZusagen}
          onStrafe={strafenAn ? (id) => { setStrafeFuer(id); setBereich("strafen"); } : undefined}
        /> : null}
      {aktiv === "strafen" ? <StrafenErfassen abend={abend} dabei={da} andere={nichtDa} vorauswahl={strafeFuer} /> : null}
      {aktiv === "spiel" ? <SpielZaehler abend={abend} mitglieder={da} /> : null}
    </>
  );
}

/** Feste Leiste unten: Abend beenden. Ohne Knopfdruck endet er um 4 Uhr von selbst. */
export function BeendenLeiste({ abend }: { abend: TerminAbend }) {
  const styles = useThemedStyles(makeStyles);
  const [busy, setBusy] = useState(false);

  function beenden() {
    showAlert("Abend beenden?", "Danach siehst du die Zusammenfassung. Einträge lassen sich weiter korrigieren.", [
      { text: "Abbrechen", style: "cancel" },
      {
        text: "Beenden",
        onPress: async () => {
          setBusy(true);
          try { await abend.abendBeenden(); } catch { showAlert("Fehler", "Der Abend konnte nicht beendet werden."); } finally { setBusy(false); }
        },
      },
    ]);
  }

  return (
    <View style={styles.leiste}>
      <Button label="Abend beenden" icon="stop" variant="secondary" haptic="mittel" loading={busy} onPress={beenden} style={{ height: 56 }} />
    </View>
  );
}

const makeStyles = (_c: ThemeColors) =>
  StyleSheet.create({
    leiste: { paddingHorizontal: 16, paddingTop: 10 },
  });
