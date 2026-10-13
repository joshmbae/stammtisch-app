import React from "react";
import { Image, StyleSheet, Text, View, ViewStyle } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { MemberProfile, SpielEreignisTyp } from "../../types";
import { FONT, MAX_FONT_SCALE, RADIUS, TYPE, ThemeColors, glow } from "../../constants/design";
import { useColors, useThemedStyles } from "../../contexts/ThemeContext";
import { AbendStats, meisteBei } from "../../utils/abendStats";
import { HomeHero, terminEnde, terminStart } from "../../utils/terminPhase";
import { formatWochentagDatum } from "../../utils/date";
import { displayName, formatEuro } from "../../utils/format";
import { Avatar, AvatarStack, Button, Emoji, FlipCountdown, IconSquircle, LiveTimer, PressableScale, PulseDot, Scrim } from "../ui";
import { SYMBOL } from "../../constants/symbole";

export type RsvpStatus = "ja" | "nein" | null;

interface Props {
  hero: HomeHero;
  now: Date;
  members: MemberProfile[];
  stats: AbendStats | null;
  stammtischzeit?: string;
  /** Ereignistypen des aktiven Spiels, Hauptereignis zuerst. */
  spielTypen: SpielEreignisTyp[];
  /** Name des aktiven Spiels (z. B. „Schocken“) für die Live-Kachel; null = kein Spiel gewählt. */
  spielName: string | null;
  meinStatus: RsvpStatus;
  onRsvp: (s: RsvpStatus) => void;
  rsvpBusy?: boolean;
  /** Umschalten zwischen nächstem und letztem Stammtisch (nicht während ein Abend läuft). */
  umschalter?: { wert: HeroWahl; onChange: (w: HeroWahl) => void };
}

export type HeroWahl = "naechster" | "letzter";

/**
 * Die große Karte oben auf Home, in drei Zuständen, die sich von selbst
 * ablösen: vor dem Abend (Countdown, zusagen), während des Abends (Tippen
 * öffnet den Termin, die Kacheln direkt Strafen bzw. Spiel) und danach
 * (kurzes Fazit). Die ganze Fläche öffnet den Termin; oben rechts lässt sich
 * zwischen nächstem und letztem Stammtisch umschalten.
 */
export function HeroCard(props: Props) {
  switch (props.hero.phase) {
    case "vorher": return <Vorher {...props} />;
    case "live": return <Live {...props} />;
    case "danach": return <Danach {...props} />;
    default: return <Leer umschalter={props.umschalter} />;
  }
}

