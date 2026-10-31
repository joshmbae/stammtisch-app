import React, { useEffect, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import Animated, { FadeIn, LinearTransition, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { FONT, MOTION, ThemeColors } from "../constants/design";
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
/** Etwas weicher als die Tipp-Feder, damit das Gleiten sichtbar ist; dieselbe für Pille und Icons. */
const NAV_FEDER = { damping: 18, stiffness: 170, mass: 0.8 };
const FEDER = LinearTransition.springify().damping(NAV_FEDER.damping).stiffness(NAV_FEDER.stiffness).mass(NAV_FEDER.mass);

/**
 * Schwebende Glas-Leiste unten: der aktive Bereich als Pille mit Icon und
 * Name, die übrigen nur als Icon. Sitzt über der Home-Leiste des iPhones.
 *
 * Die Breiten werden aus der gemessenen Leistenbreite fest berechnet und an
 * einfachen Views gesetzt – nicht per flex am animierten Knopf. So bleibt die
 * Aufteilung beim Tab-Wechsel auf dem Gerät stabil. Beim Wechsel gleitet die
 * Pille als eigene Ebene zum neuen Tab (Transform auf dem UI-Thread), die
 * Icons rücken mit derselben Feder nach.
 */
export function BottomNav({ state, descriptors, navigation }: BottomTabBarProps) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [breite, setBreite] = useState(0);
  const anzahl = state.routes.length;
  const inaktivBreite = breite > 0 ? (breite - 2 * PADDING - (anzahl - 1) * GAP - AKTIV_BREITE) / (anzahl - 1) : 0;
  // Vor dem aktiven Tab liegen nur schmale Tabs – daraus ergibt sich die Position der Pille.
  const pilleX = PADDING + state.index * (inaktivBreite + GAP);
  const x = useSharedValue(pilleX);
  const erstesMal = useSharedValue(true);
  useEffect(() => {
    if (breite === 0) return;
    // Beim ersten Messen ohne Animation an die richtige Stelle setzen.
    if (erstesMal.value) {
      x.value = pilleX;
      erstesMal.value = false;
    } else {
      x.value = withSpring(pilleX, NAV_FEDER);
    }
  }, [pilleX, breite]);
  const pilleStil = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View style={[styles.wrap, { bottom: Math.max(insets.bottom, 12) + 4 }]} pointerEvents="box-none">
      <View style={styles.bar} onLayout={(e) => setBreite(e.nativeEvent.layout.width)}>
        <View style={styles.glas} pointerEvents="none">
          {Platform.OS === "ios" ? <BlurView intensity={60} tint="systemUltraThinMaterialDark" style={StyleSheet.absoluteFill} /> : null}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: c.tabBarGlass }]} />
        </View>
        <View style={styles.rand} pointerEvents="none" />
        {breite > 0 ? (
          <Animated.View style={[styles.gleitPille, { width: AKTIV_BREITE }, pilleStil]} pointerEvents="none" />
        ) : null}
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
                  <Animated.View key={route.key} layout={FEDER} style={{ width: aktiv ? AKTIV_BREITE : inaktivBreite }}>
                    <PressableScale
                      onPress={onPress}
                      haptic="leicht"
                      scaleTo={0.94}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: aktiv }}
                      accessibilityLabel={label}
                      style={styles.knopf}
                    >
                      <View style={styles.pille}>
                        <Ionicons name={aktiv ? icon.aktiv : icon.inaktiv} size={20} color={aktiv ? c.navActiveText : c.tabInactive} />
                        {aktiv ? <Animated.Text entering={FadeIn.duration(MOTION.base)} style={styles.label} numberOfLines={1}>{label}</Animated.Text> : null}
                      </View>
                    </PressableScale>
                  </Animated.View>
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
    },
    // Rand als eigene Ebene: ein borderWidth am clippenden View schneidet die
    // runden Enden auf iOS flach ab.
    rand: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.navBorder,
    },
    reihe: { flex: 1, flexDirection: "row", gap: GAP, padding: PADDING },
    knopf: { flex: 1 },
    pille: { flex: 1, borderRadius: 999, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 },
    // Die gleitende Pille liegt unter den Tabs, gleiche Höhe wie die Reihe.
    gleitPille: { position: "absolute", top: PADDING, bottom: PADDING, left: 0, borderRadius: 999, backgroundColor: c.tabActive },
    label: { fontFamily: FONT.w700, fontSize: 14, color: c.navActiveText },
  });
