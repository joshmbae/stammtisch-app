import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { router, useLocalSearchParams } from "expo-router";
import { TYPE, ThemeColors } from "../../constants/design";
import { useColors, useThemedStyles } from "../../contexts/ThemeContext";
import { useTerminAbend } from "../../utils/useTerminAbend";
import { useNow } from "../../utils/useNow";
import { TerminPhase, terminPhase, terminStart } from "../../utils/terminPhase";
import { formatWochentagDatum } from "../../utils/date";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorState from "../../components/ErrorState";
import OfflineBanner from "../../components/OfflineBanner";
import { Button } from "../../components/ui";
import { PhotoBand } from "../../components/termin/PhotoBand";
import { PhaseStepper } from "../../components/termin/PhaseStepper";
import { StartLeiste, VorherView } from "../../components/termin/VorherView";
import { DanachView } from "../../components/termin/DanachView";
import { LiveAlt } from "../../components/termin/LiveAlt";
import { TerminEditSheet } from "../../components/termin/TerminEditSheet";

const uhr = (d: Date) => d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

function zurueck() {
  if (router.canGoBack()) router.back();
  else router.replace("/(tabs)/kalender");
}

/**
 * Ein Termin in drei Phasen: Vorher, Live, Danach. Die Phase ergibt sich aus
 * der Uhrzeit (utils/terminPhase); über die Leiste lässt sich jede Ansicht
 * öffnen. Daten und Aktionen kommen aus useTerminAbend, die Ansichten sind
 * reine Darstellung.
 */
export default function TerminScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const abend = useTerminAbend(id);
  const now = useNow(1000);
  const [ansicht, setAnsicht] = useState<TerminPhase | null>(null);
  const [bearbeiten, setBearbeiten] = useState(false);

  if (abend.loading) return <LoadingSpinner />;
  if (abend.error) return <ErrorState message={abend.error} onRetry={abend.retry} />;

  const termin = abend.termin;
  if (!termin) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.nichtGefunden}>
          <Text style={styles.nichtGefundenText}>Diesen Termin gibt es nicht mehr.</Text>
          <Button label="Zu den Terminen" variant="secondary" onPress={zurueck} />
        </View>
      </SafeAreaView>
    );
  }

  const stammtischzeit = abend.verordnung.stammtischzeit;
  const start = terminStart(termin, stammtischzeit);
  const phase = terminPhase(termin, now, stammtischzeit);
  // Ohne eigene Wahl folgt die Ansicht der Phase, springt also zur Startzeit von selbst auf Live.
  const zeige = ansicht ?? phase;

  const tag = new Date(`${termin.datum}T00:00:00`);
  const heute = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tageBis = Math.round((tag.getTime() - heute.getTime()) / 86_400_000);
  const ort = termin.ort || abend.verordnung.treffpunkt;
  const untertitel = phase === "live"
    ? [`läuft seit ${uhr(start ?? now)}`, ort].filter(Boolean).join(" · ")
    : phase === "danach"
      ? [formatWochentagDatum(tag, true), ort, `${termin.anwesenheit?.length ?? 0} da`].filter(Boolean).join(" · ")
      : [formatWochentagDatum(tag, true), tageBis === 0 ? "heute" : tageBis === 1 ? "morgen" : `in ${tageBis} Tagen`].join(" · ");
  const titel = termin.titel ?? (termin.art === "stammtisch" ? "Stammtisch" : "Veranstaltung");

  return (
    <GestureHandlerRootView style={styles.root}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={abend.refreshing} onRefresh={abend.onRefresh} tintColor={c.textMuted} />}
        >
          <PhotoBand
            titel={titel}
            untertitel={untertitel}
            bildUrl={termin.bildUrl}
            uploading={abend.uploadingBild}
            onUpload={abend.bildHochladen}
            onRemove={abend.bildEntfernen}
            onBack={zurueck}
            onEdit={() => setBearbeiten(true)}
          />
          <OfflineBanner />
          <PhaseStepper phase={phase} ansicht={zeige} onChange={setAnsicht} />
          <View style={styles.inhalt}>
            {zeige === "vorher" ? <VorherView abend={abend} now={now} start={start} /> : null}
            {zeige === "live" ? <LiveAlt abend={abend} /> : null}
            {zeige === "danach" ? <DanachView abend={abend} start={start} /> : null}
          </View>
        </ScrollView>
        {zeige === "vorher" && phase === "vorher" ? (
          <View style={{ paddingBottom: Math.max(insets.bottom, 12), backgroundColor: c.background }}>
            <StartLeiste abend={abend} now={now} start={start} />
          </View>
        ) : null}
      </KeyboardAvoidingView>

      <TerminEditSheet
        visible={bearbeiten}
        termin={termin}
        onClose={() => setBearbeiten(false)}
        onSave={abend.speichern}
        onDelete={async () => {
          await abend.löschen();
          setBearbeiten(false);
          zurueck();
        }}
      />
    </GestureHandlerRootView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    inhalt: { paddingHorizontal: 16, gap: 12 },
    nichtGefunden: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 24 },
    nichtGefundenText: { ...TYPE.body, color: c.textMid, textAlign: "center" },
  });