/** Kleiner Umschalter „Nächster · Letzter“ auf der Hero-Fläche. */
function HeroUmschalter({ wert, onChange, hell }: { wert: HeroWahl; onChange: (w: HeroWahl) => void; hell: boolean }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const optionen: { key: HeroWahl; label: string }[] = [{ key: "naechster", label: "Nächster" }, { key: "letzter", label: "Letzter" }];
  return (
    <View style={[styles.umschalter, { backgroundColor: hell ? "rgba(255,255,255,0.14)" : "rgba(28,27,25,0.08)" }]} accessibilityRole="tablist">
      {optionen.map((o) => {
        const aktiv = o.key === wert;
        return (
          <PressableScale
            key={o.key}
            onPress={() => onChange(o.key)}
            haptic="leicht"
            hitSlop={6}
            accessibilityRole="tab"
            accessibilityState={{ selected: aktiv }}
            accessibilityLabel={`${o.label} Stammtisch`}
            style={[styles.umschalterOption, aktiv && { backgroundColor: c.card }]}
          >
            <Text style={[styles.umschalterText, { color: aktiv ? c.textDark : hell ? "rgba(255,255,255,0.85)" : c.textMid }]}>{o.label}</Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const oeffne = (id: string, bereich?: "strafen" | "spiel") => router.push(bereich ? `/termin/${id}?bereich=${bereich}` : `/termin/${id}`);

function useHeroFlaeche(art: "blau" | "live" | "senf"): ViewStyle {
  const c = useColors();
  const fl = {
    blau: { bg: c.heroBlue, edge: c.heroBlueEdge, glow: c.blue },
    live: { bg: c.live, edge: c.liveEdge, glow: c.liveAccent },
    senf: { bg: c.mustardSoft, edge: c.mustardEdge, glow: c.mustard },
  }[art];
  return { backgroundColor: fl.bg, borderColor: fl.edge, borderWidth: 1, ...glow(fl.glow, c, 24) };
}

/**
 * Zuletzt gemessene Höhe der „Nächster“-Karte, damit „Letzter“ genauso hoch
 * ist und beim Umschalten nichts springt. Startwert = gemessene Höhe bei
 * normaler Schriftgröße, falls „Nächster“ noch nicht zu sehen war.
 */
let vorherHoehe = 260;

const zeitText = (d: Date) => d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

function Vorher({ hero, now, members, stammtischzeit, meinStatus, onRsvp, rsvpBusy, umschalter }: Props) {
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
    <PressableScale onPress={() => oeffne(t.id)} onLayout={(e) => { vorherHoehe = e.nativeEvent.layout.height; }} scaleTo={0.99} style={[styles.hero, flaeche]} accessibilityLabel={`Nächster Stammtisch, ${formatWochentagDatum(new Date(`${t.datum}T00:00:00`))}, öffnen`}>
      <View style={styles.row}>
        <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
          <Text style={[styles.label, { color: c.heroBlueSub }]}>Nächster Stammtisch</Text>
          <View style={styles.datumZeile}>
            <Text style={[styles.chipText, { color: c.onHeroBlue }]} numberOfLines={1}>{`${formatWochentagDatum(new Date(`${t.datum}T00:00:00`))} · ${zeitText(start)}`}</Text>
            <Ionicons name="chevron-forward" size={14} color={c.onHeroBlue} />
          </View>
        </View>
        {umschalter ? <HeroUmschalter {...umschalter} hell /> : null}
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
    </PressableScale>
  );
}

function Live({ hero, now, members, stammtischzeit, spielName }: Props) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const flaeche = useHeroFlaeche("live");
  if (hero.phase !== "live") return null;
  const t = hero.termin;
  const start = terminStart(t, stammtischzeit) ?? now;
  const amTisch = members.filter((m) => t.anwesenheit?.includes(m.id));
  const akzent = c.heroStyle === "outline" ? c.liveAccent : c.heroBlueSub;

  return (
    <PressableScale onPress={() => oeffne(t.id)} scaleTo={0.98} style={[styles.hero, flaeche]} accessibilityLabel="Stammtisch läuft gerade, öffnen">
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
        <LiveTimer start={start} now={now} style={{ fontSize: 44, lineHeight: 48, letterSpacing: -1.2, color: c.heroStyle === "outline" ? c.liveAccent : c.onLive }} />
        <Text style={[styles.small, { color: c.liveSub }]}>{`seit ${zeitText(start)}${t.ort ? ` · ${t.ort}` : ""}`}</Text>
      </View>
      <View style={[styles.row, { justifyContent: "flex-start", gap: 12 }]}>
        {amTisch.length > 0 ? (
          <AvatarStack size={30} ringColor={c.heroStyle === "fill" ? c.background : c.live} members={amTisch.map((m) => ({ id: m.id, name: displayName(m), color: m.avatarColor, photoUri: m.photoUri }))} />
        ) : null}
        <Text style={[styles.bodyStrong, { color: c.onLive }]}>{`${amTisch.length} am Tisch`}</Text>
      </View>
      <View style={styles.row}>
        {/* Direkt in den passenden Bereich des Live-Termins: ein Tipp bis zum Eintragen. */}
        <PressableScale onPress={() => oeffne(t.id, "strafen")} scaleTo={0.96} style={styles.liveChip} accessibilityLabel="Strafe eintragen">
          <Text style={[styles.liveChipText, { color: c.onLive }]} numberOfLines={1}>Strafen</Text>
          <Ionicons name="add" size={20} color={c.onLive} />
        </PressableScale>
        {spielName ? (
          <PressableScale onPress={() => oeffne(t.id, "spiel")} scaleTo={0.96} style={styles.liveChip} accessibilityLabel={`${spielName} eintragen`}>
            <Text style={[styles.liveChipText, { color: c.onLive }]} numberOfLines={1}>{spielName}</Text>
            <Ionicons name="add" size={20} color={c.onLive} />
          </PressableScale>
        ) : null}
      </View>
    </PressableScale>
  );
}

/**
 * Rückblick auf den letzten Abend. Mit Foto füllt es die Karte (dunkler
 * Verlauf für die Lesbarkeit), sonst die Senf-Fläche. Wer da war, darunter
 * ein Glas-Feld: Strafen des Abends und wer beim Spiel vorne lag. Antippen
 * öffnet den Danach-Bereich; gleich hoch wie die „Nächster“-Karte.
 */
function Danach({ hero, now, members, stats, spielTypen, umschalter }: Props) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const flaeche = useHeroFlaeche("senf");
  if (hero.phase !== "danach" || !stats) return null;
  const t = hero.termin;
  const ende = terminEnde(t);
  const tag = new Date(`${t.datum}T00:00:00`);
  const vortag = new Date(now);
  vortag.setDate(vortag.getDate() - 1);
  // „Heute“/„Gestern“ davor; ältere Abende nur mit Datum (der Umschalter sagt schon „Letzter“).
  const wann = ende.toDateString() === now.toDateString() ? "Heute · " : ende.toDateString() === vortag.toDateString() ? "Gestern · " : "";
  const foto = !!t.bildUrl;
  const dunkel = foto || c.heroStyle === "outline";
  const text = foto ? "#FFFFFF" : c.textDark;
  const leise = foto ? "rgba(255,255,255,0.78)" : c.textMuted;
  const glas = foto
    ? { backgroundColor: "rgba(20,18,16,0.45)", borderColor: "rgba(255,255,255,0.16)" }
    : { backgroundColor: c.heroStyle === "outline" ? c.card : "rgba(255,255,255,0.6)", borderColor: c.hairline };
  const trenner = foto ? "rgba(255,255,255,0.18)" : c.border;

  const spiel = spielTypen
    .map((typ) => ({ typ, wer: meisteBei(stats, typ.id, members) }))
    .filter((z) => z.wer)
    .slice(0, 2);
  const bezahlt = stats.strafenSumme > 0 && stats.strafenOffen === 0;
  const strafenSub = stats.strafenSumme === 0 ? "keine Strafen" : bezahlt ? "alles bezahlt" : `${formatEuro(stats.strafenOffen).replace(",00", "")} € offen`;
  const schatten = foto ? styles.schatten : null;

  return (
    <PressableScale
      onPress={() => oeffne(t.id)}
      scaleTo={0.99}
      style={[styles.hero, foto ? styles.heroFoto : flaeche, { minHeight: vorherHoehe }]}
      accessibilityLabel={`Rückblick auf den Stammtisch am ${formatWochentagDatum(tag)}: ${stats.da.length} von ${stats.mitglieder.length} waren da, ${formatEuro(stats.strafenSumme)} Euro Strafen. Öffnen`}
    >
      {foto ? (
        <>
          <Image source={{ uri: t.bildUrl! }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityIgnoresInvertColors />
          <Scrim top={0.5} bottom={0.88} />
        </>
      ) : null}

      <View style={styles.row}>
        <View style={[styles.datumPill, foto ? { backgroundColor: "rgba(20,18,16,0.45)", paddingHorizontal: 10 } : null]}>
          <Text style={[styles.label, { color: foto ? "#FFFFFF" : c.mustardText }]} numberOfLines={1}>{`${wann}${formatWochentagDatum(tag)}`}</Text>
        </View>
        {umschalter ? <HeroUmschalter {...umschalter} hell={dunkel} /> : null}
      </View>

      <View style={{ gap: 8 }}>
        <Text style={[styles.titel, { color: text }, schatten]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{`${stats.da.length} von ${stats.mitglieder.length} waren da`}</Text>
        <View style={[styles.row, { justifyContent: "flex-start" }]}>
          <AvatarStack members={stats.da.map((m) => ({ id: m.id, name: displayName(m), color: m.avatarColor, photoUri: m.photoUri }))} size={26} max={8} ringColor={foto ? "#141210" : c.mustardSoft} />
          {stats.fehlten.length > 0 ? (
            <Text style={[styles.small, { color: leise, flex: 1 }, schatten]} numberOfLines={1}>{`ohne ${stats.fehlten.map(displayName).join(", ")}`}</Text>
          ) : null}
        </View>
      </View>

      <View style={[styles.glas, glas]}>
        <View style={styles.glasStrafen}>
          <Text style={[styles.glasLabel, { color: leise }]}>{`${SYMBOL.strafe} Strafen`}</Text>
          <Text style={[styles.glasBetrag, { color: text }]} maxFontSizeMultiplier={MAX_FONT_SCALE} numberOfLines={1}>{`${formatEuro(stats.strafenSumme).replace(",00", "")} €`}</Text>
          <View style={styles.glasStatus}>
            {bezahlt ? <Ionicons name="checkmark-circle" size={13} color={foto ? "#9FE8C6" : c.greenText} /> : null}
            <Text style={[styles.glasSub, { color: bezahlt ? (foto ? "#9FE8C6" : c.greenText) : stats.strafenOffen > 0 ? (foto ? "#FFB4A3" : c.coralText) : leise }]} numberOfLines={1}>{strafenSub}</Text>
          </View>
        </View>
        {spiel.length > 0 ? (
          <>
            <View style={[styles.glasTrenner, { backgroundColor: trenner }]} />
            <View style={styles.glasSpiel}>
              {spiel.map(({ typ, wer }) => {
                const erster = wer!.members[0];
                return (
                  <View key={typ.id} style={styles.glasZeile}>
                    <Emoji size={15}>{typ.emoji ?? "🎲"}</Emoji>
                    <Avatar name={displayName(erster)} color={erster.avatarColor} photoUri={erster.photoUri} size={22} ringColor={foto ? "#141210" : undefined} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.glasName, { color: text }]} numberOfLines={1}>
                        {wer!.members.length === 1 ? displayName(erster) : `${displayName(erster)} +${wer!.members.length - 1}`}
                      </Text>
                      <Text style={[styles.glasSub, { color: leise }]} numberOfLines={1}>{`${wer!.anzahl}× ${typ.label}`}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        ) : null}
      </View>
    </PressableScale>
  );
}

function Leer({ umschalter }: { umschalter?: Props["umschalter"] }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const flaeche = useHeroFlaeche("blau");
  return (
    <View style={[styles.hero, flaeche, { minHeight: 0 }]}>
      <View style={styles.row}>
        <Text style={[styles.label, { color: c.heroBlueSub, flex: 1 }]}>Nächster Stammtisch</Text>
        {umschalter ? <HeroUmschalter {...umschalter} hell /> : null}
      </View>
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
    datumZeile: { flexDirection: "row", alignItems: "center", gap: 4 },
    umschalter: { flexDirection: "row", borderRadius: 999, padding: 3 },
    umschalterOption: { minHeight: 30, paddingHorizontal: 11, borderRadius: 999, justifyContent: "center" },
    umschalterText: { fontFamily: FONT.w700, fontSize: 12 },
    chipText: { fontFamily: FONT.w600, fontSize: 13 },
    small: { ...TYPE.caption, fontSize: 13 },
    bodyStrong: { ...TYPE.bodyStrong },
    titel: { ...TYPE.title, fontSize: 22 },
    track: { height: 6, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.2)", overflow: "hidden" },
    fill: { height: "100%", borderRadius: 999 },
    round: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" },
    liveChip: { flex: 1, minHeight: 48, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: "rgba(255,255,255,0.12)", flexDirection: "row", alignItems: "center", gap: 6 },
    liveChipText: { flex: 1, fontFamily: FONT.w800, fontSize: 16 },
    gross: { ...TYPE.num, fontSize: 36, lineHeight: 40, letterSpacing: -1 },
    dots: { flex: 1, flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-end", gap: 4 },
    dot: { width: 10, height: 10, borderRadius: 5 },
    meisteRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    heroFoto: { overflow: "hidden", backgroundColor: "#141210" },
    // Text direkt auf dem Foto: leichter Schatten, damit er auch auf hellen Bildstellen lesbar bleibt.
    schatten: { textShadowColor: "rgba(0,0,0,0.55)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 },
    datumPill: { height: 26, borderRadius: 999, justifyContent: "center", flexShrink: 1 },
    glas: { flexDirection: "row", borderRadius: RADIUS.tile, borderWidth: StyleSheet.hairlineWidth, paddingVertical: 12, paddingHorizontal: 14, gap: 12 },
    glasStrafen: { minWidth: 92, justifyContent: "center" },
    glasLabel: { fontFamily: FONT.w600, fontSize: 12 },
    glasBetrag: { ...TYPE.num, fontSize: 26, lineHeight: 30, marginTop: 2 },
    glasStatus: { flexDirection: "row", alignItems: "center", gap: 4 },
    glasSub: { fontFamily: FONT.w500, fontSize: 12 },
    glasTrenner: { width: StyleSheet.hairlineWidth },
    glasSpiel: { flex: 1, justifyContent: "center", gap: 8 },
    glasZeile: { flexDirection: "row", alignItems: "center", gap: 8 },
    glasName: { fontFamily: FONT.w600, fontSize: 14 },
  });
