import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StammtischTermin, TerminArt } from "../../types";
import { FONT, RADIUS, TYPE, ThemeColors } from "../../constants/design";
import { useColors, useThemedStyles } from "../../contexts/ThemeContext";
import { toLocalIsoDate } from "../../utils/date";
import { Card, PressableScale } from "../ui";

const WOCHENTAGE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
export const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

/** Liegt ein Termin an diesem Tag? Geburtstage wiederholen sich jährlich. */
export function amTag(t: StammtischTermin, iso: string): boolean {
  if (t.art === "geburtstag") return t.datum.slice(5) === iso.slice(5);
  return t.datum <= iso && iso <= (t.datumBis ?? t.datum);
}

export function artFarbe(art: TerminArt, c: ThemeColors): string {
  return art === "stammtisch" ? c.blue : art === "veranstaltung" ? c.mustard : c.coral;
}

/** Tage in Wochen zu je 7 aufteilen. */
const wochen = <T,>(tage: T[]): T[][] => Array.from({ length: Math.ceil(tage.length / 7) }, (_, i) => tage.slice(i * 7, i * 7 + 7));
const montag = (d: Date) => { const m = new Date(d.getFullYear(), d.getMonth(), d.getDate()); m.setDate(m.getDate() - ((m.getDay() + 6) % 7)); return m; };
const plusTage = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
function kalenderwoche(d: Date): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const tag = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - tag);
  const jahresanfang = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - jahresanfang.getTime()) / 86400000 + 1) / 7);
}

/**
 * Kalender als Woche (Standard) oder Monat. Punkte zeigen Termine nach Art;
 * Antippen eines Tages wählt ihn aus (nochmal antippen hebt die Wahl auf).
 */
