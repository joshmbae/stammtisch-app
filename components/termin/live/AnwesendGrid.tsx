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
/** Vorschlag beim Eintragen von Hand, wenn sich aus der Uhrzeit nichts ableiten lässt. */
const SPAET_VORSCHLAG_MIN = 15;
const SPAET_SCHRITT_MIN = 5;

/** Ab wie vielen Minuten eine Verspätungs-Kategorie greift, gelesen aus dem Namen („15–30 Min.", „>30 Min.", „ab 30"). */
function spaetSchwelle(label: string): number {
  const bereich = label.match(/(\d+)\s*[–-]\s*\d+/);
  if (bereich) return Number(bereich[1]);
  const ueber = label.match(/>\s*(\d+)/);
  if (ueber) return Number(ueber[1]) + 1;
  const ab = label.match(/ab\s*(\d+)/i);
  return ab ? Number(ab[1]) : 0;
}

/**
 * Die Strafe für so viele Minuten Verspätung: die Kategorie mit der höchsten
 * Schwelle, die erreicht ist. Entschuldigte Verspätung wird hier nicht vergeben.
 * Unter jeder Schwelle → keine Strafe.
 */
export function spaetKategorie(kats: StrafKategorieDef[], minuten: number): StrafKategorieDef | undefined {
  return kats
    .filter((k) => !k.spielEreignisTypId && /spät|spaet|verspät/i.test(k.label) && !/entschuld/i.test(k.label))
    .filter((k) => minuten >= spaetSchwelle(k.label))
    .sort((a, b) => spaetSchwelle(b.label) - spaetSchwelle(a.label))[0];
}

/** Offene Verspätungs-Abfrage. `bestehend`: schon eingetragen, die Minuten werden nur korrigiert. */
type SpaetAbfrage = { memberId: string; minuten: number; bestehend: boolean };

/**
 * Wer sitzt am Tisch? Antippen trägt ein bzw. aus. Wer mehr als 10 Minuten
 * nach Beginn eingetragen wird, bekommt die Frage „zu spät?" mit der Strafe;
 * lange drücken trägt die Verspätung von Hand ein oder korrigiert sie.
 * Wer abgesagt hat, steht nicht im Raster, sondern klein darunter.
 */
