import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ActivityLogEntry, MemberProfile, StrafKategorieDef } from "../../types";
import { FONT, ThemeColors } from "../../constants/design";
import { useColors, useThemedStyles } from "../../contexts/ThemeContext";
import { activityRoute } from "../../utils/activityFeed";
import { renderChronik } from "../../utils/pushText";
import { formatUhrzeit } from "../../utils/date";
import { PressableScale, Ton, tonFarben } from "../ui";

export type ChronikBereich = "alle" | "strafen" | "kasse" | "termine" | "spiele";

export const CHRONIK_FILTER: { key: ChronikBereich; label: string }[] = [
  { key: "alle", label: "Alle" },
  { key: "strafen", label: "Strafen" },
  { key: "kasse", label: "Kasse" },
  { key: "termine", label: "Termine" },
  { key: "spiele", label: "Spiele" },
];

/** Bereich eines Eintrags für die Filter-Chips; Protokolle zählen zu den Terminen. */
export function bereichVon(typ: ActivityLogEntry["actionType"]): Exclude<ChronikBereich, "alle"> | null {
  if (typ.startsWith("straf_")) return "strafen";
  if (typ.startsWith("kasse_") || typ === "abendkosten_created") return "kasse";
  if (typ.startsWith("termin_") || typ === "protokoll_updated") return "termine";
  if (typ.startsWith("spiel_") || typ.startsWith("wette_")) return "spiele";
  return null;
}

/** Tönung des Emoji-Kreises je Bereich (weiche Fläche, damit das Emoji wirkt); auch für Home. */
export function tonFuerAktion(typ: ActivityLogEntry["actionType"]): Ton {
  if (typ.endsWith("_deleted") || typ === "termin_absage") return "neutral";
  if (typ === "straf_log_beglichen" || typ === "kasse_beglichen" || typ === "termin_zusage") return "green";
  if (typ.startsWith("straf_")) return "coral";
  if (typ.startsWith("kasse_") || typ === "abendkosten_created" || typ.startsWith("spiel_") || typ.startsWith("wette_")) return "mustard";
  if (typ.startsWith("termin_")) return "blue";
  return "neutral";
}

/** Eine Zeile der Chronik: farbiges Symbol, Text, „Uhrzeit · eingetragen von X". Tippen öffnet das Ziel. */
export function ChronikEintrag({ entry, membersById, strafKategorien, linie }: {
  entry: ActivityLogEntry;
  membersById: Map<string, MemberProfile>;
  strafKategorien: StrafKategorieDef[];
  /** Verbindungslinie zum nächsten Eintrag derselben Karte. */
  linie: boolean;
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const r = renderChronik(entry, membersById, strafKategorien);
  const route = activityRoute(entry);
  const ton = tonFarben(tonFuerAktion(entry.actionType), c);
  const zeit = formatUhrzeit(entry.createdAt);
  const meta = r.actorText ? `${zeit} · ${r.actorText}` : zeit;

  const inhalt = (
    <>
      {linie ? <View style={styles.linie} /> : null}
      <View style={[styles.symbol, { backgroundColor: ton.bg }]}>
        <Text style={styles.emoji} maxFontSizeMultiplier={1}>{r.emoji}</Text>
      </View>
      <View style={styles.texte}>
        <Text style={styles.text}>{r.text}</Text>
        {r.detail ? <Text style={styles.detail} numberOfLines={3}>{r.detail}</Text> : null}
        <Text style={styles.meta}>{meta}</Text>
      </View>
      {route ? <Ionicons name="chevron-forward" size={16} color={c.textMuted} /> : null}
    </>
  );

  const label = [r.text, r.detail, meta].filter(Boolean).join(", ");
  return route ? (
    <PressableScale onPress={() => router.push(route as never)} scaleTo={0.98} style={styles.zeile} accessibilityLabel={label} accessibilityHint="Öffnet den Eintrag">
      {inhalt}
    </PressableScale>
  ) : (
    <View style={styles.zeile} accessible accessibilityLabel={label}>{inhalt}</View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    zeile: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 60, paddingVertical: 8, paddingLeft: 16, paddingRight: 14 },
    // Linie von der Mitte des Symbols bis zur Mitte des nächsten — läuft hinter beiden durch.
    linie: { position: "absolute", left: 33, top: 30, bottom: -30, width: 2, borderRadius: 1, backgroundColor: c.border },
    symbol: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
    emoji: { fontSize: 18, lineHeight: 24, textAlign: "center" },
    texte: { flex: 1, minWidth: 0, gap: 2 },
    text: { fontFamily: FONT.w600, fontSize: 15, lineHeight: 20, color: c.textDark },
    detail: { fontFamily: FONT.w500, fontSize: 14, lineHeight: 19, color: c.textMid },
    meta: { fontFamily: FONT.w600, fontSize: 12, color: c.textMuted, fontVariant: ["tabular-nums"] },
  });
