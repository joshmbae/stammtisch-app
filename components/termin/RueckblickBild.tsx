import React, { forwardRef } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { FONT, kombiAvatarFarbe } from "../../constants/design";

export interface RueckblickPerson {
  id: string;
  name: string;
  color?: string;
  photoUri?: string;
}

/** Wer in einer Wertung des Abends vorne lag – mit großer Zahl. */
export interface RueckblickSieger {
  emoji: string;
  /** Wofür, z. B. „Schock-Aus“ oder „Strafen“. */
  label: string;
  /** Groß: „3×“ oder „10 €“. */
  wert: string;
  /** Bei Gleichstand mehrere; gezeigt werden höchstens drei Gesichter. */
  personen: RueckblickPerson[];
}

interface Props {
  datum: string;
  titel: string;
  zeile: string;
  /** Anwesenheit 0 … 1, als Ring neben dem Titel. */
  quote: number;
  /** Foto vom Abend; ohne Foto die grüne Fläche. */
  bildUrl?: string;
  sieger: RueckblickSieger[];
  /** Kleine Fußzeile, z. B. „18 € für die Kasse · Toni hat gefehlt“. */
  fuss: string;
  stammtisch: string;
}

/** Feste Größe 4:5, wird mit 1080 px Breite als Bild gespeichert (1080 × 1350). */
export const RUECKBLICK_BREITE = 360;
const HOEHE = RUECKBLICK_BREITE * 1.25;
const FOTO_HOEHE = 220;

/**
 * Rückblick auf einen Abend als Bild für die WhatsApp-Gruppe: oben das Foto
 * vom Abend, darunter die Sieger mit Profilbild und großer Zahl. Bei
 * Gleichstand bis zu drei Gesichter und die Namen auf bis zu zwei Zeilen. Bewusst feste
 * Farben (Live-Grün der App, egal ob Hell oder Dunkel): es ist ein Bild, das
 * außerhalb der App gezeigt wird. Ohne runde Ecken, sonst werden sie im Bild
 * schwarz. Wird unsichtbar gerendert und nur abfotografiert.
 */
