import React, { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import { Spiel, SpielEreignisTyp, SPIEL_VORLAGEN, StammtischVerordnung } from "../types";
import { instantiateSpielVorlage, loadAllEreignisTypen, loadSpiele, loadVerordnung } from "../utils/storage";
import { formatBetrag } from "../utils/format";

import { showAlert } from "../utils/alert";
import { useScreenLoad } from "../utils/useScreenLoad";
import { TYPE, ThemeColors } from "../constants/design";
import { useThemedStyles } from "../contexts/ThemeContext";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorState from "../components/ErrorState";
import OfflineBanner from "../components/OfflineBanner";
import { Button, Card, FormSection, HeaderIconButton, ListGroup, ListRow, Screen, ScreenHeader } from "../components/ui";
import { WeitereSpiele } from "../components/spiele/SpielFormular";


export default function SpieleScreen() {
  const styles = useThemedStyles(makeStyles);
  const [spiele, setSpiele] = useState<Spiel[]>([]);
  const [typen, setTypen] = useState<SpielEreignisTyp[]>([]);
  const [verordnung, setVerordnung] = useState<StammtischVerordnung | null>(null);
  const [vorlageBusy, setVorlageBusy] = useState<string | null>(null);

  const { loading, refreshing, error, onRefresh, retry } = useScreenLoad(async () => {
    const [s, v] = await Promise.all([loadSpiele(), loadVerordnung()]);
    setSpiele(s);
    setVerordnung(v);
    setTypen(await loadAllEreignisTypen(s.map((x) => x.id)));
  }, []);

  async function vorlageAnlegen(vorlage: (typeof SPIEL_VORLAGEN)[number]) {
    setVorlageBusy(vorlage.name);
    try {
      const spiel = await instantiateSpielVorlage(vorlage);
      router.push(`/spiel/${spiel.id}`);
    } catch {
      showAlert("Fehler", "Spiel-Vorlage konnte nicht angelegt werden.");
    } finally {
      setVorlageBusy(null);
    }
  }

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={retry} />;

  const aktiv = spiele.find((s) => s.id === verordnung?.aktivesSpielId);
  const ereignisText = (spielId: string) =>
    typen
      .filter((t) => t.spielId === spielId)
      .map((t) => (t.strafBetrag ? `${t.label} (${formatBetrag(t.strafBetrag)})` : t.label))
      .join(", ");

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={onRefresh}
      contentStyle={{ gap: 16 }}
      header={
        <>
          <OfflineBanner />
          <ScreenHeader
            back
            title="Spiele"
            subtitle={`${spiele.length} ${spiele.length === 1 ? "Spiel" : "Spiele"}${aktiv ? ` · ${aktiv.name} aktiv` : ""}`}
            right={<HeaderIconButton icon="add" label="Neues Spiel" onPress={() => router.push("/spiel/new")} />}
          />
        </>
      }
    >
      {spiele.length === 0 ? (
        <Card enterIndex={0} style={{ gap: 12, alignItems: "center", paddingVertical: 24 }}>
          <Text style={styles.leer}>Noch keine Spiele. Legt ein eigenes an oder übernehmt unten eine Vorlage.</Text>
          <Button label="Neues Spiel" icon="add" variant="blue" size="sm" onPress={() => router.push("/spiel/new")} />
        </Card>
      ) : (
        <FormSection title="Eure Spiele">
          <ListGroup>
            {spiele.map((s) => (
              <ListRow
                key={s.id}
                title={s.name}
                subtitle={ereignisText(s.id) || "noch keine Ereignisse"}
                value={verordnung?.aktivesSpielId === s.id ? "aktiv" : undefined}
                emoji={s.emoji ?? "🎮"}
                ton="mustard"
                onPress={() => router.push(`/spiel/${s.id}`)}
              />
            ))}
          </ListGroup>
          <Text style={styles.hinweis}>Welches Spiel am Abend läuft, legt ihr im Spiel über „Aktiv" oder in den Einstellungen fest.</Text>
        </FormSection>
      )}

      <WeitereSpiele titel="Vorlagen" spiele={spiele} mitSpielen={false} busy={vorlageBusy} onVorlage={vorlageAnlegen} />
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    leer: { ...TYPE.body, fontSize: 14, lineHeight: 20, color: c.textMuted, textAlign: "center" },
    hinweis: { ...TYPE.caption, fontSize: 13, color: c.textMuted, paddingHorizontal: 4 },
  });
