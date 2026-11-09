import React, { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MemberProfile, StammtischTermin, StammtischVerordnung } from "../../types";
import { FONT, RADIUS, TYPE, ThemeColors } from "../../constants/design";
import { useColors, useThemedStyles } from "../../contexts/ThemeContext";
import { getStammtischId } from "../../utils/storage";
import { rundeEinladen } from "../../utils/einladen";
import { SYMBOL } from "../../constants/symbole";
import { Card, IconSquircle, PressableScale, Ton } from "../ui";

interface Zustand {
  /** Von Hand ausgeblendet. */
  aus?: boolean;
}

async function schluessel(): Promise<string> {
  return `st_erste_schritte_${await getStammtischId()}`;
}

/**
 * Checkliste für neue Stammtische auf Home: vier Schritte (Grunddaten, Admin,
 * Runde einladen, erster Termin), die sich von selbst abhaken. Darunter
 * „Auch möglich“ – Satzung, Strafenkatalog, Spiele – als Hinweis, was es noch
 * gibt, ohne dass es abgearbeitet werden muss. Verschwindet, wenn die vier
 * erledigt sind, von Hand ausgeblendet wurde oder der Stammtisch schon
 * mehrere Abende hinter sich hat.
 */
export function ErsteSchritte({ verordnung, members, termine, ich }: {
  verordnung: StammtischVerordnung | null;
  members: MemberProfile[];
  termine: StammtischTermin[];
  ich: MemberProfile | null;
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const [zustand, setZustand] = useState<Zustand | null>(null);

  useFocusEffect(
    useCallback(() => {
      let aktiv = true;
      schluessel()
        .then((k) => AsyncStorage.getItem(k))
        .then((v) => { if (aktiv) setZustand(v ? JSON.parse(v) : {}); })
        .catch(() => { if (aktiv) setZustand({}); });
      return () => { aktiv = false; };
    }, [])
  );

  function merken(neu: Zustand) {
    const z = { ...zustand, ...neu };
    setZustand(z);
    schluessel().then((k) => AsyncStorage.setItem(k, JSON.stringify(z))).catch(() => {});
  }

  if (!zustand || zustand.aus) return null;
  const heute = new Date().toISOString().slice(0, 10);
  // Eingespielte Runden brauchen das nicht mehr.
  if (termine.filter((t) => t.datum < heute).length >= 3) return null;

  const name = verordnung?.name ?? "";
  const schritte: { key: string; emoji: string; ton: Ton; titel: string; text: string; erledigt: boolean; los: () => void }[] = [
    {
      key: "grunddaten", emoji: SYMBOL.treffpunkt, ton: "blue",
      titel: "Grunddaten eintragen", text: "Treffpunkt und Stammtischtag",
      erledigt: !!verordnung?.treffpunkt && !!verordnung?.stammtischTag,
      los: () => router.push("/einstellungen"),
    },
    {
      key: "admin", emoji: SYMBOL.krone, ton: "mustard",
      titel: "Admin festlegen", text: "Dann darf nicht jede:r alles ändern",
      erledigt: members.some((m) => m.istAdmin),
      los: () => router.push(ich ? `/member/edit/${ich.id}` : "/mitglieder"),
    },
    {
      key: "einladen", emoji: SYMBOL.rollen, ton: "green",
      titel: "Runde einladen", text: "Name und Passwort an die anderen schicken",
      erledigt: members.length >= 2,
      los: () => rundeEinladen(name),
    },
    {
      key: "termin", emoji: SYMBOL.termin, ton: "blue",
      titel: "Ersten Termin anlegen", text: "Dann können alle zusagen",
      erledigt: termine.length > 0,
      los: () => router.push("/kalender?neu=1"),
    },
  ];
  const fertig = schritte.filter((s) => s.erledigt).length;
  const extras: { key: string; emoji: string; ton: Ton; titel: string; route: string }[] = [
    { key: "satzung", emoji: SYMBOL.satzung, ton: "green", titel: "Satzung", route: "/satzung" },
    { key: "strafen", emoji: SYMBOL.strafenkatalog, ton: "coral", titel: "Strafen", route: "/strafen-kategorien" },
    { key: "spiele", emoji: SYMBOL.spiele, ton: "mustard", titel: "Spiele", route: "/spiele" },
  ];
  if (fertig === schritte.length) return null;

  return (
    <Card enterIndex={0} style={{ gap: 10 }}>
      <View style={styles.kopf}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.titel} accessibilityRole="header">Erste Schritte</Text>
          <Text style={styles.meta}>{`${fertig} von ${schritte.length} erledigt`}</Text>
        </View>
        <PressableScale onPress={() => merken({ aus: true })} hitSlop={8} style={styles.aus} accessibilityLabel="Erste Schritte ausblenden">
          <Text style={styles.ausText}>Ausblenden</Text>
        </PressableScale>
      </View>
      <View style={[styles.spur, { backgroundColor: c.cardAlt }]}>
        <View style={[styles.fuell, { width: `${Math.round((fertig / schritte.length) * 100)}%`, backgroundColor: c.success }]} />
      </View>
      {schritte.map((s, i) =>
        s.erledigt ? (
          // Erledigt: kein Knopf mehr (ein deaktivierter wäre blass), nur Haken und durchgestrichener Titel.
          <View key={s.key} style={[styles.zeile, i > 0 && styles.trenner]} accessible accessibilityLabel={`${s.titel}, erledigt`}>
            <View style={[styles.haken, { backgroundColor: c.success }]}>
              <Ionicons name="checkmark" size={18} color={c.onAccent} />
            </View>
            <Text style={[styles.schritt, styles.schrittErledigt, { flex: 1 }]} numberOfLines={1}>{s.titel}</Text>
          </View>
        ) : (
          <PressableScale
            key={s.key}
            onPress={s.los}
            scaleTo={0.98}
            style={[styles.zeile, i > 0 && styles.trenner]}
            accessibilityRole="button"
            accessibilityLabel={`${s.titel}. ${s.text}`}
          >
            <IconSquircle emoji={s.emoji} ton={s.ton} size={34} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.schritt} numberOfLines={1}>{s.titel}</Text>
              <Text style={styles.meta} numberOfLines={1}>{s.text}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
          </PressableScale>
        ),
      )}
      <View style={styles.extrasKopf}>
        <Text style={styles.extrasTitel}>Auch möglich</Text>
        <Text style={styles.meta}>wenn ihr mögt</Text>
      </View>
      <View style={styles.extras}>
        {extras.map((e) => (
          <PressableScale
            key={e.key}
            onPress={() => router.push(e.route as never)}
            scaleTo={0.96}
            style={[styles.extra, { backgroundColor: c.cardAlt }]}
            accessibilityRole="link"
            accessibilityLabel={`${e.titel} einrichten`}
          >
            <IconSquircle emoji={e.emoji} ton={e.ton} size={30} />
            <Text style={styles.extraText} numberOfLines={1}>{e.titel}</Text>
          </PressableScale>
        ))}
      </View>
    </Card>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    kopf: { flexDirection: "row", alignItems: "center", gap: 8 },
    titel: { ...TYPE.heading, color: c.textDark },
    meta: { ...TYPE.caption, fontSize: 13, color: c.textMuted },
    aus: { minHeight: 32, justifyContent: "center" },
    ausText: { fontFamily: FONT.w600, fontSize: 13, color: c.textMuted },
    spur: { height: 6, borderRadius: RADIUS.pill, overflow: "hidden" },
    fuell: { height: "100%", borderRadius: RADIUS.pill },
    zeile: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52 },
    trenner: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
    haken: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    schritt: { fontFamily: FONT.w600, fontSize: 15, color: c.textDark },
    schrittErledigt: { color: c.textMuted, textDecorationLine: "line-through" },
    extrasKopf: { flexDirection: "row", alignItems: "baseline", gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border, paddingTop: 12, marginTop: 2 },
    extrasTitel: { ...TYPE.label, color: c.textMuted },
    extras: { flexDirection: "row", gap: 8 },
    extra: { flex: 1, minWidth: 0, alignItems: "center", gap: 6, paddingVertical: 10, borderRadius: RADIUS.md },
    extraText: { fontFamily: FONT.w600, fontSize: 13, color: c.textDark },
  });
