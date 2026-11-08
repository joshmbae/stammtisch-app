import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";
import { MemberProfile, StrafKategorieDef, StrafLog } from "../../../types";
import { FONT, MAX_FONT_SCALE, RADIUS, TYPE, ThemeColors } from "../../../constants/design";
import { useColors, useThemedStyles } from "../../../contexts/ThemeContext";
import { TerminAbend } from "../../../utils/useTerminAbend";
import { displayName, formatBetrag } from "../../../utils/format";
import { formatUhrzeit } from "../../../utils/date";
import { Avatar, Button, Card, KategorieIcon, PressableScale, Sheet, haptik } from "../../ui";
import { VerlaufListe } from "./VerlaufListe";

/** So lange bleibt „Rückgängig“ nach dem Eintragen stehen. */
const RUECKGAENGIG_MS = 6000;

/**
 * Strafen am Abend, Person zuerst: wer dabei ist, mit den Strafen von heute
 * und der Summe. „+“ öffnet den Katalog; ein Tipp auf eine Strafe trägt sie
 * sofort ein (mit „Rückgängig“). Nur „Betrag frei“ (Sonstiges) fragt nach
 * Betrag und Notiz. Wer nicht da ist, steht eingeklappt darunter – für
 * Strafen wie „Fehlen“. Darunter der Verlauf des Abends.
 */
