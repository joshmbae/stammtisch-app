import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ActivityLogEntry, MemberProfile, StrafKategorieDef } from "../../types";
import { FONT, ThemeColors } from "../../constants/design";
import { useColors, useThemedStyles } from "../../contexts/ThemeContext";
import { activityRoute, renderActivity } from "../../utils/activityFeed";
import { formatUhrzeit } from "../../utils/date";
import { PressableScale } from "../ui";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

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

/**
 * Symbol und Farbe je Aktion. Volle Farbflächen mit on…-Token in beiden
 * Themes; nur die dunkle Spiel-Fläche (Tinte) braucht im Dunkeln eine
 * eigene Fläche, weil Tinte dort fast weiß ist.
 */
function symbolFuer(typ: ActivityLogEntry["actionType"], c: ThemeColors): { icon: IconName; bg: string; fg: string } {
  const dunkel = c.heroStyle === "outline";
  const neutral = { bg: c.cardAlt, fg: c.textMid };
  const kasse = { bg: dunkel ? c.mustard : c.mustardTile, fg: c.onMustard };
  const spiel = { bg: dunkel ? c.mustardSoft : c.textDark, fg: c.mustard };
  switch (typ) {
    case "straf_log_created": return { icon: "warning-outline", bg: c.coral, fg: c.onCoral };
    case "straf_log_beglichen": return { icon: "checkmark-done", bg: c.success, fg: c.onAccent };
    case "kasse_einnahme_created": return { icon: "arrow-down", ...kasse };
    case "kasse_ausgabe_created": return { icon: "arrow-up", ...kasse };
    case "abendkosten_created": return { icon: "receipt-outline", ...kasse };
    case "kasse_beglichen": return { icon: "cash-outline", ...kasse };
    case "spiel_log_created": return { icon: "dice-outline", ...spiel };
    case "wette_created": return { icon: "people-outline", ...spiel };
    case "wette_resolved": return { icon: "trophy-outline", ...spiel };
    case "protokoll_updated": return { icon: "document-text-outline", bg: dunkel ? c.cardAlt : c.border, fg: c.textDark };
    case "termin_zusage": return { icon: "checkmark", bg: c.success, fg: c.onAccent };
    case "termin_absage": return { icon: "close", ...neutral };
    case "termin_erstellt": return { icon: "calendar-outline", bg: c.blue, fg: c.onAccent };
    case "termin_verlegt": return { icon: "swap-horizontal", bg: c.blue, fg: c.onAccent };
    case "straf_log_deleted":
    case "kasse_eintrag_deleted":
    case "spiel_log_deleted":
    case "wette_deleted":
      return { icon: "trash-outline", ...neutral };
    default:
      return { icon: "ellipse-outline", ...neutral };
  }
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
  const r = renderActivity(entry, membersById, strafKategorien);
  const route = activityRoute(entry);
  const s = symbolFuer(entry.actionType, c);
  const zeit = formatUhrzeit(entry.createdAt);
  const meta = r.actorText ? `${zeit} · ${r.actorText}` : zeit;

  const inhalt = (
    <>
      {linie ? <View style={styles.linie} /> : null}
      <View style={[styles.symbol, { backgroundColor: s.bg }]}>
        <Ionicons name={s.icon} size={18} color={s.fg} />
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
    texte: { flex: 1, minWidth: 0, gap: 2 },
    text: { fontFamily: FONT.w700, fontSize: 15, lineHeight: 20, color: c.textDark },
    detail: { fontFamily: FONT.w500, fontSize: 14, lineHeight: 19, color: c.textMid },
    meta: { fontFamily: FONT.w600, fontSize: 12, color: c.textMuted, fontVariant: ["tabular-nums"] },
  });
