import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { MemberProfile } from "../../types";
import { FONT, MAX_FONT_SCALE, RADIUS, TYPE, ThemeColors } from "../../constants/design";
import { useColors, useThemedStyles } from "../../contexts/ThemeContext";
import { ALLZEIT, Jahrestitel } from "../../utils/stats";
import { displayName } from "../../utils/format";
import { formatWochentagDatum } from "../../utils/date";
import { Avatar, BildVollbild, Card, Emoji, IconSquircle, Krone, PressableScale, SectionLabel, tonFuerRangliste } from "../ui";
import { SYMBOL } from "../../constants/symbole";


/** Kopf: Bild, Name, Rollen und die festen Angaben zur Person. */
export function ProfilHero({ member }: { member: MemberProfile }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const [gross, setGross] = useState(false);
  const angaben = [
    member.spitzname ? { label: "Spitzname", wert: member.spitzname } : null,
    { label: "Mitglied seit", wert: new Date(member.mitgliedSeit).toLocaleDateString("de-DE", { month: "short", year: "numeric" }) },
    member.geburtsdatum ? { label: "Geburtstag", wert: new Date(`${member.geburtsdatum}T00:00:00`).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }) } : null,
    member.lieblingsgetraenk ? { label: "Lieblingsgetränk", wert: member.lieblingsgetraenk } : null,
    member.beruf ? { label: "Beruf", wert: member.beruf } : null,
  ].filter(Boolean) as { label: string; wert: string }[];

  return (
    <Card enterIndex={0} style={[styles.hero, { backgroundColor: c.heroBlue, borderColor: c.heroBlueEdge, borderWidth: 1 }]}>
      <View style={styles.heroKopf}>
        {/* Mit Profilbild: Antippen zeigt es groß. Ohne Foto ein schlichter Rahmen (kein deaktivierter Knopf, der wäre blass). */}
        {member.photoUri ? (
          <PressableScale
            onPress={() => setGross(true)}
            scaleTo={0.96}
            style={[styles.heroRing, { borderColor: c.mustard }]}
            accessibilityRole="imagebutton"
            accessibilityLabel={`Profilbild von ${displayName(member)} groß ansehen`}
          >
            <Avatar name={displayName(member)} color={member.avatarColor} photoUri={member.photoUri} size={72} />
          </PressableScale>
        ) : (
          <View style={[styles.heroRing, { borderColor: c.mustard }]}>
            <Avatar name={displayName(member)} color={member.avatarColor} size={72} />
          </View>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.heroName, { color: c.onHeroBlue }]} numberOfLines={2} maxFontSizeMultiplier={MAX_FONT_SCALE} accessibilityRole="header">{member.name}</Text>
          <Text style={[styles.heroRolle, { color: c.heroBlueSub }]} numberOfLines={2}>{[member.istAdmin ? "Admin" : null, ...member.rollen].filter(Boolean).join(", ")}</Text>
        </View>
      </View>
      <View style={[styles.heroTrenner, { backgroundColor: "rgba(255,255,255,0.18)" }]} />
      <View style={styles.angaben}>
        {angaben.map((a) => (
          <View key={a.label} style={styles.angabe}>
            <Text style={[styles.angabeWert, { color: c.onHeroBlue }]} numberOfLines={1}>{a.wert}</Text>
            <Text style={[styles.angabeLabel, { color: "rgba(255,255,255,0.75)" }]}>{a.label}</Text>
          </View>
        ))}
      </View>
      {member.notizen ? <Text style={[styles.notiz, { color: c.onHeroBlue }]}>{member.notizen}</Text> : null}
      {member.photoUri ? <BildVollbild uri={member.photoUri} titel={displayName(member)} visible={gross} onClose={() => setGross(false)} /> : null}
    </Card>
  );
}

/** Jahrestitel aus abgeschlossenen Jahren. */
export function TitelKarte({ titel }: { titel: Jahrestitel[] }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  if (titel.length === 0) return null;
  return (
    <Card enterIndex={2} style={{ gap: 12 }}>
      <View style={styles.kopf}>
        <Text style={styles.kartenTitel} accessibilityRole="header">Titel</Text>
        <Text style={styles.meta}>{titel.length === 1 ? "1 Pokal" : `${titel.length} Pokale`}</Text>
      </View>
      <View style={styles.titelRaster}>
        {titel.map((t, i) => (
          <View key={`${t.jahr}-${t.ranglisteKey}`} style={styles.titelZelle}>
            {/* Öffnet die Tabelle in genau dieser Saison. */}
            <PressableScale onPress={() => router.push(`/ranglisten?jahr=${t.jahr}`)} scaleTo={0.97} style={[styles.titelKachel, { backgroundColor: c.cardAlt }]} accessibilityRole="link" accessibilityLabel={`${t.titel} ${t.jahr}. Tabelle ${t.jahr} öffnen`}>
              <View style={[styles.pokal, { backgroundColor: i === 0 ? c.mustard : c.mustardSoft }]}>
                <Emoji size={18}>{SYMBOL.pokal}</Emoji>
              </View>
              <Text style={styles.titelJahr}>{t.jahr}</Text>
              <Text style={styles.titelName} numberOfLines={1}>{`${t.emoji} ${t.titel}`}</Text>
            </PressableScale>
          </View>
        ))}
      </View>
    </Card>
  );
}

