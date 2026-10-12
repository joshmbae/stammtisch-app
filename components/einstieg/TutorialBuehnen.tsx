import React, { useEffect } from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { FONT, RADIUS, TYPE, ThemeColors, glow } from "../../constants/design";
import { SYMBOL } from "../../constants/symbole";
import { useColors, useThemedStyles } from "../../contexts/ThemeContext";
import StammtischLogo from "../StammtischLogo";
import { Avatar, Emoji, IconSquircle, Krone, PulseDot } from "../ui";

/**
 * Kleine Nachbauten der echten Oberfläche für das Tutorial. Rein zum
 * Anschauen: nicht antippbar und für Screenreader ausgeblendet – die
 * Bedeutung steht im Text der Seite.
 */

/** Sanftes Auf und Ab; bei „Bewegung reduzieren“ steht es still. */
function useSchweben(verzoegerung = 0, hub = 6) {
  const reduce = useReducedMotion();
  const y = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    y.value = withDelay(
      verzoegerung,
      withRepeat(withSequence(withTiming(-hub, { duration: 1600, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.sin) })), -1)
    );
  }, [reduce]);
  return useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
}

/** Pulsierender Ring um ein Element: „hier tippen“. */
function TippRing({ farbe, radius }: { farbe: string; radius: number }) {
  const reduce = useReducedMotion();
  const p = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    p.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }), -1);
  }, [reduce]);
  const stil = useAnimatedStyle(() => ({ opacity: reduce ? 0 : 0.55 * (1 - p.value), transform: [{ scale: 1 + p.value * 0.18 }] }));
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, borderWidth: 2, borderColor: farbe }, stil]} />;
}

/** Gemeinsamer Rahmen: getönte Bühne mit dekorativem Ring. */
function Buehne({ bg, ring, children }: { bg: string; ring: string; children: React.ReactNode }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.buehne, { backgroundColor: bg }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none">
      <View style={[styles.ring, { borderColor: ring }]} />
      <View style={[styles.ring2, { borderColor: ring }]} />
      {children}
    </View>
  );
}

// ─── 1 · Willkommen ─────────────────────────────────────────────────────────

function Bereich({ emoji, label, stil, verzoegerung }: { emoji: string; label: string; stil: ViewStyle; verzoegerung: number }) {
  const styles = useThemedStyles(makeStyles);
  const schweben = useSchweben(verzoegerung, 5);
  return (
    <Animated.View style={[styles.bereich, stil, schweben]}>
      <Emoji size={15}>{emoji}</Emoji>
      <Text style={styles.bereichText}>{label}</Text>
    </Animated.View>
  );
}

export function BuehneWillkommen({ logoUrl }: { logoUrl?: string }) {
  const c = useColors();
  const schweben = useSchweben(0, 4);
  return (
    <Buehne bg={c.mustardSoft} ring={c.heroStyle === "outline" ? "rgba(255,201,60,0.10)" : "rgba(122,94,28,0.08)"}>
      <Animated.View style={schweben}>
        <StammtischLogo size={104} uri={logoUrl} />
      </Animated.View>
      <Bereich emoji={SYMBOL.termin} label="Termine" stil={{ top: 34, left: 22 }} verzoegerung={200} />
      <Bereich emoji={SYMBOL.kasse} label="Kasse" stil={{ top: 54, right: 20 }} verzoegerung={700} />
      <Bereich emoji={SYMBOL.spiele} label="Spiel" stil={{ bottom: 52, left: 30 }} verzoegerung={1100} />
      <Bereich emoji={SYMBOL.tabelle} label="Tabelle" stil={{ bottom: 30, right: 28 }} verzoegerung={400} />
    </Buehne>
  );
}

// ─── 2 · Zusagen ────────────────────────────────────────────────────────────

const BEISPIEL = [
  { name: "Max", farbe: "blue" as const },
  { name: "Sepp", farbe: "success" as const },
  { name: "Toni", farbe: "coral" as const },
];

