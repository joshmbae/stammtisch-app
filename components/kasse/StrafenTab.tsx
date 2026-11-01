import React, { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";
import { StrafLog } from "../../types";
import { FONT, MAX_FONT_SCALE, RADIUS, TYPE, ThemeColors } from "../../constants/design";
import { useColors, useThemedStyles } from "../../contexts/ThemeContext";
import { Kasse } from "../../utils/useKasse";
import { formatWochentagDatum } from "../../utils/date";
import { displayName, formatBetrag } from "../../utils/format";
import { terminBezeichnung } from "../../utils/activityFeed";
import { useSingleFlight } from "../../utils/useSingleFlight";
import { Button, Card, Chip, KategorieIcon, PersonChip, PressableScale, haptik } from "../ui";
import { begleichenDialog, zahlungsAnbieter } from "../../utils/zahlungslink";
import { showAlert } from "../../utils/alert";


/**
 * Alle Strafen der Runde: offene Summe mit den größten Schuldnern, Filter
 * nach Person, offene Strafen nach Termin gruppiert. Der Kreis rechts hakt
 * ab (= Einnahme in der Kasse); Antippen der Zeile öffnet Details.
 * Persönlich: Hinweis auf die eigenen offenen Strafen und „Du" als erster
 * Personen-Filter; mit Filter zeigt die Karte oben die Summe dieser Person.
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
  const [zahltGerade, setZahltGerade] = useState(false);
  // Gewählte Person sichtbar halten, z. B. nach einem Link aus dem Profil.
  const chipLeiste = useRef<ScrollView>(null);
  const chipX = useRef(new Map<string, number>());
  const [chipsBereit, setChipsBereit] = useState(0);
  useEffect(() => {
    const x = filter ? chipX.current.get(filter) : 0;
    if (x !== undefined) chipLeiste.current?.scrollTo({ x: Math.max(0, x - 60), animated: true });
  }, [filter, chipsBereit]);
  const name = (id: string) => { const m = kasse.members.find((x) => x.id === id); return m ? displayName(m) : "?"; };

  const ich = kasse.activeMemberId;
  const alleOffen = kasse.strafen.filter((l) => !l.beglichen);
  const meineOffen = ich ? alleOffen.filter((l) => l.memberId === ich) : [];
  const meineSumme = meineOffen.reduce((s, l) => s + l.betrag, 0);
  // „Du" zuerst, dann die anderen in gewohnter Reihenfolge.
  const chipLeute = [...kasse.members.filter((m) => m.id === ich), ...kasse.members.filter((m) => m.id !== ich)];
  const proPerson = new Map<string, number>();
  for (const l of alleOffen) proPerson.set(l.memberId, (proPerson.get(l.memberId) ?? 0) + l.betrag);
  const top = [...proPerson.entries()].sort((a, b) => b[1] - a[1]);
  const max = top[0]?.[1] ?? 1;
  const summe = alleOffen.reduce((s, l) => s + l.betrag, 0);

  const gefiltert = kasse.strafen.filter((l) => !filter || l.memberId === filter);
  const offen = gefiltert.filter((l) => !l.beglichen);
  const offenSumme = offen.reduce((s, l) => s + l.betrag, 0);
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

  function allesZahlen() {
    begleichenDialog({
      link: kasse.zahlungsLink,
      betragText: formatBetrag(meineSumme),
      beschreibung: `${meineOffen.length} ${meineOffen.length === 1 ? "Strafe wird" : "Strafen werden"}`,
      onBeglichen: async () => {
        setZahltGerade(true);
        try {
          await kasse.meineStrafenBegleichen();
          haptik("erfolg");
        } catch {
          showAlert("Fehler", "Nicht alles konnte gespeichert werden. Bitte die Liste prüfen.");
        } finally {
          setZahltGerade(false);
        }
      },
    });
  }

  async function abhaken(l: StrafLog) {
    haptik(l.beglichen ? "leicht" : "erfolg");
    await kasse.strafeUmschalten(l.id);
  }

  const zeile = (l: StrafLog, i: number) => {
    const kat = kasse.strafKategorien.find((k) => k.id === l.kategorie);
    const was = kat?.systemKey === "sonstiges" && l.notiz ? l.notiz : kat?.label ?? "Strafe";
    const zusatz = kat?.systemKey === "sonstiges" ? null : l.notiz;
    const unter = (filter ? [zusatz] : [was, zusatz]).filter(Boolean).join(" · ");
    return (
      <View key={l.id} style={[styles.zeile, i > 0 && styles.trenner]}>
        <PressableScale onPress={() => onStrafe(l)} style={styles.zeileInfo} accessibilityLabel={`${name(l.memberId)}: ${was}, ${formatBetrag(l.betrag)}${l.beglichen ? ", bezahlt" : ", offen"}. Details`}>
          <KategorieIcon kat={kat} size={36} />
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            {/* Gefiltert ist die Person klar – dann steht die Strafe vorne statt des Namens. */}
            <Text style={styles.name} numberOfLines={1}>{filter ? was : name(l.memberId)}</Text>
            {/* Kein „offen“-Badge: Abschnitt, Betrag in Koralle und leerer Kreis sagen das schon. */}
            {unter ? <Text style={styles.sub} numberOfLines={1}>{unter}</Text> : null}
          </View>
          <Text style={[styles.betrag, l.beglichen ? styles.bezahlt : { color: c.coralText }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{formatBetrag(l.betrag)}</Text>
        </PressableScale>
        <PressableScale
          onPress={() => guard(() => abhaken(l))}
          scaleTo={0.9}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: l.beglichen }}
          accessibilityLabel={`${name(l.memberId)}: ${was}, ${formatBetrag(l.betrag)}${l.beglichen ? ", bezahlt. Tippen, um wieder offen zu setzen" : ", als bezahlt markieren"}`}
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
      {!filter && meineOffen.length > 0 ? (
        <PressableScale onPress={() => onFilter(ich!)} style={[styles.meins, { backgroundColor: c.coralSoft }]} accessibilityRole="button" accessibilityLabel={`Deine offenen Strafen: ${formatBetrag(meineSumme)}, ${meineOffen.length}. Anzeigen`}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.meinsTitel, { color: c.coralText }]}>{`Du hast ${formatBetrag(meineSumme)} offen`}</Text>
            <Text style={styles.meta}>{`${meineOffen.length} ${meineOffen.length === 1 ? "Strafe" : "Strafen"} – hier abhaken, wenn bezahlt`}</Text>
          </View>
          <Text style={[styles.meinsLink, { color: c.coralText }]}>Anzeigen</Text>
          <Ionicons name="chevron-forward" size={14} color={c.coralText} />
        </PressableScale>
      ) : null}

      {filter ? (
        <Card enterIndex={0} style={styles.oben}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: offenSumme > 0 ? c.coralText : c.successText }]}>
              {filter === ich ? (offenSumme > 0 ? "Du hast offen" : "Du hast alles bezahlt") : offenSumme > 0 ? `${name(filter)} hat offen` : `${name(filter)} hat alles bezahlt`}
            </Text>
            <Text style={[styles.summe, { color: offenSumme > 0 ? c.coralText : c.successText }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{formatBetrag(offenSumme)}</Text>
            <Text style={styles.meta}>{`${offen.length} ${offen.length === 1 ? "Strafe" : "Strafen"} offen`}</Text>
          </View>
          {filter === ich && offenSumme > 0 ? (
            <Button
              label={kasse.zahlungsLink ? `Mit ${zahlungsAnbieter(kasse.zahlungsLink)} zahlen` : "Alles begleichen"}
              size="sm"
              variant="danger"
              loading={zahltGerade}
              onPress={allesZahlen}
            />
          ) : null}
        </Card>
      ) : (
      <Card enterIndex={0} style={styles.oben}>
        <View style={{ flex: 1, minWidth: 110 }}>
          <Text style={[styles.label, { color: summe > 0 ? c.coralText : c.successText }]}>{summe > 0 ? "Offen gesamt" : "Alles bezahlt"}</Text>
          <Text style={[styles.summe, { color: summe > 0 ? c.coralText : c.successText }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{formatBetrag(summe)}</Text>
          <Text style={styles.meta}>{`${top.length} ${top.length === 1 ? "Person" : "Personen"}`}</Text>
        </View>
        {top.length > 0 ? (
          <View style={{ flex: 1.3, gap: 10 }}>
            {top.slice(0, 3).map(([id, v]) => (
              // Tippen filtert die Liste auf diese Person, wie der Chip darunter.
              <PressableScale key={id} onPress={() => onFilter(filter === id ? null : id)} scaleTo={0.98} style={{ gap: 4 }} accessibilityLabel={`${name(id)}: ${formatBetrag(v)} offen. Nur diese Strafen zeigen`}>
                <View style={styles.topZeile}>
                  <Text style={styles.topName} numberOfLines={1}>{name(id)}</Text>
                  <Text style={styles.topWert}>{formatBetrag(v)}</Text>
                </View>
                <View style={styles.spur}><View style={[styles.fuell, { width: `${Math.round((v / max) * 100)}%`, backgroundColor: c.coral }]} /></View>
              </PressableScale>
            ))}
          </View>
        ) : null}
      </Card>
      )}
      <View style={styles.hinweis}>
        <Ionicons name="information-circle-outline" size={16} color={c.textMuted} />
        <Text style={styles.hinweisText}>Bezahlte Strafen landen automatisch als Einnahme in der Kasse.</Text>
      </View>

      <ScrollView ref={chipLeiste} horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={styles.filter}>
        <Chip label="Alle" selected={!filter} onPress={() => onFilter(null)} />
        {chipLeute.map((m) => (
          <View key={m.id} onLayout={(e) => { chipX.current.set(m.id, e.nativeEvent.layout.x); if (m.id === filter) setChipsBereit((n) => n + 1); }}>
            <PersonChip member={m} ich={ich} selected={filter === m.id} onPress={() => onFilter(filter === m.id ? null : m.id)} />
          </View>
        ))}
      </ScrollView>

      <View style={styles.abschnitt}>
        <Text style={styles.label}>Offene Strafen</Text>
        <Text style={styles.meta}>{`${offen.length} offen`}</Text>
      </View>
      {offen.length === 0 ? (
        <Card><Text style={styles.leer}>{filter === ich ? "Du hast nichts offen." : filter ? `${name(filter)} hat nichts offen.` : "Nichts offen. Sauber!"}</Text></Card>
      ) : (
        <Card enterIndex={1} style={{ paddingVertical: 4 }}>
          {gruppenListe.map(([terminId, liste], gi) => (
            <Animated.View key={terminId || "ohne"} entering={FadeIn.duration(200)}>
              {/* Kopf öffnet den Abend – außer bei „Ohne Termin“ oder wenn der Termin gelöscht ist. */}
              {terminId && kasse.termine.some((t) => t.id === terminId) ? (
                <PressableScale
                  onPress={() => router.push(`/termin/${terminId}`)}
                  scaleTo={0.99}
                  style={[styles.gruppenKopf, gi > 0 && styles.trenner]}
                  accessibilityRole="link"
                  accessibilityLabel={`${gruppenTitel(terminId)}, ${formatBetrag(liste.reduce((s, l) => s + l.betrag, 0))} offen. Termin öffnen`}
                >
                  <Text style={styles.gruppenTitel} numberOfLines={1}>{gruppenTitel(terminId).toUpperCase()}</Text>
                  <Ionicons name="chevron-forward" size={12} color={c.textMuted} />
                  <View style={{ flex: 1 }} />
                  <Text style={[styles.gruppenSumme, { color: c.coralText }]}>{`${formatBetrag(liste.reduce((s, l) => s + l.betrag, 0))} offen`}</Text>
                </PressableScale>
              ) : (
                <View style={[styles.gruppenKopf, gi > 0 && styles.trenner]}>
                  <Text style={styles.gruppenTitel} numberOfLines={1}>{gruppenTitel(terminId).toUpperCase()}</Text>
                  <View style={{ flex: 1 }} />
                  <Text style={[styles.gruppenSumme, { color: c.coralText }]}>{`${formatBetrag(liste.reduce((s, l) => s + l.betrag, 0))} offen`}</Text>
                </View>
              )}
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
    meins: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: RADIUS.md, paddingVertical: 10, paddingLeft: 14, paddingRight: 12 },
    meinsTitel: { fontFamily: FONT.w600, fontSize: 15 },
    meinsLink: { fontFamily: FONT.w600, fontSize: 14 },
    hinweis: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 6, marginTop: -4 },
    hinweisText: { ...TYPE.caption, fontSize: 13, color: c.textMuted, flex: 1 },
    filter: { gap: 8, paddingHorizontal: 16 },
    abschnitt: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 4, marginTop: 4 },
    leer: { ...TYPE.body, fontSize: 14, color: c.textMuted },
    gruppenKopf: { flexDirection: "row", alignItems: "center", gap: 4, paddingTop: 14, paddingBottom: 6 },
    gruppenTitel: { ...TYPE.label, color: c.textMuted, flexShrink: 1 },
    gruppenSumme: { fontFamily: FONT.w700, fontSize: 13 },
    zeile: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 56, paddingVertical: 6 },
    zeileInfo: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12, minHeight: 44 },
    trenner: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
    name: { fontFamily: FONT.w600, fontSize: 15, color: c.textDark },
    sub: { ...TYPE.caption, fontSize: 13, color: c.textMuted, flexShrink: 1 },
    betrag: { ...TYPE.num, fontSize: 17 },
    bezahlt: { color: c.textMuted, textDecorationLine: "line-through" },
    kreis: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: c.control, alignItems: "center", justifyContent: "center" },
    aufklapp: { minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    aufklappText: { fontFamily: FONT.w600, fontSize: 15, color: c.textDark },
  });
