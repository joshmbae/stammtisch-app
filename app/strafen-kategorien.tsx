import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Spiel, SpielEreignisTyp, StrafKategorieDef, STRAF_KATEGORIEN_VORLAGEN } from "../types";
import {
  loadStrafKategorien,
  addStrafKategorie,
  updateStrafKategorie,
  deleteStrafKategorie,
  instantiateStrafKategorieVorlage,
  loadSpiele,
  loadAllEreignisTypen,
} from "../utils/storage";
import { formatEuro } from "../utils/format";
import { useScreenLoad } from "../utils/useScreenLoad";
import { useSingleFlight } from "../utils/useSingleFlight";
import { showAlert } from "../utils/alert";
import { FONT, MAX_FONT_SCALE, RADIUS, TYPE, ThemeColors } from "../constants/design";
import { useColors, useThemedStyles } from "../contexts/ThemeContext";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorState from "../components/ErrorState";
import OfflineBanner from "../components/OfflineBanner";
import {
  Card,
  FormSection,
  HeaderIconButton,
  IconSquircle,
  KategorieIcon,
  ListGroup,
  ListRow,
  PressableScale,
  Screen,
  ScreenHeader,
  StatusPill,
} from "../components/ui";
import { KategorieForm, KategorieSheet } from "../components/einstellungen/KategorieSheet";

const euro = (n: number) => `${formatEuro(n).replace(",00", "")} €`;

interface SpielKategorie {
  kat: StrafKategorieDef;
  spiel?: Spiel;
}