function Stapel({ ring }: { ring: string }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: "row" }}>
      {BEISPIEL.map((m, i) => (
        <View key={m.name} style={{ marginLeft: i ? -8 : 0, borderRadius: 14, borderWidth: 2, borderColor: ring }}>
          <Avatar name={m.name} color={c[m.farbe]} size={24} />
        </View>
      ))}
    </View>
  );
}

export function BuehneZusagen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const schweben = useSchweben(0, 4);
  return (
    <Buehne bg={c.blueBg} ring={c.heroStyle === "outline" ? "rgba(77,124,255,0.10)" : "rgba(45,79,158,0.08)"}>
      <Animated.View style={[styles.karte, { backgroundColor: c.heroBlue, borderColor: c.heroBlueEdge }, glow(c.blue, c, 18), schweben]}>
        <Text style={[styles.kartenLabel, { color: c.heroBlueSub }]}>Nächster Stammtisch</Text>
        <Text style={[styles.kartenZeile, { color: c.onHeroBlue }]}>Fr, 16.10. · 19:30</Text>
        <View style={styles.countdown}>
          {[["3", "Tage"], ["23", "Std"], ["10", "Min"]].map(([z, l]) => (
            <View key={l} style={[styles.kachel, { backgroundColor: c.heroBlueInner }]}>
              <Text style={[styles.kachelZahl, { color: c.heroBlueSub }]}>{z}</Text>
              <Text style={[styles.kachelLabel, { color: c.onHeroBlue }]}>{l}</Text>
            </View>
          ))}
        </View>
        <View style={styles.zeile}>
          <Stapel ring={c.heroStyle === "fill" ? c.heroBlue : c.heroBlue} />
          <Text style={[styles.klein, { color: c.onHeroBlue }]}>3 von 6 dabei</Text>
        </View>
        <View>
          <View style={[styles.knopf, { backgroundColor: c.mustard }]}>
            <Ionicons name="checkmark" size={16} color={c.onMustard} />
            <Text style={[styles.knopfText, { color: c.onMustard }]}>Bin dabei</Text>
          </View>
          <TippRing farbe={c.mustard} radius={999} />
        </View>
      </Animated.View>
    </Buehne>
  );
}

// ─── 3 · Live ───────────────────────────────────────────────────────────────

export function BuehneLive({ spielName }: { spielName: string }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const dunkel = c.heroStyle === "outline";
  const schweben = useSchweben(0, 4);
  const toast = useSchweben(500, 6);
  return (
    <Buehne bg={c.greenSoft} ring={dunkel ? "rgba(61,220,151,0.10)" : "rgba(36,85,63,0.08)"}>
      <Animated.View style={[styles.karte, { backgroundColor: c.live, borderColor: c.liveEdge }, glow(c.liveAccent, c, 18), schweben]}>
        <View style={styles.zeile}>
          <PulseDot color={c.liveAccent} size={8} />
          <Text style={[styles.kartenLabel, { color: dunkel ? c.liveAccent : c.heroBlueSub }]}>Läuft gerade</Text>
        </View>
        <Text style={[styles.timer, { color: dunkel ? c.liveAccent : c.onLive }]}>1:13:05</Text>
        <View style={styles.zeile}>
          <View style={styles.liveChip}>
            <Text style={[styles.liveChipText, { color: c.onLive }]}>Strafen</Text>
            <Ionicons name="add" size={16} color={c.onLive} />
          </View>
          <View style={styles.liveChip}>
            <Text style={[styles.liveChipText, { color: c.onLive }]} numberOfLines={1}>{spielName}</Text>
            <Ionicons name="add" size={16} color={c.onLive} />
            <TippRing farbe={c.liveAccent} radius={14} />
          </View>
        </View>
      </Animated.View>
      <Animated.View style={[styles.toast, toast]}>
        <Emoji size={15}>{SYMBOL.spiele}</Emoji>
        <Text style={styles.toastText}>Max +1</Text>
        <View style={[styles.toastKnopf, { backgroundColor: c.cardAlt }]}>
          <Ionicons name="arrow-undo" size={12} color={c.textMid} />
          <Text style={styles.toastKnopfText}>Rückgängig</Text>
        </View>
      </Animated.View>
    </Buehne>
  );
}

