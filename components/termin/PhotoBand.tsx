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
  /** Ohne Foto: Standardmotiv – Fläche je Phase, Emoji je Termin-Art. */
  motiv: { flaeche: "blau" | "senf"; emoji: string };
}

const FOTO_HOEHE = 200;

/**
 * Kopf des Termins: mit Foto füllt es das Band (Tippen = groß ansehen), ohne
 * Foto ein Standardmotiv in der Farbe der Phase (wie die Karte auf Home) mit
 * großem Emoji der Termin-Art. Titel und Datum stehen immer hier, damit der
 * Rahmen in allen Phasen gleich bleibt.
 */
export function PhotoBand({ titel, untertitel, bildUrl, uploading, onUpload, onRemove, onBack, onEdit, live, motiv }: Props) {
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
      {/* Foto ändern/entfernen geht über Antippen des Fotos (Vollbild), daher hier kein eigener Knopf. */}
      <PressableScale onPress={onEdit} style={styles.rund} accessibilityLabel="Termin bearbeiten" hitSlop={6}>
        <Ionicons name="pencil" size={18} color={c.textDark} />
      </PressableScale>
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
        {uploading ? (
          <View style={styles.ladenAufFoto} pointerEvents="none">
            <ActivityIndicator size="small" color="#FFFFFF" />
          </View>
        ) : null}
        {knoepfe}
        <View style={styles.titelAufFoto} pointerEvents="none">
          <Text style={[styles.titel, { color: "#FFFFFF" }]} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE} accessibilityRole="header">{titel}</Text>
          <Text style={[styles.unter, { color: "rgba(255,255,255,0.88)" }]} numberOfLines={1}>{untertitel}</Text>
        </View>

        {vollbild}
      </View>
    );
  }

  // Ohne Foto: Standardmotiv. Im Glow-Look dunkle Fläche mit Akzentkante, wie die Hero-Karten.
  const dunkel = c.heroStyle === "outline";
  const blau = motiv.flaeche === "blau";
  const flaeche = blau
    ? { bg: c.heroBlue, kante: c.heroBlueEdge, text: c.onHeroBlue, sub: c.heroBlueSub, ring: dunkel ? "rgba(77,124,255,0.10)" : "rgba(255,255,255,0.08)" }
    : { bg: c.mustardSoft, kante: c.mustardEdge, text: c.textDark, sub: c.mustardText, ring: dunkel ? "rgba(255,201,60,0.08)" : "rgba(122,94,28,0.08)" };
  const hellerText = blau || dunkel;
  return (
    <View style={[styles.motiv, { height: FOTO_HOEHE + insets.top, backgroundColor: flaeche.bg, borderBottomColor: flaeche.kante }]}>
      <StatusBar style={hellerText ? "light" : "dark"} />
      <View style={[styles.motivRing, { borderColor: flaeche.ring }]} pointerEvents="none" />
      <Text style={styles.motivEmoji} maxFontSizeMultiplier={1} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{motiv.emoji}</Text>
      <View style={[styles.knopfZeile, { top: insets.top + 8 }]} pointerEvents="box-none">
        <PressableScale onPress={onBack} style={[styles.rund, styles.rundGlasMotiv]} accessibilityLabel="Zurück" hitSlop={6}>
          <Ionicons name="chevron-back" size={20} color={flaeche.text} />
        </PressableScale>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <PressableScale onPress={waehlen} style={[styles.rund, styles.rundGlasMotiv]} disabled={uploading} accessibilityLabel="Foto zum Termin hinzufügen" hitSlop={6}>
            {uploading ? <ActivityIndicator size="small" color={flaeche.text} /> : <Ionicons name="camera-outline" size={19} color={flaeche.text} />}
          </PressableScale>
          <PressableScale onPress={onEdit} style={[styles.rund, styles.rundGlasMotiv]} accessibilityLabel="Termin bearbeiten" hitSlop={6}>
            <Ionicons name="pencil" size={18} color={flaeche.text} />
          </PressableScale>
        </View>
      </View>
      <View style={[styles.titelAufFoto, { right: 116 }]}>
        <Text style={[styles.titel, { color: flaeche.text }]} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE} accessibilityRole="header">{titel}</Text>
        <Text style={[styles.unter, { color: flaeche.sub }]} numberOfLines={1}>{untertitel}</Text>
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
    // Beim Ersetzen des Fotos: Ladeanzeige mitten auf dem alten Bild.
    ladenAufFoto: {
      position: "absolute", alignSelf: "center", top: "45%", width: 44, height: 44, borderRadius: 22,
      backgroundColor: "rgba(20,18,16,0.55)", alignItems: "center", justifyContent: "center",
    },
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
    motiv: { overflow: "hidden", borderBottomWidth: 1 },
    motivRing: { position: "absolute", width: 320, height: 320, borderRadius: 160, borderWidth: 48, right: -110, top: -90 },
    // Großes Emoji als Bildersatz, angeschnitten am rechten Rand.
    motivEmoji: { position: "absolute", right: -6, bottom: -14, fontSize: 132, lineHeight: 160, transform: [{ rotate: "-12deg" }] },
    rundGlasMotiv: { backgroundColor: "rgba(255,255,255,0.16)", borderColor: "rgba(255,255,255,0.18)" },
    vollbild: { flex: 1, backgroundColor: "rgba(12,11,10,0.94)", paddingHorizontal: 16, gap: 16 },
    vollKopf: { flexDirection: "row", alignItems: "center", gap: 12 },
    vollTitel: { fontFamily: FONT.w700, fontSize: 17, color: "#FFFFFF" },
    vollUnter: { fontFamily: FONT.w600, fontSize: 13, color: "rgba(255,255,255,0.7)" },
    vollBild: { flex: 1, width: "100%", borderRadius: RADIUS.md },
    vollAktionen: { flexDirection: "row", gap: 10 },
  });
