import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { MemberProfile, StrafKategorieDef, StrafLog } from "../../../types";
import { FONT, MAX_FONT_SCALE, RADIUS, TYPE, ThemeColors } from "../../../constants/design";
import { useColors, useThemedStyles } from "../../../contexts/ThemeContext";
import { TerminAbend } from "../../../utils/useTerminAbend";
import { displayName, formatBetrag } from "../../../utils/format";
import { formatUhrzeit } from "../../../utils/date";
import { SYMBOL } from "../../../constants/symbole";
import { Avatar, Card, Emoji, PressableScale, Sheet, haptik, kategorieSymbol, tonFarben, tonFuer } from "../../ui";
import { VerlaufListe } from "./VerlaufListe";

/** So lange bleibt „Rückgängig“ nach dem Eintragen stehen. */
const RUECKGAENGIG_MS = 8000;

/** Strafen fürs Fehlen: dann zuerst zeigen, wer nicht da ist. */
const istFehlen = (k: StrafKategorieDef) => /fehl/i.test(k.label);

/**
 * Strafen am Abend, Katalog zuerst: alle Strafen als Kacheln, damit man
 * sieht, was es gibt. Kachel antippen, dann wer – ein Tipp auf die Person
 * trägt sofort ein (mit „Rückgängig“). „Betrag frei“ (Sonstiges) fragt
 * vorher Betrag und Notiz. Darunter der Stand des Abends pro Person und der
 * Verlauf.
 */
