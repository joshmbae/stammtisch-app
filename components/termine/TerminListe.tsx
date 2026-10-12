import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { MemberProfile, StammtischTermin } from "../../types";
import { FONT, MAX_FONT_SCALE, RADIUS, TYPE, ThemeColors, glow } from "../../constants/design";
import { useColors, useThemedStyles } from "../../contexts/ThemeContext";
import { TerminPhase, terminStart } from "../../utils/terminPhase";
import { displayName } from "../../utils/format";
import { toLocalIsoDate } from "../../utils/date";
import { Avatar, AvatarStack, Card, Emoji, PressableScale, PulseDot } from "../ui";
import { MONATE } from "./KalenderKarte";
import { SYMBOL } from "../../constants/symbole";

const WT = ["SO", "MO", "DI", "MI", "DO", "FR", "SA"];
const uhr = (d: Date) => d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

/** Eintrag der Liste: ein Termin oder der Geburtstag eines Mitglieds (nächstes Vorkommen). */
export type ListenEintrag =
  | { art: "termin"; datum: string; termin: StammtischTermin }
  | { art: "geburtstag"; datum: string; member: MemberProfile; alter: number | null };

/** Große Karte für den nächsten (oder laufenden) Stammtisch. */
export function NaechsterStammtisch({ termin, phase, members, ichId, stammtischzeit, now }: {
  termin: StammtischTermin;
  phase: TerminPhase;
  members: MemberProfile[];
  ichId: string | null;
  stammtischzeit?: string;
  now: Date;
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const start = terminStart(termin, stammtischzeit);
  const tag = new Date(`${termin.datum}T00:00:00`);
  const heute = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tageBis = Math.round((tag.getTime() - heute.getTime()) / 86_400_000);
  const dabei = members.filter((m) => termin.anwesenheit?.includes(m.id));
  const offen = members.filter((m) => !termin.anwesenheit?.includes(m.id) && !termin.absagen?.includes(m.id)).length;
  const ichDabei = !!ichId && !!termin.anwesenheit?.includes(ichId);
  const live = phase === "live";
  const wann = tageBis === 0 ? "heute" : tageBis === 1 ? "morgen" : `in ${tageBis} Tagen`;

  return (
    <PressableScale
      onPress={() => router.push(`/termin/${termin.id}`)}
      scaleTo={0.98}
      style={[styles.hero, { backgroundColor: live ? c.live : c.heroBlue, borderColor: live ? c.liveEdge : c.heroBlueEdge }, glow(live ? c.liveAccent : c.blue, c, 22)]}
      accessibilityLabel={`${live ? "Stammtisch läuft gerade" : "Nächster Stammtisch"}: ${tag.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}${start ? `, ${uhr(start)} Uhr` : ""}. ${dabei.length} von ${members.length} dabei. Öffnen`}
    >
      <View style={styles.heroKopf}>
        <View style={styles.heroLabelZeile}>
          {live ? <PulseDot color={c.liveAccent} size={8} /> : null}
          <Text style={[styles.label, { color: live ? c.liveAccent : c.heroBlueSub }]}>{live ? "Läuft gerade" : "Nächster Stammtisch"}</Text>
        </View>
        {ichDabei ? (
          <View style={[styles.dabeiPill, { backgroundColor: c.mustard }]}>
            <Ionicons name="checkmark" size={13} color={c.onMustard} />
            <Text style={[styles.dabeiText, { color: c.onMustard }]}>Du bist dabei</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.heroDatum, { color: live ? c.onLive : c.onHeroBlue }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
        {`${["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"][tag.getDay()]} ${tag.getDate()}.${tag.getMonth() + 1}.`}
      </Text>
      <Text style={[styles.heroSub, { color: live ? c.liveSub : c.onHeroBlue }]} numberOfLines={1}>
        {[start ? `${uhr(start)} Uhr` : null, termin.ort, live ? null : wann].filter(Boolean).join(" · ")}
      </Text>
      <View style={styles.heroFuss}>
        {dabei.length > 0 ? (
          <AvatarStack size={26} ringColor={c.heroStyle === "fill" ? c.background : live ? c.live : c.heroBlue} members={dabei.map((m) => ({ id: m.id, name: displayName(m), color: m.avatarColor, photoUri: m.photoUri }))} />
        ) : null}
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={[styles.heroKlein, { color: live ? c.onLive : c.onHeroBlue }]}>{`${dabei.length} von ${members.length} dabei${offen ? ` · ${offen} offen` : ""}`}</Text>
          <View style={styles.spur}><View style={[styles.fuell, { width: `${members.length ? Math.round((dabei.length / members.length) * 100) : 0}%`, backgroundColor: c.mustard }]} /></View>
        </View>
        <View style={[styles.pfeil, { backgroundColor: "rgba(255,255,255,0.16)" }]}>
          <Ionicons name="chevron-forward" size={18} color={live ? c.onLive : c.onHeroBlue} />
        </View>
      </View>
    </PressableScale>
  );
}

/** Termine und Geburtstage nach Monat gruppiert. */
export function TerminListe({ eintraege, vergangen, members, onGeburtstagTermin }: {
  eintraege: ListenEintrag[];
  vergangen: boolean;
  members: MemberProfile[];
  /** Eigene Geburtstags-Termine (ohne Mitglied) haben keine Detailseite. */
  onGeburtstagTermin: (t: StammtischTermin) => void;
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const gruppen: { schluessel: string; titel: string; eintraege: ListenEintrag[] }[] = [];
  const jahrJetzt = new Date().getFullYear();
  for (const e of eintraege) {
    const [j, m] = e.datum.split("-").map(Number);
    const schluessel = `${j}-${m}`;
    let g = gruppen.find((x) => x.schluessel === schluessel);
    if (!g) {
      g = { schluessel, titel: `${MONATE[m - 1]}${j !== jahrJetzt ? ` ${j}` : ""}`, eintraege: [] };
      gruppen.push(g);
    }
    g.eintraege.push(e);
  }
  if (gruppen.length === 0) {
    return (
      <Card style={{ alignItems: "center", paddingVertical: 24 }}>
        <Text style={styles.leer}>{vergangen ? "Noch keine vergangenen Termine." : "Nichts geplant. Mit + einen Termin anlegen."}</Text>
      </Card>
    );
  }
  return (
    <>
      {gruppen.map((g, gi) => (
        <View key={g.schluessel} style={{ gap: 8 }}>
          <Text style={styles.gruppe}>{g.titel.toUpperCase()}</Text>
          <Card enterIndex={gi + 1} style={{ paddingVertical: 4 }}>
            {g.eintraege.map((e, i) => (
              <View key={e.art === "termin" ? e.termin.id : `bd-${e.member.id}`} style={i > 0 ? styles.trenner : undefined}>
                {e.art === "termin" ? (
                  <TerminZeile termin={e.termin} vergangen={vergangen} members={members} onGeburtstagTermin={onGeburtstagTermin} />
                ) : (
                  <GeburtstagZeile member={e.member} datum={e.datum} alter={e.alter} />
                )}
              </View>
            ))}
          </Card>
        </View>
      ))}
    </>
  );
}

function TerminZeile({ termin, vergangen, members, onGeburtstagTermin }: {
  termin: StammtischTermin;
  vergangen: boolean;
  members: MemberProfile[];
  onGeburtstagTermin: (t: StammtischTermin) => void;
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const titel = termin.titel ?? (termin.art === "stammtisch" ? "Stammtisch" : termin.art === "geburtstag" ? "Geburtstag" : "Veranstaltung");
  const zusagen = termin.anwesenheit?.length ?? 0;
  const status = termin.art === "geburtstag" ? null : vergangen ? `${zusagen} da` : zusagen > 0 ? `${zusagen} ${zusagen === 1 ? "Zusage" : "Zusagen"}` : "offen";
  const mehrtaegig = termin.datumBis && termin.datumBis !== termin.datum;
  const bisText = mehrtaegig ? `bis ${termin.datumBis!.slice(8, 10)}.${termin.datumBis!.slice(5, 7)}.` : null;
  const tint = { stammtisch: c.blueBg, veranstaltung: c.mustardSoft, geburtstag: c.coralSoft }[termin.art];
  return (
    <PressableScale
      onPress={() => (termin.art === "geburtstag" ? onGeburtstagTermin(termin) : router.push(`/termin/${termin.id}`))}
      style={styles.zeile}
      accessibilityLabel={`${titel}, ${new Date(`${termin.datum}T00:00:00`).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}${termin.startZeit ? `, ${termin.startZeit} Uhr` : ""}${status ? `, ${status}` : ""}`}
    >
      <View style={[styles.blockRahmen, { backgroundColor: tint }]}>
        <Text style={[styles.blockWt, { color: { stammtisch: c.blue, veranstaltung: c.mustardText, geburtstag: c.coralText }[termin.art] }]}>{WT[new Date(`${termin.datum}T00:00:00`).getDay()]}</Text>
        <Text style={[styles.blockTag, { color: c.textDark }]}>{termin.datum.slice(8, 10)}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.titel, vergangen && { color: c.textMid }]} numberOfLines={1}>{titel}</Text>
        <Text style={styles.sub} numberOfLines={1}>{[termin.startZeit ? `${termin.startZeit}` : null, bisText, termin.ort].filter(Boolean).join(" · ") || (termin.art === "geburtstag" ? "Geburtstag" : "")}</Text>
      </View>
      {status ? <Text style={[styles.status, status === "offen" && { color: c.textLight }]}>{status}</Text> : null}
      <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
    </PressableScale>
  );
}

function GeburtstagZeile({ member, datum, alter }: { member: MemberProfile; datum: string; alter: number | null }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const heute = toLocalIsoDate(new Date());
  return (
    <PressableScale onPress={() => router.push(`/member/${member.id}`)} style={styles.zeile} accessibilityLabel={`${displayName(member)} hat Geburtstag${alter ? `, wird ${alter}` : ""}`}>
      <View style={[styles.blockRahmen, { backgroundColor: c.coralSoft }]}>
        <Text style={[styles.blockWt, { color: c.coralText }]}>{WT[new Date(`${datum}T00:00:00`).getDay()]}</Text>
        <Text style={[styles.blockTag, { color: c.textDark }]}>{datum.slice(8, 10)}</Text>
      </View>
      <Avatar name={displayName(member)} color={member.avatarColor} photoUri={member.photoUri} size={30} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.titel} numberOfLines={1}>{alter ? `${displayName(member)} wird ${alter}` : `${displayName(member)} hat Geburtstag`}</Text>
        <Text style={styles.sub}>{datum === heute ? "heute!" : "Geburtstag"}</Text>
      </View>
      <Emoji size={20}>{SYMBOL.geburtstag}</Emoji>
    </PressableScale>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    hero: { borderRadius: RADIUS.hero, padding: 16, gap: 4, borderWidth: 1 },
    heroKopf: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 28 },
    heroLabelZeile: { flexDirection: "row", alignItems: "center", gap: 6 },
    label: { ...TYPE.label },
    dabeiPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, height: 26, borderRadius: 13 },
    dabeiText: { fontFamily: FONT.w800, fontSize: 12 },
    heroDatum: { ...TYPE.num, fontSize: 34, lineHeight: 40, letterSpacing: -1 },
    heroSub: { fontFamily: FONT.w600, fontSize: 14 },
    heroFuss: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
    heroKlein: { fontFamily: FONT.w700, fontSize: 13 },
    spur: { height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.2)", overflow: "hidden" },
    fuell: { height: "100%", borderRadius: 3 },
    pfeil: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },

    leer: { ...TYPE.body, fontSize: 14, color: c.textMuted, textAlign: "center" },
    gruppe: { ...TYPE.label, color: c.textMuted, paddingHorizontal: 4, marginTop: 4 },
    trenner: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
    zeile: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 64, paddingVertical: 8 },
    blockRahmen: { width: 46, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    blockWt: { fontFamily: FONT.w800, fontSize: 12, letterSpacing: 0.6 },
    blockTag: { ...TYPE.num, fontSize: 19, lineHeight: 22 },
    titel: { fontFamily: FONT.w800, fontSize: 16, color: c.textDark },
    sub: { ...TYPE.caption, fontSize: 13, color: c.textMuted },
    status: { fontFamily: FONT.w700, fontSize: 13, color: c.textMuted },
  });
