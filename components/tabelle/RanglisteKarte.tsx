import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import { MemberProfile } from "../../types";
import { FONT, MAX_FONT_SCALE, RADIUS, TYPE, ThemeColors } from "../../constants/design";
import { useColors, useThemedStyles } from "../../contexts/ThemeContext";
import { FuehrenderTitel, RangVerlauf, Rangliste, trend, wertKurz } from "../../utils/stats";
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
  offen: boolean;
  onToggle: () => void;
  ichId: string | null;
  fuehrende: Map<string, FuehrenderTitel[]>;
  /** Erst da, wenn eine Karte aufgeklappt ist (teure Rechnung). */
  verlauf: RangVerlauf | null;
  hinweis?: string;
  enterIndex: number;
}

/**
 * Eine Wertung als Karte: zugeklappt die ersten drei, aufgeklappt die ganze
 * Liste mit Trend seit dem letzten Abend.
 */
export function RanglisteKarte({ liste, offen, onToggle, ichId, fuehrende, verlauf, hinweis, enterIndex }: Props) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const ich = ichId ? liste.eintraege.find((e) => e.member.id === ichId) : undefined;
  const top = liste.eintraege.slice(0, 3);
  const zuProfil = (m: MemberProfile) => router.push(`/member/${m.id}`);

  return (
    <Card enterIndex={enterIndex} style={{ gap: 12 }}>
      <PressableScale onPress={onToggle} scaleTo={0.99} style={styles.kopf} accessibilityState={{ expanded: offen }} accessibilityLabel={`${liste.kurz}${ich ? `, du bist auf Platz ${ich.platz}` : ""}. ${offen ? "Zuklappen" : "Aufklappen"}`}>
        <IconSquircle emoji={liste.emoji} ton={tonFuerRangliste(liste.key)} size={36} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.titel} numberOfLines={1}>{liste.kurz}</Text>
          <Text style={styles.untertitel} numberOfLines={1}>{UNTERTITEL[liste.key] ?? (liste.key.startsWith("spiel_") ? `beim ${liste.titel.split(" — ")[0]}` : liste.untertitel)}</Text>
        </View>
        {ich ? (
          <View style={[styles.platzPill, { backgroundColor: ich.platz === 1 ? c.mustard : c.blueBg }]}>
            <Text style={[styles.platzText, { color: ich.platz === 1 ? c.onMustard : c.blue }]}>{`Du: Platz ${ich.platz}`}</Text>
          </View>
        ) : null}
        <Ionicons name={offen ? "chevron-up" : "chevron-down"} size={20} color={c.textMuted} />
      </PressableScale>

      {!offen ? (
        <View style={styles.top3}>
          {top.map((e) => {
            const istIch = e.member.id === ichId;
            return (
              <PressableScale key={e.member.id} onPress={() => zuProfil(e.member)} style={styles.topZelle} accessibilityLabel={`Platz ${e.platz}: ${displayName(e.member)}, ${wertKurz(liste.key, e.wert)}`}>
                <View>
                  {e.platz === 1 ? <View style={styles.kroneTop}><Krone size={16} /></View> : null}
                  <View style={istIch ? [styles.ichRing, { borderColor: c.blue }] : null}>
                    <Avatar name={displayName(e.member)} color={e.member.avatarColor} photoUri={e.member.photoUri} size={34} />
                  </View>
                </View>
                <View style={{ flexShrink: 1 }}>
                  <Text style={[styles.topName, istIch && { color: c.blue }]} numberOfLines={1}>{displayName(e.member)}</Text>
                  <Text style={styles.topWert} maxFontSizeMultiplier={MAX_FONT_SCALE}>{wertKurz(liste.key, e.wert)}</Text>
                </View>
              </PressableScale>
            );
          })}
        </View>
      ) : (
        <Animated.View entering={FadeIn.duration(200)} style={{ gap: 14 }}>
          <View>
            {liste.eintraege.map((e) => {
              const istIch = e.member.id === ichId;
              const t = verlauf ? trend(verlauf, liste.key, e.member.id) : 0;
              return (
                <PressableScale
                  key={e.member.id}
                  onPress={() => zuProfil(e.member)}
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
            })}
          </View>
          {hinweis ? <Text style={styles.hinweis}>{hinweis}</Text> : null}
        </Animated.View>
      )}
    </Card>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    kopf: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 48 },
    titel: { ...TYPE.heading, color: c.textDark },
    untertitel: { ...TYPE.caption, fontSize: 13, color: c.textMuted },
    platzPill: { paddingHorizontal: 10, height: 28, borderRadius: RADIUS.pill, justifyContent: "center" },
    platzText: { fontFamily: FONT.w700, fontSize: 13 },
    top3: { flexDirection: "row", gap: 8 },
    topZelle: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, minHeight: 48, paddingTop: 10 },
    kroneTop: { position: "absolute", top: -14, left: 9 },
    ichRing: { borderWidth: 2, borderRadius: 20, padding: 1, margin: -3 },
    topName: { fontFamily: FONT.w600, fontSize: 14, color: c.textDark },
    topWert: { ...TYPE.num, fontSize: 18, color: c.textDark },
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
  });