// ─── 4 · Kasse ──────────────────────────────────────────────────────────────

export function BuehneKasse() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const schweben = useSchweben(0, 4);
  const haken = useSchweben(600, 5);
  return (
    <Buehne bg={c.mustardSoft} ring={c.heroStyle === "outline" ? "rgba(255,201,60,0.10)" : "rgba(122,94,28,0.08)"}>
      <Animated.View style={[styles.karte, styles.karteHell, schweben]}>
        <Text style={[styles.kartenLabel, { color: c.textMuted }]}>Kassenstand</Text>
        <Text style={[styles.gross, { color: c.textDark }]}>74,50 €</Text>
        <View style={[styles.posten, { borderTopColor: c.border }]}>
          <IconSquircle emoji={SYMBOL.zuSpaet} ton="coral" size={30} />
          <View style={{ flex: 1 }}>
            <Text style={styles.postenTitel}>Zu spät · Max</Text>
            <Text style={styles.postenSub}>bezahlt</Text>
          </View>
          <Text style={[styles.postenBetrag, { color: c.successText }]}>5 €</Text>
          <View style={[styles.haken, { backgroundColor: c.success }]}>
            <Ionicons name="checkmark" size={13} color={c.onAccent} />
          </View>
        </View>
        <View style={[styles.posten, { borderTopColor: c.border }]}>
          <IconSquircle emoji={SYMBOL.rechnung} ton="blue" size={30} />
          <View style={{ flex: 1 }}>
            <Text style={styles.postenTitel}>Rechnung Fr</Text>
            <Text style={styles.postenSub}>Sepp hat bezahlt</Text>
          </View>
          <Text style={[styles.postenBetrag, { color: c.textDark }]}>6 € p. P.</Text>
        </View>
      </Animated.View>
      <Animated.View style={[styles.stempel, { backgroundColor: c.success }, haken]}>
        <Ionicons name="checkmark-done" size={14} color={c.onAccent} />
        <Text style={[styles.stempelText, { color: c.onAccent }]}>Abgehakt</Text>
      </Animated.View>
    </Buehne>
  );
}

// ─── 5 · Tabelle ────────────────────────────────────────────────────────────

export function BuehneTabelle() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const pokal = useSchweben(300, 6);
  const saeulen = [
    { name: "Sepp", farbe: c.success, hoehe: 64, wert: "7", platz: 2 },
    { name: "Max", farbe: c.blue, hoehe: 96, wert: "9", platz: 1 },
    { name: "Toni", farbe: c.coral, hoehe: 46, wert: "5", platz: 3 },
  ];
  return (
    <Buehne bg={c.coralSoft} ring={c.heroStyle === "outline" ? "rgba(255,106,77,0.10)" : "rgba(150,63,44,0.07)"}>
      <View style={styles.podium}>
        {saeulen.map((s) => (
          <View key={s.name} style={styles.podiumSpalte}>
            {s.platz === 1 ? <Krone size={22} /> : null}
            <Avatar name={s.name} color={s.farbe} size={34} />
            <Text style={styles.podiumName}>{s.name}</Text>
            <View style={[styles.saeule, { height: s.hoehe, backgroundColor: s.platz === 1 ? c.blue : c.card }, s.platz === 1 && glow(c.blue, c, 14)]}>
              <Text style={[styles.saeulenWert, { color: s.platz === 1 ? c.onAccent : c.textDark }]}>{s.wert}</Text>
            </View>
          </View>
        ))}
      </View>
      <Animated.View style={[styles.pokal, pokal]}>
        <Emoji size={18}>{SYMBOL.pokal}</Emoji>
        <Text style={styles.pokalText}>Titel 2025</Text>
      </Animated.View>
    </Buehne>
  );
}

