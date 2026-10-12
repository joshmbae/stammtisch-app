import React from "react";
import { ScrollView, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { FONT, MOTION, TYPE, ThemeColors } from "../../constants/design";
import { useThemedStyles } from "../../contexts/ThemeContext";
import StammtischLogo from "../StammtischLogo";
import { IconSquircle, Ton } from "../ui";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

export interface Vorteil {
  icon: IconName;
  ton: Ton;
  titel: string;
  text: string;
}

/**
 * Grundgerüst der Einstiegs-Screens (ohne Tab-Leiste): breiterer Rand, Inhalt
 * scrollt, Tippen auf Knöpfe schließt nicht erst die Tastatur.
 */
export function EinstiegScreen({ children, contentStyle }: { children: React.ReactNode; contentStyle?: StyleProp<ViewStyle> }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={[styles.inhalt, contentStyle]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Logo, große Überschrift, Satz darunter und optional eine Liste mit Symbolen. */
export function EinstiegHero({ titel, text, vorteile, symbol }: {
  titel: string;
  text?: string;
  vorteile?: Vorteil[];
  /** Statt des Logos ein Symbol in einer großen Kachel (z. B. im Rundgang). */
  symbol?: { icon: IconName; ton: Ton };
}) {
  const styles = useThemedStyles(makeStyles);
  const ein = (i: number) => FadeInDown.duration(MOTION.base).delay(i * MOTION.stagger * 2);
  return (
    <View>
      <Animated.View entering={ein(0)}>
        {symbol ? <IconSquircle icon={symbol.icon} ton={symbol.ton} size={112} /> : <StammtischLogo size={112} />}
      </Animated.View>
      <Animated.View entering={ein(1)}>
        <Text style={styles.titel} accessibilityRole="header">{titel}</Text>
        {text ? <Text style={styles.text}>{text}</Text> : null}
      </Animated.View>
      {vorteile?.length ? (
        <Animated.View entering={ein(2)} style={styles.liste}>
          {vorteile.map((v) => (
            <View key={v.titel} style={styles.vorteil}>
              <IconSquircle icon={v.icon} ton={v.ton} size={36} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.vorteilTitel}>{v.titel}</Text>
                <Text style={styles.vorteilText}>{v.text}</Text>
              </View>
            </View>
          ))}
        </Animated.View>
      ) : null}
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    inhalt: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 32, paddingBottom: 32, gap: 12 },
    titel: { fontFamily: FONT.w800, fontSize: 31, lineHeight: 34, letterSpacing: -0.6, color: c.textDark, marginTop: 26 },
    text: { fontFamily: FONT.w600, fontSize: 15, lineHeight: 21, color: c.textMuted, marginTop: 8 },
    liste: { marginTop: 24, gap: 10 },
    vorteil: { flexDirection: "row", alignItems: "center", gap: 12 },
    vorteilTitel: { ...TYPE.bodyStrong, fontFamily: FONT.w800, color: c.textDark },
    vorteilText: { ...TYPE.caption, fontSize: 13, color: c.textMuted },
  });
