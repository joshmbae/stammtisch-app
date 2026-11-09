import React, { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { MemberProfile } from "../../../types";
import { FONT, RADIUS, TYPE, ThemeColors } from "../../../constants/design";
import { useColors, useThemedStyles } from "../../../contexts/ThemeContext";
import { TerminAbend } from "../../../utils/useTerminAbend";
import { displayName } from "../../../utils/format";
import { formatUhrzeit } from "../../../utils/date";
import { Avatar, Button, Card, PressableScale, Sheet, haptik } from "../../ui";
import { Agenda } from "../Agenda";
import { VerlaufListe } from "./VerlaufListe";
import { SYMBOL } from "../../../constants/symbole";

/** Vorschlag, wenn noch keine Verspätung eingetragen ist. */
const SPAET_VORSCHLAG_MIN = 15;
const SPAET_MAX_MIN = 999;

/**
 * Erster Bereich am Abend: die Agenda (eingeklappt), wer heute dabei ist und
 * die Verspätungen. Ob jemand da ist, kommt aus den Zusagen (Vorher) und wird
 * hier nicht noch einmal abgefragt; eingetragen wird nur, wer zu spät kam.
 * Antippen einer Person öffnet Minuten und Grund. Ob eine Verspätung etwas
 * kostet, regelt jeder Stammtisch selbst; nach dem Speichern führt
 * „Strafe eintragen“ zu den Strafen (`onStrafe`).
 */
export function Heute({ abend, dabei, start, onStrafe, onZusagen }: {
  abend: TerminAbend;
  /** Zur Vorher-Ansicht: wer dabei ist, regeln die Zusagen. */
  onZusagen: () => void;
  /** Wer heute dabei ist (Zusagen bzw. Anwesenheit). */
  dabei: MemberProfile[];
  start: Date | null;
  /** Zu den Strafen springen, Person vorausgewählt. Fehlt, wenn der Strafen-Tab aus ist. */
  onStrafe?: (memberId: string) => void;
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const [offenFuer, setOffenFuer] = useState<string | null>(null);
  const [minuten, setMinuten] = useState(0);
  const [grund, setGrund] = useState("");
  const [busy, setBusy] = useState(false);
  /** Gerade gespeicherte Verspätung – bietet den Weg zur Strafe an. */
  const [gespeichert, setGespeichert] = useState<{ memberId: string; minuten: number } | null>(null);
  const minutenRef = useRef<TextInput>(null);

  const spaetLogs = (memberId: string) => abend.verspätungMap[memberId] ?? [];
  const spaetMinuten = (memberId: string): number | null => {
    const logs = spaetLogs(memberId);
    return logs.length > 0 ? Math.max(...logs.map((l) => l.minutenVerspätet)) : null;
  };
  const spaetGrund = (memberId: string) => spaetLogs(memberId).find((l) => l.grund)?.grund;

  function oeffnen(m: MemberProfile) {
    haptik("leicht");
    setGespeichert(null);
    setMinuten(spaetMinuten(m.id) ?? SPAET_VORSCHLAG_MIN);
    setGrund(spaetGrund(m.id) ?? "");
    setOffenFuer(m.id);
  }

  async function spaetSpeichern(m: MemberProfile) {
    if (minuten < 1) return;
    setBusy(true);
    try {
      const neu = spaetMinuten(m.id) === null;
      for (const log of spaetLogs(m.id)) await abend.verspätungLöschen(m.id, log.id);
      await abend.verspätungEintragen(m.id, minuten, grund.trim() || undefined);
      haptik("mittel");
      setOffenFuer(null);
      if (neu && onStrafe) setGespeichert({ memberId: m.id, minuten });
    } finally {
      setBusy(false);
    }
  }

  async function spaetEntfernen(m: MemberProfile) {
    setBusy(true);
    try {
      for (const log of spaetLogs(m.id)) await abend.verspätungLöschen(m.id, log.id);
      haptik("leicht");
      setOffenFuer(null);
    } finally {
      setBusy(false);
    }
  }

  const minutenTippen = (text: string) => {
    const zahl = parseInt(text.replace(/\D/g, ""), 10);
    setMinuten(Number.isNaN(zahl) ? 0 : Math.min(SPAET_MAX_MIN, zahl));
  };
  const minutenAendern = (delta: number) => setMinuten((n) => Math.min(SPAET_MAX_MIN, Math.max(1, (n || 0) + delta)));

  const person = offenFuer ? dabei.find((m) => m.id === offenFuer) : undefined;
  const personSpaet = person ? spaetMinuten(person.id) : null;
  const gespeichertMember = gespeichert ? dabei.find((m) => m.id === gespeichert.memberId) : undefined;

  // Verspätungen des Abends, früheste Ankunft zuerst.
  const verspaetungen = dabei
    .filter((m) => spaetMinuten(m.id) !== null)
    .map((m) => ({ m, min: spaetMinuten(m.id)! }))
    .sort((a, b) => a.min - b.min)
    .map(({ m, min }) => ({
      id: m.id,
      zeit: start ? formatUhrzeit(new Date(start.getTime() + min * 60_000).toISOString()) : undefined,
      emoji: SYMBOL.zuSpaet,
      ton: "coral" as const,
      wer: displayName(m),
      was: spaetGrund(m.id) ?? "zu spät",
      rechts: `+${min} Min.`,
      loeschen: async () => { for (const log of spaetLogs(m.id)) await abend.verspätungLöschen(m.id, log.id); },
    }));

  return (
    <View style={{ gap: 12 }}>
      <Agenda abend={abend} einklappbar />

      {gespeichert && gespeichertMember && onStrafe ? (
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

      <Card style={{ gap: 12 }}>
        <View style={styles.kopf}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.kartenTitel} accessibilityRole="header">{`Dabei · ${dabei.length}`}</Text>
            {dabei.length > 0 ? <Text style={styles.meta}>Wer zu spät kam: antippen</Text> : null}
          </View>
          <PressableScale onPress={onZusagen} style={styles.zusagenLink} hitSlop={6} accessibilityLabel="Zusagen ändern, öffnet Vorher">
            <Text style={styles.zusagenText}>Zusagen</Text>
            <Ionicons name="chevron-forward" size={14} color={c.blue} />
          </PressableScale>
        </View>
        {dabei.length === 0 ? (
          <Text style={styles.leer}>Noch niemand eingetragen. Wer dabei ist, ergibt sich aus den Zusagen unter „Vorher“.</Text>
        ) : (
          <View style={styles.raster}>
            {dabei.map((m) => {
              const min = spaetMinuten(m.id);
              return (
                <PressableScale
                  key={m.id}
                  onPress={() => oeffnen(m)}
                  style={styles.person}
                  accessibilityRole="button"
                  accessibilityLabel={min !== null ? `${displayName(m)}, ${min} Minuten zu spät` : displayName(m)}
                  accessibilityHint={min !== null ? "Verspätung ändern" : "Verspätung eintragen"}
                >
                  <Avatar name={displayName(m)} color={m.avatarColor} photoUri={m.photoUri} size={44} />
                  <Text style={styles.personName} numberOfLines={1}>{displayName(m)}</Text>
                  {min !== null ? (
                    <View style={[styles.spaetPille, { backgroundColor: c.coralSoft }]}>
                      <Ionicons name="time-outline" size={11} color={c.coralText} />
                      <Text style={[styles.spaetText, { color: c.coralText }]}>{`+${min}`}</Text>
                    </View>
                  ) : null}
                </PressableScale>
              );
            })}
          </View>
        )}
      </Card>

      <VerlaufListe titel="Verspätungen" eintraege={verspaetungen} />

      <Sheet visible={!!person} onClose={() => setOffenFuer(null)} title={person ? displayName(person) : ""}>
        {person ? (
          <>
            <Text style={styles.abschnitt}>{personSpaet !== null ? "Verspätung ändern" : "Verspätung"}</Text>
            <View style={styles.stepper}>
              <PressableScale onPress={() => minutenAendern(-1)} style={styles.stepKnopf} hitSlop={4} accessibilityLabel="Eine Minute weniger">
                <Ionicons name="remove" size={18} color={c.textDark} />
              </PressableScale>
              <Pressable style={styles.minutenFeld} onPress={() => minutenRef.current?.focus()} accessible={false}>
                <TextInput
                  ref={minutenRef}
                  style={[styles.minutenEingabe, { color: c.coralText }]}
                  value={minuten > 0 ? String(minuten) : ""}
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
              {start && minuten > 0 ? (
                <Text style={styles.ankunft}>{`Ankunft ${formatUhrzeit(new Date(start.getTime() + minuten * 60_000).toISOString())}`}</Text>
              ) : null}
            </View>
            <TextInput
              style={styles.grundEingabe}
              value={grund}
              onChangeText={setGrund}
              placeholder="Grund (optional), z. B. Zug verspätet"
              placeholderTextColor={c.textLight}
              maxLength={80}
              returnKeyType="done"
              accessibilityLabel="Grund für die Verspätung"
            />
            <Button
              label={personSpaet !== null ? "Verspätung speichern" : "Verspätung eintragen"}
              variant="danger"
              loading={busy}
              colors={minuten < 1 ? { bg: c.cardAlt, fg: c.textMuted } : undefined}
              onPress={() => spaetSpeichern(person)}
            />
            {personSpaet !== null ? (
              <PressableScale onPress={() => spaetEntfernen(person)} style={styles.textKnopf} hitSlop={6} accessibilityLabel="Verspätung entfernen">
                <Text style={[styles.textKnopfText, { color: c.coralText }]}>Verspätung entfernen</Text>
              </PressableScale>
            ) : null}
          </>
        ) : null}
      </Sheet>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    kopf: { flexDirection: "row", alignItems: "center", gap: 8 },
    zusagenLink: { flexDirection: "row", alignItems: "center", gap: 2, minHeight: 44, paddingLeft: 8 },
    zusagenText: { fontFamily: FONT.w600, fontSize: 14, color: c.blue },
    kartenTitel: { ...TYPE.heading, color: c.textDark },
    meta: { ...TYPE.caption, fontSize: 13, color: c.textMuted, marginTop: 1 },
    leer: { ...TYPE.body, fontSize: 14, color: c.textMuted },
    raster: { flexDirection: "row", flexWrap: "wrap", rowGap: 14 },
    person: { width: "25%", alignItems: "center", gap: 4 },
    personName: { fontFamily: FONT.w600, fontSize: 13, color: c.textDark, maxWidth: "92%" },
    spaetPille: { flexDirection: "row", alignItems: "center", gap: 2, height: 20, paddingHorizontal: 7, borderRadius: RADIUS.pill },
    spaetText: { fontFamily: FONT.w700, fontSize: 12, fontVariant: ["tabular-nums"] },

    gespeichert: {
      flexDirection: "row", alignItems: "center", gap: 10, minHeight: 44, paddingLeft: 14, paddingRight: 12,
      borderRadius: RADIUS.md, backgroundColor: c.card, borderWidth: StyleSheet.hairlineWidth, borderColor: c.hairline,
    },
    gespeichertText: { flex: 1, fontFamily: FONT.w500, fontSize: 14, color: c.textDark },
    gespeichertKnopf: { flexDirection: "row", alignItems: "center", gap: 2, height: 32 },
    gespeichertKnopfText: { fontFamily: FONT.w600, fontSize: 14 },

    abschnitt: { ...TYPE.label, color: c.textMuted },
    stepper: { flexDirection: "row", alignItems: "center", gap: 8 },
    stepKnopf: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.card, alignItems: "center", justifyContent: "center" },
    minutenFeld: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 3, height: 40, minWidth: 80, paddingHorizontal: 10,
      borderRadius: RADIUS.sm, backgroundColor: c.card,
    },
    minutenEingabe: { fontFamily: FONT.w700, fontSize: 17, lineHeight: 22, minWidth: 28, textAlign: "right", paddingVertical: 0, fontVariant: ["tabular-nums"] },
    minutenEinheit: { fontFamily: FONT.w600, fontSize: 14, lineHeight: 22 },
    ankunft: { flex: 1, fontFamily: FONT.w500, fontSize: 13, color: c.textMuted, textAlign: "right" },
    grundEingabe: {
      height: 44, borderRadius: RADIUS.sm, paddingHorizontal: 12, backgroundColor: c.card,
      fontFamily: FONT.w400, fontSize: 15, color: c.textDark,
    },
    textKnopf: { alignSelf: "center", paddingVertical: 4 },
    textKnopfText: { fontFamily: FONT.w600, fontSize: 14 },
  });