export default function StrafenKategorienScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const guard = useSingleFlight();
  const [kategorien, setKategorien] = useState<StrafKategorieDef[]>([]);
  const [ausSpielen, setAusSpielen] = useState<SpielKategorie[]>([]);
  // undefined = zu, null = neue Kategorie, sonst die bearbeitete.
  const [sheet, setSheet] = useState<StrafKategorieDef | null | undefined>(undefined);

  const { loading, refreshing, error, onRefresh, retry } = useScreenLoad(async () => {
    const [kats, spiele] = await Promise.all([loadStrafKategorien(), loadSpiele()]);
    const typen: SpielEreignisTyp[] = await loadAllEreignisTypen(spiele.map((s) => s.id));
    // Kategorien aus Spiel-Ereignissen werden beim jeweiligen Spiel verwaltet
    // (Betrag/Label dort), hier nur zur Übersicht mit Sprung ins Spiel.
    setKategorien(kats.filter((k) => !k.spielEreignisTypId));
    setAusSpielen(
      kats
        .filter((k) => k.spielEreignisTypId)
        .map((k) => {
          const typ = typen.find((t) => t.id === k.spielEreignisTypId);
          return { kat: k, spiel: spiele.find((s) => s.id === typ?.spielId) };
        })
    );
  }, []);

  async function handleSave(form: KategorieForm) {
    if (sheet) {
      // Leere Beschreibung explizit mitschicken, sonst bliebe die alte stehen
      // (undefined wird beim Update übersprungen).
      await updateStrafKategorie(sheet.id, { ...form, beschreibung: form.beschreibung ?? "" });
      setKategorien((prev) => prev.map((k) => (k.id === sheet.id ? { ...k, ...form } : k)));
    } else {
      const kat = await addStrafKategorie({ ...form, reihenfolge: kategorien.length });
      setKategorien((prev) => [...prev, kat]);
    }
  }

  async function handleDelete(k: StrafKategorieDef) {
    await deleteStrafKategorie(k.id);
    setKategorien((prev) => prev.filter((x) => x.id !== k.id));
  }

  async function handleVorlage(vorlage: (typeof STRAF_KATEGORIEN_VORLAGEN)[number]) {
    try {
      const kat = await instantiateStrafKategorieVorlage(vorlage, kategorien.length);
      setKategorien((prev) => [...prev, kat]);
    } catch {
      showAlert("Fehler", "Die Vorlage konnte nicht übernommen werden.");
    }
  }

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={retry} />;

  const vorlagenOffen = STRAF_KATEGORIEN_VORLAGEN.filter((v) => !kategorien.some((k) => k.label === v.label));
  const untertitel = [
    `${kategorien.length} ${kategorien.length === 1 ? "Kategorie" : "Kategorien"}`,
    ausSpielen.length ? `${ausSpielen.length} aus Spielen` : null,
  ].filter(Boolean).join(" · ");

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
            title="Strafenkatalog"
            subtitle={untertitel}
            right={<HeaderIconButton icon="add" label="Neue Kategorie" onPress={() => setSheet(null)} />}
          />
        </>
      }
    >
      <View style={styles.info}>
        <Ionicons name="information-circle-outline" size={18} color={c.blue} />
        <Text style={styles.infoText}>Strafen aus Spielen werden im Spiel verwaltet.</Text>
      </View>

      <FormSection title="Kategorien">
        {kategorien.length === 0 ? <Text style={styles.leer}>Noch keine Kategorien. Oben mit + anlegen oder eine Vorlage übernehmen.</Text> : null}
        {kategorien.map((k, i) => {
          const frei = k.betrag <= 0;
          return (
            <Card
              key={k.id}
              enterIndex={i}
              onPress={() => setSheet(k)}
              accessibilityLabel={`${k.label}, ${frei ? "Betrag frei" : euro(k.betrag)}${k.istSystem ? ", Systemkategorie" : ""}. Bearbeiten`}
              style={styles.kat}
            >
              <KategorieIcon kat={k} size={48} />
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <View style={styles.titelReihe}>
                  <Text style={styles.katLabel} numberOfLines={2}>{k.label}</Text>
                  {k.istSystem ? <StatusPill label="System" /> : null}
                </View>
                {k.beschreibung || frei ? (
                  <Text style={styles.katSub} numberOfLines={2}>{k.beschreibung || "Betrag beim Erfassen frei wählbar"}</Text>
                ) : null}
              </View>
              <Text style={[styles.betrag, frei && styles.betragFrei]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                {frei ? "frei" : euro(k.betrag)}
              </Text>
            </Card>
          );
        })}
      </FormSection>

      {ausSpielen.length > 0 ? (
        <FormSection title="Aus Spielen (automatisch)">
          {ausSpielen.map(({ kat, spiel }) => (
            <Card
              key={kat.id}
              onPress={spiel ? () => router.push(`/spiel/${spiel.id}`) : undefined}
              accessibilityLabel={`${spiel ? `${spiel.name}, ` : ""}${kat.label}, ${euro(kat.betrag)}, automatisch. Im Spiel bearbeiten`}
              style={styles.kat}
            >
              <IconSquircle emoji={spiel?.emoji ?? kat.emoji} ton="mustard" size={48} />
              <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                <Text style={styles.katLabel} numberOfLines={2}>{spiel ? `${spiel.name} · ${kat.label}` : kat.label}</Text>
                <View style={styles.titelReihe}>
                  <StatusPill label="automatisch" ton="blue" />
                  {spiel ? <Text style={styles.link}>im Spiel</Text> : null}
                </View>
              </View>
              <Text style={styles.betrag} maxFontSizeMultiplier={MAX_FONT_SCALE}>{euro(kat.betrag)}</Text>
              {spiel ? <Ionicons name="chevron-forward" size={18} color={c.textMuted} /> : null}
            </Card>
          ))}
        </FormSection>
      ) : null}

      {vorlagenOffen.length > 0 ? (
        <FormSection title="Vorlagen">
          <ListGroup>
            {vorlagenOffen.map((v) => (
              <ListRow
                key={v.label}
                title={v.label}
                subtitle={v.beschreibung}
                right={
                  <View style={styles.vorlageRechts}>
                    <Text style={styles.vorlageBetrag}>{euro(v.betrag)}</Text>
                    <PressableScale onPress={() => guard(() => handleVorlage(v))} style={styles.plus} accessibilityLabel={`Vorlage ${v.label} übernehmen`}>
                      <Ionicons name="add" size={22} color={c.blue} />
                    </PressableScale>
                  </View>
                }
              />
            ))}
          </ListGroup>
        </FormSection>
      ) : null}

      <KategorieSheet
        visible={sheet !== undefined}
        kategorie={sheet ?? null}
        onClose={() => setSheet(undefined)}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    info: {
      flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: c.blueBg,
      borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 10,
    },
    infoText: { ...TYPE.caption, fontSize: 13, color: c.blue, flex: 1 },
    leer: { ...TYPE.body, fontSize: 14, color: c.textMuted, paddingHorizontal: 4 },
    kat: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14 },
    titelReihe: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
    katLabel: { fontFamily: FONT.w800, fontSize: 16, color: c.textDark, flexShrink: 1 },
    katSub: { ...TYPE.caption, fontSize: 13, color: c.textMuted },
    betrag: { ...TYPE.num, fontSize: 24, color: c.textDark },
    betragFrei: { color: c.textMuted },
    link: { fontFamily: FONT.w700, fontSize: 13, color: c.blue },
    vorlageRechts: { flexDirection: "row", alignItems: "center", gap: 10 },
    vorlageBetrag: { fontFamily: FONT.w700, fontSize: 15, color: c.textMid },
    plus: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.blueBg, alignItems: "center", justifyContent: "center" },
  });