export function AnwesendGrid({ abend, mitglieder, start, now }: { abend: TerminAbend; mitglieder: MemberProfile[]; start: Date | null; now: Date }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const fuehrende = useFuehrende();
  const t = abend.termin!;
  const [spaet, setSpaet] = useState<SpaetAbfrage | null>(null);
  const dunkel = c.heroStyle === "outline";

  const istDa = (m: MemberProfile) => !!t.anwesenheit?.includes(m.id);
  const hatAbgesagt = (m: MemberProfile) => !istDa(m) && !!t.absagen?.includes(m.id);
  const imRaster = mitglieder.filter((m) => !hatAbgesagt(m));
  const abgesagt = mitglieder.filter(hatAbgesagt);

  const spaetMinuten = (memberId: string): number | null => {
    const logs = abend.verspätungMap[memberId] ?? [];
    return logs.length > 0 ? Math.max(...logs.map((l) => l.minutenVerspätet)) : null;
  };
  /** Schon eine Verspätungs-Strafe im Verlauf (auch ohne eingetragene Minuten)? */
  const hatSpaetStrafe = (memberId: string) =>
    (abend.strafMap[memberId] ?? []).some((l) => /spät|spaet|verspät/i.test(abend.strafKategorien.find((k) => k.id === l.kategorie)?.label ?? ""));
  const minutenSeitBeginn = () => (start ? Math.floor((now.getTime() - start.getTime()) / 60_000) : 0);

  async function tippen(m: MemberProfile) {
    const da = istDa(m);
    haptik(da ? "leicht" : "erfolg");
    if (spaet?.memberId === m.id) setSpaet(null);
    await abend.anwesenheitSetzen(m.id, !da);
    if (!da && start) {
      const minuten = minutenSeitBeginn();
      if (minuten > SPAET_AB_MIN && spaetMinuten(m.id) === null && !hatSpaetStrafe(m.id)) setSpaet({ memberId: m.id, minuten, bestehend: false });
    }
  }

  function langDruecken(m: MemberProfile) {
    if (!istDa(m)) return;
    haptik("mittel");
    const bisher = spaetMinuten(m.id);
    const seitBeginn = minutenSeitBeginn();
    const vorschlag = bisher ?? (seitBeginn > 0 ? seitBeginn : SPAET_VORSCHLAG_MIN);
    // Steht die Strafe schon im Verlauf, nur die Minuten festhalten – keine zweite Strafe.
    setSpaet({ memberId: m.id, minuten: vorschlag, bestehend: bisher !== null || hatSpaetStrafe(m.id) });
  }

  function minutenAendern(delta: number) {
    setSpaet((s) => (s ? { ...s, minuten: Math.max(SPAET_SCHRITT_MIN, s.minuten + delta) } : s));
  }

  async function spaetSpeichern() {
    if (!spaet) return;
    const s = spaet;
    setSpaet(null);
    haptik("mittel");
    if (s.bestehend) {
      // Nur die Minuten korrigieren – die Strafe steht schon im Verlauf.
      for (const log of abend.verspätungMap[s.memberId] ?? []) await abend.verspätungLöschen(s.memberId, log.id);
      await abend.verspätungEintragen(s.memberId, s.minuten);
    } else {
      await abend.verspätungMitStrafe(s.memberId, s.minuten, spaetKategorie(abend.strafKategorien, s.minuten));
    }
  }

  const spaetMember = spaet ? mitglieder.find((m) => m.id === spaet.memberId) : undefined;
  const kat = spaet && !spaet.bestehend ? spaetKategorie(abend.strafKategorien, spaet.minuten) : undefined;
  const spaetKnopf = spaet?.bestehend ? "Speichern" : kat ? `Eintragen · ${formatEuro(kat.betrag).replace(",00", "")} €` : "Eintragen";

  return (
    <View style={{ gap: 12 }}>
      <View style={styles.raster}>
        {imRaster.map((m) => {
          const da = istDa(m);
          const minuten = da ? spaetMinuten(m.id) : null;
          const marke = minuten !== null ? `+${minuten} Min.` : da && hatSpaetStrafe(m.id) ? "zu spät" : null;
          return (
            <View key={m.id} style={styles.zelle}>
              <PressableScale
                onPress={() => tippen(m)}
                onLongPress={() => langDruecken(m)}
                delayLongPress={350}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: da }}
                accessibilityLabel={`${displayName(m)}${minuten !== null ? `, ${minuten} Minuten zu spät` : marke ? ", zu spät" : ""}`}
                accessibilityHint={da ? "Tippen, wenn doch nicht da. Lange drücken, um eine Verspätung einzutragen" : "Tippen, wenn da"}
                style={[
                  styles.kachel,
                  da ? [styles.kachelDa, dunkel && glow(c.liveAccent, c, 10)] : null,
                ]}
              >
                <Avatar
                  name={displayName(m)} color={m.avatarColor} photoUri={m.photoUri} size={34}
                  fuehrt={fuehrende.get(m.id)} ringColor={da ? (dunkel ? c.card : c.live) : c.card}
                />
                <Text style={[styles.name, da && { color: dunkel ? c.textDark : c.onLive }]} numberOfLines={1}>{displayName(m)}</Text>
                {marke ? <Text style={[styles.spaetMarke, { color: c.mustard }]} numberOfLines={1}>{marke}</Text> : null}
                {da ? (
                  <Animated.View entering={ZoomIn.springify().damping(14)} style={[styles.haken, { backgroundColor: dunkel ? "transparent" : c.onLive }]}>
                    <Ionicons name="checkmark" size={dunkel ? 14 : 12} color={dunkel ? c.liveAccent : c.live} />
                  </Animated.View>
                ) : null}
              </PressableScale>
            </View>
          );
        })}
      </View>

      {spaet && spaetMember ? (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={[styles.spaet, { backgroundColor: c.coralSoft }]} accessibilityLiveRegion="polite">
          <View style={styles.spaetKopf}>
            <View style={styles.spaetIcon}><Emoji size={18}>{SYMBOL.zuSpaet}</Emoji></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.spaetTitel} numberOfLines={1}>
                {spaet.bestehend ? `${displayName(spaetMember)}: Verspätung ändern` : `${displayName(spaetMember)} zu spät?`}
              </Text>
              <Text style={[styles.spaetSub, { color: c.coralText }]} numberOfLines={1}>
                {spaet.bestehend ? "Strafe bleibt wie eingetragen" : kat ? kat.label : "Ohne Strafe"}
              </Text>
            </View>
            <PressableScale onPress={() => setSpaet(null)} style={styles.spaetNein} hitSlop={6} accessibilityLabel={spaet.bestehend ? "Abbrechen" : "Nicht zu spät"}>
              <Ionicons name="close" size={16} color={c.textDark} />
            </PressableScale>
          </View>
          <View style={styles.spaetFuss}>
            <View style={styles.stepper}>
              <PressableScale onPress={() => minutenAendern(-SPAET_SCHRITT_MIN)} style={styles.stepKnopf} hitSlop={4} accessibilityLabel={`${SPAET_SCHRITT_MIN} Minuten weniger`}>
                <Ionicons name="remove" size={18} color={c.textDark} />
              </PressableScale>
              <Text style={[styles.stepWert, { color: c.coralText }]} accessibilityLiveRegion="polite">{`+${spaet.minuten} Min.`}</Text>
              <PressableScale onPress={() => minutenAendern(SPAET_SCHRITT_MIN)} style={styles.stepKnopf} hitSlop={4} accessibilityLabel={`${SPAET_SCHRITT_MIN} Minuten mehr`}>
                <Ionicons name="add" size={18} color={c.textDark} />
              </PressableScale>
            </View>
            <PressableScale
              onPress={spaetSpeichern}
              style={[styles.spaetJa, { backgroundColor: c.coral }]}
              accessibilityLabel={spaet.bestehend
                ? `Verspätung auf ${spaet.minuten} Minuten ändern`
                : `${displayName(spaetMember)} ${spaet.minuten} Minuten zu spät eintragen${kat ? `, ${formatEuro(kat.betrag)} Euro Strafe` : ""}`}
            >
              <Text style={[styles.spaetJaText, { color: c.onCoral }]} numberOfLines={1}>{spaetKnopf}</Text>
            </PressableScale>
          </View>
        </Animated.View>
      ) : null}

      {abgesagt.length > 0 ? (
        <View style={styles.abgesagtBox}>
          <Text style={styles.abgesagtTitel}>{`Abgesagt · ${abgesagt.length}`}</Text>
          <View style={styles.abgesagtReihe}>
            {abgesagt.map((m) => (
              <PressableScale
                key={m.id}
                onPress={() => tippen(m)}
                style={styles.abgesagtChip}
                accessibilityRole="button"
                accessibilityLabel={`${displayName(m)}, hat abgesagt`}
                accessibilityHint="Tippen, wenn doch da"
              >
                <Avatar name={displayName(m)} color={m.avatarColor} photoUri={m.photoUri} size={22} absent />
                <Text style={styles.abgesagtName} numberOfLines={1}>{displayName(m)}</Text>
              </PressableScale>
            ))}
          </View>
        </View>
      ) : null}

      <Text style={styles.tipp}>Lange drücken, um eine Verspätung einzutragen.</Text>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    raster: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 },
    zelle: { width: "25%", padding: 4 },
    kachel: {
      minHeight: 82, borderRadius: RADIUS.md, alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 8, paddingHorizontal: 6,
      backgroundColor: c.card, borderWidth: StyleSheet.hairlineWidth, borderColor: c.hairline,
    },
    kachelDa: c.heroStyle === "outline"
      ? { backgroundColor: c.live, borderColor: c.liveEdge, borderWidth: 1 }
      : { backgroundColor: c.live, borderColor: c.live },
    name: { fontFamily: FONT.w600, fontSize: 13, color: c.textDark, maxWidth: "100%" },
    spaetMarke: { fontFamily: FONT.w700, fontSize: 11, marginTop: -2, fontVariant: ["tabular-nums"] },
    haken: { position: "absolute", top: 6, right: 6, width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center" },

    spaet: { borderRadius: RADIUS.tile, padding: 12, gap: 10 },
    spaetKopf: { flexDirection: "row", alignItems: "center", gap: 10 },
    spaetIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: c.card, alignItems: "center", justifyContent: "center" },
    spaetTitel: { fontFamily: FONT.w600, fontSize: 15, color: c.textDark },
    spaetSub: { fontFamily: FONT.w500, fontSize: 12 },
    spaetNein: { width: 32, height: 32, borderRadius: 16, backgroundColor: c.card, alignItems: "center", justifyContent: "center" },
    spaetFuss: { flexDirection: "row", alignItems: "center", gap: 10 },
    stepper: { flexDirection: "row", alignItems: "center", gap: 6 },
    stepKnopf: { width: 36, height: 36, borderRadius: 18, backgroundColor: c.card, alignItems: "center", justifyContent: "center" },
    stepWert: { fontFamily: FONT.w700, fontSize: 15, minWidth: 64, textAlign: "center", fontVariant: ["tabular-nums"] },
    spaetJa: { flex: 1, height: 40, paddingHorizontal: 12, borderRadius: RADIUS.pill, alignItems: "center", justifyContent: "center" },
    spaetJaText: { fontFamily: FONT.w600, fontSize: 14 },

    abgesagtBox: { gap: 6, paddingHorizontal: 4 },
    abgesagtTitel: { fontFamily: FONT.w600, fontSize: 12, color: c.textMuted, letterSpacing: 0.4, textTransform: "uppercase" },
    abgesagtReihe: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    abgesagtChip: {
      flexDirection: "row", alignItems: "center", gap: 6, height: 30, paddingLeft: 4, paddingRight: 10,
      borderRadius: RADIUS.pill, borderWidth: StyleSheet.hairlineWidth, borderColor: c.hairline, backgroundColor: c.card,
    },
    abgesagtName: { fontFamily: FONT.w500, fontSize: 13, color: c.textMuted },
    tipp: { fontFamily: FONT.w400, fontSize: 12, color: c.textMuted, paddingHorizontal: 4 },
  });
