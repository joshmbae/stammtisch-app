import React from "react";
import { Image, StyleSheet, Text, View, ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { MemberProfile, SpielEreignisTyp } from "../../types";
import { FONT, MAX_FONT_SCALE, RADIUS, TYPE, ThemeColors } from "../../constants/design";
import { useColors, useThemedStyles } from "../../contexts/ThemeContext";
import { AbendStats, meisteBei } from "../../utils/abendStats";
import { HomeHero, terminStart } from "../../utils/terminPhase";
import { formatWochentagDatum } from "../../utils/date";
import { displayName, formatEuro, formatBetrag } from "../../utils/format";
import { AvatarStack, Button, Emoji, FlipCountdown, LiveTimer, PressableScale, PulseDot, Scrim } from "../ui";
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
  /** Zeitliche Einordnung oben links, z. B. „Als Nächstes“ oder „Zuletzt“. */
  rolle?: string;
  /** Füllt die Höhe der Umgebung (im Karussell gleich hohe Karten). */
  fill?: boolean;
  /** Seitenpunkte am unteren Rand der Karte (im Karussell). */
  punkte?: { anzahl: number; aktiv: number; onWahl: (i: number) => void };
}

/** Punkte am unteren Kartenrand: welche Karte im Karussell, antippbar. */
function Punkte({ anzahl, aktiv, onWahl, hell }: { anzahl: number; aktiv: number; onWahl: (i: number) => void; hell: boolean }) {
  const styles = useThemedStyles(makeStyles);
  if (anzahl < 2) return null;
  const farbe = hell ? "#FFFFFF" : "#1C1B19";
  return (
    <View style={styles.seitenPunkte} pointerEvents="box-none">
      {/* Leicht getönte Kapsel, damit die Punkte auch auf bunten Fotos lesbar sind. */}
      <View style={[styles.punktKapsel, { backgroundColor: hell ? "rgba(0,0,0,0.16)" : "rgba(28,27,25,0.08)" }]}>
      {Array.from({ length: anzahl }, (_, i) => (
        <PressableScale key={i} onPress={() => onWahl(i)} hitSlop={{ top: 8, bottom: 8, left: 2, right: 2 }} scaleTo={0.9} accessibilityLabel={`Termin ${i + 1} von ${anzahl}`}>
          <View style={[styles.seitenPunkt, { backgroundColor: farbe, opacity: i === aktiv ? 0.95 : 0.35 }, i === aktiv && styles.seitenPunktAktiv]} />
        </PressableScale>
      ))}
      </View>
    </View>
  );
}

/** Name des Termins, groß oben links: „Stammtisch“ oder der Titel der Veranstaltung. */
function terminName(t: { titel?: string; art: string }): string {
  return t.titel ?? (t.art === "stammtisch" ? "Stammtisch" : t.art === "geburtstag" ? "Geburtstag" : "Veranstaltung");
}

/**
 * Die große Karte oben auf Home, in drei Zuständen, die sich von selbst
 * ablösen: vor dem Abend (Countdown, zusagen), während des Abends (Tippen
 * öffnet den Termin, die Kacheln direkt Strafen bzw. Spiel) und danach
 * (kurzes Fazit). Die ganze Fläche öffnet den Termin. Oben links steht klein,
 * wo der Termin zeitlich liegt (`rolle`), darunter groß sein Name.
 */
export function HeroCard(props: Props) {
  switch (props.hero.phase) {
    case "vorher": return <Vorher {...props} />;
    case "live": return <Live {...props} />;
    case "danach": return <Danach {...props} />;
    default: return <Leer />;
  }
}

const oeffne = (id: string, bereich?: "strafen" | "spiel") => router.push(bereich ? `/termin/${id}?bereich=${bereich}` : `/termin/${id}`);

