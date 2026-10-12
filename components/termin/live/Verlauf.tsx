import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";
import { FONT, RADIUS, TYPE, ThemeColors } from "../../../constants/design";
import { useColors, useThemedStyles } from "../../../contexts/ThemeContext";
import { TerminAbend } from "../../../utils/useTerminAbend";
import { displayName } from "../../../utils/format";
import { PressableScale, haptik } from "../../ui";
import { euroKurz } from "./StrafenErfassen";

interface Eintrag {
  id: string;
  zeit: string;
  wer: string;
  was: string;
  art: "spiel" | "strafe";
  loeschen: () => Promise<void>;
}

/**
 * Alles, was an diesem Abend eingetragen wurde, neueste zuerst. Das × nimmt
 * einen Eintrag zurück; Spiel-Ereignisse mit Strafe und „zu spät" mit Strafe
 * sind je ein Eintrag und werden zusammen entfernt.
 */
export function Verlauf({ abend }: { abend: TerminAbend }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const name = (id: string) => { const m = abend.members.find((x) => x.id === id); return m ? displayName(m) : "?"; };
  const strafen = Object.values(abend.strafMap).flat();
  const verbraucht = new Set<string>();
  const eintraege: Eintrag[] = [];

  for (const l of Object.values(abend.spielLogMap).flat()) {
    const typ = abend.ereignisTypen.find((t) => t.id === l.ereignisTypId);
    const strafe = l.strafLogId ? strafen.find((s) => s.id === l.strafLogId) : undefined;
    if (l.strafLogId) verbraucht.add(l.strafLogId);
    eintraege.push({
      id: `sp-${l.id}`, zeit: l.loggedAt, wer: name(l.memberId), art: strafe ? "strafe" : "spiel",
      was: `${typ?.label ?? "Spiel"}${strafe ? ` ${euroKurz(strafe.betrag)}` : ""}`,
      loeschen: () => abend.spielEreignisLöschen(l.memberId, l.id),
    });
  }

  for (const v of Object.values(abend.verspätungMap).flat()) {
    // Die Strafe, die beim „zu spät?"-Knopf mit angelegt wurde.
    const strafe = strafen.find((s) => !verbraucht.has(s.id) && s.memberId === v.memberId && s.notiz === `${v.minutenVerspätet} Min.`);
    if (strafe) verbraucht.add(strafe.id);
    eintraege.push({
      id: `v-${v.id}`, zeit: v.datum, wer: name(v.memberId), art: "strafe",
      was: `Zu spät ${v.minutenVerspätet} Min.${strafe ? ` · ${euroKurz(strafe.betrag)}` : ""}`,
      loeschen: async () => {
        await abend.verspätungLöschen(v.memberId, v.id);
        if (strafe) await abend.strafeLöschen(strafe.memberId, strafe.id);
      },
    });
  }

  for (const s of strafen) {
    if (verbraucht.has(s.id)) continue;
    const kat = abend.strafKategorien.find((k) => k.id === s.kategorie);
    const label = kat?.systemKey === "sonstiges" && s.notiz ? s.notiz : kat?.label ?? "Strafe";
    eintraege.push({
      id: `st-${s.id}`, zeit: s.loggedAt, wer: name(s.memberId), art: "strafe",
      was: `${label} ${euroKurz(s.betrag)}`,
      loeschen: () => abend.strafeLöschen(s.memberId, s.id),
    });
  }

  eintraege.sort((a, b) => b.zeit.localeCompare(a.zeit));
  if (eintraege.length === 0) return null;

  return (
    <View style={{ gap: 10 }}>
      <Text style={styles.label}>Verlauf</Text>
      <View style={styles.raster}>
        {eintraege.map((e) => {
          const spiel = e.art === "spiel";
          return (
            <Animated.View key={e.id} entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} layout={LinearTransition} style={styles.zelle}>
              <View style={[styles.chip, { backgroundColor: spiel ? c.mustardSoft : c.coralSoft }]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.wer} numberOfLines={1}>{e.wer}</Text>
                  <Text style={[styles.was, { color: spiel ? c.mustardText : c.coralText }]} numberOfLines={1}>{e.was}</Text>
                </View>
                <PressableScale
                  onPress={() => { haptik("leicht"); e.loeschen().catch(() => {}); }}
                  style={styles.x}
                  accessibilityLabel={`${e.wer}: ${e.was} zurücknehmen`}
                >
                  <View style={styles.xKreis}><Ionicons name="close" size={14} color={c.textDark} /></View>
                </PressableScale>
              </View>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    label: { ...TYPE.label, color: c.textMuted },
    raster: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 },
    zelle: { width: "50%", padding: 4 },
    chip: { minHeight: 52, borderRadius: RADIUS.md + 2, paddingLeft: 12, flexDirection: "row", alignItems: "center" },
    wer: { fontFamily: FONT.w800, fontSize: 14, color: c.textDark },
    was: { fontFamily: FONT.w600, fontSize: 13 },
    x: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
    xKreis: { width: 26, height: 26, borderRadius: 13, backgroundColor: c.heroStyle === "outline" ? "rgba(255,255,255,0.1)" : "rgba(28,27,25,0.08)", alignItems: "center", justifyContent: "center" },
  });
