import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useThemedStyles } from "../../../contexts/ThemeContext";
import { ThemeColors } from "../../../constants/design";
import { TerminAbend } from "../../../utils/useTerminAbend";
import { abendStats } from "../../../utils/abendStats";
import { hauptEreignis } from "../../../utils/spiel";
import { showAlert } from "../../../utils/alert";
import { Button, SegmentedTabs, TabItem } from "../../ui";
import { AnwesendGrid } from "./AnwesendGrid";
import { StrafenErfassen, euroKurz } from "./StrafenErfassen";
import { SpielZaehler } from "./SpielZaehler";
import { Verlauf } from "./Verlauf";

type Bereich = "anwesend" | "strafen" | "spiel";

/** Während des Abends: wer da ist, Strafen, Spiel – und darunter der Verlauf zum Rückgängigmachen. */
export function LiveView({ abend, start, now }: { abend: TerminAbend; start: Date | null; now: Date }) {
  const t = abend.termin!;
  const [bereich, setBereich] = useState<Bereich>("anwesend");
  const { mitglieder } = abendStats(t, abend.members, [], []);
  const da = mitglieder.filter((m) => t.anwesenheit?.includes(m.id));
  // Für Strafen alle (auch „unentschuldigt fehlen"), wer da ist zuerst.
  const fuerStrafen = [...da, ...mitglieder.filter((m) => !t.anwesenheit?.includes(m.id))];

  const spielStrafen = new Set(Object.values(abend.spielLogMap).flat().map((l) => l.strafLogId).filter(Boolean));
  const strafenSumme = Object.values(abend.strafMap).flat().filter((l) => !spielStrafen.has(l.id)).reduce((s, l) => s + l.betrag, 0);
  const haupt = hauptEreignis(abend.ereignisTypen);
  const hauptAnzahl = haupt ? Object.values(abend.spielLogMap).flat().filter((l) => l.ereignisTypId === haupt.id).length : 0;

  const items: TabItem<Bereich>[] = [{ key: "anwesend", label: "Anwesend", sub: `${da.length} von ${mitglieder.length}` }];
  if (abend.verordnung.tabStrafenAktiv !== false) items.push({ key: "strafen", label: "Strafen", sub: euroKurz(strafenSumme) });
  if (abend.aktivesSpiel) items.push({ key: "spiel", label: abend.aktivesSpiel.name, sub: haupt ? `${hauptAnzahl}× ${haupt.label}` : undefined });
  const aktiv = items.some((i) => i.key === bereich) ? bereich : "anwesend";

  return (
    <>
      <SegmentedTabs variant="live" items={items} value={aktiv} onChange={setBereich} />
      {aktiv === "anwesend" ? <AnwesendGrid abend={abend} mitglieder={mitglieder} start={start} now={now} /> : null}
      {aktiv === "strafen" ? <StrafenErfassen abend={abend} mitglieder={fuerStrafen} /> : null}
      {aktiv === "spiel" ? <SpielZaehler abend={abend} mitglieder={da} /> : null}
      <Verlauf abend={abend} />
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
