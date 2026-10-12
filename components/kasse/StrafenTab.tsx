import React, { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";
import { StrafLog } from "../../types";
import { FONT, MAX_FONT_SCALE, RADIUS, TYPE, ThemeColors } from "../../constants/design";
import { useColors, useThemedStyles } from "../../contexts/ThemeContext";
import { Kasse } from "../../utils/useKasse";
import { formatWochentagDatum } from "../../utils/date";
import { displayName, formatEuro } from "../../utils/format";
import { terminBezeichnung } from "../../utils/activityFeed";
import { useSingleFlight } from "../../utils/useSingleFlight";
import { Avatar, Card, Chip, KategorieIcon, PressableScale, haptik } from "../ui";

const euro = (n: number) => `${formatEuro(n).replace(",00", "")} €`;

/**
 * Alle Strafen der Runde: offene Summe mit den größten Schuldnern, Filter
 * nach Person, offene Strafen nach Termin gruppiert. Der Kreis rechts hakt
 * ab (= Einnahme in der Kasse); Antippen der Zeile öffnet Details.
 */
export function StrafenTab({ kasse, filter, onFilter, onStrafe }: {
  kasse: Kasse;
  filter: string | null;
  onFilter: (id: string | null) => void;
  onStrafe: (l: StrafLog) => void;
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const guard = useSingleFlight();
  const [beglicheneOffen, setBeglicheneOffen] = useState(false);
  // Gewählte Person sichtbar halten, z. B. nach einem Link aus dem Profil.
  const chipLeiste = useRef<ScrollView>(null);
  const chipX = useRef(new Map<string, number>());
  const [chipsBereit, setChipsBereit] = useState(0);
  useEffect(() => {
    const x = filter ? chipX.current.get(filter) : 0;
    if (x !== undefined) chipLeiste.current?.scrollTo({ x: Math.max(0, x - 60), animated: true });
  }, [filter, chipsBereit]);
  const name = (id: string) => { const m = kasse.members.find((x) => x.id === id); return m ? displayName(m) : "?"; };

  const alleOffen = kasse.strafen.filter((l) => !l.beglichen);
  const proPerson = new Map<string, number>();
  for (const l of alleOffen) proPerson.set(l.memberId, (proPerson.get(l.memberId) ?? 0) + l.betrag);
  const top = [...proPerson.entries()].sort((a, b) => b[1] - a[1]);
  const max = top[0]?.[1] ?? 1;
  const summe = alleOffen.reduce((s, l) => s + l.betrag, 0);

  const gefiltert = kasse.strafen.filter((l) => !filter || l.memberId === filter);
  const offen = gefiltert.filter((l) => !l.beglichen);
  const beglichen = gefiltert.filter((l) => l.beglichen);

  // Offene nach Termin gruppieren, neueste Termine zuerst; ohne Termin am Ende.
  const gruppen = new Map<string, StrafLog[]>();
  for (const l of offen) gruppen.set(l.terminId ?? "", [...(gruppen.get(l.terminId ?? "") ?? []), l]);
  const gruppenListe = [...gruppen.entries()].sort(([a], [b]) => {
    if (!a) return 1;
    if (!b) return -1;
    const ta = kasse.termine.find((t) => t.id === a)?.datum ?? "";
    const tb = kasse.termine.find((t) => t.id === b)?.datum ?? "";
    return tb.localeCompare(ta);
  });
  const gruppenTitel = (terminId: string) => {
    const t = kasse.termine.find((x) => x.id === terminId);
    if (!t) return terminId ? "Termin gelöscht" : "Ohne Termin";
    return terminBezeichnung({ terminDatum: t.datum, terminTitel: t.titel, terminArt: t.art }, true);
  };

  async function abhaken(l: StrafLog) {
    haptik(l.beglichen ? "leicht" : "erfolg");
    await kasse.strafeUmschalten(l.id);
  }

  const zeile = (l: StrafLog, i: number) => {
    const kat = kasse.strafKategorien.find((k) => k.id === l.kategorie);
    const was = kat?.systemKey === "sonstiges" && l.notiz ? l.notiz : kat?.label ?? "Strafe";
    const zusatz = kat?.systemKey === "sonstiges" ? null : l.notiz;
    return (
      <View key={l.id} style={[styles.zeile, i > 0 && styles.trenner]}>
        <PressableScale onPress={() => onStrafe(l)} style={styles.zeileInfo} accessibilityLabel={`${name(l.memberId)}: ${was}, ${euro(l.betrag)}${l.beglichen ? ", bezahlt" : ", offen"}. Details`}>
          <KategorieIcon kat={kat} size={36} />
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text style={styles.name} numberOfLines={1}>{name(l.memberId)}</Text>
            <View style={styles.subZeile}>
              <Text style={styles.sub} numberOfLines={1}>{[was, zusatz].filter(Boolean).join(" · ")}</Text>
              {!l.beglichen ? <View style={[styles.pill, { backgroundColor: c.coralSoft }]}><Text style={[styles.pillText, { color: c.coralText }]}>offen</Text></View> : null}
            </View>
          </View>
          <Text style={[styles.betrag, l.beglichen ? styles.bezahlt : { color: c.coralText }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{euro(l.betrag)}</Text>
        </PressableScale>
        <PressableScale
          onPress={() => guard(() => abhaken(l))}
          scaleTo={0.9}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: l.beglichen }}
          accessibilityLabel={l.beglichen ? "Bezahlt. Tippen, um wieder offen zu setzen" : "Als bezahlt markieren"}
          hitSlop={6}
          style={[styles.kreis, l.beglichen && { backgroundColor: c.success, borderColor: c.success }]}
        >
          {l.beglichen ? (
            <Animated.View entering={ZoomIn.springify().damping(14)}>
              <Ionicons name="checkmark" size={18} color={c.onAccent} />
            </Animated.View>
          ) : null}
        </PressableScale>
      </View>
    );
  };

  return (
    <>
      <Card enterIndex={0} style={styles.oben}>
        <View style={{ flex: 1, minWidth: 110 }}>
          <Text style={[styles.label, { color: summe > 0 ? c.coralText : c.successText }]}>{summe > 0 ? "Offen gesamt" : "Alles bezahlt"}</Text>
          <Text style={[styles.summe, { color: summe > 0 ? c.coralText : c.successText }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{euro(summe)}</Text>
          <Text style={styles.meta}>{`${top.length} ${top.length === 1 ? "Person" : "Personen"}`}</Text>
        </View>
        {top.length > 0 ? (
          <View style={{ flex: 1.3, gap: 10 }}>
            {top.slice(0, 3).map(([id, v]) => (
              <View key={id} style={{ gap: 4 }} accessible accessibilityLabel={`${name(id)}: ${euro(v)} offen`}>
                <View style={styles.topZeile}>
                  <Text style={styles.topName} numberOfLines={1}>{name(id)}</Text>
                  <Text style={styles.topWert}>{euro(v)}</Text>
                </View>
                <View style={styles.spur}><View style={[styles.fuell, { width: `${Math.round((v / max) * 100)}%`, backgroundColor: c.coral }]} /></View>
              </View>
            ))}
          </View>
        ) : null}
      </Card>
      <View style={styles.hinweis}>
        <Ionicons name="information-circle-outline" size={16} color={c.textMuted} />
        <Text style={styles.hinweisText}>Bezahlte Strafen landen automatisch als Einnahme in der Kasse.</Text>
      </View>

      <ScrollView ref={chipLeiste} horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={styles.filter}>
        <Chip label="Alle" selected={!filter} onPress={() => onFilter(null)} />
        {kasse.members.map((m) => (
          <View key={m.id} onLayout={(e) => { chipX.current.set(m.id, e.nativeEvent.layout.x); if (m.id === filter) setChipsBereit((n) => n + 1); }}>
            <Chip
              label={displayName(m)}
              selected={filter === m.id}
              onPress={() => onFilter(filter === m.id ? null : m.id)}
              leading={<Avatar name={displayName(m)} color={m.avatarColor} photoUri={m.photoUri} size={22} />}
            />
          </View>
        ))}
      </ScrollView>

      <View style={styles.abschnitt}>
        <Text style={styles.label}>Offene Strafen</Text>
        <Text style={styles.meta}>{`${offen.length} offen`}</Text>
      </View>
      {offen.length === 0 ? (
        <Card><Text style={styles.leer}>{filter ? `${name(filter)} hat nichts offen.` : "Nichts offen. Sauber!"}</Text></Card>
      ) : (
        <Card enterIndex={1} style={{ paddingVertical: 4 }}>
          {gruppenListe.map(([terminId, liste], gi) => (
            <Animated.View key={terminId || "ohne"} entering={FadeIn.duration(200)}>
              <View style={[styles.gruppenKopf, gi > 0 && styles.trenner]}>
                <Text style={styles.gruppenTitel} numberOfLines={1}>{gruppenTitel(terminId).toUpperCase()}</Text>
                <Text style={[styles.gruppenSumme, { color: c.coralText }]}>{`${euro(liste.reduce((s, l) => s + l.betrag, 0))} offen`}</Text>
              </View>
              {liste.map((l) => zeile(l, 1))}
            </Animated.View>
          ))}
        </Card>
      )}

      {beglichen.length > 0 ? (
        <Card style={{ paddingVertical: 0 }}>
          <PressableScale onPress={() => setBeglicheneOffen((v) => !v)} style={styles.aufklapp} accessibilityState={{ expanded: beglicheneOffen }} accessibilityLabel={`Bezahlt, ${beglichen.length}`}>
            <Text style={styles.aufklappText}>Bezahlt <Text style={{ color: c.textMuted }}>{`· ${beglichen.length}`}</Text></Text>
            <Ionicons name={beglicheneOffen ? "chevron-up" : "chevron-down"} size={18} color={c.textDark} />
          </PressableScale>
          {beglicheneOffen ? beglichen.slice(0, 50).map((l, i) => zeile(l, i + 1)) : null}
        </Card>
      ) : null}
    </>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    oben: { flexDirection: "row", gap: 16, alignItems: "center" },
    label: { ...TYPE.label, color: c.textMuted },
    summe: { ...TYPE.num, fontSize: 34, lineHeight: 40, letterSpacing: -1 },
    meta: { ...TYPE.caption, fontSize: 13, color: c.textMuted },
    topZeile: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
    topName: { fontFamily: FONT.w700, fontSize: 14, color: c.textDark, flexShrink: 1 },
    topWert: { fontFamily: FONT.w700, fontSize: 14, color: c.textDark },
    spur: { height: 8, borderRadius: 4, backgroundColor: c.coralSoft, overflow: "hidden" },
    fuell: { height: "100%", borderRadius: 4 },
    hinweis: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 6, marginTop: -4 },
    hinweisText: { ...TYPE.caption, fontSize: 13, color: c.textMuted, flex: 1 },
    filter: { gap: 8, paddingHorizontal: 16 },
    abschnitt: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 4, marginTop: 4 },
    leer: { ...TYPE.body, fontSize: 14, color: c.textMuted },
    gruppenKopf: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8, paddingTop: 14, paddingBottom: 6 },
    gruppenTitel: { ...TYPE.label, color: c.textMuted, flexShrink: 1 },
    gruppenSumme: { fontFamily: FONT.w700, fontSize: 13 },
    zeile: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 56, paddingVertical: 6 },
    zeileInfo: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12, minHeight: 44 },
    trenner: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
    name: { fontFamily: FONT.w600, fontSize: 15, color: c.textDark },
    subZeile: { flexDirection: "row", alignItems: "center", gap: 6 },
    sub: { ...TYPE.caption, fontSize: 13, color: c.textMuted, flexShrink: 1 },
    pill: { paddingHorizontal: 8, height: 20, borderRadius: 10, justifyContent: "center" },
    pillText: { fontFamily: FONT.w700, fontSize: 12 },
    betrag: { ...TYPE.num, fontSize: 17 },
    bezahlt: { color: c.textMuted, textDecorationLine: "line-through" },
    kreis: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: c.borderDark, alignItems: "center", justifyContent: "center" },
    aufklapp: { minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    aufklappText: { fontFamily: FONT.w600, fontSize: 15, color: c.textDark },
  });
