import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import { KassenEintrag } from "../../types";
import { FONT, MAX_FONT_SCALE, RADIUS, TYPE, ThemeColors, glow } from "../../constants/design";
import { useColors, useThemedStyles } from "../../contexts/ThemeContext";
import { Kasse } from "../../utils/useKasse";
import { monatsSalden, rechnungBeglichen, rechnungOffen, saldo, schuldnerVon } from "../../utils/kasse";
import { formatWochentagDatum, tagesSchluessel } from "../../utils/date";
import { displayName, formatEuro } from "../../utils/format";
import { Card, Emoji, IconSquircle, PressableScale, SectionLabel } from "../ui";
import { SYMBOL } from "../../constants/symbole";

const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const euro = (n: number) => `${formatEuro(n).replace(",00", "")} €`;
const vorzeichen = (n: number) => `${n >= 0 ? "+" : "−"}${euro(Math.abs(n))}`;

/** Kassenstand mit Monatsverlauf, offene Posten und Verlauf nach Tagen. */
export function UebersichtTab({ kasse, onStrafen, onRechnungen, onEintrag }: {
  kasse: Kasse;
  onStrafen: () => void;
  onRechnungen: () => void;
  onEintrag: (e: KassenEintrag) => void;
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const dunkel = c.heroStyle === "outline";
  const jetzt = new Date();
  const buchungen = useMemo(() => kasse.eintraege.filter((e) => e.typ !== "abendkosten"), [kasse.eintraege]);
  const monate = useMemo(() => monatsSalden(kasse.eintraege, 10, jetzt), [kasse.eintraege]);
  const [gewaehlt, setGewaehlt] = useState(monate.length - 1);
  const [alle, setAlle] = useState(false);
  const stand = saldo(kasse.eintraege);
  const m = monate[Math.min(gewaehlt, monate.length - 1)];
  const imMonat = buchungen.filter((e) => {
    const d = new Date(e.datum);
    return d.getFullYear() === m.monat.getFullYear() && d.getMonth() === m.monat.getMonth();
  });
  const ein = imMonat.filter((e) => e.typ === "einnahme").reduce((s, e) => s + e.betrag, 0);
  const aus = imMonat.filter((e) => e.typ === "ausgabe").reduce((s, e) => s + e.betrag, 0);
  const max = Math.max(1, ...monate.map((x) => Math.abs(x.stand)));
  const letzte = buchungen[0];

  const offeneStrafen = kasse.strafen.filter((l) => !l.beglichen);
  const strafPersonen = [...new Set(offeneStrafen.map((l) => l.memberId))].map((id) => kasse.members.find((x) => x.id === id)).filter(Boolean);
  const offeneRechnungen = kasse.eintraege.filter((e) => e.typ === "abendkosten" && !rechnungBeglichen(e));

  // Verlauf nach Tagen, neueste zuerst.
  const tage = useMemo(() => {
    const map = new Map<string, KassenEintrag[]>();
    for (const e of buchungen) {
      const k = tagesSchluessel(e.datum);
      map.set(k, [...(map.get(k) ?? []), e]);
    }
    return [...map.entries()];
  }, [buchungen]);
  const sichtbar = alle ? tage : tage.slice(0, 4);
  const name = (id?: string) => { const x = kasse.members.find((mm) => mm.id === id); return x ? displayName(x) : undefined; };

  return (
    <>
      <Card enterIndex={0} style={[styles.stand, dunkel ? { backgroundColor: c.card, borderColor: c.mustardEdge, borderWidth: 1, ...glow(c.mustard, c, 18) } : { backgroundColor: c.mustardTile, borderColor: c.mustardTile }]}>
        <View style={styles.zeile}>
          <Text style={[styles.label, { color: dunkel ? c.mustard : c.onMustard }]}>Kassenstand</Text>
          {letzte ? (
            <View style={[styles.standChip, { backgroundColor: dunkel ? c.cardAlt : "rgba(28,27,25,0.08)" }]}>
              <Text style={[styles.standChipText, { color: dunkel ? c.textMid : c.onMustard }]}>{`Stand ${formatWochentagDatum(new Date(letzte.datum))}`}</Text>
            </View>
          ) : null}
        </View>
        <Text style={[styles.betrag, { color: stand < 0 ? c.coralText : dunkel ? c.textDark : c.onMustard }]} maxFontSizeMultiplier={MAX_FONT_SCALE} accessibilityLabel={`Kassenstand ${formatEuro(stand)} Euro`}>
          {formatEuro(stand).replace(",00", "")}
          <Text style={styles.euro}> €</Text>
        </Text>

        <View style={styles.balken} accessibilityRole="tablist" accessibilityLabel="Stand pro Monat">
          {monate.map((x, i) => {
            const sel = i === gewaehlt;
            const h = Math.max(6, Math.round((Math.abs(x.stand) / max) * 56));
            return (
              <PressableScale
                key={i}
                onPress={() => setGewaehlt(i)}
                accessibilityRole="tab"
                accessibilityState={{ selected: sel }}
                accessibilityLabel={`${MONATE[x.monat.getMonth()]}: Stand ${formatEuro(x.stand)} Euro`}
                style={styles.saeuleFlaeche}
              >
                <View style={[styles.saeule, { height: h, backgroundColor: sel ? c.blue : dunkel ? "rgba(255,201,60,0.22)" : "rgba(28,27,25,0.14)" }, sel && dunkel && glow(c.blue, c, 10)]} />
                <Text style={[styles.monat, { color: dunkel ? c.textMuted : c.onMustard }, sel && { fontFamily: FONT.w800 }]}>{MONATE[x.monat.getMonth()][0]}</Text>
              </PressableScale>
            );
          })}
        </View>
        <Text style={[styles.monatText, { color: dunkel ? c.textDark : c.onMustard }]}>{`${MONATE[m.monat.getMonth()]} · Stand ${euro(m.stand)}`}</Text>
        <View style={styles.zeile}>
          <View style={[styles.kachel, { backgroundColor: dunkel ? c.cardAlt : c.card }]}>
            <View style={styles.kachelKopf}>
              <Emoji size={14}>{SYMBOL.einnahme}</Emoji>
              <Text style={styles.kachelLabel}>Einnahmen</Text>
            </View>
            <Text style={[styles.kachelWert, { color: c.successText }]} maxFontSizeMultiplier={MAX_FONT_SCALE} numberOfLines={1} adjustsFontSizeToFit>{`+${euro(ein)}`}</Text>
          </View>
          <View style={[styles.kachel, { backgroundColor: dunkel ? c.cardAlt : c.card }]}>
            <View style={styles.kachelKopf}>
              <Emoji size={14}>{SYMBOL.ausgabe}</Emoji>
              <Text style={styles.kachelLabel}>Ausgaben</Text>
            </View>
            <Text style={[styles.kachelWert, { color: c.coralText }]} maxFontSizeMultiplier={MAX_FONT_SCALE} numberOfLines={1} adjustsFontSizeToFit>{`−${euro(aus)}`}</Text>
          </View>
        </View>
      </Card>

      {offeneStrafen.length > 0 || offeneRechnungen.length > 0 ? (
        <Card enterIndex={1} style={{ gap: 2 }}>
          <Text style={[styles.label, { color: c.textMuted, marginBottom: 6 }]}>Offene Posten</Text>
          {offeneStrafen.length > 0 ? (
            <PressableScale onPress={onStrafen} style={styles.posten} accessibilityLabel={`Strafen: ${euro(offeneStrafen.reduce((s, l) => s + l.betrag, 0))} offen`}>
              <IconSquircle emoji={SYMBOL.strafe} ton="coral" size={36} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.postenTitel}>Strafen</Text>
                <Text style={styles.postenSub} numberOfLines={2}>{`bei ${strafPersonen.length} ${strafPersonen.length === 1 ? "Person" : "Personen"} · ${strafPersonen.map((p) => displayName(p!)).join(", ")}`}</Text>
              </View>
              <Text style={[styles.postenBetrag, { color: c.coralText }]}>{euro(offeneStrafen.reduce((s, l) => s + l.betrag, 0))}</Text>
              <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
            </PressableScale>
          ) : null}
          {offeneRechnungen.map((e) => {
            const schuldner = schuldnerVon(e);
            const offen = schuldner.filter((id) => !(e.beglichenIds ?? []).includes(id)).length;
            const termin = kasse.termine.find((t) => t.id === e.terminId);
            const wann = formatWochentagDatum(new Date(termin ? `${termin.datum}T00:00:00` : e.datum));
            return (
              <PressableScale key={e.id} onPress={onRechnungen} style={[styles.posten, styles.trenner]} accessibilityLabel={`Rechnung ${wann}: ${euro(rechnungOffen(e))} offen`}>
                <IconSquircle emoji={SYMBOL.rechnung} ton="blue" size={36} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.postenTitel}>{`Rechnung ${wann}`}</Text>
                  <Text style={styles.postenSub} numberOfLines={1}>
                    {[schuldner.length ? `${offen} von ${schuldner.length} noch offen` : "offen", name(e.bezahltVon) ? `an ${name(e.bezahltVon)}` : null].filter(Boolean).join(" · ")}
                  </Text>
                </View>
                <Text style={[styles.postenBetrag, { color: c.coralText }]}>{euro(rechnungOffen(e))}</Text>
                <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
              </PressableScale>
            );
          })}
        </Card>
      ) : null}

      <View style={{ paddingHorizontal: 4, marginTop: 4 }}>
        <SectionLabel action={tage.length > 4 ? { label: alle ? "Weniger" : "Alle", onPress: () => setAlle((v) => !v) } : undefined}>Verlauf</SectionLabel>
      </View>
      {tage.length === 0 ? (
        <Card><Text style={styles.leer}>Noch keine Buchungen. Mit + oben die erste eintragen.</Text></Card>
      ) : (
        <Card enterIndex={2} style={{ paddingVertical: 6 }}>
          {sichtbar.map(([tag, liste], ti) => {
            const plus = liste.filter((e) => e.typ === "einnahme").reduce((s, e) => s + e.betrag, 0);
            const minus = liste.filter((e) => e.typ === "ausgabe").reduce((s, e) => s + e.betrag, 0);
            return (
              <Animated.View key={tag} entering={FadeIn.duration(200)}>
                <View style={[styles.tagKopf, ti > 0 && styles.trenner]}>
                  <Text style={styles.tagText}>{formatWochentagDatum(new Date(`${tag}T00:00:00`)).toUpperCase()}</Text>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {plus > 0 ? <Text style={[styles.tagSumme, { color: c.successText }]}>{`+${euro(plus)}`}</Text> : null}
                    {minus > 0 ? <Text style={[styles.tagSumme, { color: c.coralText }]}>{`−${euro(minus)}`}</Text> : null}
                  </View>
                </View>
                {liste.map((e) => {
                  const rein = e.typ === "einnahme";
                  const wer = name(kasse.actorByRefId.get(e.id));
                  const termin = kasse.termine.find((t) => t.id === e.terminId);
                  return (
                    <PressableScale key={e.id} onPress={() => onEintrag(e)} style={[styles.buchung, styles.trenner]} accessibilityLabel={`${e.beschreibung || (rein ? "Einnahme" : "Ausgabe")}: ${vorzeichen(rein ? e.betrag : -e.betrag)}`}>
                      <View style={[styles.rund, { backgroundColor: rein ? c.greenSoft : c.coralSoft }]}>
                        <Emoji size={18}>{rein ? SYMBOL.einnahme : SYMBOL.ausgabe}</Emoji>
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.buchungTitel} numberOfLines={1}>{e.beschreibung?.trim() || (rein ? "Einnahme" : "Ausgabe")}</Text>
                        <Text style={styles.buchungSub} numberOfLines={1}>
                          {[rein ? "Einnahme" : "Ausgabe", termin ? `Termin ${formatWochentagDatum(new Date(`${termin.datum}T00:00:00`))}` : null, wer ? `von ${wer}` : null].filter(Boolean).join(" · ")}
                        </Text>
                      </View>
                      <Text style={[styles.buchungBetrag, { color: rein ? c.successText : c.coralText }]}>{vorzeichen(rein ? e.betrag : -e.betrag)}</Text>
                    </PressableScale>
                  );
                })}
              </Animated.View>
            );
          })}
        </Card>
      )}
    </>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    stand: { borderRadius: RADIUS.hero, padding: 16, gap: 12 },
    zeile: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
    label: { ...TYPE.label },
    standChip: { paddingHorizontal: 10, height: 28, borderRadius: RADIUS.pill, justifyContent: "center" },
    standChipText: { fontFamily: FONT.w600, fontSize: 12 },
    betrag: { ...TYPE.num, fontSize: 44, lineHeight: 50, letterSpacing: -1.2 },
    euro: { fontSize: 24, letterSpacing: 0 },
    balken: { flexDirection: "row", alignItems: "flex-end", height: 64, marginHorizontal: -2 },
    saeuleFlaeche: { flex: 1, height: 64, justifyContent: "flex-end", alignItems: "center", paddingHorizontal: 2, gap: 4 },
    saeule: { alignSelf: "stretch", borderRadius: 6 },
    monat: { fontFamily: FONT.w600, fontSize: 12 },
    monatText: { fontFamily: FONT.w700, fontSize: 15, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.heroStyle === "outline" ? c.hairline : "rgba(28,27,25,0.15)", paddingTop: 10 },
    kachel: { flex: 1, borderRadius: RADIUS.tile, padding: 12, gap: 4 },
    kachelKopf: { flexDirection: "row", alignItems: "center", gap: 6 },
    kachelLabel: { ...TYPE.label, color: c.textMuted },
    kachelWert: { ...TYPE.num, fontSize: 22 },

    posten: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56, paddingVertical: 8 },
    trenner: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
    postenTitel: { fontFamily: FONT.w600, fontSize: 15, color: c.textDark },
    postenSub: { ...TYPE.caption, fontSize: 13, color: c.textMuted },
    postenBetrag: { ...TYPE.num, fontSize: 18 },

    leer: { ...TYPE.body, fontSize: 14, color: c.textMuted },
    tagKopf: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 12, paddingBottom: 6 },
    tagText: { ...TYPE.label, color: c.textMuted },
    tagSumme: { fontFamily: FONT.w700, fontSize: 12 },
    buchung: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52, paddingVertical: 8 },
    rund: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
    buchungTitel: { fontFamily: FONT.w700, fontSize: 15, color: c.textDark },
    buchungSub: { ...TYPE.caption, fontSize: 13, color: c.textMuted },
    buchungBetrag: { ...TYPE.num, fontSize: 16 },
  });
