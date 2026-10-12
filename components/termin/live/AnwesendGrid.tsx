import React, { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeOut, ZoomIn } from "react-native-reanimated";
import { MemberProfile } from "../../../types";
import { FONT, RADIUS, ThemeColors, glow } from "../../../constants/design";
import { useColors, useThemedStyles } from "../../../contexts/ThemeContext";
import { TerminAbend } from "../../../utils/useTerminAbend";
import { displayName } from "../../../utils/format";
import { useFuehrende } from "../../../utils/useFuehrende";
import { Avatar, Emoji, PressableScale, haptik } from "../../ui";
import { SYMBOL } from "../../../constants/symbole";
import { formatUhrzeit } from "../../../utils/date";
import { VerlaufListe } from "./VerlaufListe";

/** Ab wie vielen Minuten nach Beginn ein Eintreffen als „zu spät" gilt. */
const SPAET_AB_MIN = 10;
/** Vorschlag beim Eintragen von Hand, wenn sich aus der Uhrzeit nichts ableiten lässt. */
const SPAET_VORSCHLAG_MIN = 15;
const SPAET_MAX_MIN = 999;

/** Offene Verspätungs-Abfrage. `bestehend`: schon eingetragen, Minuten und Grund werden nur korrigiert. */
type SpaetAbfrage = { memberId: string; minuten: number; grund: string; bestehend: boolean };

/**
 * Wer sitzt am Tisch? Antippen trägt ein bzw. aus. Wer mehr als 10 Minuten
 * nach Beginn eingetragen wird, bekommt die Frage „zu spät?"; lange drücken
 * trägt die Verspätung von Hand ein oder korrigiert sie. Erfasst werden nur
 * Minuten und Grund – ob das eine Strafe kostet, regelt jeder Stammtisch
 * selbst, daher danach nur der Sprung zu den Strafen (`onStrafe`).
 * Wer abgesagt hat, steht nicht im Raster, sondern klein darunter.
 * Darunter der Verlauf: wer kam wann (Ankunftszeit beim Einchecken).
 */