export function StrafenErfassen({ abend, dabei, andere, vorauswahl }: {
  abend: TerminAbend;
  /** Wer heute dabei ist. */
  dabei: MemberProfile[];
  /** Alle anderen (abgesagt oder ohne Antwort). */
  andere: MemberProfile[];
  /** Katalog für diese Person gleich öffnen, z. B. nach einer eingetragenen Verspätung. */
  vorauswahl?: string | null;
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const [fuer, setFuer] = useState<string | null>(vorauswahl ?? null);
  const [frei, setFrei] = useState<StrafKategorieDef | null>(null);
  const [betrag, setBetrag] = useState("");
  const [notiz, setNotiz] = useState("");
  const [busy, setBusy] = useState(false);
  const [andereOffen, setAndereOffen] = useState(false);
  /** Zuletzt eingetragene Strafe – bietet „Rückgängig“ an. */
  const [zuletzt, setZuletzt] = useState<{ log: StrafLog; text: string } | null>(null);
  const zuletztTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (zuletztTimer.current) clearTimeout(zuletztTimer.current); }, []);

  const kategorien = abend.strafKategorien.filter((k) => !k.spielEreignisTypId);
  const alle = [...dabei, ...andere];
  const person = alle.find((m) => m.id === fuer);
  const kat = (id: string) => abend.strafKategorien.find((k) => k.id === id);
  const spielStrafen = new Set(Object.values(abend.spielLogMap).flat().map((s) => s.strafLogId).filter(Boolean));
  // Alle Strafen des Abends zählen pro Person und in der Summe (wie im Tab oben);
  // im Verlauf fehlen die aus dem Spiel (z. B. „Verloren"), die stehen im Spiel-Tab.
  const alleHeute: StrafLog[] = Object.values(abend.strafMap).flat().sort((a, b) => b.loggedAt.localeCompare(a.loggedAt));
  const heute = alleHeute.filter((l) => !spielStrafen.has(l.id));
  const vonPerson = (id: string) => alleHeute.filter((l) => l.memberId === id);
  const summe = alleHeute.reduce((s, l) => s + l.betrag, 0);
  const label = (l: StrafLog) => {
    const k = kat(l.kategorie);
    return l.notiz && k?.systemKey === "sonstiges" ? l.notiz : k?.label ?? "Strafe";
  };

  function schliessen() {
    setFuer(null);
    setFrei(null);
    setBetrag("");
    setNotiz("");
  }

  async function eintragen(m: MemberProfile, k: StrafKategorieDef, wert: number, text?: string) {
    setBusy(true);
    try {
      const log = await abend.strafeEintragen(m.id, k, wert, text);
      haptik("erfolg");
      schliessen();
      if (log) {
        if (zuletztTimer.current) clearTimeout(zuletztTimer.current);
        setZuletzt({ log, text: `${displayName(m)}: ${text || k.label} · ${formatBetrag(wert)}` });
        zuletztTimer.current = setTimeout(() => setZuletzt(null), RUECKGAENGIG_MS);
      }
    } finally {
      setBusy(false);
    }
  }

  function waehlen(k: StrafKategorieDef) {
    if (!person || busy) return;
    if (k.betrag > 0) {
      eintragen(person, k, k.betrag);
    } else {
      setFrei(frei?.id === k.id ? null : k);
      setBetrag("");
    }
  }

  async function rueckgaengig() {
    if (!zuletzt) return;
    const { log } = zuletzt;
    setZuletzt(null);
    haptik("leicht");
    await abend.strafeLöschen(log.memberId, log.id);
  }

  const freiZahl = parseFloat(betrag.replace(",", "."));
  const freiBereit = !!frei && !isNaN(freiZahl) && freiZahl > 0;

  const zeile = (m: MemberProfile, i: number, abwesend?: boolean) => {
    const logs = vonPerson(m.id);
    const sum = logs.reduce((s, l) => s + l.betrag, 0);
    const unter = logs.length === 0
      ? (abwesend ? (abend.termin?.absagen?.includes(m.id) ? "abgesagt" : "ohne Absage") : "noch nichts")
      : logs.map(label).join(", ");
    return (
      <PressableScale
        key={m.id}
        onPress={() => { haptik("leicht"); setFuer(m.id); }}
        scaleTo={0.98}
        style={[styles.zeile, i > 0 && styles.trenner]}
        accessibilityRole="button"
        accessibilityLabel={`${displayName(m)}: ${logs.length === 0 ? "noch keine Strafe" : `${unter}, zusammen ${formatBetrag(sum)}`}`}
        accessibilityHint="Strafe eintragen"
      >
        <Avatar name={displayName(m)} color={m.avatarColor} photoUri={m.photoUri} size={36} absent={abwesend} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.name, abwesend && { color: c.textMid }]} numberOfLines={1}>{displayName(m)}</Text>
          <Text style={styles.sub} numberOfLines={1}>{unter}</Text>
        </View>
        {sum > 0 ? <Text style={[styles.summe, { color: c.coralText }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{formatBetrag(sum)}</Text> : null}
        <View style={[styles.plus, { backgroundColor: c.coralSoft }]}>
          <Ionicons name="add" size={20} color={c.coralText} />
        </View>
      </PressableScale>
    );
  };

  return (
    <View style={{ gap: 12 }}>
      {zuletzt ? (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={styles.toast} accessibilityLiveRegion="polite">
          <Ionicons name="checkmark-circle" size={18} color={c.success} />
          <Text style={styles.toastText} numberOfLines={1}>{zuletzt.text}</Text>
          <PressableScale onPress={rueckgaengig} hitSlop={6} style={styles.toastKnopf} accessibilityLabel={`${zuletzt.text} rückgängig machen`}>
            <Text style={[styles.toastKnopfText, { color: c.blue }]}>Rückgängig</Text>
          </PressableScale>
        </Animated.View>
      ) : null}

      <Card style={{ paddingVertical: 4, paddingHorizontal: 14 }}>
        <View style={styles.kopf}>
          <Text style={styles.kartenTitel} accessibilityRole="header">{`Dabei · ${dabei.length}`}</Text>
          <Text style={[styles.kopfSumme, { color: summe > 0 ? c.coralText : c.textMuted }]}>
            {summe > 0 ? `${formatBetrag(summe)} heute` : "noch keine Strafen"}
          </Text>
        </View>
        {dabei.length === 0 ? (
          <Text style={[styles.sub, { paddingBottom: 12 }]}>Noch niemand dabei. Wer dabei ist, ergibt sich aus den Zusagen.</Text>
        ) : (
          dabei.map((m, i) => zeile(m, i + 1))
        )}
      </Card>

      {andere.length > 0 ? (
        <Card style={{ paddingVertical: 4, paddingHorizontal: 14 }}>
          <PressableScale
            onPress={() => setAndereOffen((v) => !v)}
            scaleTo={0.99}
            style={styles.kopf}
            accessibilityRole="button"
            accessibilityState={{ expanded: andereOffen }}
            accessibilityLabel={`Nicht da, ${andere.length}. Für Strafen wie Fehlen`}
          >
            <Text style={[styles.kartenTitel, { color: c.textMid }]}>{`Nicht da · ${andere.length}`}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Text style={styles.meta}>z. B. fürs Fehlen</Text>
              <Ionicons name={andereOffen ? "chevron-up" : "chevron-down"} size={16} color={c.textMuted} />
            </View>
          </PressableScale>
          {andereOffen ? (
            <Animated.View entering={FadeIn.duration(180)} layout={LinearTransition}>
              {andere.map((m, i) => zeile(m, i + 1, true))}
            </Animated.View>
          ) : null}
        </Card>
      ) : null}

      <VerlaufListe
        titel="Verlauf"
        eintraege={heute.map((l) => {
          const k = kat(l.kategorie);
          const m = abend.members.find((x) => x.id === l.memberId);
          return {
            id: l.id,
            zeit: formatUhrzeit(l.loggedAt),
            symbol: <KategorieIcon kat={k} size={24} />,
            wer: m ? displayName(m) : "?",
            was: l.beglichen ? `${label(l)} · bezahlt` : label(l),
            rechts: formatBetrag(l.betrag),
            loeschen: () => abend.strafeLöschen(l.memberId, l.id),
          };
        })}
      />

      <Sheet visible={!!person} onClose={schliessen} title={person ? `Strafe für ${displayName(person)}` : ""}>
        {kategorien.length === 0 ? (
          <Text style={styles.sub}>Noch keine Strafen im Katalog. In den Einstellungen unter Strafenkatalog anlegen.</Text>
        ) : (
          <>
            <Text style={styles.hinweis}>Antippen trägt die Strafe gleich ein.</Text>
            <View style={styles.raster}>
              {kategorien.map((k) => {
                const sel = frei?.id === k.id;
                return (
                  <View key={k.id} style={styles.zelle}>
                    <PressableScale
                      onPress={() => waehlen(k)}
                      disabled={busy}
                      haptic="leicht"
                      accessibilityRole="button"
                      accessibilityLabel={k.betrag > 0 ? `${k.label}, ${formatBetrag(k.betrag)} eintragen` : `${k.label}, Betrag frei`}
                      style={[styles.kat, sel && { borderColor: c.coral, borderWidth: 2, backgroundColor: c.coralSoft }]}
                    >
                      <KategorieIcon kat={k} size={30} />
                      <View style={styles.katText}>
                        <Text style={styles.katLabel} numberOfLines={2}>{k.label}</Text>
                        <Text style={[styles.katBetrag, { color: k.betrag > 0 ? c.coralText : c.textMuted }]}>
                          {k.betrag > 0 ? formatBetrag(k.betrag) : "Betrag frei"}
                        </Text>
                      </View>
                    </PressableScale>
                  </View>
                );
              })}
            </View>
            {frei && person ? (
              <Animated.View entering={FadeIn.duration(200)} style={{ gap: 10 }}>
                <View style={styles.freiZeile}>
                  <TextInput
                    style={[styles.input, { width: 110 }]}
                    value={betrag}
                    onChangeText={setBetrag}
                    keyboardType="decimal-pad"
                    autoFocus
                    placeholder="Betrag €"
                    placeholderTextColor={c.textLight}
                    accessibilityLabel="Betrag in Euro"
                  />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={notiz}
                    onChangeText={setNotiz}
                    placeholder="Wofür? (optional)"
                    placeholderTextColor={c.textLight}
                    accessibilityLabel="Notiz zur Strafe"
                  />
                </View>
                <Button
                  label={freiBereit ? `${frei.label} · ${formatBetrag(freiZahl)} eintragen` : "Betrag eingeben"}
                  variant="danger"
                  icon={freiBereit ? "add" : undefined}
                  colors={freiBereit ? undefined : { bg: c.cardAlt, fg: c.textMuted }}
                  loading={busy}
                  onPress={() => { if (freiBereit) eintragen(person, frei, freiZahl, notiz.trim() || undefined); }}
                />
              </Animated.View>
            ) : null}
          </>
        )}
      </Sheet>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    kopf: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, minHeight: 48 },
    kartenTitel: { ...TYPE.heading, color: c.textDark },
    kopfSumme: { fontFamily: FONT.w700, fontSize: 14, fontVariant: ["tabular-nums"] },
    meta: { ...TYPE.caption, fontSize: 13, color: c.textMuted },
    zeile: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 60, paddingVertical: 8 },
    trenner: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
    name: { fontFamily: FONT.w600, fontSize: 15, color: c.textDark },
    sub: { ...TYPE.caption, fontSize: 13, color: c.textMuted, marginTop: 1 },
    summe: { ...TYPE.num, fontSize: 16 },
    plus: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },

    toast: {
      flexDirection: "row", alignItems: "center", gap: 10, minHeight: 48, paddingLeft: 14, paddingRight: 12,
      borderRadius: RADIUS.md, backgroundColor: c.card, borderWidth: StyleSheet.hairlineWidth, borderColor: c.hairline,
    },
    toastText: { flex: 1, fontFamily: FONT.w500, fontSize: 14, color: c.textDark },
    toastKnopf: { height: 36, justifyContent: "center", paddingHorizontal: 4 },
    toastKnopfText: { fontFamily: FONT.w700, fontSize: 14 },

    hinweis: { ...TYPE.caption, fontSize: 13, color: c.textMuted },
    raster: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 },
    zelle: { width: "50%", padding: 4 },
    kat: {
      flexDirection: "row", alignItems: "center", gap: 10, minHeight: 60, borderRadius: RADIUS.md, paddingVertical: 8, paddingHorizontal: 10,
      backgroundColor: c.card, borderWidth: StyleSheet.hairlineWidth, borderColor: c.hairline,
    },
    katText: { flex: 1, minWidth: 0 },
    katBetrag: { ...TYPE.num, fontSize: 13, marginTop: 1 },
    katLabel: { fontFamily: FONT.w600, fontSize: 14, lineHeight: 18, color: c.textDark },
    freiZeile: { flexDirection: "row", gap: 8 },
    input: {
      minHeight: 44, borderRadius: RADIUS.md, paddingHorizontal: 14, backgroundColor: c.card,
      borderWidth: StyleSheet.hairlineWidth, borderColor: c.hairline, fontFamily: FONT.w600, fontSize: 15, color: c.textDark,
    },
  });
