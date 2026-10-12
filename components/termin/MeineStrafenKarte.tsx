import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StrafLog } from "../../types";
import { FONT, TYPE, ThemeColors } from "../../constants/design";
import { useColors, useThemedStyles } from "../../contexts/ThemeContext";
import { TerminAbend } from "../../utils/useTerminAbend";
import { formatEuro } from "../../utils/format";
import { showAlert } from "../../utils/alert";
import { Button, Card, KategorieIcon, PressableScale, haptik } from "../ui";

const euro = (n: number) => `${formatEuro(n).replace(",00", "")} €`;

/**
 * „Deine Strafen“ am Abend: was du insgesamt offen hast, die offenen von
 * diesem Abend einzeln zum Abhaken und „Alles begleichen“ für alle auf einmal.
 * Begleichen bucht wie in der Kasse je Strafe eine Einnahme.
 */
export function MeineStrafenKarte({ abend }: { abend: TerminAbend }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const [busy, setBusy] = useState(false);
  const t = abend.termin!;
  const offen = abend.meineOffen;
  if (offen.length === 0) return null;

  const summe = offen.reduce((s, l) => s + l.betrag, 0);
  const heute = offen.filter((l) => l.terminId === t.id).sort((a, b) => a.loggedAt.localeCompare(b.loggedAt));
  const frueher = offen.filter((l) => l.terminId !== t.id);
  const frueherSumme = frueher.reduce((s, l) => s + l.betrag, 0);
  const ich = offen[0].memberId;

  async function einzeln(l: StrafLog) {
    haptik("erfolg");
    await abend.strafeBeglichenUmschalten(l.memberId, l.id);
  }

  function alles() {
    showAlert(
      `Alles begleichen · ${euro(summe)}?`,
      `${offen.length} ${offen.length === 1 ? "Strafe wird" : "Strafen werden"} als bezahlt markiert und als Einnahme in die Kasse gebucht.`,
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Begleichen",
          onPress: async () => {
            setBusy(true);
            try {
              await abend.meineStrafenBegleichen();
              haptik("erfolg");
            } catch {
              showAlert("Fehler", "Nicht alles konnte gespeichert werden. Bitte in der Kasse prüfen.");
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  }

  return (
    <Card style={{ gap: 10 }}>
      <View style={styles.kopf}>
        <Text style={styles.label}>Deine Strafen</Text>
        <Text style={[styles.summe, { color: c.coralText }]}>{`${euro(summe)} offen`}</Text>
      </View>

      {heute.map((l, i) => {
        const kat = abend.strafKategorien.find((k) => k.id === l.kategorie);
        const was = kat?.systemKey === "sonstiges" && l.notiz ? l.notiz : kat?.label ?? "Strafe";
        return (
          <View key={l.id} style={[styles.zeile, i > 0 && styles.trenner]}>
            <KategorieIcon kat={kat} size={28} />
            <Text style={styles.was} numberOfLines={1}>{was}</Text>
            <Text style={[styles.betrag, { color: c.coralText }]}>{euro(l.betrag)}</Text>
            <PressableScale
              onPress={() => einzeln(l)}
              scaleTo={0.9}
              hitSlop={6}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: false }}
              accessibilityLabel={`${was}, ${euro(l.betrag)}: als bezahlt markieren`}
              style={styles.kreis}
            />
          </View>
        );
      })}

      {frueher.length > 0 ? (
        <PressableScale
          onPress={() => router.push(`/kasse?tab=strafen&memberId=${ich}`)}
          style={[styles.zeile, heute.length > 0 && styles.trenner]}
          accessibilityRole="button"
          accessibilityLabel={`Von früheren Abenden ${euro(frueherSumme)} offen. In der Kasse einzeln abhaken`}
        >
          <Text style={styles.frueher} numberOfLines={1}>
            {`${heute.length > 0 ? "Dazu von früher" : "Von früheren Abenden"}: ${frueher.length} · ${euro(frueherSumme)}`}
          </Text>
          <Text style={[styles.link, { color: c.coralText }]}>Einzeln</Text>
          <Ionicons name="chevron-forward" size={14} color={c.coralText} />
        </PressableScale>
      ) : null}

      <Button label={`Alles begleichen · ${euro(summe)}`} icon="checkmark" variant="danger" loading={busy} onPress={alles} />
    </Card>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    kopf: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
    label: { ...TYPE.label, color: c.textMuted },
    summe: { ...TYPE.num, fontSize: 17 },
    zeile: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 44 },
    trenner: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
    was: { flex: 1, fontFamily: FONT.w500, fontSize: 14, color: c.textDark },
    betrag: { ...TYPE.num, fontSize: 15 },
    kreis: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: c.borderDark },
    frueher: { flex: 1, fontFamily: FONT.w400, fontSize: 14, color: c.textMid },
    link: { fontFamily: FONT.w600, fontSize: 14 },
  });
