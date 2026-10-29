import React, { useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { MemberProfile, SpielEreignisTyp } from "../../../types";
import { FONT, MAX_FONT_SCALE, RADIUS, TYPE, ThemeColors } from "../../../constants/design";
import { useColors, useThemedStyles } from "../../../contexts/ThemeContext";
import { TerminAbend } from "../../../utils/useTerminAbend";
import { displayName, formatBetrag } from "../../../utils/format";
import { showAlert } from "../../../utils/alert";
import { Avatar, Card, CountBurst, Emoji, PressableScale, Ton, haptik } from "../../ui";
import { formatUhrzeit } from "../../../utils/date";
import { VerlaufListe } from "./VerlaufListe";

const TOENE: Ton[] = ["mustard", "coral", "green", "blue"];

/**
 * Eine Zeile pro Person am Tisch, ein Zähl-Knopf pro Ereignis des Spiels
 * (meist zwei, manchmal drei oder mehr). Bei 0 blass, ab dem ersten Treffer
 * kräftig. Darunter der Verlauf des Spiels, dort lässt sich zurücknehmen.
 */
export function SpielZaehler({ abend, mitglieder }: { abend: TerminAbend; mitglieder: MemberProfile[] }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const typen = abend.ereignisTypen;
  // Damit die Zahl sofort springt: pro Knopf der angezeigte Zielwert und wie viele Taps noch laufen.
  // Angezeigt wird max(gespeichert, Ziel) – so zählt ein schon gespeicherter, aber noch
  // „laufender“ Tap nicht doppelt (vorher blitzte nach dem ersten Tap kurz eine 2 auf).
  const [ziel, setZiel] = useState<Record<string, number>>({});
  const [laufend, setLaufend] = useState<Record<string, number>>({});
  // Sofort aktuelle Kopie, damit zwei Taps im selben Moment nicht vom selben Stand aus zählen.
  const zielRef = useRef<Record<string, number>>({});
  const laufendRef = useRef<Record<string, number>>({});
  const gespeichert = (memberId: string, typId: string) =>
    (abend.spielLogMap[memberId] ?? []).filter((l) => l.ereignisTypId === typId).length;
  const anzeige = (memberId: string, typId: string) => {
    const key = `${memberId}:${typId}`;
    return Math.max(gespeichert(memberId, typId), laufend[key] ? ziel[key] ?? 0 : 0);
  };
  const [bursts, setBursts] = useState<Record<string, number>>({});

  const voll = (ton: Ton) => ({
    mustard: { bg: c.mustard, fg: c.onMustard, blass: c.mustardSoft, blassFg: c.mustardText },
    coral: { bg: c.coral, fg: c.onCoral, blass: c.coralSoft, blassFg: c.coralText },
    green: { bg: c.success, fg: c.onAccent, blass: c.greenSoft, blassFg: c.greenText },
    blue: { bg: c.blue, fg: c.onAccent, blass: c.blueBg, blassFg: c.blue },
    neutral: { bg: c.textDark, fg: c.background, blass: c.cardAlt, blassFg: c.textMid },
  }[ton]);

  async function plus(m: MemberProfile, typ: SpielEreignisTyp) {
    const key = `${m.id}:${typ.id}`;
    haptik((typ.strafBetrag ?? 0) > 0 ? "mittel" : "leicht");
    const basis = laufendRef.current[key] ? Math.max(zielRef.current[key] ?? 0, gespeichert(m.id, typ.id)) : gespeichert(m.id, typ.id);
    zielRef.current = { ...zielRef.current, [key]: basis + 1 };
    laufendRef.current = { ...laufendRef.current, [key]: (laufendRef.current[key] ?? 0) + 1 };
    setZiel(zielRef.current);
    setLaufend(laufendRef.current);
    setBursts((b) => ({ ...b, [key]: (b[key] ?? 0) + 1 }));
    try {
      await abend.spielEreignisEintragen(m.id, typ.id);
    } catch {
      // Ohne Speichern fällt die Anzeige auf den gespeicherten Stand zurück.
      zielRef.current = { ...zielRef.current, [key]: Math.max(0, (zielRef.current[key] ?? 1) - 1) };
      setZiel(zielRef.current);
      showAlert("Nicht gespeichert", `${typ.label} für ${displayName(m)} konnte nicht gespeichert werden.`);
    } finally {
      laufendRef.current = { ...laufendRef.current, [key]: Math.max(0, (laufendRef.current[key] ?? 1) - 1) };
      setLaufend(laufendRef.current);
    }
  }

  if (!abend.aktivesSpiel || typen.length === 0) {
    return <Text style={styles.leer}>Kein Spiel aktiv. In den Einstellungen lässt sich eins auswählen.</Text>;
  }
  if (mitglieder.length === 0) {
    return <Text style={styles.leer}>Noch niemand am Tisch. Erst unter „Anwesend" eintragen.</Text>;
  }

  // Bei mehr Ereignissen schmalere Knöpfe, damit Name und Zähler auf jedes Handy passen.
  const breite = typen.length <= 2 ? 72 : typen.length === 3 ? 58 : 48;
  const mitStrafe = typen.filter((t) => (t.strafBetrag ?? 0) > 0);
  const strafen = Object.values(abend.strafMap).flat();
  const verlauf = Object.values(abend.spielLogMap).flat()
    .filter((l) => typen.some((t) => t.id === l.ereignisTypId))
    .sort((a, b) => b.loggedAt.localeCompare(a.loggedAt))
    .map((l) => {
      const typ = typen.find((t) => t.id === l.ereignisTypId)!;
      const m = abend.members.find((x) => x.id === l.memberId);
      const strafe = l.strafLogId ? strafen.find((s) => s.id === l.strafLogId) : undefined;
      return {
        id: l.id,
        zeit: formatUhrzeit(l.loggedAt),
        symbol: typ.emoji ? <Emoji size={16}>{typ.emoji}</Emoji> : undefined,
        wer: m ? displayName(m) : "?",
        was: typ.label,
        rechts: strafe ? formatBetrag(strafe.betrag) : undefined,
        loeschen: () => abend.spielEreignisLöschen(l.memberId, l.id),
      };
    });

  return (
    <View style={{ gap: 6 }}>
      <View style={styles.kopf} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={{ flex: 1 }} />
        {typen.map((t) => (
          <View key={t.id} style={[styles.spalte, { width: breite }]}>
            {t.emoji ? <Emoji size={16}>{t.emoji}</Emoji> : null}
            <Text style={styles.spalteText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{t.label}</Text>
          </View>
        ))}
      </View>
      <Card style={{ paddingVertical: 2, paddingHorizontal: 12 }}>
      {mitglieder.map((m, zeileIndex) => (
        <View key={m.id} style={[styles.zeile, zeileIndex > 0 && styles.trenner]}>
          <Avatar name={displayName(m)} color={m.avatarColor} photoUri={m.photoUri} size={28} />
          <Text style={styles.name} numberOfLines={1}>{displayName(m)}</Text>
          {typen.map((t, i) => {
            const key = `${m.id}:${t.id}`;
            const n = anzeige(m.id, t.id);
            const f = voll(TOENE[i % TOENE.length]);
            return (
              <PressableScale
                key={t.id}
                onPress={() => plus(m, t)}
                scaleTo={0.9}
                accessibilityLabel={`${t.label} für ${displayName(m)}, bisher ${n}. Tippen für plus eins`}
                style={[styles.knopf, { width: breite, backgroundColor: n > 0 ? f.bg : f.blass }]}
              >
                <Text style={[styles.zahl, { color: n > 0 ? f.fg : f.blassFg }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{n}</Text>
                <CountBurst trigger={bursts[key] ?? 0} text="+1" color={n > 0 ? f.fg : f.blassFg} />
              </PressableScale>
            );
          })}
        </View>
      ))}
      </Card>
      {mitStrafe.length > 0 ? (
        <Text style={styles.fuss}>{mitStrafe.map((t) => `${t.emoji ? `${t.emoji} ` : ""}${t.label} ${formatBetrag(t.strafBetrag!)}`).join(" · ")}</Text>
      ) : null}
      <VerlaufListe titel="Verlauf" eintraege={verlauf} />
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    leer: { ...TYPE.body, fontSize: 14, color: c.textMuted, paddingVertical: 8 },
    // Gleiche Einrückung wie die Karte (12), damit die Überschriften über ihren Knöpfen stehen.
    kopf: { flexDirection: "row", alignItems: "flex-end", gap: 6, paddingHorizontal: 12 },
    spalte: { alignItems: "center", gap: 1 },
    spalteText: { fontFamily: FONT.w500, fontSize: 10, lineHeight: 12, color: c.textMuted, textAlign: "center" },
    zeile: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 50, paddingVertical: 6 },
    trenner: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
    name: { flex: 1, fontFamily: FONT.w600, fontSize: 15, color: c.textDark, marginLeft: 4 },
    knopf: { height: 44, borderRadius: RADIUS.md, alignItems: "center", justifyContent: "center", overflow: "visible" },
    zahl: { ...TYPE.num, fontSize: 18 },
    fuss: { ...TYPE.caption, fontSize: 12, color: c.textMuted, textAlign: "center", marginTop: 2 },
  });
