import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { MemberProfile, SpielEreignisTyp } from "../../../types";
import { FONT, MAX_FONT_SCALE, RADIUS, TYPE, ThemeColors } from "../../../constants/design";
import { useColors, useThemedStyles } from "../../../contexts/ThemeContext";
import { TerminAbend } from "../../../utils/useTerminAbend";
import { displayName } from "../../../utils/format";
import { showAlert } from "../../../utils/alert";
import { Avatar, CountBurst, PressableScale, Ton, haptik } from "../../ui";
import { euroKurz } from "./StrafenErfassen";

const TOENE: Ton[] = ["mustard", "coral", "green", "blue"];

/**
 * Eine Zeile pro Person am Tisch, ein Zähl-Knopf pro Ereignis des Spiels.
 * Bei 0 blass, ab dem ersten Treffer kräftig. Rückgängig über den Verlauf.
 */
export function SpielZaehler({ abend, mitglieder }: { abend: TerminAbend; mitglieder: MemberProfile[] }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const typen = abend.ereignisTypen;
  // Noch nicht bestätigte Taps, damit die Zahl sofort springt.
  const [offen, setOffen] = useState<Record<string, number>>({});
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
    setOffen((o) => ({ ...o, [key]: (o[key] ?? 0) + 1 }));
    setBursts((b) => ({ ...b, [key]: (b[key] ?? 0) + 1 }));
    try {
      await abend.spielEreignisEintragen(m.id, typ.id);
    } catch {
      showAlert("Nicht gespeichert", `${typ.label} für ${displayName(m)} konnte nicht gespeichert werden.`);
    } finally {
      setOffen((o) => ({ ...o, [key]: Math.max(0, (o[key] ?? 1) - 1) }));
    }
  }

  if (!abend.aktivesSpiel || typen.length === 0) {
    return <Text style={styles.leer}>Kein Spiel aktiv. In den Einstellungen lässt sich eins auswählen.</Text>;
  }
  if (mitglieder.length === 0) {
    return <Text style={styles.leer}>Noch niemand am Tisch. Erst unter „Anwesend" eintragen.</Text>;
  }

  // Bei mehr Ereignissen schmalere Knöpfe, damit die Zeile auf jedes Handy passt.
  const breite = typen.length <= 2 ? 84 : typen.length === 3 ? 64 : 52;
  const mitStrafe = typen.filter((t) => (t.strafBetrag ?? 0) > 0);

  return (
    <View style={{ gap: 8 }}>
      <View style={styles.kopf} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={{ flex: 1 }} />
        {typen.map((t) => (
          <Text key={t.id} style={[styles.spalte, { width: breite }]} numberOfLines={1}>{t.label}</Text>
        ))}
      </View>
      {mitglieder.map((m) => (
        <View key={m.id} style={styles.zeile}>
          <Avatar name={displayName(m)} color={m.avatarColor} photoUri={m.photoUri} size={32} />
          <Text style={styles.name} numberOfLines={1}>{displayName(m)}</Text>
          {typen.map((t, i) => {
            const key = `${m.id}:${t.id}`;
            const n = (abend.spielLogMap[m.id] ?? []).filter((l) => l.ereignisTypId === t.id).length + (offen[key] ?? 0);
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
      {mitStrafe.length > 0 ? (
        <Text style={styles.fuss}>{mitStrafe.map((t) => `${t.label} kostet ${euroKurz(t.strafBetrag!)}`).join(" · ")}</Text>
      ) : null}
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    leer: { ...TYPE.body, fontSize: 14, color: c.textMuted, paddingVertical: 8 },
    kopf: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12 },
    spalte: { ...TYPE.label, fontSize: 11, color: c.textMuted, textAlign: "center" },
    zeile: {
      flexDirection: "row", alignItems: "center", gap: 8, minHeight: 64, paddingVertical: 8, paddingLeft: 12, paddingRight: 8,
      borderRadius: RADIUS.tile, backgroundColor: c.card, borderWidth: StyleSheet.hairlineWidth, borderColor: c.hairline,
    },
    name: { flex: 1, fontFamily: FONT.w700, fontSize: 15, color: c.textDark, marginLeft: 2 },
    knopf: { height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center", overflow: "visible" },
    zahl: { ...TYPE.num, fontSize: 22 },
    fuss: { ...TYPE.caption, fontSize: 13, color: c.textMuted, textAlign: "center", marginTop: 4 },
  });
