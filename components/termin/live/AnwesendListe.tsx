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
import { useFuehrende } from "../../../utils/useFuehrende";
import { Avatar, Button, Card, PressableScale, Sheet, haptik } from "../../ui";
import { VerlaufListe } from "./VerlaufListe";

/** Vorschlag, wenn noch keine Verspätung eingetragen ist. */
const SPAET_VORSCHLAG_MIN = 15;
const SPAET_MAX_MIN = 999;

type Status = "dabei" | "nichtDa" | "abgesagt";

/**
 * Wer ist dabei? Zusagen gelten am Abend als „dabei“; eingetragen werden nur
 * Ausnahmen – Verspätung (Minuten + Grund, auch nachträglich), doch nicht
 * gekommen, doch gekommen. Antippen öffnet dafür ein Menü, damit nichts aus
 * Versehen umspringt. Ob eine Verspätung etwas kostet, regelt jeder Stammtisch
 * selbst; nach dem Speichern führt „Strafe eintragen“ zu den Strafen (`onStrafe`).
 * Darunter die Verspätungen des Abends mit errechneter Ankunft (Beginn + Minuten).
 */
export function AnwesendListe({ abend, mitglieder, start, onStrafe }: {
  abend: TerminAbend; mitglieder: MemberProfile[]; start: Date | null;
  /** Zu den Strafen springen, Person vorausgewählt. Fehlt, wenn der Strafen-Tab aus ist. */
  onStrafe?: (memberId: string) => void;
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const fuehrende = useFuehrende();
  const t = abend.termin!;
  const [offenFuer, setOffenFuer] = useState<string | null>(null);
  const [minuten, setMinuten] = useState(0);
  const [grund, setGrund] = useState("");
  const [busy, setBusy] = useState(false);
  /** Gerade gespeicherte Verspätung – bietet den Weg zur Strafe an. */
  const [gespeichert, setGespeichert] = useState<{ memberId: string; minuten: number } | null>(null);
  const minutenRef = useRef<TextInput>(null);

  const status = (m: MemberProfile): Status =>
    t.anwesenheit?.includes(m.id) ? "dabei" : t.absagen?.includes(m.id) ? "abgesagt" : "nichtDa";
  const spaetLogs = (memberId: string) => abend.verspätungMap[memberId] ?? [];
  const spaetMinuten = (memberId: string): number | null => {
    const logs = spaetLogs(memberId);
    return logs.length > 0 ? Math.max(...logs.map((l) => l.minutenVerspätet)) : null;
  };
  const spaetGrund = (memberId: string) => spaetLogs(memberId).find((l) => l.grund)?.grund;
  /** Schon eine Verspätungs-Strafe im Verlauf (auch ohne eingetragene Minuten)? */
  const hatSpaetStrafe = (memberId: string) =>
    (abend.strafMap[memberId] ?? []).some((l) => /spät|spaet|verspät/i.test(abend.strafKategorien.find((k) => k.id === l.kategorie)?.label ?? ""));

  const gruppen: { key: Status; titel: string; leute: MemberProfile[] }[] = [
    { key: "dabei", titel: "Dabei", leute: mitglieder.filter((m) => status(m) === "dabei") },
    { key: "nichtDa", titel: "Nicht da", leute: mitglieder.filter((m) => status(m) === "nichtDa") },
    { key: "abgesagt", titel: "Abgesagt", leute: mitglieder.filter((m) => status(m) === "abgesagt") },
  ];

  /** Zeile: kleine Zusatzzeile unter dem Namen und der Knopf rechts, der sagt, was Antippen tut. */
  function zeile(m: MemberProfile): { sub?: string; knopf: { label: string; icon: "time-outline" | "checkmark"; ton: "neutral" | "spaet" | "da" } } {
    const s = status(m);
    if (s === "dabei") {
      const min = spaetMinuten(m.id);
      if (min !== null) return { sub: spaetGrund(m.id), knopf: { label: `+${min} Min.`, icon: "time-outline", ton: "spaet" } };
      if (hatSpaetStrafe(m.id)) return { knopf: { label: "zu spät", icon: "time-outline", ton: "spaet" } };
      return { knopf: { label: "zu spät?", icon: "time-outline", ton: "neutral" } };
    }
    return {
      sub: s === "abgesagt" ? t.absageGruende?.[m.id] || "abgesagt" : "ohne Absage",
      knopf: { label: "doch da", icon: "checkmark", ton: "da" },
    };
  }

  const knopfFarben = {
    neutral: { bg: c.cardAlt, fg: c.textMid },
    spaet: { bg: c.coralSoft, fg: c.coralText },
    da: { bg: c.greenSoft, fg: c.greenText },
  };

  function oeffnen(m: MemberProfile) {
    haptik("leicht");
    setGespeichert(null);
    setMinuten(spaetMinuten(m.id) ?? SPAET_VORSCHLAG_MIN);
    setGrund(spaetGrund(m.id) ?? "");
    setOffenFuer(m.id);
  }

  async function anwesenheit(m: MemberProfile, da: boolean) {
    setBusy(true);
    try {
      haptik(da ? "erfolg" : "leicht");
      await abend.anwesenheitSetzen(m.id, da);
      // Wer doch nicht kam, hat auch keine Verspätung.
      if (!da) for (const log of spaetLogs(m.id)) await abend.verspätungLöschen(m.id, log.id);
      if (!da) setOffenFuer(null);
    } finally {
      setBusy(false);
    }
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

  const person = offenFuer ? mitglieder.find((m) => m.id === offenFuer) : undefined;
  const personStatus = person ? status(person) : null;
  const personSpaet = person ? spaetMinuten(person.id) : null;
  const gespeichertMember = gespeichert ? mitglieder.find((m) => m.id === gespeichert.memberId) : undefined;

  // Verspätungen des Abends, früheste Ankunft zuerst.
  const verspaetungen = mitglieder
    .filter((m) => status(m) === "dabei" && spaetMinuten(m.id) !== null)
    .map((m) => ({ m, min: spaetMinuten(m.id)! }))
    .sort((a, b) => a.min - b.min)
    .map(({ m, min }) => ({
      id: m.id,
      zeit: start ? formatUhrzeit(new Date(start.getTime() + min * 60_000).toISOString()) : undefined,
      wer: displayName(m),
      was: `+${min} Min.${spaetGrund(m.id) ? ` · ${spaetGrund(m.id)}` : ""}`,
      loeschen: async () => { for (const log of spaetLogs(m.id)) await abend.verspätungLöschen(m.id, log.id); },
    }));

  return (
    <View style={{ gap: 12 }}>
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

      {gruppen.filter((g) => g.leute.length > 0).map((g) => (
        <View key={g.key} style={{ gap: 6 }}>
          <Text style={styles.label}>{`${g.titel} · ${g.leute.length}`}</Text>
          <Card style={{ paddingVertical: 2, paddingHorizontal: 12 }}>
            {g.leute.map((m, i) => {
              const z = zeile(m);
              const f = knopfFarben[z.knopf.ton];
              const dabei = g.key === "dabei";
              return (
                <PressableScale
                  key={m.id}
                  onPress={() => oeffnen(m)}
                  scaleTo={0.98}
                  style={[styles.zeile, i > 0 && styles.trenner]}
                  accessibilityRole="button"
                  accessibilityLabel={`${displayName(m)}${z.sub ? `, ${z.sub}` : ""}`}
                  accessibilityHint="Öffnet Verspätung und Anwesenheit"
                >
                  <Avatar
                    name={displayName(m)} color={m.avatarColor} photoUri={m.photoUri} size={30}
                    fuehrt={dabei ? fuehrende.get(m.id) : undefined} absent={!dabei}
                  />
                  <View style={styles.text}>
                    <Text style={[styles.name, !dabei && { color: c.textMuted }]} numberOfLines={1}>{displayName(m)}</Text>
                    {z.sub ? <Text style={styles.sub} numberOfLines={1}>{z.sub}</Text> : null}
                  </View>
                  <PressableScale
                    onPress={() => (dabei ? oeffnen(m) : anwesenheit(m, true))}
                    scaleTo={0.94}
                    hitSlop={8}
                    style={[styles.knopf, { backgroundColor: f.bg }]}
                    accessibilityRole="button"
                    accessibilityLabel={dabei
                      ? `${displayName(m)}: ${z.knopf.ton === "neutral" ? "Verspätung eintragen" : `Verspätung ${z.knopf.label} ändern`}`
                      : `${displayName(m)} ist doch da`}
                  >
                    <Ionicons name={z.knopf.icon} size={14} color={f.fg} />
                    <Text style={[styles.knopfText, { color: f.fg }]}>{z.knopf.label}</Text>
                  </PressableScale>
                </PressableScale>
              );
            })}
          </Card>
        </View>
      ))}

      <VerlaufListe titel="Verspätungen" eintraege={verspaetungen} />

      <Sheet visible={!!person} onClose={() => setOffenFuer(null)} title={person ? displayName(person) : ""}>
        {person && personStatus !== "dabei" ? (
          <>
            <Text style={styles.sheetText}>
              {personStatus === "abgesagt"
                ? `Hat abgesagt${t.absageGruende?.[person.id] ? `: „${t.absageGruende[person.id]}“` : "."}`
                : "Ist nicht als dabei eingetragen."}
            </Text>
            <Button label="Ist doch da" icon="checkmark" variant="blue" loading={busy} onPress={() => anwesenheit(person, true)} />
          </>
        ) : null}

        {person && personStatus === "dabei" ? (
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

            <View style={styles.sheetTrenner} />
            <Button label="Doch nicht gekommen" variant="secondary" loading={busy} onPress={() => anwesenheit(person, false)} />
          </>
        ) : null}
      </Sheet>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    label: { ...TYPE.label, color: c.textMuted },
    zeile: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 48 },
    trenner: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
    text: { flex: 1, minWidth: 0 },
    name: { fontFamily: FONT.w600, fontSize: 15, color: c.textDark },
    sub: { fontFamily: FONT.w400, fontSize: 12, color: c.textMuted, marginTop: 1 },
    knopf: { flexDirection: "row", alignItems: "center", gap: 4, height: 30, paddingHorizontal: 10, borderRadius: RADIUS.pill },
    knopfText: { fontFamily: FONT.w600, fontSize: 13, fontVariant: ["tabular-nums"] },

    gespeichert: {
      flexDirection: "row", alignItems: "center", gap: 10, minHeight: 44, paddingLeft: 14, paddingRight: 12,
      borderRadius: RADIUS.md, backgroundColor: c.card, borderWidth: StyleSheet.hairlineWidth, borderColor: c.hairline,
    },
    gespeichertText: { flex: 1, fontFamily: FONT.w500, fontSize: 14, color: c.textDark },
    gespeichertKnopf: { flexDirection: "row", alignItems: "center", gap: 2, height: 32 },
    gespeichertKnopfText: { fontFamily: FONT.w600, fontSize: 14 },

    sheetText: { ...TYPE.body, color: c.textMid },
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
    sheetTrenner: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border, marginVertical: 4 },
  });
