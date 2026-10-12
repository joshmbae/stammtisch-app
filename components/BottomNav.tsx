import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
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

/**
 * Schwebende Leiste unten: der aktive Bereich als Pille mit Icon und Name,
 * die übrigen nur als Icon. Sitzt über der Home-Leiste des iPhones.
 */
export function BottomNav({ state, descriptors, navigation }: BottomTabBarProps) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { bottom: Math.max(insets.bottom, 12) + 4 }]} pointerEvents="box-none">
      <View style={styles.bar} accessibilityRole="tablist">
        {state.routes.map((route, index) => {
          const aktiv = state.index === index;
          const label = descriptors[route.key].options.title ?? route.name;
          const icon = ICONS[route.name] ?? { aktiv: "ellipse", inaktiv: "ellipse-outline" };
          const onPress = () => {
            const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!aktiv && !event.defaultPrevented) navigation.navigate(route.name, route.params);
          };
          return (
            <PressableScale
              key={route.key}
              onPress={onPress}
              haptic="leicht"
              scaleTo={0.94}
              accessibilityRole="tab"
              accessibilityState={{ selected: aktiv }}
              accessibilityLabel={label}
              style={[styles.item, aktiv && styles.itemAktiv, aktiv && glow(c.tabActive, c, 14)]}
            >
              <Ionicons name={aktiv ? icon.aktiv : icon.inaktiv} size={20} color={aktiv ? c.navActiveText : c.tabInactive} />
              {aktiv ? <Text style={styles.label} numberOfLines={1}>{label}</Text> : null}
            </PressableScale>
          );
        })}
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
      backgroundColor: c.tabBar,
      borderWidth: 1,
      borderColor: c.navBorder,
      padding: 7,
      flexDirection: "row",
      gap: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.18,
      shadowRadius: 18,
      elevation: 8,
    },
    item: { flex: 1, borderRadius: 999, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 },
    itemAktiv: { flexGrow: 0, flexBasis: 116, backgroundColor: c.tabActive },
    label: { fontFamily: FONT.w800, fontSize: 14, color: c.navActiveText },
  });
