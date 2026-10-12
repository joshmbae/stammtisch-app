import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorState from "../components/ErrorState";
import StammtischLogo from "../components/StammtischLogo";
import { StammtischVerordnung } from "../types";
import { loadVerordnung, saveVerordnung } from "../utils/storage";
import { showAlert } from "../utils/alert";
import { useScreenLoad } from "../utils/useScreenLoad";
import { FONT, TYPE, ThemeColors } from "../constants/design";
import { useThemedStyles } from "../contexts/ThemeContext";
import { gruendungsDauer, formatDauer, formatGruendungMonat } from "../utils/format";
import { Button, Card, HeaderIconButton, ListGroup, ListRow, Screen, ScreenHeader, SectionLabel } from "../components/ui";
import { SatzungSheet } from "../components/einstellungen/SatzungSheet";

/** Die Satzung zum Nachlesen; Regeln und Anmerkungen lassen sich über den Stift bearbeiten. */
export default function SatzungScreen() {
  const styles = useThemedStyles(makeStyles);
  const [verordnung, setVerordnung] = useState<StammtischVerordnung>({ name: "Mein Stammtisch", regeln: [] });
  const [bearbeiten, setBearbeiten] = useState(false);

  const { loading, refreshing, error, onRefresh, retry } = useScreenLoad(async () => {
    setVerordnung(await loadVerordnung());
  }, []);

  async function speichern(regeln: string[], sonstiges: string | undefined): Promise<boolean> {
    try {
      // Frisch laden, damit parallel geänderte Einstellungen nicht überschrieben werden.
      const aktuell = await loadVerordnung();
      const updated = { ...aktuell, regeln, sonstiges };
      await saveVerordnung(updated);
      setVerordnung(updated);
      return true;
    } catch (e: any) {
      showAlert("Fehler", "Speichern fehlgeschlagen: " + (e?.message ?? "Unbekannter Fehler.") + "\n\nBitte nochmal versuchen.");
      return false;
    }
  }

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={retry} />;

  const v = verordnung;
  const regeln = v.regeln.filter((r) => r.trim());
  const dauer = v.gruendungsjahr ? gruendungsDauer(v.gruendungsjahr) : null;
  const tagZeit = [v.stammtischTag, v.stammtischzeit ? `${v.stammtischzeit.replace(/\s*Uhr$/i, "")} Uhr` : null].filter(Boolean).join(" · ");

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={onRefresh}
      header={
        <ScreenHeader
          back
          title="Satzung"
          subtitle={`${v.name} · ${regeln.length ? `${regeln.length} ${regeln.length === 1 ? "Regel" : "Regeln"}` : "noch leer"}`}
          right={<HeaderIconButton icon="create-outline" label="Satzung bearbeiten" onPress={() => setBearbeiten(true)} />}
        />
      }
    >
      <Card enterIndex={0}>
        <View style={styles.kopf}>
          <StammtischLogo size={52} uri={v.logoUrl} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.name} numberOfLines={2}>{v.name}</Text>
            <Text style={styles.muted}>Stammtischverordnung</Text>
            {v.gruendungsjahr ? (
              <Text style={styles.muted}>
                gegründet {formatGruendungMonat(v.gruendungsjahr)}{dauer ? ` · ${formatDauer(dauer)}` : ""}
              </Text>
            ) : null}
          </View>
        </View>
      </Card>

      {v.treffpunkt || tagZeit ? (
        <ListGroup>
          {v.treffpunkt ? <ListRow title="Treffpunkt" subtitle={v.treffpunkt} icon="location-outline" ton="blue" /> : null}
          {tagZeit ? <ListRow title="Stammtischtag" subtitle={tagZeit} icon="time-outline" ton="blue" /> : null}
        </ListGroup>
      ) : null}

      {regeln.length > 0 ? (
        <Card enterIndex={1}>
          <SectionLabel meta={`${regeln.length}`}>Regeln</SectionLabel>
          <View style={styles.regeln}>
            {regeln.map((regel, i) => (
              <View key={i} style={styles.regel} accessible accessibilityLabel={`Regel ${i + 1}: ${regel}`}>
                <View style={styles.nr}>
                  <Text style={styles.nrText}>{i + 1}</Text>
                </View>
                <Text style={styles.regelText}>{regel}</Text>
              </View>
            ))}
          </View>
        </Card>
      ) : null}

      {v.sonstiges ? (
        <Card enterIndex={2}>
          <SectionLabel>Anmerkungen</SectionLabel>
          <Text style={styles.sonstiges}>{v.sonstiges}</Text>
        </Card>
      ) : null}

      {regeln.length === 0 && !v.sonstiges ? (
        <Card enterIndex={1} style={styles.leer}>
          <Text style={styles.leerText}>Noch keine Regeln hinterlegt. Schreibt auf, was bei euch am Stammtisch gilt.</Text>
          <Button label="Regeln schreiben" icon="create-outline" variant="blue" size="sm" onPress={() => setBearbeiten(true)} />
        </Card>
      ) : null}

      <SatzungSheet
        visible={bearbeiten}
        regeln={v.regeln}
        sonstiges={v.sonstiges}
        onClose={() => setBearbeiten(false)}
        onSave={speichern}
      />
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    kopf: { flexDirection: "row", alignItems: "center", gap: 14 },
    name: { ...TYPE.heading, fontSize: 19, color: c.textDark },
    muted: { ...TYPE.caption, fontSize: 13, color: c.textMuted, marginTop: 1 },
    regeln: { marginTop: 12, gap: 14 },
    regel: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
    nr: { width: 26, height: 26, borderRadius: 13, backgroundColor: c.blueBg, alignItems: "center", justifyContent: "center", marginTop: 1 },
    nrText: { fontFamily: FONT.w800, fontSize: 13, color: c.blue },
    regelText: { flex: 1, fontFamily: FONT.w600, fontSize: 15, lineHeight: 22, color: c.textDark },
    sonstiges: { ...TYPE.body, fontSize: 15, lineHeight: 22, color: c.textMid, marginTop: 10 },
    leer: { alignItems: "center", gap: 14, paddingVertical: 24 },
    leerText: { ...TYPE.body, fontSize: 14, lineHeight: 20, color: c.textMuted, textAlign: "center" },
  });
