import React, { useMemo, useState } from "react";
import { ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { StammtischVerordnung } from "../../types";
import { ThemeColors, TYPE } from "../../constants/design";
import { useThemedStyles } from "../../contexts/ThemeContext";
import { useSession } from "../../contexts/SessionContext";
import { loadVerordnung, saveRanglistenRichtung } from "../../utils/storage";
import { loadStatsDaten } from "../../utils/statsDaten";
import { useScreenLoad } from "../../utils/useScreenLoad";
import { showAlert } from "../../utils/alert";
import { useAdmin } from "../../utils/useAdmin";
import { displayName } from "../../utils/format";
import { toLocalIsoDate } from "../../utils/date";
import {
  ALLZEIT,
  JahrFilter,
  StatsDaten,
  aktuellesJahr,
  computeRangVerlauf,
  computeRanglisten,
  fuehrendeTitel,
  verfuegbareJahre,
  wertKurz,
} from "../../utils/stats";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorState from "../../components/ErrorState";
import OfflineBanner from "../../components/OfflineBanner";
import { Chip, HeaderIconButton, Screen, ScreenHeader } from "../../components/ui";
import { RanglisteKarte } from "../../components/tabelle/RanglisteKarte";

/**
 * Alle Wertungen auf einer Seite: pro Rangliste eine Karte mit den ersten
 * drei (alle auf Wunsch) und dem Trend seit dem letzten Abend. Gewertet wird
 * pro Kalenderjahr oder über alle Jahre.
 */
export default function TabelleScreen() {
  const styles = useThemedStyles(makeStyles);
  const { activeMemberId } = useSession();
  const { nurAdmin } = useAdmin();
  const [daten, setDaten] = useState<StatsDaten | null>(null);
  const [verordnung, setVerordnung] = useState<StammtischVerordnung | null>(null);
  const [jahr, setJahr] = useState<JahrFilter>(aktuellesJahr());
  const [alle, setAlle] = useState<Set<string>>(new Set());

  const screen = useScreenLoad(async () => {
    const [d, v] = await Promise.all([loadStatsDaten(), loadVerordnung()]);
    setDaten(d);
    setVerordnung(v);
  }, []);

  const jahre = useMemo(() => (daten ? verfuegbareJahre(daten) : [aktuellesJahr()]), [daten]);
  const listen = useMemo(() => (daten ? computeRanglisten(daten, jahr) : []), [daten, jahr]);
  // Badges zeigen immer die laufende Saison, egal welches Jahr gewählt ist.
  const fuehrende = useMemo(() => (daten ? fuehrendeTitel(daten, aktuellesJahr()) : new Map()), [daten]);
  const verlauf = useMemo(() => (daten ? computeRangVerlauf(daten, jahr) : null), [daten, jahr]);
  const abende = daten ? daten.termine.filter((t) => t.art === "stammtisch" && t.datum <= toLocalIsoDate(new Date()) && (jahr === ALLZEIT || t.datum.startsWith(jahr))).length : 0;

  function alleUmschalten(key: string) {
    const next = new Set(alle);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setAlle(next);
  }

  /** Viel ↔ wenig vorne, sofort sichtbar; gespeichert für die ganze Runde. */
  async function richtungUmschalten(key: string) {
    if (!daten) return;
    const vorher = daten.richtung ?? {};
    const neu = (vorher[key] ?? "viel") === "viel" ? "wenig" : "viel";
    setDaten({ ...daten, richtung: { ...vorher, [key]: neu } });
    try {
      const gespeichert = await saveRanglistenRichtung(key, neu);
      setDaten((d) => (d ? { ...d, richtung: gespeichert } : d));
    } catch {
      setDaten((d) => (d ? { ...d, richtung: vorher } : d));
      showAlert("Nicht gespeichert", "Die Rangliste konnte nicht umgestellt werden. Bitte später noch einmal.");
    }
  }

  async function teilen() {
    const kopf = `${verordnung?.name ?? "Stammtisch"} · Tabelle ${jahr === ALLZEIT ? "Allzeit" : jahr}`;
    const teile = listen.map((l) =>
      `${l.emoji} ${l.kurz}\n${l.eintraege.slice(0, 3).map((e) => `${e.platz}. ${displayName(e.member)} – ${wertKurz(l.key, e.wert)}`).join("\n")}`
    );
    try { await Share.share({ message: [kopf, ...teile].join("\n\n") }); } catch { /* abgebrochen */ }
  }

  const hinweis = (key: string) =>
    key.startsWith("spiel_") ? "Live am Abend erfasst." : key === "teilnahme" ? "Gezählt ab Mitgliedsbeginn, nur vergangene Abende." : undefined;

  return (
    <Screen
      withNav
      refreshing={screen.refreshing}
      onRefresh={screen.onRefresh}
      header={
        <ScreenHeader
          title="Tabelle"
          subtitle={`${jahr === ALLZEIT ? "Allzeit" : `Saison ${jahr}`} · ${abende} ${abende === 1 ? "Stammtisch" : "Stammtische"}`}
          right={listen.length > 0 ? <HeaderIconButton icon="share-outline" label="Tabelle teilen" onPress={teilen} /> : undefined}
        />
      }
    >
      <OfflineBanner />
      {screen.loading ? (
        <LoadingSpinner />
      ) : screen.error ? (
        <ErrorState message={screen.error} onRetry={screen.retry} />
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={styles.jahre}>
            {[...jahre, ALLZEIT].map((j) => (
              <Chip key={j} label={j === ALLZEIT ? "Allzeit" : j} selected={j === jahr} onPress={() => setJahr(j)} accessibilityLabel={j === ALLZEIT ? "Wertung über alle Jahre" : `Saison ${j}`} />
            ))}
          </ScrollView>
          {listen.length === 0 ? (
            <View style={styles.leer}><Text style={styles.leerText}>Noch keine Wertungen für diesen Zeitraum.</Text></View>
          ) : (
            listen.map((l, i) => (
              <RanglisteKarte
                key={`${jahr}-${l.key}`}
                liste={l}
                alle={alle.has(l.key)}
                onAlle={() => alleUmschalten(l.key)}
                onRichtung={l.umschaltbar ? () => nurAdmin(() => richtungUmschalten(l.key)) : undefined}
                ichId={activeMemberId}
                fuehrende={fuehrende}
                verlauf={verlauf}
                hinweis={hinweis(l.key)}
                enterIndex={i}
              />
            ))
          )}
        </>
      )}
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    jahre: { gap: 8, paddingHorizontal: 16 },
    leer: { paddingVertical: 32, alignItems: "center" },
    leerText: { ...TYPE.body, color: c.textMuted },
  });
