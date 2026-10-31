import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import Animated, { Easing, FadeIn, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { FONT, MAX_FONT_SCALE, MOTION, TYPE, ThemeColors } from "../../constants/design";
import { useColors, useThemedStyles } from "../../contexts/ThemeContext";
import { FuehrenderTitel, Rangliste, RangEintrag } from "../../utils/stats";
import { displayName } from "../../utils/format";
import { Avatar, Card, IconSquircle, Krone, PressableScale, tonFuerRangliste } from "../ui";
const SAEULE_MAX = 112;
const SAEULE_MIN = 40;
/** Platz über der höchsten Säule für Krone, Avatar und Name. */
const KOPF_H = 96;
const PODIUM_H = SAEULE_MAX + KOPF_H;

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
    const id = setInterval(() => setIndex((i) => (i + 1) % listen.length), MOTION.wechsel);
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
        // Spalten nach Position, nicht nach Wertung: beim Wechsel bleiben sie
        // stehen und gleiten von der alten zur neuen Höhe.
        <View style={styles.podium}>
          {podium.map(({ e, pos }) => (
            <PodiumSpalte key={pos} e={e} pos={pos} maxWert={maxWert} fuehrt={e ? fuehrende.get(e.member.id) : undefined} reduce={reduce} />
          ))}
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

/**
 * Eine Podiumsspalte. Animiert wird nur per Transform (Säule und Kopf werden
 * hochgeschoben), nicht die Höhe – so muss pro Frame nichts neu gelayoutet
 * werden und die Bewegung läuft flüssig auf dem UI-Thread.
 */
function PodiumSpalte({ e, pos, maxWert, fuehrt, reduce }: {
  e: RangEintrag | undefined;
  pos: number;
  maxWert: number;
  fuehrt: FuehrenderTitel[] | undefined;
  reduce: boolean;
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const erster = pos === 1;
  const ziel = !e ? 0 : erster ? SAEULE_MAX : Math.max(SAEULE_MIN, Math.round(SAEULE_MAX * (e.wert / maxWert)));
  const h = useSharedValue(0);
  const erstesMal = useRef(true);

  useEffect(() => {
    if (reduce) {
      h.value = ziel;
    } else {
      // Beim ersten Mal wächst das Podium gestaffelt, danach gleiten alle fast gleichzeitig.
      const verzoegerung = erstesMal.current ? (erster ? 150 : 300 + pos * 100) : pos * 50;
      h.value = withDelay(verzoegerung, withTiming(ziel, { duration: 600, easing: Easing.out(Easing.cubic) }));
    }
    erstesMal.current = false;
  }, [ziel, reduce]);

  const hoch = useAnimatedStyle(() => ({ transform: [{ translateY: SAEULE_MAX - h.value }] }));

  return (
    <View style={styles.spalte}>
      <Animated.View style={[styles.kopfBox, hoch]}>
        {e ? (
          <Animated.View key={e.member.id} entering={reduce ? undefined : FadeIn.duration(250)} style={styles.kopfInhalt}>
            {erster ? <Krone size={24} /> : null}
            <Avatar name={displayName(e.member)} color={e.member.avatarColor} photoUri={e.member.photoUri} size={38} fuehrt={fuehrt} />
            <Text style={styles.name} numberOfLines={1}>{displayName(e.member)}</Text>
          </Animated.View>
        ) : null}
      </Animated.View>
      <Animated.View style={[styles.saeule, { backgroundColor: erster ? c.blue : pos === 0 ? c.blueBg : c.cardAlt }, hoch]}>
        {e ? (
          <Text style={[styles.wert, { color: erster ? c.onAccent : c.textDark }]} maxFontSizeMultiplier={MAX_FONT_SCALE} numberOfLines={1}>
            {e.anzeige.replace(",00 €", " €")}
          </Text>
        ) : null}
      </Animated.View>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    kopf: { flexDirection: "row", alignItems: "center", gap: 10 },
    label: { ...TYPE.label, color: c.textMuted },
    titel: { fontFamily: FONT.w700, fontSize: 17, color: c.textDark },
    punkte: { flexDirection: "row", alignItems: "center" },
    // Punkt klein, Tippfläche 44 pt hoch und so breit wie möglich ohne Nachbarn zu überdecken.
    punktFlaeche: { height: 44, paddingHorizontal: 4, justifyContent: "center" },
    punkt: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.borderDark },
    punktAktiv: { width: 18, backgroundColor: c.textDark },
    alle: { minHeight: 44, justifyContent: "center", paddingLeft: 4 },
    alleText: { fontFamily: FONT.w600, fontSize: 14, color: c.blue },
    leer: { ...TYPE.caption, fontSize: 13, color: c.textMuted, paddingVertical: 24, textAlign: "center" },
    // Feste Höhe und abgeschnitten: die Säulen stehen unterhalb und werden hochgeschoben.
    podium: { flexDirection: "row", gap: 10, marginTop: 10, height: PODIUM_H, overflow: "hidden" },
    spalte: { flex: 1, height: PODIUM_H },
    kopfBox: { position: "absolute", left: 0, right: 0, bottom: SAEULE_MAX + 6, alignItems: "center" },
    kopfInhalt: { alignItems: "center", gap: 6, maxWidth: "100%" },
    name: { fontFamily: FONT.w600, fontSize: 13, color: c.textDark, maxWidth: "100%" },
    saeule: {
      position: "absolute", left: 0, right: 0, bottom: 0, height: SAEULE_MAX,
      borderTopLeftRadius: 16, borderTopRightRadius: 16, alignItems: "center", paddingTop: 10,
    },
    wert: { ...TYPE.num, fontSize: 22 },
  });