export const BUEHNE_HOEHE = 300;

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    buehne: { height: BUEHNE_HOEHE, borderRadius: 32, overflow: "hidden", alignItems: "center", justifyContent: "center" },
    ring: { position: "absolute", width: 320, height: 320, borderRadius: 160, borderWidth: 40, right: -150, top: -150 },
    ring2: { position: "absolute", width: 220, height: 220, borderRadius: 110, borderWidth: 30, left: -110, bottom: -120 },

    bereich: {
      position: "absolute", flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, height: 36,
      borderRadius: RADIUS.pill, backgroundColor: c.card, borderWidth: StyleSheet.hairlineWidth, borderColor: c.hairline, ...glow(c.mustard, c, 10),
    },
    bereichText: { fontFamily: FONT.w700, fontSize: 14, color: c.textDark },

    karte: { width: 284, borderRadius: 24, padding: 16, gap: 10, borderWidth: 1 },
    karteHell: { backgroundColor: c.card, borderColor: c.hairline },
    kartenLabel: { ...TYPE.label, fontSize: 11 },
    kartenZeile: { fontFamily: FONT.w700, fontSize: 15 },
    zeile: { flexDirection: "row", alignItems: "center", gap: 8 },
    klein: { fontFamily: FONT.w600, fontSize: 13 },
    countdown: { flexDirection: "row", gap: 6 },
    kachel: { flex: 1, borderRadius: 12, paddingVertical: 6, alignItems: "center" },
    kachelZahl: { ...TYPE.num, fontSize: 22 },
    kachelLabel: { fontFamily: FONT.w600, fontSize: 11 },
    knopf: { height: 40, borderRadius: 999, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
    knopfText: { fontFamily: FONT.w700, fontSize: 15 },

    timer: { ...TYPE.num, fontSize: 36, lineHeight: 40, letterSpacing: -1 },
    liveChip: { flex: 1, height: 40, borderRadius: 14, paddingHorizontal: 10, backgroundColor: "rgba(255,255,255,0.14)", flexDirection: "row", alignItems: "center", gap: 4 },
    liveChipText: { flex: 1, fontFamily: FONT.w800, fontSize: 14 },
    toast: {
      position: "absolute", bottom: 22, right: 18, flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 12, paddingRight: 6, height: 38,
      borderRadius: RADIUS.pill, backgroundColor: c.card, borderWidth: StyleSheet.hairlineWidth, borderColor: c.hairline,
    },
    toastText: { fontFamily: FONT.w700, fontSize: 13, color: c.textDark },
    toastKnopf: { flexDirection: "row", alignItems: "center", gap: 4, height: 26, paddingHorizontal: 8, borderRadius: RADIUS.pill },
    toastKnopfText: { fontFamily: FONT.w600, fontSize: 12, color: c.textMid },

    gross: { ...TYPE.num, fontSize: 34, lineHeight: 38, marginTop: -4 },
    posten: { flexDirection: "row", alignItems: "center", gap: 10, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10 },
    postenTitel: { fontFamily: FONT.w700, fontSize: 13, color: c.textDark },
    postenSub: { fontFamily: FONT.w500, fontSize: 12, color: c.textMuted },
    postenBetrag: { ...TYPE.num, fontSize: 15 },
    haken: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
    stempel: { position: "absolute", top: 26, right: 26, flexDirection: "row", alignItems: "center", gap: 5, height: 30, paddingHorizontal: 10, borderRadius: RADIUS.pill, transform: [{ rotate: "6deg" }] },
    stempelText: { fontFamily: FONT.w800, fontSize: 12 },

    podium: { flexDirection: "row", alignItems: "flex-end", gap: 10, width: 240, marginTop: 30 },
    podiumSpalte: { flex: 1, alignItems: "center", gap: 4 },
    podiumName: { fontFamily: FONT.w700, fontSize: 12, color: c.textDark },
    saeule: { alignSelf: "stretch", borderTopLeftRadius: 14, borderTopRightRadius: 14, alignItems: "center", paddingTop: 8 },
    saeulenWert: { ...TYPE.num, fontSize: 18 },
    pokal: {
      position: "absolute", top: 22, left: 20, flexDirection: "row", alignItems: "center", gap: 6, height: 36, paddingHorizontal: 12,
      borderRadius: RADIUS.pill, backgroundColor: c.card, borderWidth: StyleSheet.hairlineWidth, borderColor: c.hairline,
    },
    pokalText: { fontFamily: FONT.w700, fontSize: 13, color: c.textDark },
  });
