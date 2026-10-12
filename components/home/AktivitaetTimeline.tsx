import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { ActivityLogEntry, MemberProfile, StrafKategorieDef } from "../../types";
import { FONT, TYPE, ThemeColors } from "../../constants/design";
import { useColors, useThemedStyles } from "../../contexts/ThemeContext";
import { activityRoute } from "../../utils/activityFeed";
import { renderChronik } from "../../utils/pushText";
import { formatActivityZeit } from "../../utils/date";
import { PressableScale, SectionLabel, tonFarben } from "../ui";
import { tonFuerAktion } from "../chronik/ChronikEintrag";

/** Die letzten Einträge der Chronik als kleiner Zeitstrahl. */
export function AktivitaetTimeline({ eintraege, membersById, kategorien }: {
  eintraege: ActivityLogEntry[];
  membersById: Map<string, MemberProfile>;
  kategorien: StrafKategorieDef[];
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.card}>
      <SectionLabel tone="blue" action={{ label: "Alle", onPress: () => router.push("/feed") }}>Aktivität</SectionLabel>
      {eintraege.length === 0 ? (
        <Text style={styles.leer}>Noch nichts passiert. Die erste Strafe kommt bestimmt.</Text>
      ) : (
        <View style={{ marginTop: 4 }}>
          {eintraege.map((e, i) => {
            const r = renderChronik(e, membersById, kategorien);
            const ziel = activityRoute(e);
            const ton = tonFarben(tonFuerAktion(e.actionType), c);
            return (
              <PressableScale
                key={e.id}
                onPress={() => router.push((ziel ?? "/feed") as never)}
                scaleTo={0.98}
                style={styles.zeile}
                accessibilityLabel={[r.text, r.detail, formatActivityZeit(e.createdAt)].filter(Boolean).join(", ")}
              >
                {i < eintraege.length - 1 ? <View style={styles.linie} /> : null}
                <View style={[styles.punkt, { backgroundColor: ton.bg }]}>
                  <Text style={styles.emoji} maxFontSizeMultiplier={1}>{r.emoji}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.text} numberOfLines={1}>{r.text}</Text>
                  {r.detail ? <Text style={styles.detail} numberOfLines={1}>{r.detail}</Text> : null}
                  <Text style={styles.zeit}>{formatActivityZeit(e.createdAt)}</Text>
                </View>
              </PressableScale>
            );
          })}
        </View>
      )}
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    card: { borderRadius: 24, backgroundColor: c.blueBg, padding: 16, paddingBottom: 10, borderWidth: 1, borderColor: c.heroStyle === "outline" ? "rgba(77,124,255,0.25)" : "transparent" },
    leer: { ...TYPE.caption, fontSize: 13, color: c.textMuted, marginTop: 8, marginBottom: 6 },
    zeile: { flexDirection: "row", gap: 12, paddingVertical: 7, minHeight: 52 },
    linie: { position: "absolute", left: 13, top: 39, bottom: -7, width: 2, borderRadius: 1, backgroundColor: c.heroStyle === "outline" ? "rgba(77,124,255,0.3)" : "#C3CCE2" },
    punkt: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: c.blueBg },
    emoji: { fontSize: 12 },
    text: { fontFamily: FONT.w700, fontSize: 14, lineHeight: 19, color: c.textDark },
    detail: { fontFamily: FONT.w500, fontSize: 13, lineHeight: 17, color: c.textMid },
    zeit: { fontFamily: FONT.w600, fontSize: 12, color: c.textMuted, marginTop: 1 },
  });