function useHeroFlaeche(art: "blau" | "live" | "senf"): ViewStyle {
  const c = useColors();
  const fl = {
    blau: { bg: c.heroBlue, edge: c.heroBlueEdge },
    live: { bg: c.live, edge: c.liveEdge },
    senf: { bg: c.mustardSoft, edge: c.mustardEdge },
  }[art];
  return { backgroundColor: fl.bg, borderColor: fl.edge, borderWidth: 1 };
}

/**
 * Zuletzt gemessene Höhe der „Nächster“-Karte, damit „Letzter“ genauso hoch
 * ist und beim Umschalten nichts springt. Startwert = gemessene Höhe bei
 * normaler Schriftgröße, falls „Nächster“ noch nicht zu sehen war.
 */
let vorherHoehe = 261;

const zeitText = (d: Date) => d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

function Vorher({ hero, now, members, stammtischzeit, meinStatus, onRsvp, rsvpBusy, rolle, fill, punkte }: Props) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const flaecheBlau = useHeroFlaeche("blau");
  if (hero.phase !== "vorher") return null;
  const t = hero.termin;
  // Stammtische im Markenblau, Veranstaltungen im Preußischblau – gleich
  // aufgebaut, beim Wischen über Ton und Tiefe sofort unterscheidbar.
  const ev = t.art !== "stammtisch";
  const p = {
    flaeche: ev ? ({ backgroundColor: c.event, borderColor: "transparent", borderWidth: 1 } as ViewStyle) : flaecheBlau,
    text: ev ? c.onEvent : c.onHeroBlue, sub: ev ? c.eventSub : c.heroBlueSub,
    kachel: ev ? c.eventInner : c.heroBlueInner, ziffer: c.heroBlueSub,
    spur: "rgba(255,255,255,0.2)", fuell: c.mustard,
    ring: ev ? c.event : c.isDark ? c.heroBlue : c.background,
    dabei: undefined, offen: { bg: c.card, fg: c.textDark },
    nicht: { bg: "rgba(255,255,255,0.14)", fg: ev ? c.onEvent : c.onHeroBlue }, hell: true,
  };
  const start = terminStart(t, stammtischzeit) ?? (() => { const d = new Date(`${t.datum}T00:00:00`); d.setHours(19, 0, 0, 0); return d; })();
  const zugesagt = members.filter((m) => t.anwesenheit?.includes(m.id));
  const dabei = meinStatus === "ja";
  const abgesagt = meinStatus === "nein";
  const name = terminName(t);
  const wann = `${formatWochentagDatum(new Date(`${t.datum}T00:00:00`))} · ${zeitText(start)}`;

  return (
    <PressableScale onPress={() => oeffne(t.id)} onLayout={(e) => { vorherHoehe = e.nativeEvent.layout.height; }} scaleTo={0.99} style={[styles.hero, p.flaeche, fill && styles.fuellen, punkte && styles.mitPunkten]} accessibilityLabel={`${rolle ?? "Als Nächstes"}: ${name}, ${formatWochentagDatum(new Date(`${t.datum}T00:00:00`))}, öffnen`}>
      <View style={{ gap: 2 }}>
        {/* Einordnung links, Datum rechts – eine Zeile, darunter groß der Name. */}
        <View style={styles.row}>
          <Text style={[styles.label, { color: p.sub, flexShrink: 1 }]} numberOfLines={1}>{rolle ?? "Als Nächstes"}</Text>
          <View style={styles.datumZeile}>
            <Text style={[styles.chipText, { color: p.text }]} numberOfLines={1}>{wann}</Text>
            <Ionicons name="chevron-forward" size={14} color={p.text} />
          </View>
        </View>
        <Text style={[styles.name, { color: p.text }]} numberOfLines={2} maxFontSizeMultiplier={MAX_FONT_SCALE} accessibilityRole="header">{name}</Text>
      </View>
      <FlipCountdown ziel={start} now={now} tileColor={p.kachel} digitColor={p.ziffer} labelColor={p.text} />
      <View style={[styles.row, { gap: 12 }]}>
        {zugesagt.length > 0 ? (
          <AvatarStack size={28} ringColor={p.ring} members={zugesagt.map((m) => ({ id: m.id, name: displayName(m), color: m.avatarColor, photoUri: m.photoUri }))} />
        ) : null}
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={[styles.small, { color: p.text, fontFamily: FONT.w600 }]} numberOfLines={1}>{`${zugesagt.length} von ${members.length} dabei`}</Text>
          <View style={[styles.track, { backgroundColor: p.spur }]}>
            <View style={[styles.fill, { width: `${members.length ? Math.round((zugesagt.length / members.length) * 100) : 0}%`, backgroundColor: p.fuell }]} />
          </View>
        </View>
      </View>
      <View style={styles.row}>
        <Button
          label="Bin dabei"
          icon={dabei ? "checkmark" : undefined}
          variant="primary"
          colors={dabei ? p.dabei : p.offen}
          haptic="erfolg"
          loading={rsvpBusy}
          onPress={() => onRsvp(dabei ? null : "ja")}
          style={{ flex: 1.5 }}
          accessibilityLabel={dabei ? "Bin dabei, ausgewählt. Tippen zum Zurücknehmen" : "Bin dabei"}
        />
        <Button
          label="Kann nicht"
          icon={abgesagt ? "close" : undefined}
          colors={abgesagt ? { bg: c.coral, fg: c.onCoral } : p.nicht}
          onPress={() => onRsvp(abgesagt ? null : "nein")}
          disabled={rsvpBusy}
          style={{ flex: 1 }}
          accessibilityLabel={abgesagt ? "Kann nicht, ausgewählt. Tippen zum Zurücknehmen" : "Kann nicht"}
        />
      </View>
      {punkte ? <Punkte {...punkte} hell={p.hell} /> : null}
    </PressableScale>
  );
}

