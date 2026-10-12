import React, { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { MemberProfile, StrafKategorieDef, StrafLog } from "../../../types";
import { FONT, RADIUS, TYPE, ThemeColors } from "../../../constants/design";
import { useColors, useThemedStyles } from "../../../contexts/ThemeContext";
import { TerminAbend } from "../../../utils/useTerminAbend";
import { displayName, formatEuro } from "../../../utils/format";
import { Button, Card, Chip, KategorieIcon, PressableScale, haptik } from "../../ui";

export const euroKurz = (n: number) => `${formatEuro(n).replace(",00", "")} €`;

/**
 * Strafe in zwei Griffen: wer, wofür, eintragen. Bei Kategorien ohne festen
 * Betrag (Sonstiges) kommt ein Betragsfeld dazu. Darunter die Strafen des Abends.
 */
export function StrafenErfassen({ abend, mitglieder, vorauswahl }: {
  abend: TerminAbend; mitglieder: MemberProfile[];
  /** Person schon ausgewählt, z. B. nach einer eingetragenen Verspätung. */
  vorauswahl?: string | null;
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const [wer, setWer] = useState<string | null>(vorauswahl ?? null);
  const [wofuer, setWofuer] = useState<StrafKategorieDef | null>(null);
  const [betrag, setBetrag] = useState("");
  const [notiz, setNotiz] = useState("");
  const [busy, setBusy] = useState(false);
  const kategorien = abend.strafKategorien.filter((k) => !k.spielEreignisTypId);
  const person = mitglieder.find((m) => m.id === wer);
  const freierBetrag = !!wofuer && wofuer.betrag <= 0;
  const betragZahl = freierBetrag ? parseFloat(betrag.replace(",", ".")) : wofuer?.betrag ?? NaN;
  const bereit = !!person && !!wofuer && !isNaN(betragZahl) && betragZahl > 0;

  const heute: StrafLog[] = Object.values(abend.strafMap).flat()
    // Strafen aus dem Spiel (z. B. „Verloren") stehen schon im Spiel-Tab.
    .filter((l) => !Object.values(abend.spielLogMap).flat().some((s) => s.strafLogId === l.id))
    .sort((a, b) => b.loggedAt.localeCompare(a.loggedAt));

  async function eintragen() {
    if (!bereit || !person || !wofuer) return;
    setBusy(true);
    try {
      await abend.strafeEintragen(person.id, wofuer, betragZahl, notiz.trim() || undefined);
      haptik("erfolg");
      setWofuer(null);
      setBetrag("");
      setNotiz("");
    } finally {
      setBusy(false);
    }
  }

  const knopfText = !person ? "Wer und wofür?" : !wofuer ? `${displayName(person)}: wofür?` : freierBetrag && !bereit ? "Betrag eingeben" : `${displayName(person)}: ${wofuer.label} · ${euroKurz(betragZahl)}`;

  return (
    <View style={{ gap: 12 }}>
      <Text style={styles.label}>Wer</Text>
      <View style={styles.chips}>
        {mitglieder.map((m) => (
          <Chip key={m.id} label={displayName(m)} selected={m.id === wer} onPress={() => setWer(m.id === wer ? null : m.id)} />
        ))}
      </View>

      <Text style={styles.label}>Wofür</Text>
      {kategorien.length === 0 ? (
        <Text style={styles.leer}>Noch keine Strafen im Katalog. Unter Runde → Strafenkatalog anlegen.</Text>
      ) : (
        <View style={styles.raster}>
          {kategorien.map((k) => {
            const sel = wofuer?.id === k.id;
            return (
              <View key={k.id} style={styles.zelle}>
                <PressableScale
                  onPress={() => { setWofuer(sel ? null : k); setBetrag(""); }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: sel }}
                  accessibilityLabel={`${k.label}${k.betrag > 0 ? `, ${euroKurz(k.betrag)}` : ""}`}
                  style={[styles.kat, sel && { borderColor: c.coral, borderWidth: 2, backgroundColor: c.coralSoft }]}
                >
                  <KategorieIcon kat={k} size={30} />
                  <View style={styles.katText}>
                    <Text style={styles.katLabel} numberOfLines={2}>{k.label}</Text>
                    <Text style={[styles.katBetrag, { color: k.betrag > 0 ? c.coralText : c.textMuted }]}>
                      {k.betrag > 0 ? euroKurz(k.betrag) : "Betrag frei"}
                    </Text>
                  </View>
                </PressableScale>
              </View>
            );
          })}
        </View>
      )}

      {freierBetrag ? (
        <Animated.View entering={FadeIn.duration(200)} style={styles.freiZeile}>
          <TextInput
            style={[styles.input, { width: 110 }]}
            value={betrag}
            onChangeText={setBetrag}
            keyboardType="decimal-pad"
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
        </Animated.View>
      ) : null}

      {/* Nicht „disabled": der ausgegraute Zustand soll lesbar bleiben und sagt, was fehlt. */}
      <Button
        label={knopfText}
        variant="danger"
        colors={bereit ? undefined : { bg: c.cardAlt, fg: c.textMuted }}
        icon={bereit ? "add" : undefined}
        haptic={bereit ? "leicht" : undefined}
        loading={busy}
        onPress={eintragen}
        accessibilityLabel={bereit ? `Strafe eintragen: ${knopfText}` : "Erst wählen, wer und wofür"}
      />

      {heute.length > 0 ? (
        <>
          <Text style={[styles.label, { marginTop: 8 }]}>{`Heute · ${heute.length}`}</Text>
          <Card style={{ paddingVertical: 4 }}>
            {heute.map((l, i) => {
              const k = abend.strafKategorien.find((x) => x.id === l.kategorie);
              const m = abend.members.find((x) => x.id === l.memberId);
              return (
                <View key={l.id} style={[styles.zeile, i > 0 && styles.trenner]}>
                  <KategorieIcon kat={k} size={28} />
                  <Text style={styles.zeileText} numberOfLines={1}>
                    <Text style={styles.zeileName}>{m ? displayName(m) : "?"}</Text>
                    {` · ${l.notiz && k?.systemKey === "sonstiges" ? l.notiz : k?.label ?? "Strafe"}`}
                  </Text>
                  <Text style={[styles.zeileBetrag, l.beglichen && styles.bezahlt]}>{euroKurz(l.betrag)}</Text>
                </View>
              );
            })}
          </Card>
        </>
      ) : null}
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    label: { ...TYPE.label, color: c.textMuted },
    leer: { ...TYPE.body, fontSize: 14, color: c.textMuted },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    raster: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 },
    zelle: { width: "50%", padding: 4 },
    kat: {
      flexDirection: "row", alignItems: "center", gap: 10, minHeight: 56, borderRadius: RADIUS.md, paddingVertical: 8, paddingHorizontal: 10,
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
    zeile: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 46 },
    trenner: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
    zeileText: { flex: 1, fontFamily: FONT.w400, fontSize: 14, color: c.textMid },
    zeileName: { fontFamily: FONT.w600, color: c.textDark },
    zeileBetrag: { ...TYPE.num, fontSize: 15, color: c.textDark },
    bezahlt: { color: c.textMuted, textDecorationLine: "line-through" },
  });
