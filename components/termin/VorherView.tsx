import React, { useEffect, useState } from "react";
import { Linking, Platform, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Animated, { FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";
import { MemberProfile } from "../../types";
import { FONT, MAX_FONT_SCALE, RADIUS, TYPE, ThemeColors } from "../../constants/design";
import { useColors, useThemedStyles } from "../../contexts/ThemeContext";
import { TerminAbend } from "../../utils/useTerminAbend";
import { abendStats } from "../../utils/abendStats";
import { agendaPunkte, agendaText } from "../../utils/agenda";
import { formatWochentagDatum } from "../../utils/date";
import { displayName } from "../../utils/format";
import { sendErinnerungPush } from "../../utils/push";
import { Avatar, Button, Card, FlipCountdown, PressableScale } from "../ui";

const WOCHENTAG = ["SO", "MO", "DI", "MI", "DO", "FR", "SA"];
const MONAT = ["JAN", "FEB", "MÄR", "APR", "MAI", "JUN", "JUL", "AUG", "SEP", "OKT", "NOV", "DEZ"];
const uhr = (d: Date) => d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

/** Vor dem Abend: wann und wo, eigene Zusage, wer kommt, Agenda. */
export function VorherView({ abend, now, start }: { abend: TerminAbend; now: Date; start: Date | null }) {
  return (
    <>
      <WannWo abend={abend} now={now} start={start} />
      <Zusage abend={abend} />
      <WerKommt abend={abend} start={start} />
      <Agenda abend={abend} />
    </>
  );
}

function WannWo({ abend, now, start }: { abend: TerminAbend; now: Date; start: Date | null }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const t = abend.termin!;
  const tag = new Date(`${t.datum}T00:00:00`);
  const ort = t.ort || abend.verordnung.treffpunkt;
  const flaeche = { backgroundColor: c.heroBlue, borderColor: c.heroBlueEdge, borderWidth: 1 };

  function route() {
    if (!ort) return;
    const q = encodeURIComponent(ort);
    const url = Platform.select({
      ios: `maps://?q=${q}`,
      android: `geo:0,0?q=${q}`,
      default: `https://www.google.com/maps/search/?api=1&query=${q}`,
    });
    Linking.openURL(url).catch(() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`));
  }

  return (
    <Card enterIndex={0} style={[styles.hero, flaeche]}>
      <View style={styles.wannZeile}>
        <View style={[styles.datumBlock, { backgroundColor: c.heroBlueInner }]} accessibilityLabel={tag.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}>
          <Text style={[styles.datumKlein, { color: c.heroBlueSub }]}>{WOCHENTAG[tag.getDay()]}</Text>
          <Text style={[styles.datumTag, { color: c.onHeroBlue }]} maxFontSizeMultiplier={1.1}>{tag.getDate()}</Text>
          <Text style={[styles.datumKlein, { color: c.heroBlueSub }]}>{MONAT[tag.getMonth()]}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.zeit, { color: c.onHeroBlue }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            {start ? `${uhr(start)} Uhr` : "Uhrzeit offen"}
          </Text>
          {ort ? <Text style={[styles.ort, { color: c.onHeroBlue }]} numberOfLines={2}>{ort}</Text> : null}
          {t.notizen ? <Text style={[styles.notiz, { color: "rgba(255,255,255,0.78)" }]} numberOfLines={2}>{t.notizen}</Text> : null}
        </View>
        {ort ? (
          <PressableScale onPress={route} style={[styles.routeKnopf, { backgroundColor: "rgba(255,255,255,0.16)" }]} accessibilityLabel={`Route zu ${ort}`}>
            <Ionicons name="navigate-outline" size={20} color={c.onHeroBlue} />
          </PressableScale>
        ) : null}
      </View>
      {start && start > now ? (
        <FlipCountdown ziel={start} now={now} tileColor={c.heroBlueInner} digitColor={c.heroBlueSub} labelColor={c.onHeroBlue} />
      ) : null}
    </Card>
  );
}

function Zusage({ abend }: { abend: TerminAbend }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const t = abend.termin!;
  const ich = abend.activeMemberId;
  const status = !ich ? null : t.anwesenheit?.includes(ich) ? "ja" : t.absagen?.includes(ich) ? "nein" : null;
  const gespeicherterGrund = ich ? t.absageGruende?.[ich] ?? "" : "";
  const [grund, setGrund] = useState(gespeicherterGrund);
  const [busy, setBusy] = useState(false);
  useEffect(() => setGrund(gespeicherterGrund), [gespeicherterGrund]);

  if (!ich) return null;

  async function setzen(s: "ja" | "nein" | null) {
    if (busy) return;
    setBusy(true);
    try { await abend.rsvp(s, s === "nein" ? grund.trim() || undefined : undefined); } finally { setBusy(false); }
  }

  function grundSpeichern() {
    if (grund.trim() === gespeicherterGrund) return;
    abend.rsvp("nein", grund.trim() || undefined);
  }

  return (
    <Card enterIndex={1} style={{ gap: 12 }}>
      <Text style={styles.label}>Deine Zusage</Text>
      <View style={styles.zeile} accessibilityRole="radiogroup">
        <Button
          label="Bin dabei"
          icon={status === "ja" ? "checkmark" : undefined}
          colors={status === "ja" ? { bg: c.success, fg: c.onAccent } : { bg: c.cardAlt, fg: c.textDark }}
          haptic="erfolg"
          onPress={() => setzen(status === "ja" ? null : "ja")}
          disabled={busy}
          style={{ flex: 1 }}
          accessibilityLabel={status === "ja" ? "Bin dabei, ausgewählt. Tippen zum Zurücknehmen" : "Bin dabei"}
        />
        <Button
          label="Kann nicht"
          icon={status === "nein" ? "close" : undefined}
          colors={status === "nein" ? { bg: c.coral, fg: c.onCoral } : { bg: c.cardAlt, fg: c.textDark }}
          onPress={() => setzen(status === "nein" ? null : "nein")}
          disabled={busy}
          style={{ flex: 1 }}
          accessibilityLabel={status === "nein" ? "Kann nicht, ausgewählt. Tippen zum Zurücknehmen" : "Kann nicht"}
        />
      </View>
      {status === "nein" ? (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={{ gap: 6 }}>
          <Text style={styles.feldLabel}>Grund (optional, sieht die Runde)</Text>
          <TextInput
            style={styles.input}
            value={grund}
            onChangeText={setGrund}
            onBlur={grundSpeichern}
            onSubmitEditing={grundSpeichern}
            returnKeyType="done"
            placeholder="z. B. Spätschicht"
            placeholderTextColor={c.textLight}
            accessibilityLabel="Grund für die Absage"
          />
        </Animated.View>
      ) : null}
    </Card>
  );
}

function WerKommt({ abend, start }: { abend: TerminAbend; start: Date | null }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const t = abend.termin!;
  const { mitglieder } = abendStats(t, abend.members, [], []);
  const dabei = mitglieder.filter((m) => t.anwesenheit?.includes(m.id));
  const abgesagt = mitglieder.filter((m) => t.absagen?.includes(m.id));
  const offen = mitglieder.filter((m) => !t.anwesenheit?.includes(m.id) && !t.absagen?.includes(m.id));
  const n = Math.max(1, mitglieder.length);
  const name = (m: MemberProfile) => (m.id === abend.activeMemberId ? "Du" : displayName(m));
  const [erinnert, setErinnert] = useState<string[]>([]);
  const zuProfil = (m: MemberProfile) => router.push(`/member/${m.id}`);
  const [sendet, setSendet] = useState<string | null>(null);

  /** Erst per Push direkt an die Person; ohne registriertes Gerät über das Teilen-Menü. */
  async function erinnern(m: MemberProfile) {
    if (sendet || erinnert.includes(m.id)) return;
    const wann = `${formatWochentagDatum(new Date(`${t.datum}T00:00:00`))}${start ? ` um ${uhr(start)}` : ""}`;
    const ich = abend.members.find((x) => x.id === abend.activeMemberId);
    setSendet(m.id);
    try {
      const perPush = await sendErinnerungPush(m.id, {
        title: `${ich ? displayName(ich) : "Die Runde"} fragt: Bist du dabei?`,
        body: `Stammtisch am ${wann}. Sag kurz in der App zu oder ab.`,
        subtitle: abend.verordnung.name || undefined,
        url: `/termin/${t.id}`,
        terminId: t.id,
      });
      if (perPush) {
        setErinnert((prev) => [...prev, m.id]);
        return;
      }
      const r = await Share.share({ message: `Servus ${displayName(m)}, bist du am ${wann} beim Stammtisch dabei? Sag kurz in der App zu oder ab.` });
      if (r.action !== Share.dismissedAction) setErinnert((prev) => [...prev, m.id]);
    } catch { /* Teilen abgebrochen oder nicht verfügbar */ } finally {
      setSendet(null);
    }
  }

  return (
    <Card enterIndex={2} style={{ gap: 10 }}>
      <View style={styles.kopf}>
        <Text style={styles.kartenTitel} accessibilityRole="header">Wer kommt</Text>
        <Text style={styles.meta}>{`${dabei.length} von ${mitglieder.length} dabei`}</Text>
      </View>
      <View style={styles.balken} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={{ flex: dabei.length / n, backgroundColor: c.success }} />
        <View style={{ flex: abgesagt.length / n, backgroundColor: c.borderDark }} />
        <View style={{ flex: offen.length / n }} />
      </View>

      {dabei.length > 0 ? (
        <>
          <Text style={[styles.gruppe, { color: c.successText }]}>{`Dabei · ${dabei.length}`}</Text>
          <View style={styles.raster}>
            {dabei.map((m) => (
              <PressableScale key={m.id} onPress={() => zuProfil(m)} scaleTo={0.96} style={styles.rasterZelle} accessibilityRole="link" accessibilityLabel={`${name(m)} ist dabei. Profil öffnen`}>
                <Avatar name={displayName(m)} color={m.avatarColor} photoUri={m.photoUri} size={30} />
                <Text style={styles.rasterName} numberOfLines={1}>{name(m)}</Text>
              </PressableScale>
            ))}
          </View>
        </>
      ) : null}

      {abgesagt.length > 0 ? (
        <>
          <Text style={styles.gruppe}>{`Abgesagt · ${abgesagt.length}`}</Text>
          {/* Wie „Dabei“ im Raster; der Grund steht klein unter dem Namen. */}
          <View style={styles.raster}>
            {abgesagt.map((m) => {
              const grund = t.absageGruende?.[m.id];
              return (
                <PressableScale key={m.id} onPress={() => zuProfil(m)} scaleTo={0.97} style={[styles.rasterZelle, styles.rasterZelleBreit]} accessibilityRole="link" accessibilityLabel={`${name(m)} hat abgesagt${grund ? `: ${grund}` : ""}. Profil öffnen`}>
                  <Avatar name={displayName(m)} color={m.avatarColor} photoUri={m.photoUri} size={30} />
                  <View style={{ flexShrink: 1, minWidth: 0 }}>
                    <Text style={styles.rasterName} numberOfLines={1}>{name(m)}</Text>
                    {grund ? <Text style={styles.rasterGrund} numberOfLines={2}>{grund}</Text> : null}
                  </View>
                </PressableScale>
              );
            })}
          </View>
        </>
      ) : null}

      {offen.length > 0 ? (
        <>
          <Text style={styles.gruppe}>{`Offen · ${offen.length}`}</Text>
          {offen.map((m) => {
            const schon = erinnert.includes(m.id);
            const ich = m.id === abend.activeMemberId;
            return (
              <View key={m.id} style={styles.personZeile}>
                {/* Person öffnet das Profil, „Erinnern“ rechts bleibt ein eigener Knopf. */}
                <PressableScale onPress={() => zuProfil(m)} scaleTo={0.98} style={styles.personInfo} accessibilityRole="link" accessibilityLabel={`${name(m)}, ${schon ? "erinnert" : "noch keine Antwort"}. Profil öffnen`}>
                  <Avatar name={displayName(m)} color={m.avatarColor} size={34} absent />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.personName} numberOfLines={1}>{name(m)}</Text>
                    <Text style={styles.personSub}>{schon ? "erinnert" : "noch keine Antwort"}</Text>
                  </View>
                </PressableScale>
                {ich ? null : (
                  <PressableScale onPress={() => erinnern(m)} disabled={sendet === m.id} style={[styles.erinnern, schon && { backgroundColor: c.greenSoft }]} accessibilityLabel={`${displayName(m)} erinnern`}>
                    <Ionicons name={schon ? "checkmark" : "notifications-outline"} size={16} color={schon ? c.greenText : c.blue} />
                    <Text style={[styles.erinnernText, schon && { color: c.greenText }]}>{schon ? "Erinnert" : sendet === m.id ? "Sendet …" : "Erinnern"}</Text>
                  </PressableScale>
                )}
              </View>
            );
          })}
        </>
      ) : null}
    </Card>
  );
}

function Agenda({ abend }: { abend: TerminAbend }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const punkte = agendaPunkte(abend.agendaText);
  const [offen, setOffen] = useState(false);
  const [neu, setNeu] = useState("");

  function hinzufuegen() {
    const p = neu.trim();
    if (!p) return;
    abend.agendaSpeichern(agendaText([...punkte, p])).catch(() => {});
    setNeu("");
    setOffen(false);
  }

  function entfernen(i: number) {
    abend.agendaSpeichern(agendaText(punkte.filter((_, k) => k !== i))).catch(() => {});
  }

  return (
    <Card enterIndex={3} style={{ gap: 10 }}>
      <View style={styles.kopf}>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8, flex: 1 }}>
          <Text style={styles.kartenTitel} accessibilityRole="header">Agenda</Text>
          {punkte.length > 0 ? <Text style={styles.meta}>{punkte.length === 1 ? "1 Punkt" : `${punkte.length} Punkte`}</Text> : null}
        </View>
        <PressableScale onPress={() => setOffen((v) => !v)} style={styles.plusKnopf} accessibilityLabel="Agenda-Punkt hinzufügen" accessibilityState={{ expanded: offen }}>
          <Ionicons name={offen ? "close" : "add"} size={18} color={c.blue} />
          <Text style={styles.plusText}>{offen ? "Abbrechen" : "Punkt"}</Text>
        </PressableScale>
      </View>

      {offen ? (
        <Animated.View entering={FadeIn.duration(200)} style={styles.neuZeile}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={neu}
            onChangeText={setNeu}
            onSubmitEditing={hinzufuegen}
            returnKeyType="done"
            autoFocus
            placeholder="Worüber wollt ihr reden?"
            placeholderTextColor={c.textLight}
            accessibilityLabel="Neuer Agenda-Punkt"
          />
          <Button label="Hinzufügen" size="sm" variant="blue" onPress={hinzufuegen} disabled={!neu.trim()} />
        </Animated.View>
      ) : null}

      {punkte.length === 0 && !offen ? (
        <Text style={styles.leer}>Noch nichts geplant. Was steht an?</Text>
      ) : (
        punkte.map((p, i) => (
          <Animated.View key={`${i}-${p}`} layout={LinearTransition} style={[styles.punktZeile, i > 0 && styles.trenner]}>
            <View style={styles.nummer}><Text style={styles.nummerText}>{i + 1}</Text></View>
            <Text style={styles.punktText}>{p}</Text>
            <PressableScale onPress={() => entfernen(i)} style={styles.entfernen} accessibilityLabel={`Punkt „${p}" entfernen`} hitSlop={4}>
              <Ionicons name="close" size={16} color={c.textMuted} />
            </PressableScale>
          </Animated.View>
        ))
      )}
    </Card>
  );
}