/**
 * Der laufende Abend: großer Timer, wer am Tisch sitzt, darunter ein
 * Glas-Feld mit dem Stand des Abends (Strafen, wer beim Spiel vorne liegt)
 * und die Knöpfe direkt zum Eintragen. Mit Foto füllt es die Karte wie beim
 * Rückblick, sonst die Live-Fläche.
 */
function Live({ hero, now, members, stats, stammtischzeit, spielTypen, spielName, rolle, fill, punkte }: Props) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const flaeche = useHeroFlaeche("live");
  if (hero.phase !== "live") return null;
  const t = hero.termin;
  const start = terminStart(t, stammtischzeit) ?? now;
  const amTisch = members.filter((m) => t.anwesenheit?.includes(m.id));
  const foto = !!t.bildUrl;
  const leise = foto ? "rgba(255,255,255,0.9)" : c.liveSub;
  const glas = foto
    ? { backgroundColor: "rgba(20,18,16,0.3)", borderColor: "rgba(255,255,255,0.18)" }
    : { backgroundColor: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.14)" };
  const trenner = "rgba(255,255,255,0.18)";
  const schatten = foto ? styles.schatten : null;
  const was = terminName(t);

  // Stand des Abends: Strafen bisher und wer beim Spiel vorne liegt (bis zu zwei Ereignisse).
  const spiel = stats
    ? spielTypen.map((typ) => ({ typ, wer: meisteBei(stats, typ.id, members) })).filter((z) => z.wer).slice(0, 2)
    : [];
  const spalten: { key: string; emoji: string; label: string; wert: string; sub: string }[] = [
    {
      key: "strafen",
      emoji: SYMBOL.strafe,
      label: "Strafen",
      wert: formatBetrag(stats?.strafenSumme ?? 0),
      sub: !stats || stats.strafenSumme === 0 ? "noch keine" : stats.strafenOffen > 0 ? `${formatBetrag(stats.strafenOffen)} offen` : "bezahlt",
    },
    ...(spiel.length > 0
      ? spiel.map(({ typ, wer }) => ({
          key: typ.id,
          emoji: typ.emoji ?? "🎲",
          label: typ.label,
          wert: wer!.members.length === 1 ? displayName(wer!.members[0]) : `${displayName(wer!.members[0])} +${wer!.members.length - 1}`,
          sub: `${wer!.anzahl}×${spiel.length > 1 ? "" : " – vorne"}`,
        }))
      : spielName
        ? [{ key: "spiel", emoji: spielTypen[0]?.emoji ?? "🎲", label: spielName, wert: "–", sub: "noch nichts" }]
        : []),
  ];

  return (
    <PressableScale
      onPress={() => oeffne(t.id)}
      scaleTo={0.99}
      style={[styles.hero, foto ? styles.heroFoto : [flaeche, { overflow: "hidden" }], fill && styles.fuellen, punkte && styles.mitPunkten]}
      accessibilityLabel={`${was} läuft gerade seit ${zeitText(start)}, ${amTisch.length} am Tisch, ${formatEuro(stats?.strafenSumme ?? 0)} Euro Strafen. Öffnen`}
    >
      {foto ? (
        <>
          <Image source={{ uri: t.bildUrl! }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityIgnoresInvertColors />
          <Scrim top={0.55} bottom={0.9} />
        </>
      ) : (
        <View style={[styles.liveRing, { borderColor: "rgba(255,255,255,0.06)" }]} pointerEvents="none" />
      )}

      <View style={[styles.row, { alignItems: "flex-start" }]}>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <View style={styles.liveLabelZeile}>
            <PulseDot color={c.liveAccent} size={8} />
            <Text style={[styles.label, { color: c.liveAccent }, schatten]} numberOfLines={1}>{rolle ?? "Läuft gerade"}</Text>
          </View>
          <Text style={[styles.name, { color: "#FFFFFF" }, schatten]} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE} accessibilityRole="header">{was}</Text>
        </View>
        <View style={[styles.round, foto && { backgroundColor: "rgba(20,18,16,0.45)" }]}>
          <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
        </View>
      </View>

      <View style={[styles.row, { alignItems: "flex-end" }]}>
        <View style={{ flexShrink: 1 }}>
          <LiveTimer start={start} now={now} style={[styles.liveTimer, { color: c.onLive }, schatten]} />
          <Text style={[styles.small, { color: leise }, schatten]} numberOfLines={1}>{`seit ${zeitText(start)} · ${amTisch.length} am Tisch`}</Text>
        </View>
        {amTisch.length > 0 ? (
          <View style={{ paddingBottom: 4 }}>
            <AvatarStack size={30} max={5} ringColor={foto ? "#141210" : c.live} members={amTisch.map((m) => ({ id: m.id, name: displayName(m), color: m.avatarColor, photoUri: m.photoUri }))} />
          </View>
        ) : null}
      </View>

      <View style={[styles.glas, glas]}>
        {foto ? <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} /> : null}
        {spalten.map((sp, i) => (
          <React.Fragment key={sp.key}>
            {i > 0 ? <View style={[styles.glasTrenner, { backgroundColor: trenner }]} /> : null}
            <View style={styles.glasSpalte} accessible accessibilityLabel={`${sp.label}: ${sp.wert}, ${sp.sub}`}>
              <View style={styles.glasKopf}>
                <Emoji size={12}>{sp.emoji}</Emoji>
                <Text style={[styles.glasLabel, { color: leise }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{sp.label}</Text>
              </View>
              <Text style={[styles.glasWert, { color: "#FFFFFF" }]} numberOfLines={1} adjustsFontSizeToFit={spalten.length > 1} minimumFontScale={0.7} maxFontSizeMultiplier={MAX_FONT_SCALE}>{sp.wert}</Text>
              <Text style={[styles.glasSub, { color: leise }]} numberOfLines={1}>{sp.sub}</Text>
            </View>
          </React.Fragment>
        ))}
      </View>

      <View style={styles.row}>
        {/* Direkt in den passenden Bereich des Live-Termins: ein Tipp bis zum Eintragen. */}
        <PressableScale onPress={() => oeffne(t.id, "strafen")} scaleTo={0.96} style={[styles.liveChip, styles.liveChipHell]} accessibilityLabel="Strafe eintragen">
          <Ionicons name="add" size={20} color={c.live} />
          <Text style={[styles.liveChipText, { color: c.live }]} numberOfLines={1}>Strafe</Text>
        </PressableScale>
        {spielName ? (
          <PressableScale onPress={() => oeffne(t.id, "spiel")} scaleTo={0.96} style={[styles.liveChip, foto && { backgroundColor: "rgba(20,18,16,0.45)" }]} accessibilityLabel={`${spielName} eintragen`}>
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={[styles.liveChipText, { color: "#FFFFFF" }]} numberOfLines={1}>{spielName}</Text>
          </PressableScale>
        ) : null}
      </View>
      {punkte ? <Punkte {...punkte} hell /> : null}
    </PressableScale>
  );
}

