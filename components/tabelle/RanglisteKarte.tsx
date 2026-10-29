import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { LinearTransition } from "react-native-reanimated";
import { FONT, MAX_FONT_SCALE, RADIUS, TYPE, ThemeColors } from "../../constants/design";
import { useColors, useThemedStyles } from "../../contexts/ThemeContext";
import { FuehrenderTitel, RangEintrag, RangVerlauf, Rangliste, trend, wertKurz } from "../../utils/stats";
import { displayName } from "../../utils/format";
import { Avatar, Card, IconSquircle, Krone, PressableScale, tonFuerRangliste } from "../ui";

/** „Schock-Aus" statt „Schocken — Schock-Aus", „Teilnahme" statt „Teilnahme-Rangliste". */
const UNTERTITEL: Record<string, string> = {
  teilnahme: "Abende dabei",
  verspaetung: "Minuten zu spät",
  strafen: "Strafen gesamt",
};

interface Props {
  liste: Rangliste;
  /** Alle Plätze statt nur der ersten drei. */
  alle: boolean;
  onAlle: () => void;
  /** Viel ↔ wenig vorne; fehlt bei Listen, die sich nicht umdrehen lassen. */
  onRichtung?: () => void;
  ichId: string | null;
  fuehrende: Map<string, FuehrenderTitel[]>;
  verlauf: RangVerlauf | null;
  hinweis?: string;
  enterIndex: number;
}

const TOP = 3;

/**
 * Eine Wertung als Karte, immer offen: die ersten drei als Zeilen (liegst du
 * dahinter, deine Zeile darunter), „Alle anzeigen“ für den Rest. Unten lässt
 * sich umstellen, ob viel oder wenig vorne liegt – gilt für die ganze Runde.
 */
export function RanglisteKarte({ liste, alle, onAlle, onRichtung, ichId, fuehrende, verlauf, hinweis, enterIndex }: Props) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const ich = ichId ? liste.eintraege.find((e) => e.member.id === ichId) : undefined;
  const sichtbar = alle ? liste.eintraege : liste.eintraege.slice(0, TOP);
  // Zugeklappt und selbst nicht unter den ersten drei: eigene Zeile abgesetzt darunter.
  const ichExtra = !alle && ich && !sichtbar.includes(ich) ? ich : null;
  const mehr = liste.eintraege.length > TOP;
  const wenig = liste.richtung === "wenig";

  const zeile = (e: RangEintrag) => {
    const istIch = e.member.id === ichId;
    const t = verlauf ? trend(verlauf, liste.key, e.member.id) : 0;
    return (
      <PressableScale
        key={e.member.id}
        onPress={() => router.push(`/member/${e.member.id}`)}
        style={[styles.zeile, istIch && { backgroundColor: c.blueBg }]}
        accessibilityLabel={`Platz ${e.platz}: ${displayName(e.member)}, ${wertKurz(liste.key, e.wert)}${t > 0 ? ", aufgestiegen" : t < 0 ? ", abgerutscht" : ""}`}
      >
        <View style={styles.rang}>{e.platz === 1 ? <Krone size={18} /> : <Text style={styles.rangText}>{`${e.platz}.`}</Text>}</View>
        <Avatar name={displayName(e.member)} color={e.member.avatarColor} photoUri={e.member.photoUri} size={32} fuehrt={fuehrende.get(e.member.id)} ringColor={istIch ? c.blueBg : c.card} />
        <Text style={styles.name} numberOfLines={1}>{displayName(e.member)}</Text>
        {istIch ? <View style={[styles.du, { backgroundColor: c.card }]}><Text style={[styles.duText, { color: c.blue }]}>DU</Text></View> : null}
        <View style={{ flex: 1 }} />
        <Text style={styles.wert} maxFontSizeMultiplier={MAX_FONT_SCALE}>{wertKurz(liste.key, e.wert)}</Text>
        <View style={styles.trend} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {t > 0 ? <Ionicons name="caret-up" size={12} color={c.successText} />
            : t < 0 ? <Ionicons name="caret-down" size={12} color={c.coralText} />
            : <Text style={styles.trendGleich}>–</Text>}
        </View>
      </PressableScale>
    );
  };

  return (
    <Card enterIndex={enterIndex} style={{ gap: 10 }}>
      <View style={styles.kopf}>
        <IconSquircle emoji={liste.emoji} ton={tonFuerRangliste(liste.key)} size={36} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.titel} numberOfLines={1} accessibilityRole="header">{liste.kurz}</Text>
          <Text style={styles.untertitel} numberOfLines={1}>{untertitel(liste)}</Text>
        </View>
        {ich ? (
          <View style={[styles.platzPill, { backgroundColor: ich.platz === 1 ? c.mustard : c.blueBg }]}>
            <Text style={[styles.platzText, { color: ich.platz === 1 ? c.onMustard : c.blue }]}>{`Du: Platz ${ich.platz}`}</Text>
          </View>
        ) : null}
      </View>

      <Animated.View layout={LinearTransition.duration(220)}>
        {sichtbar.map(zeile)}
        {ichExtra ? (
          <>
            <Text style={styles.luecke} accessibilityElementsHidden>⋯</Text>
            {zeile(ichExtra)}
          </>
        ) : null}
      </Animated.View>

      {mehr || onRichtung || hinweis ? (
        <View style={styles.fuss}>
          {mehr ? (
            <PressableScale onPress={onAlle} style={styles.fussKnopf} hitSlop={6} accessibilityState={{ expanded: alle }} accessibilityLabel={alle ? "Nur die ersten drei zeigen" : `Alle ${liste.eintraege.length} anzeigen`}>
              <Text style={[styles.fussText, { color: c.blue }]}>{alle ? "Weniger" : `Alle ${liste.eintraege.length} anzeigen`}</Text>
              <Ionicons name={alle ? "chevron-up" : "chevron-down"} size={14} color={c.blue} />
            </PressableScale>
          ) : hinweis ? <Text style={styles.hinweis} numberOfLines={1}>{hinweis}</Text> : <View />}
          {onRichtung ? (
            <PressableScale
              onPress={onRichtung}
              style={styles.fussKnopf}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={`Vorne liegt, wer am ${wenig ? "wenigsten" : "meisten"} hat. Tippen zum Umdrehen, gilt für alle`}
            >
              <Ionicons name="swap-vertical" size={14} color={c.textMuted} />
              <Text style={styles.fussText}>{wenig ? "Wenig ist gut" : "Viel ist gut"}</Text>
            </PressableScale>
          ) : null}
        </View>
      ) : null}
      {mehr && hinweis ? <Text style={styles.hinweis}>{hinweis}</Text> : null}
    </Card>
  );
}