export function AnwesendGrid({ abend, mitglieder, start, now, onStrafe }: {
  abend: TerminAbend; mitglieder: MemberProfile[]; start: Date | null; now: Date;
  /** Zu den Strafen springen, Person vorausgewählt. Fehlt, wenn der Strafen-Tab aus ist. */
  onStrafe?: (memberId: string) => void;
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const fuehrende = useFuehrende();
  const t = abend.termin!;
  const [spaet, setSpaet] = useState<SpaetAbfrage | null>(null);
  /** Gerade gespeicherte Verspätung – bietet den Weg zur Strafe an. */
  const [gespeichert, setGespeichert] = useState<{ memberId: string; minuten: number } | null>(null);
  const minutenRef = useRef<TextInput>(null);
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
      if (minuten > SPAET_AB_MIN && spaetMinuten(m.id) === null) setSpaet({ memberId: m.id, minuten, grund: "", bestehend: false });
    }
  }

  function langDruecken(m: MemberProfile) {
    if (!istDa(m)) return;
    haptik("mittel");
    setGespeichert(null);
    const bisher = spaetMinuten(m.id);
    const seitBeginn = minutenSeitBeginn();
    const vorschlag = bisher ?? (seitBeginn > 0 ? seitBeginn : SPAET_VORSCHLAG_MIN);
    const grund = (abend.verspätungMap[m.id] ?? []).find((l) => l.grund)?.grund ?? "";
    setSpaet({ memberId: m.id, minuten: vorschlag, grund, bestehend: bisher !== null });
  }

  function minutenAendern(delta: number) {
    setSpaet((s) => (s ? { ...s, minuten: Math.min(SPAET_MAX_MIN, Math.max(1, (s.minuten || 0) + delta)) } : s));
  }

  /** Freie Eingabe: nur Ziffern; leer bleibt erlaubt, solange getippt wird. */
  function minutenTippen(text: string) {
    const zahl = parseInt(text.replace(/\D/g, ""), 10);
    setSpaet((s) => (s ? { ...s, minuten: Number.isNaN(zahl) ? 0 : Math.min(SPAET_MAX_MIN, zahl) } : s));
  }

  async function spaetSpeichern() {
    if (!spaet || spaet.minuten < 1) return;
    const s = spaet;
    const grund = s.grund.trim() || undefined;
    setSpaet(null);
    haptik("mittel");
    if (s.bestehend) {
      for (const log of abend.verspätungMap[s.memberId] ?? []) await abend.verspätungLöschen(s.memberId, log.id);
    }
    await abend.verspätungEintragen(s.memberId, s.minuten, grund);
    if (!s.bestehend && onStrafe) setGespeichert({ memberId: s.memberId, minuten: s.minuten });
  }

  async function spaetEntfernen() {
    if (!spaet) return;
    const s = spaet;
    setSpaet(null);
    haptik("leicht");
    for (const log of abend.verspätungMap[s.memberId] ?? []) await abend.verspätungLöschen(s.memberId, log.id);
  }

  const spaetMember = spaet ? mitglieder.find((m) => m.id === spaet.memberId) : undefined;

  // Verlauf: wer kam wann. Ohne Uhrzeit sind, wer vorab zugesagt hat (und nicht neu eingecheckt wurde) sowie ältere Einträge.
  const zeiten = t.ankunftZeiten ?? {};
  const anwesende = mitglieder.filter(istDa);
  const mitZeit = anwesende.filter((m) => zeiten[m.id]).sort((a, b) => zeiten[a.id].localeCompare(zeiten[b.id]));
  const ohneZeit = anwesende.filter((m) => !zeiten[m.id]);
  const spaetText = (memberId: string) => {
    const minuten = spaetMinuten(memberId);
    if (minuten === null) return undefined;
    const grund = (abend.verspätungMap[memberId] ?? []).find((l) => l.grund)?.grund;
    return `zu spät, +${minuten} Min.${grund ? ` · ${grund}` : ""}`;
  };
  const gespeichertMember = gespeichert ? mitglieder.find((m) => m.id === gespeichert.memberId) : undefined;

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
            <Text style={[styles.spaetTitel, { flex: 1 }]} numberOfLines={1}>
              {spaet.bestehend ? `${displayName(spaetMember)}: Verspätung ändern` : `${displayName(spaetMember)} zu spät?`}
            </Text>
            <PressableScale onPress={() => setSpaet(null)} style={styles.spaetNein} hitSlop={6} accessibilityLabel={spaet.bestehend ? "Abbrechen" : "Nicht zu spät"}>
              <Ionicons name="close" size={16} color={c.textDark} />
            </PressableScale>
          </View>
          <View style={styles.spaetFuss}>
            <View style={styles.stepper}>
              <PressableScale onPress={() => minutenAendern(-1)} style={styles.stepKnopf} hitSlop={4} accessibilityLabel="Eine Minute weniger">
                <Ionicons name="remove" size={18} color={c.textDark} />
              </PressableScale>
              <Pressable style={styles.minutenFeld} onPress={() => minutenRef.current?.focus()} accessible={false}>
                <TextInput
                  ref={minutenRef}
                  style={[styles.minutenEingabe, { color: c.coralText }]}
                  value={spaet.minuten > 0 ? String(spaet.minuten) : ""}
                  onChangeText={minutenTippen}
                  keyboardType="number-pad"
                  maxLength={3}
                  selectTextOnFocus
                  placeholder="0"
                  placeholderTextColor={c.textLight}
                  accessibilityLabel="Minuten zu spät"
                />
                <Text style={[styles.minutenEinheit, { color: c.coralText }]}>Min.</Text>
              </Pressable>
              <PressableScale onPress={() => minutenAendern(1)} style={styles.stepKnopf} hitSlop={4} accessibilityLabel="Eine Minute mehr">
                <Ionicons name="add" size={18} color={c.textDark} />
              </PressableScale>
            </View>
            <PressableScale
              onPress={spaetSpeichern}
              disabled={spaet.minuten < 1}
              style={[styles.spaetJa, { backgroundColor: spaet.minuten < 1 ? c.cardAlt : c.coral }]}
              accessibilityLabel={`${displayName(spaetMember)}: ${spaet.minuten} Minuten zu spät speichern`}
            >
              <Text style={[styles.spaetJaText, { color: c.onCoral }]} numberOfLines={1}>Speichern</Text>
            </PressableScale>
          </View>
          <TextInput
            style={styles.grundEingabe}
            value={spaet.grund}
            onChangeText={(grund) => setSpaet((s) => (s ? { ...s, grund } : s))}
            placeholder="Grund (optional), z. B. Zug verspätet"
            placeholderTextColor={c.textLight}
            maxLength={80}
            returnKeyType="done"
            accessibilityLabel="Grund für die Verspätung"
          />
          {spaet.bestehend && spaetMinuten(spaet.memberId) !== null ? (
            <PressableScale onPress={spaetEntfernen} style={styles.entfernen} hitSlop={6} accessibilityLabel={`Verspätung von ${displayName(spaetMember)} entfernen`}>
              <Text style={[styles.entfernenText, { color: c.coralText }]}>Verspätung entfernen</Text>
            </PressableScale>
          ) : null}
        </Animated.View>
      ) : null}

      {gespeichert && gespeichertMember && onStrafe && !spaet ? (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={styles.gespeichert} accessibilityLiveRegion="polite">
          <Text style={styles.gespeichertText} numberOfLines={1}>{`${displayName(gespeichertMember)}: +${gespeichert.minuten} Min. gespeichert`}</Text>
          <PressableScale
            onPress={() => { setGespeichert(null); onStrafe(gespeichert.memberId); }}
            style={styles.gespeichertKnopf}
            hitSlop={4}
            accessibilityLabel={`Strafe für ${displayName(gespeichertMember)} eintragen`}
          >
            <Text style={[styles.gespeichertKnopfText, { color: c.coralText }]}>Strafe eintragen</Text>
            <Ionicons name="chevron-forward" size={14} color={c.coralText} />
          </PressableScale>
          <PressableScale onPress={() => setGespeichert(null)} hitSlop={8} accessibilityLabel="Hinweis schließen">
            <Ionicons name="close" size={16} color={c.textMuted} />
          </PressableScale>
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

      <VerlaufListe
        titel="Verlauf"
        eintraege={mitZeit.map((m) => ({
          id: m.id,
          zeit: formatUhrzeit(zeiten[m.id]),
          wer: displayName(m),
          was: spaetText(m.id) ?? "ist da",
        }))}
        fuss={ohneZeit.length > 0 ? (
          <Text style={[styles.ohneZeit, mitZeit.length > 0 && styles.ohneZeitTrenner]}>
            {`Ohne Ankunftszeit: ${ohneZeit.map((m) => `${displayName(m)}${spaetMinuten(m.id) !== null ? ` (+${spaetMinuten(m.id)} Min.)` : ""}`).join(", ")}`}
          </Text>
        ) : undefined}
      />
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
    spaetNein: { width: 32, height: 32, borderRadius: 16, backgroundColor: c.card, alignItems: "center", justifyContent: "center" },
    spaetFuss: { flexDirection: "row", alignItems: "center", gap: 10 },
    stepper: { flexDirection: "row", alignItems: "center", gap: 6 },
    stepKnopf: { width: 36, height: 36, borderRadius: 18, backgroundColor: c.card, alignItems: "center", justifyContent: "center" },
    minutenFeld: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 3, height: 36, minWidth: 72, paddingHorizontal: 8,
      borderRadius: RADIUS.sm, backgroundColor: c.card,
    },
    minutenEingabe: { fontFamily: FONT.w700, fontSize: 16, lineHeight: 20, minWidth: 26, textAlign: "right", paddingVertical: 0, fontVariant: ["tabular-nums"] },
    minutenEinheit: { fontFamily: FONT.w600, fontSize: 13, lineHeight: 20 },
    grundEingabe: {
      height: 40, borderRadius: RADIUS.sm, paddingHorizontal: 12, backgroundColor: c.card,
      fontFamily: FONT.w400, fontSize: 14, color: c.textDark,
    },
    spaetJa: { flex: 1, height: 40, paddingHorizontal: 12, borderRadius: RADIUS.pill, alignItems: "center", justifyContent: "center" },
    spaetJaText: { fontFamily: FONT.w600, fontSize: 14 },

    gespeichert: {
      flexDirection: "row", alignItems: "center", gap: 10, minHeight: 44, paddingLeft: 14, paddingRight: 12,
      borderRadius: RADIUS.md, backgroundColor: c.card, borderWidth: StyleSheet.hairlineWidth, borderColor: c.hairline,
    },
    gespeichertText: { flex: 1, fontFamily: FONT.w500, fontSize: 14, color: c.textDark },
    gespeichertKnopf: { flexDirection: "row", alignItems: "center", gap: 2, height: 32 },
    gespeichertKnopfText: { fontFamily: FONT.w600, fontSize: 14 },
    abgesagtBox: { gap: 6, paddingHorizontal: 4 },
    abgesagtTitel: { fontFamily: FONT.w600, fontSize: 12, color: c.textMuted, letterSpacing: 0.4, textTransform: "uppercase" },
    abgesagtReihe: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    abgesagtChip: {
      flexDirection: "row", alignItems: "center", gap: 6, height: 30, paddingLeft: 4, paddingRight: 10,
      borderRadius: RADIUS.pill, borderWidth: StyleSheet.hairlineWidth, borderColor: c.hairline, backgroundColor: c.card,
    },
    abgesagtName: { fontFamily: FONT.w500, fontSize: 13, color: c.textMuted },
    entfernen: { alignSelf: "flex-start", paddingVertical: 2 },
    entfernenText: { fontFamily: FONT.w600, fontSize: 13 },
    ohneZeit: { fontFamily: FONT.w400, fontSize: 13, lineHeight: 18, color: c.textMuted, paddingVertical: 10 },
    ohneZeitTrenner: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
    tipp: { fontFamily: FONT.w400, fontSize: 12, color: c.textMuted, paddingHorizontal: 4 },
  });