/**
 * Feste Leiste unten: Abend vorzeitig starten. Ab 30 Minuten vor Beginn bzw.
 * am Termintag, wenn keine Uhrzeit hinterlegt ist; zur Startzeit wird der
 * Abend ohnehin von selbst live.
 */
export function StartLeiste({ abend, now, start }: { abend: TerminAbend; now: Date; start: Date | null }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const [busy, setBusy] = useState(false);
  const t = abend.termin!;
  const tag = new Date(`${t.datum}T00:00:00`);
  const ab = start ? new Date(start.getTime() - 30 * 60_000) : tag;
  const moeglich = now >= ab;

  async function starten() {
    setBusy(true);
    try { await abend.abendStarten(); } finally { setBusy(false); }
  }

  return (
    <View style={styles.leiste}>
      <PressableScale
        onPress={starten}
        disabled={!moeglich || busy}
        haptic="mittel"
        style={styles.startKnopf}
        accessibilityLabel={moeglich ? "Abend jetzt starten" : `Abend starten, möglich ab ${formatWochentagDatum(ab)} ${uhr(ab)}`}
      >
        <View style={[styles.startPunkt, { backgroundColor: moeglich ? c.coral : c.textMuted }]} />
        <Text style={styles.startText}>Abend starten</Text>
        <Text style={styles.startSub}>
          {moeglich ? (start ? `sonst automatisch um ${uhr(start)}` : "") : `ab ${WOCHENTAG_LANG(ab)} ${start ? uhr(ab) : ""}`.trim()}
        </Text>
      </PressableScale>
    </View>
  );
}

