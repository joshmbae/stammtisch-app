import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeOut, ZoomIn } from "react-native-reanimated";
import { MemberProfile, StrafKategorieDef } from "../../../types";
import { FONT, RADIUS, ThemeColors, glow } from "../../../constants/design";
import { useColors, useThemedStyles } from "../../../contexts/ThemeContext";
import { TerminAbend } from "../../../utils/useTerminAbend";
import { displayName, formatEuro } from "../../../utils/format";
import { useFuehrende } from "../../../utils/useFuehrende";
import { Avatar, Emoji, PressableScale, haptik } from "../../ui";
import { SYMBOL } from "../../../constants/symbole";

/** Ab wie vielen Minuten nach Beginn ein Eintreffen als „zu spät" gilt. */
const SPAET_AB_MIN = 10;

export function spaetKategorie(kats: StrafKategorieDef[]): StrafKategorieDef | undefined {
  return kats.find((k) => !k.spielEreignisTypId && /spät|spaet|verspät/i.test(k.label));
}

/**
 * Wer sitzt am Tisch? Antippen trägt ein bzw. aus. Wer mehr als 10 Minuten
 * nach Beginn eingetragen wird, bekommt die Frage „zu spät?" mit der Strafe.
 */
export function AnwesendGrid({ abend, mitglieder, start, now }: { abend: TerminAbend; mitglieder: MemberProfile[]; start: Date | null; now: Date }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const fuehrende = useFuehrende();
  const t = abend.termin!;
  const [spaet, setSpaet] = useState<{ memberId: string; minuten: number } | null>(null);
  const kat = spaetKategorie(abend.strafKategorien);
  const dunkel = c.heroStyle === "outline";

  async function tippen(m: MemberProfile) {
    const da = !!t.anwesenheit?.includes(m.id);
    haptik(da ? "leicht" : "erfolg");
    if (spaet?.memberId === m.id) setSpaet(null);
    await abend.anwesenheitSetzen(m.id, !da);
    if (!da && start) {
      const minuten = Math.floor((now.getTime() - start.getTime()) / 60_000);
      const schonSpaet = (abend.verspätungMap[m.id] ?? []).length > 0;
      if (minuten > SPAET_AB_MIN && !schonSpaet) setSpaet({ memberId: m.id, minuten });
    }
  }

  async function spaetJa() {
    if (!spaet) return;
    const s = spaet;
    setSpaet(null);
    haptik("mittel");
    await abend.verspätungMitStrafe(s.memberId, s.minuten, kat);
  }

  const spaetMember = spaet ? mitglieder.find((m) => m.id === spaet.memberId) : undefined;

  return (
    <View style={{ gap: 12 }}>
      <View style={styles.raster}>
        {mitglieder.map((m) => {
          const da = !!t.anwesenheit?.includes(m.id);
          const abgesagt = !da && !!t.absagen?.includes(m.id);
          return (
            <View key={m.id} style={styles.zelle}>
              <PressableScale
                onPress={() => tippen(m)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: da }}
                accessibilityLabel={`${displayName(m)}${abgesagt ? ", hat abgesagt" : ""}`}
                accessibilityHint={da ? "Tippen, wenn doch nicht da" : "Tippen, wenn da"}
                style={[
                  styles.kachel,
                  da ? [styles.kachelDa, dunkel && glow(c.liveAccent, c, 10)] : null,
                ]}
              >
                <Avatar
                  name={displayName(m)} color={m.avatarColor} photoUri={m.photoUri} size={40}
                  fuehrt={fuehrende.get(m.id)} ringColor={da ? (dunkel ? c.card : c.live) : c.card}
                />
                <Text style={[styles.name, da && { color: dunkel ? c.textDark : c.onLive }]} numberOfLines={1}>{displayName(m)}</Text>
                {abgesagt ? <Text style={styles.abgesagt}>abgesagt</Text> : null}
                {da ? (
                  <Animated.View entering={ZoomIn.springify().damping(14)} style={[styles.haken, { backgroundColor: dunkel ? "transparent" : c.onLive }]}>
                    <Ionicons name="checkmark" size={dunkel ? 16 : 14} color={dunkel ? c.liveAccent : c.live} />
                  </Animated.View>
                ) : null}
              </PressableScale>
            </View>
          );
        })}
      </View>

      {spaet && spaetMember ? (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={[styles.spaet, { backgroundColor: c.coralSoft }]} accessibilityLiveRegion="polite">
          <View style={styles.spaetIcon}><Emoji size={20}>{SYMBOL.zuSpaet}</Emoji></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.spaetTitel}>{`${displayName(spaetMember)} zu spät?`}</Text>
            <Text style={[styles.spaetSub, { color: c.coralText }]}>{`+${spaet.minuten} Min.`}</Text>
          </View>
          <PressableScale onPress={spaetJa} style={[styles.spaetJa, { backgroundColor: c.coral }]} accessibilityLabel={`Ja, ${displayName(spaetMember)} war zu spät${kat ? `, ${formatEuro(kat.betrag)} Euro Strafe` : ""}`}>
            <Text style={[styles.spaetJaText, { color: c.onCoral }]}>{kat ? `${formatEuro(kat.betrag).replace(",00", "")} €` : "Ja"}</Text>
          </PressableScale>
          <PressableScale onPress={() => setSpaet(null)} style={styles.spaetNein} accessibilityLabel="Nicht zu spät">
            <Ionicons name="close" size={18} color={c.textDark} />
          </PressableScale>
        </Animated.View>
      ) : null}
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    raster: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -5 },
    zelle: { width: "33.333%", padding: 5 },
    kachel: {
      minHeight: 100, borderRadius: RADIUS.tile, alignItems: "center", justifyContent: "center", gap: 6, padding: 10,
      backgroundColor: c.card, borderWidth: StyleSheet.hairlineWidth, borderColor: c.hairline,
    },
    kachelDa: c.heroStyle === "outline"
      ? { backgroundColor: c.live, borderColor: c.liveEdge, borderWidth: 1 }
      : { backgroundColor: c.live, borderColor: c.live },
    name: { fontFamily: FONT.w800, fontSize: 14, color: c.textDark, maxWidth: "100%" },
    abgesagt: { fontFamily: FONT.w700, fontSize: 12, color: c.coralText, marginTop: -4 },
    haken: { position: "absolute", top: 8, right: 8, width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
    spaet: { borderRadius: RADIUS.tile, paddingVertical: 10, paddingLeft: 14, paddingRight: 10, flexDirection: "row", alignItems: "center", gap: 10 },
    spaetIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: c.card, alignItems: "center", justifyContent: "center" },
    spaetTitel: { fontFamily: FONT.w800, fontSize: 16, color: c.textDark },
    spaetSub: { fontFamily: FONT.w600, fontSize: 13 },
    spaetJa: { height: 46, paddingHorizontal: 16, borderRadius: RADIUS.pill, alignItems: "center", justifyContent: "center" },
    spaetJaText: { fontFamily: FONT.w800, fontSize: 15 },
    spaetNein: { width: 46, height: 46, borderRadius: 23, backgroundColor: c.card, alignItems: "center", justifyContent: "center" },
  });
