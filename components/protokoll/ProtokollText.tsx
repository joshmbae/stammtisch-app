import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FONT, TYPE, ThemeColors } from "../../constants/design";
import { useColors, useThemedStyles } from "../../contexts/ThemeContext";

/**
 * Das Protokoll bleibt Freitext. Ein paar Zeilen-Muster werden beim Lesen
 * aber hervorgehoben, damit Themen und Beschlüsse auffallen:
 *   „## Überschrift"      → Abschnitts-Überschrift
 *   „1. Thema: Details"   → nummerierter Punkt (Teil vor dem Doppelpunkt fett)
 *   „Beschluss: …"        → grün hinterlegter Beschluss
 *   „- Punkt" / „* Punkt" → Aufzählung
 * Alles andere bleibt Absatz; Leerzeilen trennen Absätze.
 */
export type Block =
  | { art: "kopf"; text: string }
  | { art: "punkt"; nr: string; titel?: string; text: string }
  | { art: "beschluss"; text: string }
  | { art: "liste"; text: string }
  | { art: "absatz"; text: string; abstand: boolean };

export function zerlegeProtokoll(inhalt: string): Block[] {
  const bloecke: Block[] = [];
  let leerDavor = false;
  for (const roh of inhalt.split("\n")) {
    const z = roh.trim();
    if (!z) {
      leerDavor = bloecke.length > 0;
      continue;
    }
    const kopf = z.match(/^#{1,3}\s*(.+)$/);
    const punkt = z.match(/^(\d{1,2})[.)]\s+(.+)$/);
    const liste = z.match(/^[-*•]\s+(.+)$/);
    if (kopf) {
      bloecke.push({ art: "kopf", text: kopf[1].trim() });
    } else if (/^beschluss\s*:/i.test(z)) {
      bloecke.push({ art: "beschluss", text: z.replace(/^beschluss\s*:\s*/i, "") });
    } else if (punkt) {
      const rest = punkt[2];
      const k = rest.indexOf(": ");
      // Nur ein kurzer Teil vor dem Doppelpunkt ist ein Titel, sonst ist es ein Satz.
      if (k > 0 && k <= 60) bloecke.push({ art: "punkt", nr: punkt[1], titel: rest.slice(0, k), text: rest.slice(k + 2) });
      else bloecke.push({ art: "punkt", nr: punkt[1], text: rest });
    } else if (liste) {
      bloecke.push({ art: "liste", text: liste[1] });
    } else {
      const letzter = bloecke[bloecke.length - 1];
      // Aufeinanderfolgende Zeilen ohne Leerzeile bleiben ein Absatz mit Zeilenumbruch.
      if (letzter && letzter.art === "absatz" && !leerDavor) letzter.text += "\n" + z;
      else bloecke.push({ art: "absatz", text: z, abstand: leerDavor });
    }
    leerDavor = false;
  }
  return bloecke;
}

/** Kurzfassung für Listen: ohne Markierungen, Zeilen zusammengezogen. */
export function protokollAuszug(inhalt: string): string {
  return inhalt
    .split("\n")
    .map((z) => z.trim().replace(/^#{1,3}\s*/, "").replace(/^[-*•]\s+/, "").replace(/^beschluss\s*:\s*/i, "Beschluss: "))
    .filter(Boolean)
    .join(" · ");
}

/** Lesefassung des Protokolltexts. */
export function ProtokollText({ inhalt }: { inhalt: string }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const bloecke = zerlegeProtokoll(inhalt);
  // Ein Beschluss direkt unter einem nummerierten Punkt gehört zu diesem und rückt ein.
  const eingerueckt: boolean[] = [];
  bloecke.forEach((b, i) => {
    const vorher = bloecke[i - 1];
    eingerueckt[i] = b.art === "beschluss" && !!vorher && (vorher.art === "punkt" || (vorher.art === "beschluss" && eingerueckt[i - 1]));
  });
  return (
    <View>
      {bloecke.map((b, i) => {
        const erster = i === 0;
        switch (b.art) {
          case "kopf":
            return <Text key={i} style={[styles.kopf, erster && { marginTop: 0 }]} accessibilityRole="header">{b.text.toUpperCase()}</Text>;
          case "punkt":
            return (
              <View key={i} style={[styles.punkt, erster && { marginTop: 0 }]}>
                <View style={styles.nr}><Text style={styles.nrText}>{b.nr}</Text></View>
                <View style={{ flex: 1, minWidth: 0, gap: 1, paddingTop: 2 }}>
                  {b.titel ? <Text style={styles.punktTitel} selectable>{b.titel}</Text> : null}
                  {b.text ? <Text style={b.titel ? styles.punktText : styles.absatz} selectable>{b.text}</Text> : null}
                </View>
              </View>
            );
          case "beschluss":
            return (
              <View key={i} style={[styles.beschluss, eingerueckt[i] && { marginLeft: 34 }, erster && { marginTop: 0 }]}>
                <Ionicons name="checkmark" size={16} color={c.greenText} style={{ marginTop: 2 }} />
                <Text style={styles.beschlussText} selectable>
                  <Text style={styles.beschlussLabel}>Beschluss: </Text>
                  {b.text}
                </Text>
              </View>
            );
          case "liste":
            return (
              <View key={i} style={[styles.liste, erster && { marginTop: 0 }]}>
                <View style={styles.bullet} />
                <Text style={[styles.absatz, { flex: 1 }]} selectable>{b.text}</Text>
              </View>
            );
          default:
            return <Text key={i} style={[styles.absatz, { marginTop: erster ? 0 : b.abstand ? 12 : 4 }]} selectable>{b.text}</Text>;
        }
      })}
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    kopf: { ...TYPE.label, color: c.textMuted, marginTop: 20, marginBottom: 2 },
    absatz: { fontFamily: FONT.w500, fontSize: 15, lineHeight: 22, color: c.textDark },
    punkt: { flexDirection: "row", gap: 10, marginTop: 12 },
    nr: { width: 24, height: 24, borderRadius: 12, backgroundColor: c.blueBg, alignItems: "center", justifyContent: "center" },
    nrText: { fontFamily: FONT.w700, fontSize: 12, color: c.blue },
    punktTitel: { fontFamily: FONT.w700, fontSize: 15, lineHeight: 21, color: c.textDark },
    punktText: { fontFamily: FONT.w500, fontSize: 15, lineHeight: 22, color: c.textMid },
    beschluss: {
      flexDirection: "row", gap: 8, alignItems: "flex-start", marginTop: 8,
      borderRadius: 12, backgroundColor: c.greenSoft, paddingVertical: 8, paddingHorizontal: 10,
    },
    beschlussText: { flex: 1, fontFamily: FONT.w600, fontSize: 14, lineHeight: 20, color: c.textDark },
    beschlussLabel: { fontFamily: FONT.w700 },
    liste: { flexDirection: "row", gap: 10, marginTop: 6 },
    bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.blue, marginTop: 8 },
  });