const WOCHENTAG_LANG = (d: Date) => ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"][d.getDay()];

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    hero: { borderRadius: RADIUS.hero, padding: 16, gap: 16 },
    wannZeile: { flexDirection: "row", alignItems: "center", gap: 14 },
    datumBlock: { width: 64, paddingVertical: 8, borderRadius: 16, alignItems: "center" },
    datumKlein: { fontFamily: FONT.w700, fontSize: 12, letterSpacing: 0.8 },
    datumTag: { fontFamily: FONT.w800, fontSize: 30, lineHeight: 34 },
    zeit: { fontFamily: FONT.w700, fontSize: 22, letterSpacing: -0.4 },
    ort: { fontFamily: FONT.w600, fontSize: 15, marginTop: 2 },
    notiz: { fontFamily: FONT.w600, fontSize: 13, marginTop: 2 },
    routeKnopf: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },

    label: { ...TYPE.label, color: c.textMuted },
    zeile: { flexDirection: "row", gap: 10 },
    feldLabel: { ...TYPE.caption, fontSize: 13, color: c.textMuted },
    input: {
      minHeight: 44, borderRadius: RADIUS.md, paddingHorizontal: 14, backgroundColor: c.cardAlt,
      fontFamily: FONT.w500, fontSize: 15, color: c.textDark,
    },

    kopf: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
    kartenTitel: { ...TYPE.heading, color: c.textDark },
    meta: { ...TYPE.caption, fontSize: 13, color: c.textMuted },
    balken: { flexDirection: "row", height: 8, borderRadius: 4, overflow: "hidden", backgroundColor: c.cardAlt, gap: 2 },
    gruppe: { ...TYPE.label, color: c.textMuted, marginTop: 6 },
    raster: { flexDirection: "row", flexWrap: "wrap", rowGap: 10 },
    rasterZelle: { width: "33.33%", flexDirection: "row", alignItems: "center", gap: 12, paddingRight: 8 },
    // Absagen mit Grund brauchen mehr Platz: zwei pro Reihe.
    rasterZelleBreit: { width: "50%" },
    rasterName: { fontFamily: FONT.w600, fontSize: 14, color: c.textDark, flexShrink: 1 },
    rasterGrund: { ...TYPE.caption, fontSize: 12, color: c.textMuted },
    personZeile: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 48 },
    personInfo: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 12, alignSelf: "stretch" },
    personName: { fontFamily: FONT.w600, fontSize: 15, color: c.textDark },
    personSub: { ...TYPE.caption, fontSize: 13, color: c.textMuted },
    erinnern: {
      height: 44, paddingHorizontal: 14, borderRadius: RADIUS.pill, flexDirection: "row", alignItems: "center", gap: 6,
      backgroundColor: c.blueBg,
    },
    erinnernText: { fontFamily: FONT.w600, fontSize: 14, color: c.blue },

    plusKnopf: {
      height: 44, paddingHorizontal: 14, borderRadius: RADIUS.pill, flexDirection: "row", alignItems: "center", gap: 4,
      backgroundColor: c.blueBg,
    },
    plusText: { fontFamily: FONT.w600, fontSize: 14, color: c.blue },
    neuZeile: { flexDirection: "row", alignItems: "center", gap: 8 },
    leer: { ...TYPE.body, fontSize: 14, color: c.textMuted },
    punktZeile: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 48 },
    trenner: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
    nummer: { width: 28, height: 28, borderRadius: 14, backgroundColor: c.blueBg, alignItems: "center", justifyContent: "center" },
    nummerText: { fontFamily: FONT.w700, fontSize: 13, color: c.blue },
    punktText: { flex: 1, fontFamily: FONT.w600, fontSize: 15, color: c.textDark },
    entfernen: { width: 44, height: 44, marginRight: -10, alignItems: "center", justifyContent: "center" },

    leiste: { paddingHorizontal: 16, paddingTop: 10 },
    startKnopf: {
      height: 56, borderRadius: RADIUS.pill, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
      backgroundColor: c.textDark,
      borderWidth: 1, borderColor: c.textDark,
    },
    startPunkt: { width: 10, height: 10, borderRadius: 5 },
    startText: { fontFamily: FONT.w700, fontSize: 17, color: c.background },
    startSub: { fontFamily: FONT.w600, fontSize: 13, color: c.background, opacity: 0.75 },
  });
