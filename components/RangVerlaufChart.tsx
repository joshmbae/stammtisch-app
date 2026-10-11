import React, { useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable, Platform, useWindowDimensions } from "react-native";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";
import { MemberProfile } from "../types";
import { ThemeColors } from "../constants/design";
import { useColors, useThemedStyles } from "../contexts/ThemeContext";
import { VerlaufPunkt } from "../utils/stats";
import { displayName } from "../utils/format";
import { formatWochentagDatum } from "../utils/date";

/**
 * Platzierungsverlauf ("Bump Chart"): x = Stichtage (Stammtische), y = Platz,
 * eine Linie pro Mitglied. Bei vielen Mitgliedern wäre eine Farbe pro Linie
 * nicht mehr unterscheidbar — deshalb Fokus statt Regenbogen: alle Linien
 * neutral, bis zu drei hervorgehobene Mitglieder farbig (Farbe folgt der
 * Person, nicht dem Platz). Die Hervorhebung steuert der Screen, damit dieselbe
 * Person in allen Ranglisten dieselbe Farbe trägt.
 */

export interface VerlaufSerie {
  member: MemberProfile;
  plaetze: (number | null)[];
}

const AXIS = 26;          // feste Platz-Achse links (scrollt nicht mit)
const PAD = 12;           // Abstand erster Stichtag zur Achse
const RIGHT = 96;         // Namen am Linienende
const TOP = 12;
const BOTTOM = 26;        // Datums-Achse
const COL_MIN = 46;
// SVG-Text erbt im Web keine Systemschrift (sonst Serif).
const FONT = Platform.OS === "web" ? "system-ui, -apple-system, sans-serif" : undefined;

function kurzName(m: MemberProfile): string {
  const n = displayName(m);
  return n.length > 11 ? n.slice(0, 10) + "…" : n;
}