/**
 * Rückblick auf den letzten Abend. Mit Foto füllt es die Karte (dunkler
 * Verlauf für die Lesbarkeit), sonst die Senf-Fläche. Wer da war, darunter
 * ein Glas-Feld: Strafen des Abends und wer beim Spiel vorne lag. Antippen
 * öffnet den Danach-Bereich; gleich hoch wie die „Nächster“-Karte.
 */
function Danach({ hero, now, members, stats, spielTypen, rolle, fill, punkte }: Props) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const flaeche = useHeroFlaeche("senf");
  if (hero.phase !== "danach" || !stats) return null;
  const t = hero.termin;
  const tag = new Date(`${t.datum}T00:00:00`);
  // „Heute“/„Gestern“ nach dem (letzten) Termintag, nicht nach dem Ende um 4 Uhr
  // früh. Bis 4 Uhr zählt die Nacht noch zum Vortag, wie das automatische Ende.
  const letzterTag = new Date(`${t.datumBis ?? t.datum}T00:00:00`).toDateString();
  const stammtischHeute = new Date(now.getTime() - 4 * 3_600_000);
  const stammtischGestern = new Date(stammtischHeute);
  stammtischGestern.setDate(stammtischGestern.getDate() - 1);
  const wann = letzterTag === stammtischHeute.toDateString() ? "Heute · " : letzterTag === stammtischGestern.toDateString() ? "Gestern · " : "";
  const name = terminName(t);
  const foto = !!t.bildUrl;
  const text = foto ? "#FFFFFF" : c.textDark;
  const leise = foto ? "rgba(255,255,255,0.92)" : c.textMid;
  const glas = foto
    ? { backgroundColor: "rgba(20,18,16,0.28)", borderColor: "rgba(255,255,255,0.18)" }
    : { backgroundColor: c.isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.6)", borderColor: c.hairline };
  const trenner = foto ? "rgba(255,255,255,0.18)" : c.border;

  const spiel = spielTypen
    .map((typ) => ({ typ, wer: meisteBei(stats, typ.id, members) }))
    .filter((z) => z.wer)
    .slice(0, 2);
  const bezahlt = stats.strafenSumme > 0 && stats.strafenOffen === 0;
  // Gleich gebaute Spalten: kleines Label mit Emoji, großer Wert, Unterzeile (Status als Punkt).
  const spalten: { key: string; emoji: string; label: string; wert: string; sub: string; punkt?: string }[] = [
    {
      key: "strafen",
      emoji: SYMBOL.strafe,
      label: "Strafen",
      wert: formatBetrag(stats.strafenSumme),
      sub: stats.strafenSumme === 0 ? "keine" : bezahlt ? "bezahlt" : `${formatBetrag(stats.strafenOffen)} offen`,
      punkt: stats.strafenSumme === 0 ? undefined : bezahlt ? c.success : c.coral,
    },
    ...spiel.map(({ typ, wer }) => ({
      key: typ.id,
      emoji: typ.emoji ?? "🎲",
      label: typ.label,
      wert: wer!.members.length === 1 ? displayName(wer!.members[0]) : `${displayName(wer!.members[0])} +${wer!.members.length - 1}`,
      // Bei drei Spalten ist kein Platz für „am meisten“ – das Label sagt, wofür.
      sub: spiel.length > 1 ? `${wer!.anzahl}×` : `${wer!.anzahl}× – am meisten`,
    })),
  ];
  const schatten = foto ? styles.schatten : null;

  return (
    <PressableScale
      onPress={() => oeffne(t.id)}
      scaleTo={0.99}
      style={[styles.hero, foto ? styles.heroFoto : flaeche, !fill && { minHeight: vorherHoehe }, fill && styles.fuellen, punkte && styles.mitPunkten]}
      accessibilityLabel={`${rolle ?? "Zuletzt"}: ${name} am ${formatWochentagDatum(tag)}: ${stats.da.length} von ${stats.mitglieder.length} waren da, ${formatEuro(stats.strafenSumme)} Euro Strafen. Öffnen`}
    >
      {foto ? (
        <>
          <Image source={{ uri: t.bildUrl! }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityIgnoresInvertColors />
          <Scrim top={0.5} bottom={0.88} />
        </>
      ) : null}

      <View style={{ gap: 2 }}>
        <View style={styles.row}>
          <Text style={[styles.label, { color: foto ? "#FFFFFF" : c.mustardText, flexShrink: 1 }, schatten]} numberOfLines={1}>{rolle ?? "Zuletzt"}</Text>
          <Text style={[styles.chipText, { color: text }, schatten]} numberOfLines={1}>{`${wann}${formatWochentagDatum(tag)}`}</Text>
        </View>
        <Text style={[styles.name, { color: text }, schatten]} numberOfLines={2} maxFontSizeMultiplier={MAX_FONT_SCALE} accessibilityRole="header">{name}</Text>
      </View>

      {/* Wer da war, direkt über den Zahlen – die Mitte bleibt fürs Foto frei. */}
      <View style={{ gap: 10 }}>
      <View style={[styles.row, { justifyContent: "flex-start" }]}>
        <AvatarStack members={stats.da.map((m) => ({ id: m.id, name: displayName(m), color: m.avatarColor, photoUri: m.photoUri }))} size={26} max={8} ringColor={foto ? "#141210" : c.mustardSoft} />
        <Text style={[styles.small, { color: leise, fontFamily: FONT.w600 }, schatten]} numberOfLines={1}>{`${stats.da.length} von ${stats.mitglieder.length} da`}</Text>
      </View>
      <View style={[styles.glas, glas]}>
        {foto ? <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} /> : null}
        {spalten.map((sp, i) => (
          <React.Fragment key={sp.key}>
            {i > 0 ? <View style={[styles.glasTrenner, { backgroundColor: trenner }]} /> : null}
            <View style={styles.glasSpalte} accessible accessibilityLabel={`${sp.label}: ${sp.wert}, ${sp.sub}`}>
              <View style={styles.glasKopf}>
                <Emoji size={12}>{sp.emoji}</Emoji>
                <Text style={[styles.glasLabel, { color: leise }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{sp.label}</Text>
              </View>
              <Text style={[styles.glasWert, { color: text }]} numberOfLines={1} adjustsFontSizeToFit={spalten.length > 1} minimumFontScale={0.7} maxFontSizeMultiplier={MAX_FONT_SCALE}>{sp.wert}</Text>
              <View style={styles.glasKopf}>
                {sp.punkt ? <View style={[styles.punkt, { backgroundColor: sp.punkt }]} /> : null}
                <Text style={[styles.glasSub, { color: leise }]} numberOfLines={1}>{sp.sub}</Text>
              </View>
            </View>
          </React.Fragment>
        ))}
      </View>
      </View>
      {punkte ? <Punkte {...punkte} hell={foto || c.isDark} /> : null}
    </PressableScale>
  );
}

function Leer() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const flaeche = useHeroFlaeche("blau");
  return (
    <View style={[styles.hero, flaeche, { minHeight: 0 }]}>
      <View style={styles.row}>
        <Text style={[styles.label, { color: c.heroBlueSub, flex: 1 }]}>Als Nächstes</Text>
      </View>
      <Text style={[styles.titel, { color: c.onHeroBlue }]}>Noch nichts geplant.</Text>
      <Button label="Termin anlegen" icon="add" onPress={() => router.push("/kalender?neu=1")} />
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    hero: { borderRadius: RADIUS.hero, padding: 18, gap: 12, minHeight: 232, justifyContent: "space-between" },
    fuellen: { flex: 1 },
    // Platz unten für die Seitenpunkte.
    mitPunkten: { paddingBottom: 34 },
    seitenPunkte: { position: "absolute", left: 0, right: 0, bottom: 10, flexDirection: "row", justifyContent: "center" },
    punktKapsel: { flexDirection: "row", alignItems: "center", gap: 6, height: 18, paddingHorizontal: 8, borderRadius: 9 },
    seitenPunkt: { width: 6, height: 6, borderRadius: 3 },
    seitenPunktAktiv: { width: 18 },
    name: { fontFamily: FONT.w800, fontSize: 24, lineHeight: 29, letterSpacing: -0.5 },
    liveLabelZeile: { flexDirection: "row", alignItems: "center", gap: 6 },
    row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
    label: { ...TYPE.label },
    datumZeile: { flexDirection: "row", alignItems: "center", gap: 4 },
    chipText: { fontFamily: FONT.w600, fontSize: 13 },
    small: { ...TYPE.caption, fontSize: 13 },
    bodyStrong: { ...TYPE.bodyStrong },
    titel: { ...TYPE.title, fontSize: 22 },
    track: { height: 6, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.2)", overflow: "hidden" },
    fill: { height: "100%", borderRadius: 999 },
    round: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" },
    liveChip: { flex: 1, minHeight: 48, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: "rgba(255,255,255,0.14)", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
    liveChipHell: { backgroundColor: "#FFFFFF" },
    liveChipText: { fontFamily: FONT.w800, fontSize: 16, flexShrink: 1 },
    liveTimer: { fontSize: 44, lineHeight: 48, letterSpacing: -1.2 },
    liveRing: { position: "absolute", width: 280, height: 280, borderRadius: 140, borderWidth: 40, right: -100, top: -110 },
    gross: { ...TYPE.num, fontSize: 36, lineHeight: 40, letterSpacing: -1 },
    dots: { flex: 1, flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-end", gap: 4 },
    dot: { width: 10, height: 10, borderRadius: 5 },
    meisteRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    heroFoto: { overflow: "hidden", backgroundColor: "#141210" },
    // Text direkt auf dem Foto: leichter Schatten, damit er auch auf hellen Bildstellen lesbar bleibt.
    schatten: { textShadowColor: "rgba(0,0,0,0.55)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 },
    glas: { flexDirection: "row", borderRadius: RADIUS.tile, borderWidth: StyleSheet.hairlineWidth, paddingVertical: 12, paddingHorizontal: 14, gap: 12, overflow: "hidden" },
    glasSpalte: { flex: 1, minWidth: 0, gap: 3 },
    glasKopf: { flexDirection: "row", alignItems: "center", gap: 5 },
    glasLabel: { ...TYPE.label, fontSize: 11, letterSpacing: 0.4, flexShrink: 1 },
    glasWert: { ...TYPE.num, fontSize: 22, lineHeight: 26 },
    glasSub: { fontFamily: FONT.w500, fontSize: 12, flexShrink: 1 },
    punkt: { width: 7, height: 7, borderRadius: 4 },
    glasTrenner: { width: StyleSheet.hairlineWidth, alignSelf: "stretch" },
  });