export function KalenderKarte({ termine, gewaehlt, onWaehlen }: {
  termine: StammtischTermin[];
  gewaehlt: string | null;
  onWaehlen: (iso: string | null) => void;
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const heute = toLocalIsoDate(new Date());
  const [monat, setMonat] = useState(false);
  const [bezug, setBezug] = useState(() => new Date());

  const tage: (Date | null)[] = useMemo(() => {
    if (!monat) {
      const start = montag(bezug);
      return Array.from({ length: 7 }, (_, i) => plusTage(start, i));
    }
    const erster = new Date(bezug.getFullYear(), bezug.getMonth(), 1);
    const versatz = (erster.getDay() + 6) % 7;
    const anzahl = new Date(bezug.getFullYear(), bezug.getMonth() + 1, 0).getDate();
    const zellen: (Date | null)[] = [...Array(versatz).fill(null), ...Array.from({ length: anzahl }, (_, i) => new Date(bezug.getFullYear(), bezug.getMonth(), i + 1))];
    while (zellen.length % 7) zellen.push(null);
    return zellen;
  }, [monat, bezug]);

  function blaettern(richtung: 1 | -1) {
    setBezug((b) => (monat ? new Date(b.getFullYear(), b.getMonth() + richtung, 1) : plusTage(b, 7 * richtung)));
  }

  const start = montag(bezug);
  const ende = plusTage(start, 6);
  const titel = monat
    ? `${MONATE[bezug.getMonth()]} ${bezug.getFullYear()}`
    : `${start.getDate()}.${start.getMonth() !== ende.getMonth() ? `${start.getMonth() + 1}.` : ""}–${ende.getDate()}. ${MONATE[ende.getMonth()]}`;
  const istDieseWoche = toLocalIsoDate(montag(new Date())) === toLocalIsoDate(start);
  const untertitel = monat ? null : `KW ${kalenderwoche(start)}${istDieseWoche ? " · diese Woche" : ""}`;

  return (
    <Card enterIndex={0} style={{ gap: 10 }}>
      <View style={styles.kopf}>
        <PressableScale onPress={() => { setBezug(new Date()); onWaehlen(heute); }} style={{ flex: 1 }} accessibilityLabel={`${titel}. Zu heute springen`}>
          <Text style={styles.titel}>{titel}</Text>
          {untertitel ? <Text style={styles.sub}>{untertitel}</Text> : null}
        </PressableScale>
        <PressableScale onPress={() => blaettern(-1)} style={styles.rund} hitSlop={4} accessibilityLabel={monat ? "Vorheriger Monat" : "Vorherige Woche"}>
          <Ionicons name="chevron-back" size={18} color={c.textDark} />
        </PressableScale>
        <PressableScale onPress={() => blaettern(1)} style={styles.rund} hitSlop={4} accessibilityLabel={monat ? "Nächster Monat" : "Nächste Woche"}>
          <Ionicons name="chevron-forward" size={18} color={c.textDark} />
        </PressableScale>
        <PressableScale onPress={() => setMonat((m) => !m)} style={styles.umschalter} hitSlop={4} accessibilityLabel={monat ? "Wochenansicht" : "Monatsansicht"}>
          <Text style={styles.umschalterText}>{monat ? "Woche" : "Monat"}</Text>
        </PressableScale>
      </View>

      <View style={styles.reihe}>
        {WOCHENTAGE.map((w) => <Text key={w} style={styles.wochentag}>{w}</Text>)}
      </View>
      {/* Feste Wochenzeilen mit gleich breiten Spalten: Prozentbreiten in einer
          umbrechenden Zeile summieren sich auf iOS über 100 % und schieben den
          Sonntag in die nächste Zeile. */}
      <View>
        {wochen(tage).map((woche, w) => (
          <View key={w} style={styles.reihe}>
            {woche.map((d, i) => {
              if (!d) return <View key={`l${i}`} style={styles.zelle} />;
              const iso = toLocalIsoDate(d);
              const arten = [...new Set(termine.filter((t) => amTag(t, iso)).map((t) => t.art))].slice(0, 3);
              const istHeute = iso === heute;
              const istGewaehlt = iso === gewaehlt;
              return (
                <View key={iso} style={styles.zelle}>
                  <PressableScale
                    onPress={() => onWaehlen(istGewaehlt ? null : iso)}
                    scaleTo={0.9}
                    style={styles.zelleKnopf}
                    accessibilityRole="button"
                    accessibilityState={{ selected: istGewaehlt }}
                    accessibilityLabel={`${d.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}${arten.length ? `, ${arten.length} Termin${arten.length > 1 ? "e" : ""}` : ""}`}
                  >
                    <View style={[styles.tag, istHeute && { backgroundColor: c.blueBg }, istGewaehlt && { backgroundColor: c.textDark }]}>
                      <Text style={[styles.tagText, istHeute && { color: c.blue, fontFamily: FONT.w700 }, istGewaehlt && { color: c.background, fontFamily: FONT.w700 }]}>{d.getDate()}</Text>
                    </View>
                    <View style={styles.punkte}>
                      {arten.map((a) => <View key={a} style={[styles.punkt, { backgroundColor: artFarbe(a, c) }]} />)}
                    </View>
                  </PressableScale>
                </View>
              );
            })}
          </View>
        ))}
      </View>

      <View style={styles.legende} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {(["stammtisch", "veranstaltung", "geburtstag"] as TerminArt[]).map((a) => (
          <View key={a} style={styles.legendeEintrag}>
            <View style={[styles.punkt, { backgroundColor: artFarbe(a, c) }]} />
            <Text style={styles.legendeText}>{a === "stammtisch" ? "Stammtisch" : a === "veranstaltung" ? "Veranstaltung" : "Geburtstag"}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    kopf: { flexDirection: "row", alignItems: "center", gap: 8 },
    titel: { ...TYPE.heading, color: c.textDark },
    sub: { ...TYPE.caption, fontSize: 13, color: c.textMuted },
    rund: { width: 36, height: 36, borderRadius: 18, backgroundColor: c.cardAlt, alignItems: "center", justifyContent: "center" },
    umschalter: { height: 36, paddingHorizontal: 12, borderRadius: RADIUS.pill, backgroundColor: c.cardAlt, justifyContent: "center" },
    umschalterText: { fontFamily: FONT.w700, fontSize: 14, color: c.textDark },
    reihe: { flexDirection: "row" },
    wochentag: { flex: 1, textAlign: "center", ...TYPE.caption, color: c.textMuted },
    zelle: { flex: 1, minHeight: 48 },
    zelleKnopf: { flex: 1, alignItems: "center", paddingVertical: 2 },
    tag: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
    tagText: { fontFamily: FONT.w600, fontSize: 16, color: c.textDark },
    punkte: { flexDirection: "row", gap: 3, height: 6, alignItems: "center", marginTop: 2 },
    punkt: { width: 6, height: 6, borderRadius: 3 },
    legende: { flexDirection: "row", gap: 14, flexWrap: "wrap" },
    legendeEintrag: { flexDirection: "row", alignItems: "center", gap: 5 },
    legendeText: { ...TYPE.caption, color: c.textMuted },
  });
