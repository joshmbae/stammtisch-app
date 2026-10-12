import React from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { RADIUS, TYPE, ThemeColors } from "../../constants/design";
import { useColors, useThemedStyles } from "../../contexts/ThemeContext";
import { PressableScale } from "./PressableScale";

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Unten fest, z. B. der Speichern-Knopf; scrollt nicht mit. */
  footer?: React.ReactNode;
  /** Höhe bis fast ganz oben statt nach Inhalt. */
  gross?: boolean;
}

/** Blatt von unten: Abdunkeln tippen oder × schließt. Inhalt scrollt, Fuß bleibt stehen. */
export function Sheet({ visible, onClose, title, children, footer, gross }: Props) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Schließen" accessibilityRole="button" />
        <View style={[styles.blatt, gross && { height: "92%" }, { paddingBottom: Math.max(insets.bottom, 16) }]} accessibilityViewIsModal>
          <View style={styles.griff} />
          <View style={styles.kopf}>
            <Text style={styles.titel} accessibilityRole="header" numberOfLines={1}>{title}</Text>
            <PressableScale onPress={onClose} style={styles.zu} accessibilityLabel={`${title} schließen`}>
              <Ionicons name="close" size={20} color={c.textDark} />
            </PressableScale>
          </View>
          <ScrollView style={gross ? { flex: 1 } : undefined} contentContainerStyle={styles.inhalt} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
          {footer ? <View style={styles.fuss}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, justifyContent: "flex-end", backgroundColor: c.overlay },
    blatt: {
      maxHeight: "92%", backgroundColor: c.background, borderTopLeftRadius: RADIUS.hero, borderTopRightRadius: RADIUS.hero,
      borderTopWidth: StyleSheet.hairlineWidth, borderColor: c.hairline,
    },
    griff: { alignSelf: "center", width: 40, height: 5, borderRadius: 3, backgroundColor: c.borderDark, marginTop: 8 },
    kopf: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8 },
    titel: { ...TYPE.title, flex: 1, color: c.textDark },
    zu: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.cardAlt, alignItems: "center", justifyContent: "center" },
    inhalt: { paddingHorizontal: 16, paddingBottom: 12, gap: 12 },
    fuss: { paddingHorizontal: 16, paddingTop: 8 },
  });