export function StrafenErfassen({ abend, dabei, andere, vorauswahl }: {
  abend: TerminAbend;
  /** Wer heute dabei ist. */
  dabei: MemberProfile[];
  /** Alle anderen (abgesagt oder ohne Antwort), z. B. fürs Fehlen. */
  andere: MemberProfile[];
  /** Person schon gewählt, z. B. nach einer eingetragenen Verspätung: dann trägt die Kachel direkt für sie ein. */
  vorauswahl?: string | null;
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const [fuer, setFuer] = useState<string | null>(vorauswahl ?? null);
  const [wofuer, setWofuer] = useState<StrafKategorieDef | null>(null);
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
  const vorPerson = alle.find((m) => m.id === fuer);
  const kat = (id: string) => abend.strafKategorien.find((k) => k.id === id);
  // Strafen aus dem Spiel gehören auch hierher: im Stand, in der Summe und im
  // Verlauf (mit Spielname). Zurückgenommen werden sie über das Spiel, damit
  // Spiel-Eintrag und Strafe zusammen verschwinden.
  const spielLogZuStrafe = new Map(Object.values(abend.spielLogMap).flat().filter((s) => s.strafLogId).map((s) => [s.strafLogId!, s]));
  const alleHeute: StrafLog[] = Object.values(abend.strafMap).flat().sort((a, b) => b.loggedAt.localeCompare(a.loggedAt));
  const summe = alleHeute.reduce((s, l) => s + l.betrag, 0);
  const label = (l: StrafLog) => {
    const k = kat(l.kategorie);
    return l.notiz && k?.systemKey === "sonstiges" ? l.notiz : k?.label ?? "Strafe";
  };
  const stand = alle
    .map((m) => {
      const logs = alleHeute.filter((l) => l.memberId === m.id);
      return { m, logs, sum: logs.reduce((s, l) => s + l.betrag, 0) };
    })
    .filter((z) => z.logs.length > 0)
    .sort((a, b) => b.sum - a.sum);

  const freiZahl = parseFloat(betrag.replace(",", "."));
  const freiBetrag = !!wofuer && wofuer.betrag <= 0;
  const wert = freiBetrag ? freiZahl : wofuer?.betrag ?? NaN;
  const bereit = !!wofuer && !isNaN(wert) && wert > 0;

  function schliessen() {
    setWofuer(null);
    setBetrag("");
    setNotiz("");
    setAndereOffen(false);
  }

  async function eintragen(m: MemberProfile) {
    if (!wofuer || !bereit || busy) return;
    const k = wofuer;
    const text = freiBetrag ? notiz.trim() || undefined : undefined;
    setBusy(true);
    try {
      const log = await abend.strafeEintragen(m.id, k, wert, text);
      haptik("erfolg");
      schliessen();
      setFuer(null);
      if (log) {
        if (zuletztTimer.current) clearTimeout(zuletztTimer.current);
        setZuletzt({ log, text: `${displayName(m)}: ${text || k.label} · ${formatBetrag(wert)}` });
        zuletztTimer.current = setTimeout(() => setZuletzt(null), RUECKGAENGIG_MS);
      }
    } finally {
      setBusy(false);
    }
  }

  function kachel(k: StrafKategorieDef) {
    haptik("leicht");
    setWofuer(k);
    setBetrag("");
    setNotiz("");
    setAndereOffen(istFehlen(k));
  }

  // Mit vorgewählter Person (fester Betrag) direkt eintragen, ohne Sheet.
  useEffect(() => {
    if (wofuer && vorPerson && wofuer.betrag > 0) eintragen(vorPerson);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wofuer]);

  async function rueckgaengig() {
    if (!zuletzt) return;
    const { log } = zuletzt;
    setZuletzt(null);
    haptik("leicht");
    await abend.strafeLöschen(log.memberId, log.id);
  }

  const personKachel = (m: MemberProfile, abwesend?: boolean) => {
    const sum = alleHeute.filter((l) => l.memberId === m.id).reduce((s, l) => s + l.betrag, 0);
    return (
      <PressableScale
        key={m.id}
        onPress={() => eintragen(m)}
        disabled={!bereit || busy}
        style={[styles.person, !bereit && { opacity: 0.4 }]}
        accessibilityRole="button"
        accessibilityLabel={wofuer ? `${wofuer.label} für ${displayName(m)} eintragen` : displayName(m)}
      >
        <Avatar name={displayName(m)} color={m.avatarColor} photoUri={m.photoUri} size={48} absent={abwesend} />
        <Text style={[styles.personName, abwesend && { color: c.textMid }]} numberOfLines={1}>{displayName(m)}</Text>
        <Text style={[styles.personSumme, { color: sum > 0 ? c.coralText : "transparent" }]}>{sum > 0 ? formatBetrag(sum) : "–"}</Text>
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

      {vorPerson ? (
        <View style={[styles.vorwahl, { backgroundColor: c.coralSoft }]}>
          <Avatar name={displayName(vorPerson)} color={vorPerson.avatarColor} photoUri={vorPerson.photoUri} size={26} />
          <Text style={[styles.vorwahlText, { color: c.coralText }]} numberOfLines={1}>{`Strafe für ${displayName(vorPerson)} wählen`}</Text>
          <PressableScale onPress={() => setFuer(null)} hitSlop={8} accessibilityLabel="Auswahl aufheben">
            <Ionicons name="close" size={18} color={c.coralText} />
          </PressableScale>
        </View>
      ) : null}

      <View style={styles.katKopf}>
        <Text style={styles.label}>Strafenkatalog</Text>
        <Text style={styles.meta}>antippen, dann wer</Text>
      </View>
      {kategorien.length === 0 ? (
        <Text style={styles.leer}>Noch keine Strafen im Katalog. In den Einstellungen unter Strafenkatalog anlegen.</Text>
      ) : (
        <View style={styles.raster}>
          {kategorien.map((k) => {
            const sonstiges = k.systemKey === "sonstiges";
            const ton = tonFarben(sonstiges ? "neutral" : tonFuer(k.id), c);
            const emoji = sonstiges ? SYMBOL.sonstiges : k.emoji || (/spät/i.test(k.label) ? SYMBOL.zuSpaet : SYMBOL.strafe);
            return (
              <View key={k.id} style={styles.zelle}>
                <PressableScale
                  onPress={() => kachel(k)}
                  disabled={busy}
                  scaleTo={0.96}
                  style={[styles.kachel, { backgroundColor: ton.bg }]}
                  accessibilityRole="button"
                  accessibilityLabel={`${k.label}, ${k.betrag > 0 ? formatBetrag(k.betrag) : "Betrag frei"}. ${vorPerson ? `Für ${displayName(vorPerson)} eintragen` : "Wer?"}`}
                >
                  <Emoji size={26}>{emoji}</Emoji>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.kachelLabel} numberOfLines={2}>{k.label}</Text>
                    <Text style={[styles.kachelBetrag, k.betrag > 0 ? { color: c.coralText } : styles.kachelFrei]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                      {k.betrag > 0 ? formatBetrag(k.betrag) : "Betrag frei"}
                    </Text>
                  </View>
                </PressableScale>
              </View>
            );
          })}
        </View>
      )}

      <Card style={{ gap: 10 }}>
        <View style={styles.standKopf}>
          <Text style={styles.kartenTitel} accessibilityRole="header">Stand heute</Text>
          <Text style={[styles.standSumme, { color: summe > 0 ? c.coralText : c.textMuted }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{formatBetrag(summe)}</Text>
        </View>
        {stand.length === 0 ? (
          <Text style={styles.leer}>Noch keine Strafen heute. Ein sauberer Abend – bisher.</Text>
        ) : (
          stand.map(({ m, logs, sum }) => (
            <View key={m.id} style={styles.standZeile} accessible accessibilityLabel={`${displayName(m)}: ${formatBetrag(sum)}, ${logs.map(label).join(", ")}`}>
              <Avatar name={displayName(m)} color={m.avatarColor} photoUri={m.photoUri} size={28} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.standName} numberOfLines={1}>{displayName(m)}</Text>
                <Text style={styles.standWas} numberOfLines={1}>{logs.map(label).join(", ")}</Text>
              </View>
              <Text style={[styles.standBetrag, { color: c.coralText }]}>{formatBetrag(sum)}</Text>
            </View>
          ))
        )}
      </Card>

      <VerlaufListe
        titel="Verlauf"
        eintraege={alleHeute.map((l) => {
          const k = kat(l.kategorie);
          const m = abend.members.find((x) => x.id === l.memberId);
          const spielLog = spielLogZuStrafe.get(l.id);
          const was = [label(l), spielLog ? abend.aktivesSpiel?.name ?? "Spiel" : null, l.beglichen ? "bezahlt" : null].filter(Boolean).join(" · ");
          return {
            id: l.id,
            zeit: formatUhrzeit(l.loggedAt),
            ...kategorieSymbol(k),
            wer: m ? displayName(m) : "?",
            was,
            rechts: formatBetrag(l.betrag),
            loeschen: spielLog
              ? () => abend.spielEreignisLöschen(spielLog.memberId, spielLog.id)
              : () => abend.strafeLöschen(l.memberId, l.id),
          };
        })}
      />

      {/* Wer? Ohne vorgewählte Person (oder bei freiem Betrag) nach der Kachel. */}
      <Sheet
        visible={!!wofuer && (!vorPerson || freiBetrag)}
        onClose={schliessen}
        title={wofuer ? `${wofuer.label}${wofuer.betrag > 0 ? ` · ${formatBetrag(wofuer.betrag)}` : ""}` : ""}
      >
        {freiBetrag ? (
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
        ) : null}

        {vorPerson && freiBetrag ? (
          <PressableScale
            onPress={() => eintragen(vorPerson)}
            disabled={!bereit || busy}
            style={[styles.vorwahlKnopf, { backgroundColor: bereit ? c.coral : c.cardAlt }]}
            accessibilityRole="button"
            accessibilityLabel={`Für ${displayName(vorPerson)} eintragen`}
          >
            <Text style={[styles.vorwahlKnopfText, { color: bereit ? c.onCoral : c.textMuted }]}>
              {bereit ? `${displayName(vorPerson)}: ${formatBetrag(wert)} eintragen` : "Betrag eingeben"}
            </Text>
          </PressableScale>
        ) : (
          <>
            <Text style={styles.label}>{freiBetrag && !bereit ? "Erst Betrag, dann wer" : "Wer? Antippen trägt ein"}</Text>
            {wofuer && istFehlen(wofuer) ? null : (
              <View style={styles.personen}>{dabei.map((m) => personKachel(m))}</View>
            )}
            {andere.length > 0 ? (
              <>
                <PressableScale
                  onPress={() => setAndereOffen((v) => !v)}
                  style={styles.andereKopf}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: andereOffen }}
                  accessibilityLabel={`Nicht da, ${andere.length}`}
                >
                  <Text style={styles.label}>{`Nicht da · ${andere.length}`}</Text>
                  <Ionicons name={andereOffen ? "chevron-up" : "chevron-down"} size={16} color={c.textMuted} />
                </PressableScale>
                {andereOffen ? <View style={styles.personen}>{andere.map((m) => personKachel(m, true))}</View> : null}
              </>
            ) : null}
            {wofuer && istFehlen(wofuer) && dabei.length > 0 ? (
              <>
                <Text style={styles.label}>Dabei</Text>
                <View style={styles.personen}>{dabei.map((m) => personKachel(m))}</View>
              </>
            ) : null}
          </>
        )}
      </Sheet>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    label: { ...TYPE.label, color: c.textMuted },
    meta: { ...TYPE.caption, fontSize: 13, color: c.textMuted },
    leer: { ...TYPE.body, fontSize: 14, color: c.textMuted },
    katKopf: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginTop: 2 },

    raster: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -5, marginTop: -4 },
    zelle: { width: "50%", padding: 5 },
    kachel: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 72, borderRadius: RADIUS.tile, paddingVertical: 10, paddingHorizontal: 12 },
    kachelLabel: { fontFamily: FONT.w700, fontSize: 14, lineHeight: 18, color: c.textDark },
    kachelBetrag: { ...TYPE.num, fontSize: 17, lineHeight: 22, marginTop: 1 },
    kachelFrei: { fontFamily: FONT.w600, fontSize: 13, color: c.textMid },

    kartenTitel: { ...TYPE.heading, color: c.textDark },
    standKopf: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    standSumme: { ...TYPE.num, fontSize: 20 },
    standZeile: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 40 },
    standName: { fontFamily: FONT.w600, fontSize: 15, color: c.textDark },
    standWas: { ...TYPE.caption, fontSize: 12, color: c.textMuted },
    standBetrag: { ...TYPE.num, fontSize: 15 },

    toast: {
      flexDirection: "row", alignItems: "center", gap: 10, minHeight: 48, paddingLeft: 14, paddingRight: 12,
      borderRadius: RADIUS.md, backgroundColor: c.card, borderWidth: StyleSheet.hairlineWidth, borderColor: c.hairline,
    },
    toastText: { flex: 1, fontFamily: FONT.w500, fontSize: 14, color: c.textDark },
    toastKnopf: { height: 36, justifyContent: "center", paddingHorizontal: 4 },
    toastKnopfText: { fontFamily: FONT.w700, fontSize: 14 },

    vorwahl: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 44, paddingHorizontal: 12, borderRadius: RADIUS.md },
    vorwahlText: { flex: 1, fontFamily: FONT.w600, fontSize: 14 },
    vorwahlKnopf: { height: 52, borderRadius: RADIUS.pill, alignItems: "center", justifyContent: "center" },
    vorwahlKnopfText: { fontFamily: FONT.w700, fontSize: 16 },

    personen: { flexDirection: "row", flexWrap: "wrap", rowGap: 12 },
    person: { width: "25%", alignItems: "center", gap: 3 },
    personName: { fontFamily: FONT.w600, fontSize: 13, color: c.textDark, maxWidth: "92%" },
    personSumme: { ...TYPE.num, fontSize: 12 },
    andereKopf: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 36 },

    freiZeile: { flexDirection: "row", gap: 8 },
    input: {
      minHeight: 44, borderRadius: RADIUS.md, paddingHorizontal: 14, backgroundColor: c.card,
      borderWidth: StyleSheet.hairlineWidth, borderColor: c.hairline, fontFamily: FONT.w600, fontSize: 15, color: c.textDark,
    },
  });