export interface BilanzKachel {
  key: string;
  wert: string;
  label: string;
  platz?: number;
  emoji: string;
  farbe?: string;
  /** Wohin Antippen führt; ohne Angabe die Tabelle im gewählten Zeitraum. */
  ziel?: string;
  /** Deutlicher Hinweis unten in Koralle, z. B. „4 € offen“; die Kachel wird dann koralle getönt. */
  offen?: string;
}

/**
 * Bilanz als Kacheln, jede mit dem Platz in der Wertung. Oben rechts der
 * Zeitraum: laufende Saison oder Allzeit (`zeitraum` ist das Jahr oder ALLZEIT).
 */
export function BilanzKarte({ jahr, zeitraum, onZeitraum, kacheln }: {
  jahr: string;
  zeitraum: string;
  onZeitraum: (z: string) => void;
  kacheln: BilanzKachel[];
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  if (kacheln.length === 0) return null;
  const allzeit = zeitraum !== jahr;
  return (
    <Card enterIndex={3} style={{ gap: 12 }}>
      <View style={styles.zeile}>
        <Text style={[styles.label, { flex: 1 }]} accessibilityRole="header">{allzeit ? "Bilanz Allzeit" : `Bilanz ${jahr}`}</Text>
        <View style={[styles.zeitraum, { backgroundColor: c.cardAlt }]} accessibilityRole="tablist">
          {[{ key: jahr, label: jahr }, { key: ALLZEIT, label: "Allzeit" }].map((o) => {
            const aktiv = o.key === zeitraum;
            return (
              <PressableScale
                key={o.key}
                onPress={() => onZeitraum(o.key)}
                haptic="leicht"
                style={[styles.zeitraumOption, aktiv && { backgroundColor: c.card }]}
                accessibilityRole="tab"
                accessibilityState={{ selected: aktiv }}
              >
                <Text style={[styles.zeitraumText, { color: aktiv ? c.textDark : c.textMuted }]}>{o.label}</Text>
              </PressableScale>
            );
          })}
        </View>
      </View>
      <View style={styles.bilanzRaster}>
        {kacheln.map((k) => (
          <View key={k.key} style={styles.bilanzZelle}>
            <PressableScale onPress={() => router.push((k.ziel ?? `/ranglisten?jahr=${zeitraum}`) as never)} scaleTo={0.97} style={[styles.bilanzKachel, { backgroundColor: k.offen ? c.coralSoft : c.cardAlt }]} accessibilityRole="link" accessibilityLabel={`${k.label}: ${k.wert}${k.offen ? `, davon ${k.offen}` : ""}${k.platz ? `, Platz ${k.platz}` : ""}. ${k.ziel ? "Öffnen" : "Tabelle öffnen"}`}>
              <View style={styles.zeile}>
                <IconSquircle emoji={k.emoji} ton={tonFuerRangliste(k.key)} size={34} />
                <View style={{ flex: 1 }} />
                {k.platz ? (
                  <View style={[styles.platzPill, { backgroundColor: k.platz === 1 ? c.mustard : c.card }]}>
                    {k.platz === 1 ? <Krone size={12} color={c.onMustard} /> : null}
                    <Text style={[styles.platzText, { color: k.platz === 1 ? c.onMustard : c.textDark }]}>{`Platz ${k.platz}`}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.bilanzWert, { color: k.farbe ?? c.textDark }]} maxFontSizeMultiplier={MAX_FONT_SCALE} numberOfLines={1} adjustsFontSizeToFit>{k.wert}</Text>
              <Text style={styles.bilanzLabel} numberOfLines={1}>{k.label}</Text>
              {k.offen ? (
                <View style={[styles.offenPill, { backgroundColor: c.coral }]}>
                  <Text style={[styles.offenText, { color: c.onCoral }]} numberOfLines={1}>{k.offen}</Text>
                  <Ionicons name="chevron-forward" size={13} color={c.onCoral} />
                </View>
              ) : null}
            </PressableScale>
          </View>
        ))}
      </View>
    </Card>
  );
}

export interface AbendZeile {
  id: string;
  datum: string;
  titel: string;
  dabei: boolean;
  chips: string[];
}

/** Die letzten Abende: dabei oder nicht, plus was an dem Abend los war. */
export function AbendeKarte({ abende }: { abende: AbendZeile[] }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const [alle, setAlle] = useState(false);
  if (abende.length === 0) return null;
  const sichtbar = alle ? abende : abende.slice(0, 5);
  return (
    <Card enterIndex={5} style={{ gap: 4 }}>
      <SectionLabel action={abende.length > 5 ? { label: alle ? "Weniger" : "Alle", onPress: () => setAlle((v) => !v) } : undefined}>Letzte Abende</SectionLabel>
      {sichtbar.map((a, i) => (
        <PressableScale key={a.id} onPress={() => router.push(`/termin/${a.id}`)} style={[styles.abend, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border }]} accessibilityLabel={`${a.titel} ${formatWochentagDatum(new Date(`${a.datum}T00:00:00`))}: ${a.dabei ? "dabei" : "gefehlt"}${a.chips.length ? `, ${a.chips.join(", ")}` : ""}`}>
          <View style={[styles.abendPunkt, { backgroundColor: a.dabei ? c.success : c.borderDark }]} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.strafName} numberOfLines={1}>{a.titel}</Text>
            <Text style={styles.meta}>{formatWochentagDatum(new Date(`${a.datum}T00:00:00`), true)}</Text>
          </View>
          <View style={styles.chips}>
            {!a.dabei ? <Text style={[styles.chip, { color: c.textMuted, backgroundColor: c.cardAlt }]}>gefehlt</Text> : null}
            {a.chips.map((ch) => <Text key={ch} style={[styles.chip, { color: c.textDark, backgroundColor: c.cardAlt }]}>{ch}</Text>)}
          </View>
        </PressableScale>
      ))}
    </Card>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    hero: { borderRadius: RADIUS.hero, padding: 18, gap: 14 },
    heroKopf: { flexDirection: "row", alignItems: "center", gap: 16 },
    heroRing: { borderWidth: 3, borderRadius: 42, padding: 3 },
    heroName: { ...TYPE.title, fontSize: 24 },
    heroRolle: { fontFamily: FONT.w600, fontSize: 14, marginTop: 2 },
    heroTrenner: { height: StyleSheet.hairlineWidth },
    angaben: { flexDirection: "row", flexWrap: "wrap", rowGap: 12 },
    angabe: { width: "50%", paddingRight: 8 },
    angabeWert: { fontFamily: FONT.w700, fontSize: 16 },
    angabeLabel: { ...TYPE.caption, fontSize: 12 },
    notiz: { ...TYPE.body, fontSize: 14, opacity: 0.9 },

    zeile: { flexDirection: "row", alignItems: "center", gap: 10 },
    label: { ...TYPE.label, color: c.textMuted },

    kopf: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    kartenTitel: { ...TYPE.heading, color: c.textDark },
    meta: { ...TYPE.caption, fontSize: 13, color: c.textMuted },
    titelRaster: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 },
    titelZelle: { width: "33.333%", padding: 4 },
    titelKachel: { borderRadius: RADIUS.tile, padding: 12, alignItems: "center", gap: 6 },
    pokal: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    titelJahr: { ...TYPE.num, fontSize: 20, color: c.textDark },
    titelName: { fontFamily: FONT.w600, fontSize: 12, color: c.textMid },

    zeitraum: { flexDirection: "row", borderRadius: 999, padding: 3 },
    zeitraumOption: { minHeight: 30, paddingHorizontal: 12, borderRadius: 999, justifyContent: "center" },
    zeitraumText: { fontFamily: FONT.w700, fontSize: 12 },
    bilanzRaster: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -5 },
    bilanzZelle: { width: "50%", padding: 5 },
    bilanzKachel: { flexGrow: 1, borderRadius: RADIUS.tile, padding: 12, gap: 4, minHeight: 116 },
    offenPill: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 2, height: 26, paddingLeft: 10, paddingRight: 6, borderRadius: 999, marginTop: 4 },
    offenText: { fontFamily: FONT.w700, fontSize: 13 },
    platzPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, height: 26, borderRadius: 13 },
    platzText: { fontFamily: FONT.w700, fontSize: 12 },
    bilanzWert: { ...TYPE.num, fontSize: 22, marginTop: 6 },
    bilanzLabel: { ...TYPE.caption, fontSize: 13, color: c.textMuted },

    strafName: { fontFamily: FONT.w700, fontSize: 15, color: c.textDark },

    abend: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56, paddingVertical: 6 },
    abendPunkt: { width: 10, height: 10, borderRadius: 5 },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 4, justifyContent: "flex-end", maxWidth: "50%" },
    chip: { fontFamily: FONT.w600, fontSize: 12, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, overflow: "hidden" },
  });