export const RueckblickBild = forwardRef<View, Props>(function RueckblickBild({ datum, titel, zeile, quote, bildUrl, sieger, fuss, stammtisch }, ref) {
  return (
    <View ref={ref} collapsable={false} style={styles.bild}>
      <View style={styles.foto}>
        {bildUrl ? (
          <Image source={{ uri: bildUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <View style={styles.ring} />
        )}
        {/* Foto läuft nach unten ins Grün aus; oben leicht abgedunkelt für die Datumszeile. */}
        <Svg style={StyleSheet.absoluteFill} width={RUECKBLICK_BREITE} height={FOTO_HOEHE} preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="rueckblick" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#000000" stopOpacity={bildUrl ? 0.55 : 0} />
              <Stop offset="0.4" stopColor={GRUEN} stopOpacity={0} />
              <Stop offset="1" stopColor={GRUEN} stopOpacity={1} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width={RUECKBLICK_BREITE} height={FOTO_HOEHE} fill="url(#rueckblick)" />
        </Svg>
        <View style={styles.kopfOben}>
          <Text style={styles.kicker} numberOfLines={1}>{`RÜCKBLICK · ${datum.toUpperCase()}`}</Text>
          <Text style={styles.stammtisch} numberOfLines={1}>{`🍻 ${stammtisch}`}</Text>
        </View>
        <View style={styles.kopfUnten}>
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text style={styles.titel} numberOfLines={1}>{titel}</Text>
            <Text style={styles.zeile} numberOfLines={1}>{zeile}</Text>
          </View>
          <AnwesenheitsRing quote={quote} />
        </View>
      </View>

      <View style={styles.siegerReihe}>
        {sieger.slice(0, 3).map((s) => (
          <View key={s.label} style={styles.sieger}>
            <View style={styles.gesichter}>
              {s.personen.slice(0, 3).map((p, i) => (
                <Gesicht key={p.id} person={p} groesse={s.personen.length === 1 ? 58 : s.personen.length === 2 ? 46 : 38} versatz={i > 0} />
              ))}
              <Text style={styles.krone}>👑</Text>
            </View>
            <Text style={styles.wert} numberOfLines={1} adjustsFontSizeToFit>{s.wert}</Text>
            <Text style={styles.label} numberOfLines={1}>{`${s.emoji} ${s.label}`}</Text>
            <Text style={styles.name} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.85}>{namen(s.personen)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.fuss}>
        <Text style={styles.fussText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{fuss}</Text>
      </View>
    </View>
  );
});

/** Anwesenheit als Ring: Senf auf hellem Grund, Prozent in der Mitte. */
function AnwesenheitsRing({ quote }: { quote: number }) {
  const groesse = 64;
  const strich = 6;
  const r = (groesse - strich) / 2;
  const umfang = 2 * Math.PI * r;
  const anteil = Math.max(0, Math.min(1, quote));
  return (
    <View style={styles.ring64}>
      <Svg width={groesse} height={groesse} style={StyleSheet.absoluteFill}>
        <Circle cx={groesse / 2} cy={groesse / 2} r={r} stroke="rgba(255,255,255,0.22)" strokeWidth={strich} fill="rgba(20,18,16,0.35)" />
        <Circle
          cx={groesse / 2} cy={groesse / 2} r={r} stroke={SENF} strokeWidth={strich} fill="none"
          strokeDasharray={`${umfang * anteil} ${umfang}`} strokeLinecap="round"
          transform={`rotate(-90 ${groesse / 2} ${groesse / 2})`}
        />
      </Svg>
      <Text style={styles.ringWert}>{`${Math.round(anteil * 100)}%`}</Text>
      <Text style={styles.ringLabel}>da</Text>
    </View>
  );
}

/** „Tommy“, „Tommy & Marky“, „Tommy, Marky & Krüger“, ab vier „Tommy, Marky & 2 weitere“. */
function namen(personen: RueckblickPerson[]): string {
  const n = personen.map((p) => p.name);
  if (n.length <= 2) return n.join(" & ");
  if (n.length === 3) return `${n[0]}, ${n[1]} & ${n[2]}`;
  return `${n[0]}, ${n[1]} & ${n.length - 2} weitere`;
}

/** Profilbild mit Senf-Ring; ohne Foto die Initiale auf der Avatarfarbe. */
function Gesicht({ person, groesse, versatz }: { person: RueckblickPerson; groesse: number; versatz: boolean }) {
  const rund = { width: groesse, height: groesse, borderRadius: groesse / 2 };
  return (
    <View style={[styles.gesicht, rund, versatz && { marginLeft: groesse < 40 ? -10 : -14 }]}>
      {person.photoUri ? (
        <Image source={{ uri: person.photoUri }} style={rund} />
      ) : (
        <View style={[rund, styles.initialeFlaeche, { backgroundColor: kombiAvatarFarbe(person.color) }]}>
          <Text style={[styles.initiale, { fontSize: groesse * 0.42 }]}>{person.name.charAt(0).toUpperCase()}</Text>
        </View>
      )}
    </View>
  );
}

const GRUEN = "#24553F";
const SENF = "#E2B347";
const HELL = "#CFE0D5";
/** Für Text direkt auf dem Foto, damit er auch auf hellen Stellen lesbar bleibt. */
const SCHATTEN = { textShadowColor: "rgba(0,0,0,0.6)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 };

const styles = StyleSheet.create({
  bild: { width: RUECKBLICK_BREITE, height: HOEHE, backgroundColor: GRUEN, overflow: "hidden" },
  foto: { height: FOTO_HOEHE, backgroundColor: GRUEN, justifyContent: "space-between", padding: 20, paddingBottom: 6 },
  ring: { position: "absolute", right: -70, top: -70, width: 240, height: 240, borderRadius: 120, borderWidth: 30, borderColor: "rgba(255,255,255,0.06)" },
  kopfOben: { flexDirection: "row", alignItems: "center", gap: 10 },
  kicker: { fontFamily: FONT.w700, fontSize: 12, letterSpacing: 1.2, color: SENF, flexShrink: 0, ...SCHATTEN },
  stammtisch: { fontFamily: FONT.w700, fontSize: 12, color: "#FFFFFF", marginLeft: "auto", flexShrink: 1, textAlign: "right", ...SCHATTEN },
  kopfUnten: { flexDirection: "row", alignItems: "flex-end", gap: 12 },
  ring64: { width: 64, height: 64, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  ringWert: { fontFamily: FONT.w800, fontSize: 17, lineHeight: 19, letterSpacing: -0.4, color: "#FFFFFF" },
  ringLabel: { fontFamily: FONT.w700, fontSize: 10, lineHeight: 12, color: HELL },
  titel: { fontFamily: FONT.w800, fontSize: 30, lineHeight: 34, letterSpacing: -0.6, color: "#FFFFFF" },
  zeile: { fontFamily: FONT.w600, fontSize: 13, color: HELL },
  siegerReihe: { flex: 1, flexDirection: "row", justifyContent: "space-around", alignItems: "flex-start", paddingHorizontal: 10, paddingTop: 16 },
  sieger: { flex: 1, alignItems: "center", gap: 1, minWidth: 0 },
  gesichter: { flexDirection: "row", alignItems: "center", height: 64, marginBottom: 4 },
  gesicht: { borderWidth: 3, borderColor: SENF, overflow: "hidden", backgroundColor: GRUEN },
  initialeFlaeche: { alignItems: "center", justifyContent: "center" },
  initiale: { fontFamily: FONT.w800, color: "#FFFFFF" },
  krone: { position: "absolute", top: -10, right: -8, fontSize: 18 },
  wert: { fontFamily: FONT.w800, fontSize: 36, lineHeight: 38, letterSpacing: -1, color: "#FFFFFF" },
  label: { fontFamily: FONT.w700, fontSize: 12, color: SENF },
  name: { fontFamily: FONT.w600, fontSize: 13, lineHeight: 17, color: HELL, maxWidth: "94%", textAlign: "center" },
  fuss: { paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(255,255,255,0.16)" },
  fussText: { fontFamily: FONT.w600, fontSize: 12, color: HELL, textAlign: "center" },
});
