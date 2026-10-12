import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { MemberProfile, SpielEreignisTyp } from "../../types";
import { FONT, MAX_FONT_SCALE, RADIUS, TYPE, ThemeColors, glow } from "../../constants/design";
import { useColors, useThemedStyles } from "../../contexts/ThemeContext";
import { AbendStats, ereignisGesamt, meisteBei } from "../../utils/abendStats";
import { HomeHero, terminEnde, terminStart } from "../../utils/terminPhase";
import { formatWochentagDatum } from "../../utils/date";
import { displayName, formatEuro } from "../../utils/format";
import { AvatarStack, Button, FlipCountdown, IconSquircle, LiveTimer, PressableScale, PulseDot } from "../ui";

export type RsvpStatus = "ja" | "nein" | null;

interface Props {
  hero: HomeHero;
  now: Date;
  members: MemberProfile[];
  stats: AbendStats | null;
  stammtischzeit?: string;
  /** Ereignistypen des aktiven Spiels, Hauptereignis zuerst. */
  spielTypen: SpielEreignisTyp[];
  meinStatus: RsvpStatus;
  onRsvp: (s: RsvpStatus) => void;
  rsvpBusy?: boolean;
}

/**
 * Die große Karte oben auf Home, in drei Zuständen, die sich von selbst
 * ablösen: vor dem Abend (Countdown, zusagen), während des Abends (nur
 * Anzeige, Tippen öffnet den Termin) und am Tag danach (kurzes Fazit).
 */
export function HeroCard(props: Props) {
  switch (props.hero.phase) {
    case "vorher": return <Vorher {...props} />;
    case "live": return <Live {...props} />;
    case "danach": return <Danach {...props} />;
    default: return <Leer />;
  }
}

function useHeroFlaeche(art: "blau" | "live" | "senf"): ViewStyle {
  const c = useColors();
  const fl = {
    blau: { bg: c.heroBlue, edge: c.heroBlueEdge, glow: c.blue },
    live: { bg: c.live, edge: c.liveEdge, glow: c.liveAccent },
    senf: { bg: c.mustardSoft, edge: c.mustardEdge, glow: c.mustard },
  }[art];
  return { backgroundColor: fl.bg, borderColor: fl.edge, borderWidth: 1, ...glow(fl.glow, c, 24) };
}

const zeitText = (d: Date) => d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

