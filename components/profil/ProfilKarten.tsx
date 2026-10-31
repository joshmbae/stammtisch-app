import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { MemberProfile, StrafKategorieDef, StrafLog } from "../../types";
import { FONT, MAX_FONT_SCALE, RADIUS, TYPE, ThemeColors } from "../../constants/design";
import { useColors, useThemedStyles } from "../../contexts/ThemeContext";
import { Jahrestitel } from "../../utils/stats";
import { displayName, formatBetrag } from "../../utils/format";
import { formatWochentagDatum } from "../../utils/date";
import { Avatar, Card, Emoji, IconSquircle, KategorieIcon, Krone, PressableScale, SectionLabel, tonFuerRangliste } from "../ui";
import { SYMBOL } from "../../constants/symbole";


/** Kopf: Bild, Name, Rollen und die festen Angaben zur Person. */
export function ProfilHero({ member }: { member: MemberProfile }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
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
        <View style={[styles.heroRing, { borderColor: c.mustard }]}>
          <Avatar name={displayName(member)} color={member.avatarColor} photoUri={member.photoUri} size={72} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.heroName, { color: c.onHeroBlue }]} numberOfLines={2} maxFontSizeMultiplier={MAX_FONT_SCALE} accessibilityRole="header">{member.name}</Text>
          <Text style={[styles.heroRolle, { color: c.heroBlueSub }]} numberOfLines={2}>{member.rollen.join(", ")}</Text>
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
            <View style={[styles.titelKachel, { backgroundColor: c.cardAlt }]} accessible accessibilityLabel={`${t.titel} ${t.jahr}`}>
              <View style={[styles.pokal, { backgroundColor: i === 0 ? c.mustard : c.mustardSoft }]}>
                <Emoji size={18}>{SYMBOL.pokal}</Emoji>
              </View>
              <Text style={styles.titelJahr}>{t.jahr}</Text>
              <Text style={styles.titelName} numberOfLines={1}>{`${t.emoji} ${t.titel}`}</Text>
            </View>
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
}

/** Bilanz der Saison als Kacheln, jede mit dem Platz in der Wertung. */
export function BilanzKarte({ jahr, kacheln }: { jahr: string; kacheln: BilanzKachel[] }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  if (kacheln.length === 0) return null;
  return (
    <Card enterIndex={3} style={{ gap: 12 }}>
      <SectionLabel action={{ label: "Tabelle", onPress: () => router.push("/ranglisten") }}>{`Bilanz ${jahr}`}</SectionLabel>
      <View style={styles.bilanzRaster}>
        {kacheln.map((k) => (
          <View key={k.key} style={styles.bilanzZelle}>
            <View style={[styles.bilanzKachel, { backgroundColor: c.cardAlt }]} accessible accessibilityLabel={`${k.label}: ${k.wert}${k.platz ? `, Platz ${k.platz}` : ""}`}>
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
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}

/** Strafen der Saison: offen, bezahlt, die letzten drei. */
export function StrafenKarte({ jahr, memberId, strafen, kategorien }: { jahr: string; memberId: string; strafen: StrafLog[]; kategorien: StrafKategorieDef[] }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const offen = strafen.filter((l) => !l.beglichen).reduce((s, l) => s + l.betrag, 0);
  const bezahlt = strafen.filter((l) => l.beglichen);
  const zuletzt = [...strafen].sort((a, b) => b.loggedAt.localeCompare(a.loggedAt)).slice(0, 3);
  return (
    <Card enterIndex={4} style={{ gap: 12 }}>
      <SectionLabel action={{ label: "Strafen", onPress: () => router.push(`/kasse?tab=strafen&memberId=${memberId}`) }}>{`Strafen ${jahr}`}</SectionLabel>
      <View style={styles.zeile}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.strafWert, { color: offen > 0 ? c.coralText : c.successText }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{formatBetrag(offen)}</Text>
          <Text style={styles.meta}>{offen > 0 ? "offen" : "offen · alles beglichen"}</Text>
        </View>
        <View style={[styles.senkrecht, { backgroundColor: c.border }]} />
        <View style={{ flex: 1, paddingLeft: 14 }}>
          <Text style={styles.strafWert} maxFontSizeMultiplier={MAX_FONT_SCALE}>{formatBetrag(bezahlt.reduce((s, l) => s + l.betrag, 0))}</Text>
          <Text style={styles.meta}>{`gezahlt · ${bezahlt.length} ${bezahlt.length === 1 ? "Strafe" : "Strafen"}`}</Text>
        </View>
      </View>
      {zuletzt.length > 0 ? (
        <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border, paddingTop: 10 }}>
          <Text style={styles.label}>Zuletzt</Text>
          {zuletzt.map((l, i) => {
            const kat = kategorien.find((k) => k.id === l.kategorie);
            const was = kat?.systemKey === "sonstiges" && l.notiz ? l.notiz : kat?.label ?? "Strafe";
            return (
              <View key={l.id} style={[styles.strafZeile, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border }]}>
                <KategorieIcon kat={kat} size={36} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.strafName} numberOfLines={1}>{was}</Text>
                  <Text style={styles.meta} numberOfLines={1}>{`${formatWochentagDatum(new Date(l.loggedAt))} · ${l.beglichen ? "bezahlt" : "offen"}`}</Text>
                </View>
                <Text style={[styles.strafBetrag, !l.beglichen && { color: c.coralText }]}>{formatBetrag(l.betrag)}</Text>
              </View>
            );
          })}
        </View>
      ) : (
        <Text style={styles.meta}>Keine Strafen in dieser Saison.</Text>
      )}
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

    bilanzRaster: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -5 },
    bilanzZelle: { width: "50%", padding: 5 },
    bilanzKachel: { borderRadius: RADIUS.tile, padding: 12, gap: 4, minHeight: 116 },
    platzPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, height: 26, borderRadius: 13 },
    platzText: { fontFamily: FONT.w700, fontSize: 12 },
    bilanzWert: { ...TYPE.num, fontSize: 22, marginTop: 6 },
    bilanzLabel: { ...TYPE.caption, fontSize: 13, color: c.textMuted },

    strafWert: { ...TYPE.num, fontSize: 22, color: c.textDark },
    senkrecht: { width: StyleSheet.hairlineWidth, alignSelf: "stretch" },
    strafZeile: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56, paddingVertical: 6 },
    strafName: { fontFamily: FONT.w700, fontSize: 15, color: c.textDark },
    strafBetrag: { ...TYPE.num, fontSize: 17, color: c.textDark },

    abend: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56, paddingVertical: 6 },
    abendPunkt: { width: 10, height: 10, borderRadius: 5 },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 4, justifyContent: "flex-end", maxWidth: "50%" },
    chip: { fontFamily: FONT.w600, fontSize: 12, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, overflow: "hidden" },
  });
