import React, { useState } from "react";
import { ActivityIndicator, Image, Modal, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { FONT, MAX_FONT_SCALE, RADIUS, TYPE, ThemeColors } from "../../constants/design";
import { useColors, useTheme, useThemedStyles } from "../../contexts/ThemeContext";
import { showAlert } from "../../utils/alert";
import { Button, LiveTimer, PressableScale, PulseDot, Scrim } from "../ui";

interface Props {
  titel: string;
  untertitel: string;
  bildUrl?: string;
  uploading: boolean;
  onUpload: (localUri: string) => Promise<void>;
  onRemove: () => Promise<void>;
  onBack: () => void;
  onEdit: () => void;
  /** Während der Abend läuft: grünes Band mit Timer statt Foto. */
  live?: { start: Date; now: Date };
}

const FOTO_HOEHE = 200;

/**
 * Kopf des Termins: mit Foto füllt es das Band (Tippen = groß ansehen), ohne
 * Foto ein ruhiges Band mit „Foto hinzufügen". Titel und Datum stehen immer
 * hier, damit der Rahmen in allen Phasen gleich bleibt.
 */
export function PhotoBand({ titel, untertitel, bildUrl, uploading, onUpload, onRemove, onBack, onEdit, live }: Props) {
  const c = useColors();
  const { scheme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [gross, setGross] = useState(false);

  async function waehlen() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showAlert("Kein Zugriff", "Bitte erlaube den Zugriff auf die Fotobibliothek in den Einstellungen.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: "images", allowsEditing: true, aspect: [16, 9], quality: 0.8 });
    if (result.canceled) return;
    try {
      await onUpload(result.assets[0].uri);
    } catch {
      showAlert("Fehler", "Das Foto konnte nicht hochgeladen werden.");
    }
  }

  function entfernen() {
    showAlert("Foto entfernen?", "Das Foto wird für alle aus dem Termin entfernt.", [
      { text: "Abbrechen", style: "cancel" },
      { text: "Entfernen", style: "destructive", onPress: async () => { setGross(false); await onRemove(); } },
    ]);
  }

  const knoepfe = (
    <View style={[styles.knopfZeile, { top: insets.top + 8 }]} pointerEvents="box-none">
      <PressableScale onPress={onBack} style={styles.rund} accessibilityLabel="Zurück" hitSlop={6}>
        <Ionicons name="chevron-back" size={20} color={c.textDark} />
      </PressableScale>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {bildUrl ? (
          <PressableScale onPress={waehlen} style={styles.fotoPill} accessibilityLabel="Foto ändern" disabled={uploading}>
            {uploading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="camera-outline" size={16} color="#FFFFFF" />}
            <Text style={styles.fotoPillText}>Foto</Text>
          </PressableScale>
        ) : null}
        <PressableScale onPress={onEdit} style={styles.rund} accessibilityLabel="Termin bearbeiten" hitSlop={6}>
          <Ionicons name="pencil" size={18} color={c.textDark} />
        </PressableScale>
      </View>
    </View>
  );

  const vollbild = bildUrl ? (
    <Modal visible={gross} transparent animationType="fade" onRequestClose={() => setGross(false)} statusBarTranslucent>
      <View style={[styles.vollbild, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.vollKopf}>
          <View style={{ flex: 1 }}>
            <Text style={styles.vollTitel} numberOfLines={1}>{titel}</Text>
            <Text style={styles.vollUnter} numberOfLines={1}>{untertitel}</Text>
          </View>
          <PressableScale onPress={() => setGross(false)} style={styles.rundHell} accessibilityLabel="Foto schließen">
            <Ionicons name="close" size={20} color="#1C1B19" />
          </PressableScale>
        </View>
        <Image source={{ uri: bildUrl }} style={styles.vollBild} resizeMode="contain" accessibilityLabel={`Foto zu ${titel}`} />
        <View style={styles.vollAktionen}>
          <Button label="Ändern" icon="camera-outline" variant="secondary" onPress={() => { setGross(false); waehlen(); }} style={{ flex: 1 }} />
          <Button label="Entfernen" icon="trash-outline" variant="danger" onPress={entfernen} style={{ flex: 1 }} />
        </View>
      </View>
    </Modal>
  ) : null;

  if (live) {
    const dunkel = c.heroStyle === "outline";
    return (
      <View style={[styles.liveBand, { paddingTop: insets.top + 8, backgroundColor: c.live, borderBottomColor: c.liveEdge }]}>
        <StatusBar style="light" />
        <View style={[styles.liveRing, { borderColor: dunkel ? "rgba(61,220,151,0.08)" : "rgba(255,255,255,0.07)" }]} pointerEvents="none" />
        <View style={styles.liveKnoepfe}>
          <PressableScale onPress={onBack} style={[styles.rund, dunkel && styles.rundDunkel]} accessibilityLabel="Zurück" hitSlop={6}>
            <Ionicons name="chevron-back" size={20} color={dunkel ? c.onLive : c.textDark} />
          </PressableScale>
          <PressableScale
            onPress={() => (bildUrl ? setGross(true) : waehlen())}
            style={[styles.rund, styles.rundGlas]}
            accessibilityLabel={bildUrl ? "Foto ansehen" : "Foto hinzufügen"}
            disabled={uploading}
          >
            {uploading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="camera-outline" size={19} color={c.onLive} />}
          </PressableScale>
        </View>
        <View style={styles.liveFuss}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={styles.liveLabelZeile}>
              <PulseDot color={c.liveAccent} size={8} />
              <Text style={[styles.liveLabel, { color: dunkel ? c.liveAccent : c.heroBlueSub }]}>Läuft gerade</Text>
            </View>
            <Text style={[styles.titel, { color: c.onLive }]} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE} accessibilityRole="header">{titel}</Text>
            <Text style={[styles.unter, { color: c.liveSub }]} numberOfLines={1}>{untertitel}</Text>
          </View>
          <LiveTimer start={live.start} now={live.now} style={[styles.liveTimer, { color: dunkel ? c.liveAccent : c.onLive }]} />
        </View>
        {vollbild}
      </View>
    );
  }

  if (bildUrl) {
    return (
      <View style={{ height: FOTO_HOEHE + insets.top, backgroundColor: c.textDark }}>
        <StatusBar style="light" />
        <PressableScale onPress={() => setGross(true)} scaleTo={1} style={StyleSheet.absoluteFill} accessibilityLabel="Foto groß ansehen">
          <Image source={{ uri: bildUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <Scrim top={0.45} bottom={0.8} />
        </PressableScale>
        {knoepfe}
        <View style={styles.titelAufFoto} pointerEvents="none">
          <Text style={[styles.titel, { color: "#FFFFFF" }]} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE} accessibilityRole="header">{titel}</Text>
          <Text style={[styles.unter, { color: "rgba(255,255,255,0.88)" }]} numberOfLines={1}>{untertitel}</Text>
        </View>

        {vollbild}
      </View>
    );
  }

  return (
    <View style={[styles.ohneFoto, { paddingTop: insets.top + 8 }]}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      {knoepfe}
      <View style={styles.hinzuZeile}>
        <PressableScale onPress={waehlen} style={styles.hinzu} disabled={uploading} accessibilityLabel="Foto zum Termin hinzufügen">
          {uploading ? <ActivityIndicator size="small" color={c.blue} /> : <Ionicons name="camera-outline" size={17} color={c.blue} />}
          <Text style={styles.hinzuText}>{uploading ? "Lädt hoch …" : "Foto hinzufügen"}</Text>
        </PressableScale>
      </View>
      <View style={styles.titelOhneFoto}>
        <Text style={styles.titel} numberOfLines={2} maxFontSizeMultiplier={MAX_FONT_SCALE} accessibilityRole="header">{titel}</Text>
        <Text style={styles.unter} numberOfLines={1}>{untertitel}</Text>
      </View>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    knopfZeile: { position: "absolute", left: 16, right: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center", zIndex: 2 },
    rund: {
      width: 44, height: 44, borderRadius: 22, backgroundColor: c.card, alignItems: "center", justifyContent: "center",
      borderWidth: StyleSheet.hairlineWidth, borderColor: c.hairline,
    },
    rundHell: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
    fotoPill: {
      height: 44, paddingHorizontal: 14, borderRadius: RADIUS.pill, flexDirection: "row", alignItems: "center", gap: 6,
      backgroundColor: "rgba(20,18,16,0.55)",
    },
    fotoPillText: { fontFamily: FONT.w700, fontSize: 14, color: "#FFFFFF" },
    liveBand: { overflow: "hidden", paddingBottom: 16, borderBottomWidth: 1 },
    liveRing: { position: "absolute", width: 300, height: 300, borderRadius: 150, borderWidth: 44, right: -90, top: -70 },
    liveKnoepfe: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16, height: 44 },
    liveFuss: { flexDirection: "row", alignItems: "flex-end", gap: 12, paddingHorizontal: 20, marginTop: 52 },
    liveLabelZeile: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
    liveLabel: { ...TYPE.label },
    liveTimer: { fontSize: 36, lineHeight: 40, letterSpacing: -1 },
    rundDunkel: { backgroundColor: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.12)" },
    rundGlas: { backgroundColor: "rgba(255,255,255,0.12)", borderColor: "transparent" },
    titelAufFoto: { position: "absolute", left: 20, right: 20, bottom: 14 },
    titel: { ...TYPE.title, fontSize: 26, color: c.textDark },
    unter: { fontFamily: FONT.w600, fontSize: 13, color: c.textMuted, marginTop: 2 },
    ohneFoto: { backgroundColor: c.cardAlt, paddingBottom: 16 },
    hinzuZeile: { height: 44, alignItems: "center", justifyContent: "center", marginTop: 52 },
    hinzu: {
      height: 44, paddingHorizontal: 18, borderRadius: RADIUS.pill, flexDirection: "row", alignItems: "center", gap: 8,
      backgroundColor: c.card, borderWidth: StyleSheet.hairlineWidth, borderColor: c.hairline,
    },
    hinzuText: { fontFamily: FONT.w700, fontSize: 14, color: c.blue },
    titelOhneFoto: { paddingHorizontal: 20, marginTop: 18 },
    vollbild: { flex: 1, backgroundColor: "rgba(12,11,10,0.94)", paddingHorizontal: 16, gap: 16 },
    vollKopf: { flexDirection: "row", alignItems: "center", gap: 12 },
    vollTitel: { fontFamily: FONT.w800, fontSize: 17, color: "#FFFFFF" },
    vollUnter: { fontFamily: FONT.w600, fontSize: 13, color: "rgba(255,255,255,0.7)" },
    vollBild: { flex: 1, width: "100%", borderRadius: RADIUS.md },
    vollAktionen: { flexDirection: "row", gap: 10 },
  });
