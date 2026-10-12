import React from "react";
import { RefreshControl, ScrollView, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "react-native";
import { TYPE, ThemeColors } from "../../constants/design";
import { useColors, useThemedStyles } from "../../contexts/ThemeContext";
import { PressableScale } from "./PressableScale";

/** Platz unter dem Inhalt, damit nichts hinter der schwebenden Bottom-Leiste verschwindet. */
export const NAV_INSET = 112;

interface ScreenProps {
  children: React.ReactNode;
  /** Kopf über dem Scrollbereich (bleibt stehen). */
  header?: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** true auf Tab-Screens mit Bottom-Leiste. */
  withNav?: boolean;
  /** false, wenn der Inhalt selbst scrollt (FlatList) oder bis an den Rand gehen soll. */
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  /** Oben nicht einrücken, z. B. wenn ein Foto bis unter die Statusleiste reicht. */
  edgeToEdgeTop?: boolean;
}

/** Grundgerüst jedes Screens: sichere Ränder, Hintergrund, Scrollen, Abstand zur Leiste. */
export function Screen({ children, header, refreshing, onRefresh, withNav, scroll = true, contentStyle, edgeToEdgeTop }: ScreenProps) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const unten = withNav ? NAV_INSET : 32;
  return (
    <SafeAreaView style={styles.root} edges={edgeToEdgeTop ? ["left", "right"] : ["top", "left", "right"]}>
      {header}
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: unten }, contentStyle]}
          refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={c.textMuted} /> : undefined}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1, paddingBottom: withNav ? NAV_INSET : 0 }, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

interface HeaderProps {
  title: string;
  subtitle?: string;
  /** Zurück-Knopf zeigen; Standard: eine Ebene zurück, sonst zur Übersicht. */
  back?: boolean | (() => void);
  right?: React.ReactNode;
}

export function ScreenHeader({ title, subtitle, back, right }: HeaderProps) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const zurueck = () => {
    if (typeof back === "function") return back();
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/home");
  };
  return (
    <View style={styles.header}>
      {back ? (
        <PressableScale onPress={zurueck} style={styles.round} accessibilityLabel="Zurück" hitSlop={6}>
          <Ionicons name="chevron-back" size={20} color={c.textDark} />
        </PressableScale>
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

/** Runder Icon-Knopf für Kopfzeilen (Glocke, Plus, Bearbeiten). */
export function HeaderIconButton({ icon, onPress, label, dot }: { icon: React.ComponentProps<typeof Ionicons>["name"]; onPress: () => void; label: string; dot?: boolean }) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  return (
    <PressableScale onPress={onPress} style={styles.round} accessibilityLabel={label} hitSlop={6}>
      <Ionicons name={icon} size={20} color={c.textDark} />
      {dot ? <View style={styles.dot} /> : null}
    </PressableScale>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    content: { paddingHorizontal: 16, gap: 12 },
    header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12 },
    round: {
      width: 44, height: 44, borderRadius: 22, backgroundColor: c.card,
      alignItems: "center", justifyContent: "center",
      borderWidth: StyleSheet.hairlineWidth, borderColor: c.hairline,
    },
    title: { ...TYPE.title, color: c.textDark },
    subtitle: { ...TYPE.caption, fontSize: 13, color: c.textMuted, marginTop: 1 },
    dot: { position: "absolute", top: 10, right: 11, width: 8, height: 8, borderRadius: 4, backgroundColor: c.coral },
  });