function punktLabel(p: VerlaufPunkt): string {
  if (p.heute) return "Heute";
  const d = new Date(p.datum + "T00:00:00");
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.`;
}

/** Linienzug je zusammenhängendem Abschnitt — null (noch nicht in der Liste) unterbricht die Linie. */
function pfad(plaetze: (number | null)[], x: (i: number) => number, y: (p: number) => number): string {
  let d = "";
  let offen = false;
  plaetze.forEach((p, i) => {
    if (p === null) {
      offen = false;
      return;
    }
    d += `${offen ? "L" : "M"}${x(i)},${y(p)} `;
    offen = true;
  });
  return d.trim();
}

export default function RangVerlaufChart({
  punkte,
  serien,
  highlight,
  onToggleMember,
}: {
  punkte: VerlaufPunkt[];
  serien: VerlaufSerie[];
  /** Mitglieds-Id -> Index in c.chartSeries */
  highlight: Map<string, number>;
  onToggleMember: (memberId: string) => void;
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const { width: fensterBreite } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  // Auswahl als Datum statt Index: kommen beim Aktualisieren Punkte dazu,
  // bleibt die Auswahl beim selben Tag; ohne Auswahl gilt immer der neueste.
  const [auswahlDatum, setAuswahlDatum] = useState<string | null>(null);
  const gefunden = auswahlDatum ? punkte.findIndex((p) => p.datum === auswahlDatum) : -1;
  const index = gefunden >= 0 ? gefunden : punkte.length - 1;

  const maxPlatz = Math.max(1, ...serien.flatMap((s) => s.plaetze.filter((p): p is number => p !== null)));
  const rowH = maxPlatz > 10 ? 24 : 30;
  // Kartenbreite ≈ Fenster minus Screen- und Karten-Padding.
  const verfuegbar = Math.max(260, fensterBreite - 72);
  const plotVerfuegbar = verfuegbar - AXIS;
  const colW = punkte.length > 1 ? Math.max(COL_MIN, (plotVerfuegbar - PAD - RIGHT) / (punkte.length - 1)) : 0;
  const breite = punkte.length > 1 ? PAD + colW * (punkte.length - 1) + RIGHT : plotVerfuegbar;
  const hoehe = TOP + rowH * (maxPlatz - 1) + BOTTOM + 10;
  const tippBreite = colW || 40;

  const x = (i: number) => (punkte.length > 1 ? PAD + i * colW : PAD + 20);
  const y = (p: number) => TOP + (p - 1) * rowH;

  // Hervorgehobene zuletzt zeichnen, damit sie über den neutralen Linien liegen.
  const sortiert = useMemo(
    () => [...serien].sort((a, b) => Number(highlight.has(a.member.id)) - Number(highlight.has(b.member.id))),
    [serien, highlight]
  );

  // Namen am Linienende; teilen sich mehrere den letzten Platz, stehen sie zusammen.
  const endLabels = useMemo(() => {
    const proPlatz = new Map<number, VerlaufSerie[]>();
    for (const s of serien) {
      const letzter = s.plaetze[s.plaetze.length - 1];
      if (letzter === null) continue;
      proPlatz.set(letzter, [...(proPlatz.get(letzter) ?? []), s]);
    }
    return [...proPlatz.entries()];
  }, [serien]);

  const stand = serien
    .map((s) => ({ s, platz: s.plaetze[index] }))
    .filter((e): e is { s: VerlaufSerie; platz: number } => e.platz !== null)
    .sort((a, b) => a.platz - b.platz);
  const hervorgehobenImStand = stand.filter((e) => highlight.has(e.s.member.id));
  const punkt = punkte[index];

  return (
    <View>
      {/* Stand am ausgewählten Stichtag — Ersatz für den Hover-Tooltip auf dem Handy */}
      <View style={styles.standBox}>
        <Text style={styles.standTitel}>
          {punkt.heute ? "Stand heute" : `Stand ${formatWochentagDatum(new Date(punkt.datum + "T00:00:00"))}`}
        </Text>
        <Text style={styles.standText}>
          {(hervorgehobenImStand.length > 0 ? hervorgehobenImStand : stand.slice(0, 3))
            .map((e) => `${e.platz}. ${displayName(e.s.member)}`)
            .join("  ·  ") || "Noch niemand in der Wertung"}
        </Text>
      </View>

      <View style={styles.plotZeile}>
        {/* Platz-Achse bleibt stehen, während der Verlauf horizontal scrollt */}
        <Svg width={AXIS} height={hoehe}>
          {Array.from({ length: maxPlatz }, (_, i) => i + 1).map((p) => (
            <SvgText key={`a${p}`} x={2} y={y(p) + 4} fontSize={11} fill={c.textMuted} fontWeight="600" fontFamily={FONT}>{`${p}.`}</SvgText>
          ))}
        </Svg>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        <View>
        <Svg
          width={breite}
          height={hoehe}
          accessibilityLabel={`Platzierungsverlauf über ${punkte.length} Stichtage`}
        >
          {/* Platz-Raster */}
          {Array.from({ length: maxPlatz }, (_, i) => i + 1).map((p) => (
            <Line key={`r${p}`} x1={0} x2={breite - RIGHT + 6} y1={y(p)} y2={y(p)} stroke={c.chartGrid} strokeWidth={1} />
          ))}

          {/* Ausgewählter Stichtag */}
          <Line x1={x(index)} x2={x(index)} y1={TOP - 8} y2={y(maxPlatz) + 8} stroke={c.borderDark} strokeWidth={1} strokeDasharray="3,3" />

          {/* Linien */}
          {sortiert.map((s) => {
            const slot = highlight.get(s.member.id);
            const farbe = slot !== undefined ? c.chartSeries[slot] : c.chartMuted;
            const d = pfad(s.plaetze, x, y);
            return (
              <React.Fragment key={s.member.id}>
                {d ? (
                  <Path
                    d={d}
                    stroke={farbe}
                    strokeWidth={slot !== undefined ? 2.5 : 1.5}
                    fill="none"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                ) : null}
                {slot !== undefined &&
                  s.plaetze.map((p, i) =>
                    p === null ? null : (
                      <Circle key={i} cx={x(i)} cy={y(p)} r={4} fill={farbe} stroke={c.card} strokeWidth={2} />
                    )
                  )}
              </React.Fragment>
            );
          })}

          {/* Namen am Ende */}
          {endLabels.map(([platz, liste]) => {
            const hervor = liste.some((s) => highlight.has(s.member.id));
            // Bei Gleichstand die Hervorgehobenen zuerst nennen, Rest als "+n".
            const reihenfolge = [...liste].sort((a, b) => Number(highlight.has(b.member.id)) - Number(highlight.has(a.member.id)));
            const text = reihenfolge.length > 2
              ? `${reihenfolge.slice(0, 2).map((s) => kurzName(s.member)).join(", ")} +${reihenfolge.length - 2}`
              : reihenfolge.map((s) => kurzName(s.member)).join(", ");
            return (
              <SvgText
                key={`e${platz}`}
                x={x(punkte.length - 1) + 8}
                y={y(platz) + 4}
                fontSize={11}
                fontFamily={FONT}
                fontWeight={hervor ? "700" : "400"}
                fill={hervor ? c.textDark : c.textMuted}
              >
                {text}
              </SvgText>
            );
          })}

          {/* Datums-Achse */}
          {punkte.map((p, i) => (
            <SvgText
              key={`x${i}`}
              x={x(i)}
              y={hoehe - 8}
              fontSize={10}
              fontFamily={FONT}
              fill={i === index ? c.textDark : c.textMuted}
              fontWeight={i === index ? "700" : "400"}
              textAnchor="middle"
            >
              {punktLabel(p)}
            </SvgText>
          ))}

        </Svg>
        {/* Tippflächen je Stichtag — breiter als die Marker */}
        {punkte.map((p, i) => (
          <Pressable
            key={`t${i}`}
            style={[styles.tippflaeche, { left: x(i) - tippBreite / 2, width: tippBreite }]}
            onPress={() => setAuswahlDatum(i === punkte.length - 1 ? null : p.datum)}
            accessibilityRole="button"
            accessibilityLabel={`Stand ${p.heute ? "heute" : punktLabel(p)} anzeigen`}
          />
        ))}
        </View>
      </ScrollView>
      </View>

      {/* Legende = Auswahl: antippen hebt hervor (max. 3) */}
      <View style={styles.legende}>
        {[...serien]
          .sort((a, b) => (a.plaetze[a.plaetze.length - 1] ?? 999) - (b.plaetze[b.plaetze.length - 1] ?? 999))
          .map((s) => {
            const slot = highlight.get(s.member.id);
            const aktiv = slot !== undefined;
            return (
              <TouchableOpacity
                key={s.member.id}
                style={[styles.chip, aktiv && { borderColor: c.chartSeries[slot!] }]}
                onPress={() => onToggleMember(s.member.id)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityState={{ selected: aktiv }}
                accessibilityLabel={`${displayName(s.member)} ${aktiv ? "nicht mehr hervorheben" : "hervorheben"}`}
              >
                <View style={[styles.chipDot, { backgroundColor: aktiv ? c.chartSeries[slot!] : c.chartMuted }]} />
                <Text style={[styles.chipText, aktiv && styles.chipTextAktiv]}>{displayName(s.member)}</Text>
              </TouchableOpacity>
            );
          })}
      </View>
      <Text style={styles.hinweis}>
        Tippe auf ein Datum für den Stand an dem Tag, auf Namen zum Hervorheben (bis zu 3).
      </Text>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  standBox: {
    backgroundColor: c.cardAlt, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, marginBottom: 10,
  },
  standTitel: { fontSize: 11, fontWeight: "700", color: c.textMuted, textTransform: "uppercase", letterSpacing: 0.4 },
  standText: { fontSize: 13, fontWeight: "700", color: c.textDark, marginTop: 2 },
  plotZeile: { flexDirection: "row" },
  tippflaeche: { position: "absolute", top: 0, bottom: 0 },
  legende: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999,
    borderWidth: 1.5, borderColor: c.border, backgroundColor: c.card,
  },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  chipText: { fontSize: 12, fontWeight: "600", color: c.textMuted },
  chipTextAktiv: { color: c.textDark, fontWeight: "700" },
  hinweis: { fontSize: 11, color: c.textLight, marginTop: 8 },
});
