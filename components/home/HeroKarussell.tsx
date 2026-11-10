import React, { useEffect, useRef, useState } from "react";
import { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, View } from "react-native";
import { MemberProfile, SpielEreignisTyp, SpielLog, StammtischTermin, StrafLog } from "../../types";
import { RADIUS, ThemeColors } from "../../constants/design";
import { useColors, useThemedStyles } from "../../contexts/ThemeContext";
import { abendStats } from "../../utils/abendStats";
import { homeHero, terminEnde, terminPhase } from "../../utils/terminPhase";
import { PressableScale } from "../ui";
import { HeroCard, RsvpStatus } from "./HeroCard";

/** So viele vergangene bzw. kommende Termine liegen links bzw. rechts. */
const JE_SEITE = 6;
const ABSTAND = 12;

interface Seite {
  termin: StammtischTermin;
  phase: "vorher" | "live" | "danach";
  rolle: string;
}

/** Vergangene links, laufende in der Mitte, kommende rechts – Geburtstage nicht. */
export function heroSeiten(termine: StammtischTermin[], now: Date, stammtischzeit?: string): Seite[] {
  const relevant = termine.filter((t) => t.art !== "geburtstag");
  const mitPhase = relevant.map((t) => ({ t, phase: terminPhase(t, now, stammtischzeit) }));
  const vorbei = mitPhase.filter((x) => x.phase === "danach")
    .sort((a, b) => terminEnde(b.t).getTime() - terminEnde(a.t).getTime())
    .slice(0, JE_SEITE);
  const live = mitPhase.filter((x) => x.phase === "live");
  const kommend = mitPhase.filter((x) => x.phase === "vorher")
    .sort((a, b) => a.t.datum.localeCompare(b.t.datum) || (a.t.startZeit ?? "").localeCompare(b.t.startZeit ?? ""))
    .slice(0, JE_SEITE);
  const rolleVorbei = (i: number) => (i === 0 ? "Zuletzt" : i === 1 ? "Davor" : "Früher");
  const rolleKommend = (i: number) => (i === 0 ? "Als Nächstes" : i === 1 ? "Übernächstes" : "Später");
  return [
    ...vorbei.map((x, i) => ({ termin: x.t, phase: "danach" as const, rolle: rolleVorbei(i) })).reverse(),
    ...live.map((x) => ({ termin: x.t, phase: "live" as const, rolle: "Läuft gerade" })),
    ...kommend.map((x, i) => ({ termin: x.t, phase: "vorher" as const, rolle: rolleKommend(i) })),
  ];
}

/**
 * Oben auf Home: alle Termine nebeneinander zum Wischen – links die
 * vergangenen, rechts die kommenden. Startet beim wichtigsten (läuft gerade,
 * eben vorbei oder als Nächstes, siehe homeHero). Punkte darüber zeigen, wo
 * man steht, und lassen sich antippen.
 */
