import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useThemedStyles } from "../../../contexts/ThemeContext";
import { ThemeColors } from "../../../constants/design";
import { TerminAbend } from "../../../utils/useTerminAbend";
import { abendStats } from "../../../utils/abendStats";
import { hauptEreignis } from "../../../utils/spiel";
import { showAlert } from "../../../utils/alert";
import { Button, SegmentedTabs, TabItem } from "../../ui";
import { AnwesendListe } from "./AnwesendListe";
import { StrafenErfassen } from "./StrafenErfassen";
import { formatBetrag } from "../../../utils/format";
import { SpielZaehler } from "./SpielZaehler";

export type LiveBereich = "anwesend" | "strafen" | "spiel";
type Bereich = LiveBereich;

/** Zuletzt genutzter Bereich je Termin: wer zurückkommt, landet wieder dort (z. B. direkt beim Spiel). */
const zuletzt = new Map<string, Bereich>();

/**
 * Während des Abends: wer da ist, Strafen, Spiel – jeder Bereich mit eigenem
 * Verlauf darunter. startBereich kommt aus dem Link (z. B. Home → „Schocken“).
 */
export function LiveView({ abend, start, now, startBereich }: { abend: TerminAbend; start: Date | null; now: Date; startBereich?: Bereich }) {
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
  // Für Strafen alle (auch „unentschuldigt fehlen"), wer da ist zuerst.
  const fuerStrafen = [...da, ...mitglieder.filter((m) => !t.anwesenheit?.includes(m.id))];

  const spielStrafen = new Set(Object.values(abend.spielLogMap).flat().map((l) => l.strafLogId).filter(Boolean));
  // Dieselbe Summe wie Danach, Home und Kasse: Strafen inklusive Spiel, der Spielanteil extra genannt.
  const alleStrafen = Object.values(abend.strafMap).flat();
  const strafenSumme = alleStrafen.reduce((s, l) => s + l.betrag, 0);
  const spielSumme = alleStrafen.filter((l) => spielStrafen.has(l.id)).reduce((s, l) => s + l.betrag, 0);
  const haupt = hauptEreignis(abend.ereignisTypen);
  const hauptAnzahl = haupt ? Object.values(abend.spielLogMap).flat().filter((l) => l.ereignisTypId === haupt.id).length : 0;

  const items: TabItem<Bereich>[] = [{ key: "anwesend", label: "Anwesend", sub: `${da.length} von ${mitglieder.length}` }];
  if (abend.verordnung.tabStrafenAktiv !== false) items.push({ key: "strafen", label: "Strafen", sub: spielSumme > 0 ? `${formatBetrag(strafenSumme)} · ${formatBetrag(spielSumme)} Spiel` : formatBetrag(strafenSumme) });
  if (abend.aktivesSpiel) items.push({ key: "spiel", label: abend.aktivesSpiel.name, sub: haupt ? `${hauptAnzahl}× ${haupt.label}` : undefined });
  const aktiv = items.some((i) => i.key === bereich) ? bereich : "anwesend";
  const strafenAn = items.some((i) => i.key === "strafen");
  const wechseln = (b: Bereich) => { setStrafeFuer(null); setBereich(b); };

  return (
    <>
      <SegmentedTabs variant="live" items={items} value={aktiv} onChange={wechseln} />
      {aktiv === "anwesend" ? <AnwesendListe
          abend={abend} mitglieder={mitglieder} start={start}
          onStrafe={strafenAn ? (id) => { setStrafeFuer(id); setBereich("strafen"); } : undefined}
        /> : null}
      {aktiv === "strafen" ? <StrafenErfassen abend={abend} mitglieder={fuerStrafen} vorauswahl={strafeFuer} /> : null}
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
