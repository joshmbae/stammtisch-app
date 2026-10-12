import React, { useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { FONT, ThemeColors, glow } from "../constants/design";
import { useColors, useThemedStyles } from "../contexts/ThemeContext";
import { PressableScale } from "./ui";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const ICONS: Record<string, { aktiv: IconName; inaktiv: IconName }> = {
  home: { aktiv: "home", inaktiv: "home-outline" },
  kalender: { aktiv: "calendar", inaktiv: "calendar-outline" },
  kasse: { aktiv: "wallet", inaktiv: "wallet-outline" },
  ranglisten: { aktiv: "trending-up", inaktiv: "trending-up-outline" },
  runde: { aktiv: "people", inaktiv: "people-outline" },
};

const PADDING = 7;
const GAP = 4;
const AKTIV_BREITE = 116;

/**
 * Schwebende Glas-Leiste unten: der aktive Bereich als Pille mit Icon und
 * Name, die übrigen nur als Icon. Sitzt über der Home-Leiste des iPhones.
 *
 * Die Breiten werden aus der gemessenen Leistenbreite fest berechnet und an
 * einfachen Views gesetzt – nicht per flex am animierten Knopf. So bleibt die
 * Aufteilung beim Tab-Wechsel auf dem Gerät stabil.
 */
export function BottomNav({ state, descriptors, navigation }: BottomTabBarProps) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [breite, setBreite] = useState(0);
  const anzahl = state.routes.length;
  const inaktivBreite = breite > 0 ? (breite - 2 * PADDING - (anzahl - 1) * GAP - AKTIV_BREITE) / (anzahl - 1) : 0;

  return (
    <View style={[styles.wrap, { bottom: Math.max(insets.bottom, 12) + 4 }]} pointerEvents="box-none">
      <View style={styles.bar} onLayout={(e) => setBreite(e.nativeEvent.layout.width)}>
        <View style={styles.glas} pointerEvents="none">
          {Platform.OS === "ios" ? <BlurView intensity={60} tint="systemUltraThinMaterialDark" style={StyleSheet.absoluteFill} /> : null}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: c.tabBarGlass }]} />
        </View>
        <View style={styles.reihe} accessibilityRole="tablist">
          {breite > 0
            ? state.routes.map((route, index) => {
                const aktiv = state.index === index;
                const label = descriptors[route.key].options.title ?? route.name;
                const icon = ICONS[route.name] ?? { aktiv: "ellipse", inaktiv: "ellipse-outline" };
                const onPress = () => {
                  const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                  if (!aktiv && !event.defaultPrevented) navigation.navigate(route.name, route.params);
                };
                return (
                  <View key={route.key} style={{ width: aktiv ? AKTIV_BREITE : inaktivBreite }}>
                    <PressableScale
                      onPress={onPress}
                      haptic="leicht"
                      scaleTo={0.94}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: aktiv }}
                      accessibilityLabel={label}
                      style={styles.knopf}
                    >
                      <View style={[styles.pille, aktiv && styles.pilleAktiv, aktiv && glow(c.tabActive, c, 14)]}>
                        <Ionicons name={aktiv ? icon.aktiv : icon.inaktiv} size={20} color={aktiv ? c.navActiveText : c.tabInactive} />
                        {aktiv ? <Text style={styles.label} numberOfLines={1}>{label}</Text> : null}
                      </View>
                    </PressableScale>
                  </View>
                );
              })
            : null}
        </View>
      </View>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    wrap: { position: "absolute", left: 16, right: 16 },
    bar: {
      height: 62,
      borderRadius: 999,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.18,
      shadowRadius: 18,
      elevation: 8,
    },
    glas: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 999,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: c.navBorder,
    },
    reihe: { flex: 1, flexDirection: "row", gap: GAP, padding: PADDING },
    knopf: { flex: 1 },
    pille: { flex: 1, borderRadius: 999, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 },
    pilleAktiv: { backgroundColor: c.tabActive },
    label: { fontFamily: FONT.w800, fontSize: 14, color: c.navActiveText },
  });
