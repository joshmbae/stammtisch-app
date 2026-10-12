import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import Animated, { Easing, FadeIn, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { FONT, MAX_FONT_SCALE, TYPE, ThemeColors, glow } from "../../constants/design";
import { useColors, useThemedStyles } from "../../contexts/ThemeContext";
import { FuehrenderTitel, Rangliste } from "../../utils/stats";
import { displayName } from "../../utils/format";
import { Avatar, Card, IconSquircle, Krone, PressableScale, tonFuerRangliste } from "../ui";

const WECHSEL_MS = 4000;

/**
 * Top 3 einer Wertung als Podium; wechselt alle 4 s zur nächsten Wertung.
 * Antippen eines Punkts wählt eine Wertung und hält an. Bei „Bewegung
 * reduzieren" und wenn der Screen nicht sichtbar ist, wird nicht gewechselt.
 */
export function RanglisteRotator({ listen, jahr, fuehrende, onAlle }: {
  listen: Rangliste[];
  jahr: string;
  fuehrende: Map<string, FuehrenderTitel[]>;
  onAlle: () => void;
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const fokus = useIsFocused();
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [angehalten, setAngehalten] = useState(false);

  useEffect(() => {
    if (!fokus || reduce || angehalten || listen.length < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % listen.length), WECHSEL_MS);
    return () => clearInterval(id);
  }, [fokus, reduce, angehalten, listen.length]);

  if (listen.length === 0) return null;
  const liste = listen[index % listen.length];
  const top = liste.eintraege.slice(0, 3);
  // Podium-Reihenfolge: Zweiter links, Erster Mitte, Dritter rechts.
  const podium = [top[1], top[0], top[2]].map((e, pos) => ({ e, pos }));
  const maxWert = Math.max(1, top[0]?.wert ?? 1);

  return (
    <Card enterIndex={4} style={{ paddingBottom: 0, overflow: "hidden" }}>
      <View style={styles.kopf}>
        <IconSquircle emoji={liste.emoji} ton={tonFuerRangliste(liste.key)} size={36} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.label}>{`Rangliste ${jahr}`}</Text>
          <Animated.Text key={liste.key} entering={reduce ? undefined : FadeIn.duration(250)} style={styles.titel} numberOfLines={1}>{liste.kurz}</Animated.Text>
        </View>
        <View style={styles.punkte}>
          {listen.map((l, i) => (
            <PressableScale
              key={l.key}
              onPress={() => { setIndex(i); setAngehalten(true); }}
              accessibilityRole="button"
              accessibilityState={{ selected: i === index }}
              accessibilityLabel={`Wertung ${l.kurz} zeigen`}
              style={styles.punktFlaeche}
            >
              <View style={[styles.punkt, i === index && styles.punktAktiv]} />
            </PressableScale>
          ))}
        </View>
        <SectionLabelAction onPress={onAlle} />
      </View>
      {top.length === 0 ? (
        <Text style={styles.leer}>Noch keine Einträge in diesem Jahr.</Text>
      ) : (
        <View style={styles.podium} key={liste.key}>
          {podium.map(({ e, pos }) => {
            if (!e) return <View key={`leer${pos}`} style={{ flex: 1 }} />;
            const erster = pos === 1;
            const hoehe = Math.max(40, Math.round((erster ? 112 : 112 * (e.wert / maxWert))));
            return (
              <View key={e.member.id} style={styles.spalte}>
                {erster ? <Krone size={24} /> : null}
                <Avatar name={displayName(e.member)} color={e.member.avatarColor} photoUri={e.member.photoUri} size={38} fuehrt={fuehrende.get(e.member.id)} />
                <Text style={styles.name} numberOfLines={1}>{displayName(e.member)}</Text>
                <Saeule hoehe={hoehe} delay={erster ? 150 : 300 + pos * 100} farbe={erster ? c.blue : pos === 0 ? c.blueBg : c.cardAlt} leuchtet={erster}>
                  <Text style={[styles.wert, { color: erster ? c.onAccent : c.textDark }]} maxFontSizeMultiplier={MAX_FONT_SCALE} numberOfLines={1}>
                    {e.anzeige.replace(",00 €", " €")}
                  </Text>
                </Saeule>
              </View>
            );
          })}
        </View>
      )}
    </Card>
  );
}

function SectionLabelAction({ onPress }: { onPress: () => void }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <PressableScale onPress={onPress} hitSlop={10} style={styles.alle} accessibilityLabel="Alle Ranglisten">
      <Text style={styles.alleText}>Alle</Text>
    </PressableScale>
  );
}

function Saeule({ hoehe, delay, farbe, leuchtet, children }: { hoehe: number; delay: number; farbe: string; leuchtet: boolean; children: React.ReactNode }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const h = useSharedValue(0);
  useEffect(() => {
    h.value = withDelay(delay, withTiming(hoehe, { duration: 700, easing: Easing.out(Easing.back(1.2)) }));
  }, [hoehe]);
  const st = useAnimatedStyle(() => ({ height: h.value }));
  return (
    <Animated.View style={[styles.saeule, { backgroundColor: farbe }, leuchtet && glow(c.blue, c, 16), st]}>
      {children}
    </Animated.View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    kopf: { flexDirection: "row", alignItems: "center", gap: 10 },
    label: { ...TYPE.label, color: c.textMuted },
    titel: { fontFamily: FONT.w800, fontSize: 17, color: c.textDark },
    punkte: { flexDirection: "row", alignItems: "center" },
    // Punkt klein, Tippfläche 44 pt hoch und so breit wie möglich ohne Nachbarn zu überdecken.
    punktFlaeche: { height: 44, paddingHorizontal: 4, justifyContent: "center" },
    punkt: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.borderDark },
    punktAktiv: { width: 18, backgroundColor: c.textDark },
    alle: { minHeight: 44, justifyContent: "center", paddingLeft: 4 },
    alleText: { fontFamily: FONT.w700, fontSize: 14, color: c.blue },
    leer: { ...TYPE.caption, fontSize: 13, color: c.textMuted, paddingVertical: 24, textAlign: "center" },
    podium: { flexDirection: "row", alignItems: "flex-end", gap: 10, marginTop: 10, minHeight: 200 },
    spalte: { flex: 1, alignItems: "center", gap: 6 },
    name: { fontFamily: FONT.w700, fontSize: 13, color: c.textDark, maxWidth: "100%" },
    saeule: { alignSelf: "stretch", borderTopLeftRadius: 16, borderTopRightRadius: 16, alignItems: "center", paddingTop: 10, overflow: "hidden" },
    wert: { ...TYPE.num, fontSize: 22 },
  });