function Vorher({ hero, now, members, stammtischzeit, meinStatus, onRsvp, rsvpBusy }: Props) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const flaeche = useHeroFlaeche("blau");
  if (hero.phase !== "vorher") return null;
  const t = hero.termin;
  const start = terminStart(t, stammtischzeit) ?? (() => { const d = new Date(`${t.datum}T00:00:00`); d.setHours(19, 0, 0, 0); return d; })();
  const zugesagt = members.filter((m) => t.anwesenheit?.includes(m.id));
  const halbTransparent = c.heroStyle === "outline" ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.14)";
  const dabei = meinStatus === "ja";
  const abgesagt = meinStatus === "nein";

  return (
    <View style={[styles.hero, flaeche]} accessibilityLabel="Nächster Stammtisch">
      <View style={styles.row}>
        <Text style={[styles.label, { color: c.heroBlueSub }]}>Nächster Stammtisch</Text>
        <PressableScale onPress={() => router.push(`/termin/${t.id}`)} style={[styles.chip, { backgroundColor: halbTransparent }]} accessibilityLabel="Termin öffnen" hitSlop={8}>
          <Text style={[styles.chipText, { color: c.onHeroBlue }]}>{`${formatWochentagDatum(new Date(`${t.datum}T00:00:00`))} · ${zeitText(start)}`}</Text>
          <Ionicons name="chevron-forward" size={14} color={c.onHeroBlue} />
        </PressableScale>
      </View>
      <FlipCountdown ziel={start} now={now} tileColor={c.heroBlueInner} digitColor={c.heroBlueSub} labelColor={c.onHeroBlue} />
      <View style={[styles.row, { gap: 12 }]}>
        {zugesagt.length > 0 ? (
          <AvatarStack size={28} ringColor={c.heroStyle === "fill" ? c.background : c.heroBlue} members={zugesagt.map((m) => ({ id: m.id, name: displayName(m), color: m.avatarColor, photoUri: m.photoUri }))} />
        ) : null}
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={[styles.small, { color: c.onHeroBlue }]} numberOfLines={1}>
            {`${zugesagt.length} von ${members.length} dabei${t.ort ? ` · ${t.ort}` : ""}`}
          </Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${members.length ? Math.round((zugesagt.length / members.length) * 100) : 0}%`, backgroundColor: c.mustard }]} />
          </View>
        </View>
      </View>
      <View style={styles.row}>
        <Button
          label={dabei ? "Du bist dabei" : "Bin dabei"}
          icon={dabei ? "checkmark" : undefined}
          variant="primary"
          colors={dabei ? undefined : { bg: c.card, fg: c.textDark }}
          haptic="erfolg"
          loading={rsvpBusy}
          onPress={() => onRsvp(dabei ? null : "ja")}
          style={{ flex: 1.5 }}
          accessibilityLabel={dabei ? "Du bist dabei. Tippen zum Zurücknehmen" : "Bin dabei"}
        />
        <Button
          label={abgesagt ? "Abgesagt" : "Absagen"}
          colors={{ bg: abgesagt ? c.coral : halbTransparent, fg: abgesagt ? c.onCoral : c.onHeroBlue }}
          onPress={() => onRsvp(abgesagt ? null : "nein")}
          disabled={rsvpBusy}
          style={{ flex: 1 }}
          accessibilityLabel={abgesagt ? "Abgesagt. Tippen zum Zurücknehmen" : "Absagen"}
        />
      </View>
    </View>
  );
}

function Live({ hero, now, members, stats, stammtischzeit, spielTypen }: Props) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const flaeche = useHeroFlaeche("live");
  if (hero.phase !== "live") return null;
  const t = hero.termin;
  const start = terminStart(t, stammtischzeit) ?? now;
  const amTisch = members.filter((m) => t.anwesenheit?.includes(m.id));
  const haupt = spielTypen[0];
  const akzent = c.heroStyle === "outline" ? c.liveAccent : c.heroBlueSub;

  return (
    <PressableScale onPress={() => router.push(`/termin/${t.id}`)} scaleTo={0.98} style={[styles.hero, flaeche]} accessibilityLabel="Stammtisch läuft gerade, öffnen">
      <View style={styles.row}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <PulseDot color={c.liveAccent} />
          <Text style={[styles.label, { color: akzent }]}>Läuft gerade</Text>
        </View>
        <View style={styles.round}>
          <Ionicons name="chevron-forward" size={16} color={c.onLive} />
        </View>
      </View>
      <View>
        <LiveTimer start={start} now={now} style={{ fontSize: 54, lineHeight: 58, letterSpacing: -1.5, color: c.heroStyle === "outline" ? c.liveAccent : c.onLive }} />
        <Text style={[styles.small, { color: c.liveSub }]}>{`seit ${zeitText(start)}${t.ort ? ` · ${t.ort}` : ""}`}</Text>
      </View>
      <View style={[styles.row, { justifyContent: "flex-start", gap: 12 }]}>
        {amTisch.length > 0 ? (
          <AvatarStack size={30} ringColor={c.heroStyle === "fill" ? c.background : c.live} members={amTisch.map((m) => ({ id: m.id, name: displayName(m), color: m.avatarColor, photoUri: m.photoUri }))} />
        ) : null}
        <Text style={[styles.bodyStrong, { color: c.onLive }]}>{`${amTisch.length} am Tisch`}</Text>
      </View>
      <View style={styles.row}>
        <View style={styles.liveChip}>
          <Text style={[styles.liveZahl, { color: c.onLive }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{`${formatEuro(stats?.strafenSumme ?? 0).replace(",00", "")} €`}</Text>
          <Text style={[styles.small, { color: c.liveSub }]}>Strafen</Text>
        </View>
        {haupt ? (
          <View style={styles.liveChip}>
            <Text style={[styles.liveZahl, { color: c.onLive }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{stats ? ereignisGesamt(stats, haupt.id) : 0}</Text>
            <Text style={[styles.small, { color: c.liveSub }]} numberOfLines={1}>{haupt.label}</Text>
          </View>
        ) : null}
      </View>
    </PressableScale>
  );
}

function Danach({ hero, now, members, stats, spielTypen }: Props) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const flaeche = useHeroFlaeche("senf");
  if (hero.phase !== "danach" || !stats) return null;
  const t = hero.termin;
  const ende = terminEnde(t);
  const gestern = ende.toDateString() !== now.toDateString();
  const tag = new Date(`${t.datum}T00:00:00`);
  const zeilen = spielTypen
    .slice(0, 2)
    .map((typ) => ({ typ, wer: meisteBei(stats, typ.id, members) }))
    .filter((z) => z.wer);

  return (
    <View style={[styles.hero, flaeche]} accessibilityLabel="Rückblick auf den letzten Abend">
      <Text style={[styles.label, { color: c.mustardText }]}>{`${gestern ? "Gestern" : "Heute"} · ${formatWochentagDatum(tag)}`}</Text>
      <View style={[styles.row, { justifyContent: "flex-start", gap: 10 }]}>
        <Text style={[styles.gross, { color: c.textDark }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{`${Math.round(stats.quote * 100)} %`}</Text>
        <View>
          <Text style={[styles.bodyStrong, { color: c.textDark }]}>da</Text>
          <Text style={[styles.small, { color: c.textMuted }]}>{`${stats.da.length} von ${stats.mitglieder.length}`}</Text>
        </View>
        <View style={styles.dots} accessibilityElementsHidden>
          {stats.mitglieder.map((m) => {
            const war = stats.da.some((d) => d.id === m.id);
            return <View key={m.id} style={[styles.dot, war ? { backgroundColor: m.avatarColor } : { borderWidth: 1.5, borderColor: c.borderDark }]} />;
          })}
        </View>
      </View>
      <View style={{ gap: 8 }}>
        {zeilen.length > 0 ? zeilen.map(({ typ, wer }) => (
          <View key={typ.id} style={styles.meisteRow}>
            <IconSquircle emoji={typ.emoji ?? "🎲"} ton="mustard" size={30} />
            <Text style={[styles.small, { flex: 1, color: c.textMid }]} numberOfLines={1}>{`Meiste ${typ.label}`}</Text>
            <Text style={[styles.bodyStrong, { color: c.textDark }]} numberOfLines={1}>{`${wer!.members.map(displayName).join(", ")} · ${wer!.anzahl}×`}</Text>
          </View>
        )) : (
          <View style={styles.meisteRow}>
            <IconSquircle icon="cash-outline" ton="mustard" size={30} />
            <Text style={[styles.small, { flex: 1, color: c.textMid }]}>Strafen des Abends</Text>
            <Text style={[styles.bodyStrong, { color: c.textDark }]}>{`${formatEuro(stats.strafenSumme)} €`}</Text>
          </View>
        )}
      </View>
      <View style={styles.row}>
        <Button label="Rückblick" icon="play" variant="dark" onPress={() => router.push(`/termin/${t.id}`)} style={{ flex: 1 }} />
        {stats.strafenOffen > 0 ? (
          <Button label={`${formatEuro(stats.strafenOffen).replace(",00", "")} € offen`} variant="secondary" onPress={() => router.push("/strafen")} style={{ flex: 1 }} />
        ) : (
          <Button label="Alles bezahlt" icon="checkmark" variant="secondary" onPress={() => router.push(`/termin/${t.id}`)} style={{ flex: 1 }} />
        )}
      </View>
    </View>
  );
}

function Leer() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const flaeche = useHeroFlaeche("blau");
  return (
    <View style={[styles.hero, flaeche, { minHeight: 0 }]}>
      <Text style={[styles.label, { color: c.heroBlueSub }]}>Nächster Stammtisch</Text>
      <Text style={[styles.titel, { color: c.onHeroBlue }]}>Noch nichts geplant.</Text>
      <Button label="Termin anlegen" icon="add" onPress={() => router.push("/kalender")} />
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    hero: { borderRadius: RADIUS.hero, padding: 18, gap: 14, minHeight: 248, justifyContent: "space-between" },
    row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
    label: { ...TYPE.label },
    chip: { minHeight: 32, borderRadius: 999, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 4 },
    chipText: { fontFamily: FONT.w700, fontSize: 13 },
    small: { ...TYPE.caption, fontSize: 13 },
    bodyStrong: { ...TYPE.bodyStrong },
    titel: { ...TYPE.title, fontSize: 24 },
    track: { height: 6, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.2)", overflow: "hidden" },
    fill: { height: "100%", borderRadius: 999 },
    round: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" },
    liveChip: { flex: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: "rgba(255,255,255,0.1)", flexDirection: "row", alignItems: "baseline", gap: 6 },
    liveZahl: { ...TYPE.num, fontSize: 20 },
    gross: { ...TYPE.num, fontSize: 46, lineHeight: 50, letterSpacing: -1.5 },
    dots: { flex: 1, flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-end", gap: 4 },
    dot: { width: 10, height: 10, borderRadius: 5 },
    meisteRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  });