function untertitel(liste: Rangliste): string {
  if (liste.richtung === "wenig") return liste.untertitel;
  return UNTERTITEL[liste.key] ?? (liste.key.startsWith("spiel_") ? `beim ${liste.titel.split(" — ")[0]}` : liste.untertitel);
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    kopf: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 48 },
    titel: { ...TYPE.heading, color: c.textDark },
    untertitel: { ...TYPE.caption, fontSize: 13, color: c.textMuted },
    platzPill: { paddingHorizontal: 10, height: 28, borderRadius: RADIUS.pill, justifyContent: "center" },
    platzText: { fontFamily: FONT.w700, fontSize: 13 },
    zeile: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 44, paddingHorizontal: 8, marginHorizontal: -8, borderRadius: RADIUS.md },
    rang: { width: 26, alignItems: "center" },
    rangText: { fontFamily: FONT.w700, fontSize: 14, color: c.textMuted },
    name: { fontFamily: FONT.w600, fontSize: 15, color: c.textDark, flexShrink: 1 },
    du: { paddingHorizontal: 8, height: 22, borderRadius: 11, justifyContent: "center" },
    duText: { fontFamily: FONT.w700, fontSize: 11, letterSpacing: 0.5 },
    wert: { ...TYPE.num, fontSize: 16, color: c.textDark },
    trend: { width: 16, alignItems: "center" },
    trendGleich: { fontFamily: FONT.w600, fontSize: 14, color: c.textMuted },
    hinweis: { ...TYPE.caption, fontSize: 13, color: c.textMuted },
    luecke: { ...TYPE.caption, color: c.textMuted, textAlign: "center", lineHeight: 14 },
    fuss: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border, paddingTop: 8 },
    fussKnopf: { flexDirection: "row", alignItems: "center", gap: 5, minHeight: 36 },
    fussText: { fontFamily: FONT.w600, fontSize: 13, color: c.textMuted },
  });