export function HeroKarussell({
  termine, now, members, strafLogs, spielLogs, stammtischzeit, spielTypen, spielName, ichId, onRsvp, rsvpBusy,
}: {
  termine: StammtischTermin[];
  now: Date;
  members: MemberProfile[];
  strafLogs: StrafLog[];
  spielLogs: SpielLog[];
  stammtischzeit?: string;
  spielTypen: SpielEreignisTyp[];
  spielName: string | null;
  ichId: string | null;
  onRsvp: (termin: StammtischTermin, s: RsvpStatus) => void;
  rsvpBusy?: boolean;
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const scroll = useRef<ScrollView>(null);
  const [breite, setBreite] = useState(0);
  const [index, setIndex] = useState(0);
  const gestartet = useRef(false);

  const seiten = heroSeiten(termine, now, stammtischzeit);
  const anker = homeHero(termine, now, stammtischzeit, "alle");
  const startIndex = Math.max(0, anker.phase === "leer" ? 0 : seiten.findIndex((s) => s.termin.id === anker.termin.id));
  // Gemessen wird die Inhaltsbreite (ohne Seitenränder) – genau so breit ist eine Karte.
  const seitenBreite = breite;
  const schritt = seitenBreite + ABSTAND;

  // Einmal beim ersten Messen auf den wichtigsten Termin springen.
  useEffect(() => {
    if (!breite || gestartet.current || seiten.length === 0) return;
    gestartet.current = true;
    setIndex(startIndex);
    requestAnimationFrame(() => scroll.current?.scrollTo({ x: startIndex * schritt, animated: false }));
  }, [breite, seiten.length, startIndex, schritt]);

  const aufLayout = (e: LayoutChangeEvent) => setBreite(e.nativeEvent.layout.width);
  const aufScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!schritt) return;
    const i = Math.round(e.nativeEvent.contentOffset.x / schritt);
    if (i !== index && i >= 0 && i < seiten.length) setIndex(i);
  };
  const springen = (i: number) => scroll.current?.scrollTo({ x: i * schritt, animated: true });

  if (seiten.length === 0) {
    return <HeroCard hero={{ phase: "leer" }} now={now} members={members} stats={null} spielTypen={spielTypen} spielName={spielName} meinStatus={null} onRsvp={() => {}} />;
  }

  return (
    <View style={styles.huelle} onLayout={aufLayout}>
      {seiten.length > 1 ? (
        <View style={styles.punkte} accessibilityRole="adjustable" accessibilityLabel={`Termin ${index + 1} von ${seiten.length}: ${seiten[index]?.rolle}. Wischen für frühere und spätere Termine`}>
          {seiten.map((s, i) => (
            <PressableScale
              key={s.termin.id}
              onPress={() => springen(i)}
              hitSlop={{ top: 10, bottom: 10, left: 2, right: 2 }}
              scaleTo={0.9}
              accessibilityLabel={s.rolle}
            >
              <View
                style={[
                  styles.punkt,
                  { backgroundColor: i === index ? c.textDark : c.borderDark },
                  i === index && styles.punktAktiv,
                  s.phase === "live" && i !== index && { backgroundColor: c.success },
                ]}
              />
            </PressableScale>
          ))}
        </View>
      ) : null}
      {breite > 0 ? (
        <ScrollView
          ref={scroll}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={schritt}
          decelerationRate="fast"
          disableIntervalMomentum
          onScroll={aufScroll}
          scrollEventThrottle={16}
          style={styles.band}
          contentContainerStyle={styles.bandInhalt}
        >
          {seiten.map((s, i) => {
            const t = s.termin;
            const meinStatus: RsvpStatus = s.phase === "vorher" && ichId
              ? t.anwesenheit?.includes(ichId) ? "ja" : t.absagen?.includes(ichId) ? "nein" : null
              : null;
            return (
              <View key={t.id} style={{ width: seitenBreite, marginRight: i < seiten.length - 1 ? ABSTAND : 0 }}>
                <HeroCard
                  hero={{ phase: s.phase, termin: t }}
                  now={now}
                  members={members}
                  stats={abendStats(t, members, strafLogs, spielLogs)}
                  stammtischzeit={stammtischzeit}
                  spielTypen={spielTypen}
                  spielName={spielName}
                  meinStatus={meinStatus}
                  onRsvp={(st) => onRsvp(t, st)}
                  rsvpBusy={rsvpBusy}
                  rolle={s.rolle}
                  fill
                />
              </View>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    huelle: { gap: 10 },
    // Über die Seitenränder hinaus, damit die Nachbarkarten beim Wischen nicht abgeschnitten wirken.
    band: { marginHorizontal: -16 },
    bandInhalt: { paddingHorizontal: 16 },
    punkte: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, height: 12 },
    punkt: { width: 6, height: 6, borderRadius: RADIUS.pill },
    punktAktiv: { width: 18 },
  });
