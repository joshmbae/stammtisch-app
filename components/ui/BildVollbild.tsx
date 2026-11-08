import React from "react";
import { Image, Modal, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { FONT, RADIUS } from "../../constants/design";
import { PressableScale } from "./PressableScale";

/**
 * Ein Bild groß auf dunklem Grund, z. B. das Profilbild eines Mitglieds.
 * Schließen über das X oder Antippen daneben.
 */
export function BildVollbild({ uri, titel, visible, onClose }: { uri: string; titel: string; visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={[styles.grund, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]}>
        <PressableScale onPress={onClose} scaleTo={1} style={StyleSheet.absoluteFill} accessibilityLabel="Schließen" />
        <View style={styles.kopf} pointerEvents="box-none">
          <Text style={styles.titel} numberOfLines={1}>{titel}</Text>
          <PressableScale onPress={onClose} style={styles.zu} accessibilityLabel="Bild schließen">
            <Ionicons name="close" size={20} color="#1C1B19" />
          </PressableScale>
        </View>
        <View style={styles.mitte} pointerEvents="none">
          <Image source={{ uri }} style={styles.bild} resizeMode="cover" accessibilityLabel={`Profilbild von ${titel}`} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  grund: { flex: 1, backgroundColor: "rgba(12,11,10,0.94)", paddingHorizontal: 16 },
  kopf: { flexDirection: "row", alignItems: "center", gap: 12 },
  titel: { flex: 1, fontFamily: FONT.w700, fontSize: 17, color: "#FFFFFF" },
  zu: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  mitte: { flex: 1, alignItems: "center", justifyContent: "center" },
  bild: { width: "100%", aspectRatio: 1, borderRadius: RADIUS.hero },
});
