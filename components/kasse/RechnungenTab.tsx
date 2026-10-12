import React, { useState } from "react";
import { Share, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { ZoomIn } from "react-native-reanimated";
import { KassenEintrag } from "../../types";
import { FONT, RADIUS, TYPE, ThemeColors } from "../../constants/design";
import { useColors, useThemedStyles } from "../../contexts/ThemeContext";
import { Kasse } from "../../utils/useKasse";
import { anteilProKopf, rechnungBeglichen, rechnungOffen, schuldnerVon } from "../../utils/kasse";
import { formatWochentagDatum } from "../../utils/date";
import { displayName, formatEuro } from "../../utils/format";
import { terminBezeichnung } from "../../utils/activityFeed";
import { useSingleFlight } from "../../utils/useSingleFlight";
import { Avatar, Button, Card, IconSquircle, PressableScale, haptik } from "../ui";
import { SYMBOL } from "../../constants/symbole";

const euro = (n: number) => `${formatEuro(n)} €`;

/**
 * Stammtischrechnungen: einer hat für alle bezahlt, die anderen zahlen ihm
 * ihren Anteil zurück. Offene Rechnungen ausgeklappt, erledigte eingeklappt.
 */
export function RechnungenTab({ kasse, onEintrag }: { kasse: Kasse; onEintrag: (e: KassenEintrag) => void }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const [erledigtOffen, setErledigtOffen] = useState(false);
  const rechnungen = kasse.eintraege.filter((e) => e.typ === "abendkosten");
  const offen = rechnungen.filter((e) => !rechnungBeglichen(e));
  const erledigt = rechnungen.filter(rechnungBeglichen);

  if (rechnungen.length === 0) {
    return (
      <Card style={{ alignItems: "center", gap: 8, paddingVertical: 28 }}>
        <IconSquircle emoji={SYMBOL.rechnung} ton="blue" size={52} />
        <Text style={styles.leerTitel}>Keine Rechnungen</Text>
        <Text style={styles.leerText}>Wenn einer für alle zahlt: mit + oben eintragen, dann sieht jeder seinen Anteil.</Text>
      </Card>
    );
  }

  return (
    <>
      {offen.map((e, i) => <RechnungKarte key={e.id} e={e} kasse={kasse} onDetails={() => onEintrag(e)} enterIndex={i} />)}
      {erledigt.length > 0 ? (
        <Card style={{ paddingVertical: 0 }}>
          <PressableScale onPress={() => setErledigtOffen((v) => !v)} style={styles.aufklapp} accessibilityState={{ expanded: erledigtOffen }} accessibilityLabel={`Erledigte Rechnungen, ${erledigt.length}`}>
            <Text style={styles.aufklappText}>Erledigte Rechnungen <Text style={{ color: c.textMuted }}>{`· ${erledigt.length}`}</Text></Text>
            <Ionicons name={erledigtOffen ? "chevron-up" : "chevron-down"} size={18} color={c.textDark} />
          </PressableScale>
          {erledigtOffen ? erledigt.map((e) => {
            const zahler = kasse.members.find((m) => m.id === e.bezahltVon);
            return (
              <PressableScale key={e.id} onPress={() => onEintrag(e)} style={[styles.erledigtZeile, styles.trenner]} accessibilityLabel={`${titel(e, kasse)}, ${euro(e.betrag)}, erledigt`}>
                <Ionicons name="checkmark-circle" size={22} color={c.success} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.erledigtTitel} numberOfLines={1}>{titel(e, kasse)}</Text>
                  {zahler ? <Text style={styles.sub}>{`${displayName(zahler)} hat bezahlt`}</Text> : null}
                </View>
                <Text style={styles.erledigtBetrag}>{euro(e.betrag)}</Text>
              </PressableScale>
            );
          }) : null}
        </Card>
      ) : null}
    </>
  );
}

function titel(e: KassenEintrag, kasse: Kasse): string {
  const t = kasse.termine.find((x) => x.id === e.terminId);
  if (t) return terminBezeichnung({ terminDatum: t.datum, terminTitel: t.titel, terminArt: t.art }, true);
  return e.beschreibung?.trim() || `Rechnung ${formatWochentagDatum(new Date(e.datum))}`;
}

function RechnungKarte({ e, kasse, onDetails, enterIndex }: { e: KassenEintrag; kasse: Kasse; onDetails: () => void; enterIndex: number }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const guard = useSingleFlight();
  const zahler = kasse.members.find((m) => m.id === e.bezahltVon);
  const schuldner = schuldnerVon(e);
  const bezahlt = schuldner.filter((id) => (e.beglichenIds ?? []).includes(id));
  const offenIds = schuldner.filter((id) => !bezahlt.includes(id));
  const anteil = anteilProKopf(e);
  const ort = kasse.termine.find((t) => t.id === e.terminId)?.ort;
  const teilnehmer = e.teilnehmerIds?.length ?? 0;
  const name = (id: string) => { const m = kasse.members.find((x) => x.id === id); return m ? displayName(m) : "?"; };

  async function erinnern() {
    const an = zahler ? displayName(zahler) : "den Zahler";
    const text = `${titel(e, kasse)}: noch offen sind ${offenIds.map(name).join(", ")} – je ${euro(anteil)} an ${an}.`;
    try { await Share.share({ message: text }); } catch { /* abgebrochen */ }
  }

  return (
    <Card enterIndex={enterIndex} style={{ gap: 12 }}>
      <PressableScale onPress={onDetails} scaleTo={0.99} style={{ gap: 2 }} accessibilityLabel={`${titel(e, kasse)}, Details`}>
        <View style={styles.kopf}>
          <Text style={[styles.label, { color: c.blue }]}>Offene Rechnung</Text>
          {ort ? <Text style={styles.sub} numberOfLines={1}>{ort}</Text> : null}
        </View>
        <Text style={styles.titel} numberOfLines={2}>{titel(e, kasse)}</Text>
        <Text style={styles.sub}>{teilnehmer > 0 ? `${euro(e.betrag)} für ${teilnehmer} · ${euro(anteil)} pro Kopf` : euro(e.betrag)}</Text>
      </PressableScale>

      {zahler ? (
        <View style={[styles.zahler, { backgroundColor: c.cardAlt }]}>
          <Avatar name={displayName(zahler)} color={zahler.avatarColor} photoUri={zahler.photoUri} size={28} />
          <Text style={styles.zahlerText} numberOfLines={2}>
            {`${displayName(zahler)} hat bezahlt${schuldner.length ? ` · bekommt ${euro(anteil * schuldner.length)}` : ""}`}
          </Text>
        </View>
      ) : null}

      {schuldner.length > 0 ? (
        <>
          <View style={styles.kopf}>
            <Text style={styles.fortschrittText}>{`${bezahlt.length} von ${schuldner.length} beglichen`}</Text>
            <Text style={[styles.fortschrittText, { color: c.coralText }]}>{`${euro(rechnungOffen(e))} offen`}</Text>
          </View>
          <View style={styles.spur}><View style={[styles.fuell, { width: `${Math.round((bezahlt.length / schuldner.length) * 100)}%`, backgroundColor: c.success }]} /></View>
          <View>
            {schuldner.map((id, i) => {
              const m = kasse.members.find((x) => x.id === id);
              const ok = bezahlt.includes(id);
              return (
                <View key={id} style={[styles.person, i > 0 && styles.trenner]}>
                  {m ? <Avatar name={displayName(m)} color={m.avatarColor} photoUri={m.photoUri} size={36} /> : null}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.personName} numberOfLines={1}>{name(id)}</Text>
                    <Text style={[styles.personStatus, { color: ok ? c.successText : c.coralText }]}>{ok ? "bezahlt" : "offen"}</Text>
                  </View>
                  <Text style={styles.personBetrag}>{euro(anteil)}</Text>
                  <PressableScale
                    onPress={() => guard(async () => { haptik(ok ? "leicht" : "erfolg"); await kasse.anteilUmschalten(e.id, id); })}
                    scaleTo={0.9}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: ok }}
                    accessibilityLabel={ok ? `${name(id)} hat bezahlt. Tippen, um wieder offen zu setzen` : `${name(id)} hat bezahlt markieren`}
                    style={[styles.kreis, ok && { backgroundColor: c.success, borderColor: c.success }]}
                  >
                    {ok ? <Animated.View entering={ZoomIn.springify().damping(14)}><Ionicons name="checkmark" size={22} color={c.onAccent} /></Animated.View> : null}
                  </PressableScale>
                </View>
              );
            })}
          </View>
          {offenIds.length > 0 ? (
            <Button label={`Offene erinnern (${offenIds.length})`} icon="notifications-outline" variant="secondary" colors={{ bg: c.blueBg, fg: c.blue }} onPress={erinnern} />
          ) : null}
        </>
      ) : (
        // Altbestand ohne Teilnehmerliste: nur „erledigt" als Ganzes.
        <Button label="Als erledigt markieren" icon="checkmark" variant="secondary" onPress={() => guard(() => kasse.rechnungUmschalten(e.id))} />
      )}
    </Card>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    leerTitel: { ...TYPE.heading, color: c.textDark },
    leerText: { ...TYPE.body, fontSize: 14, color: c.textMuted, textAlign: "center" },
    kopf: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
    label: { ...TYPE.label },
    titel: { ...TYPE.title, color: c.textDark },
    sub: { ...TYPE.caption, fontSize: 13, color: c.textMuted, flexShrink: 1 },
    zahler: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: RADIUS.md, padding: 10 },
    zahlerText: { flex: 1, fontFamily: FONT.w600, fontSize: 14, color: c.textDark },
    fortschrittText: { fontFamily: FONT.w700, fontSize: 14, color: c.textDark },
    spur: { height: 8, borderRadius: 4, backgroundColor: c.cardAlt, overflow: "hidden", marginTop: -4 },
    fuell: { height: "100%", borderRadius: 4 },
    person: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 60, paddingVertical: 6 },
    trenner: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
    personName: { fontFamily: FONT.w700, fontSize: 16, color: c.textDark },
    personStatus: { fontFamily: FONT.w600, fontSize: 12 },
    personBetrag: { ...TYPE.num, fontSize: 16, color: c.textDark },
    kreis: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: c.borderDark, alignItems: "center", justifyContent: "center" },
    aufklapp: { minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    aufklappText: { fontFamily: FONT.w700, fontSize: 16, color: c.textDark },
    erledigtZeile: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56, paddingVertical: 8 },
    erledigtTitel: { fontFamily: FONT.w600, fontSize: 15, color: c.textDark },
    erledigtBetrag: { ...TYPE.num, fontSize: 15, color: c.textMuted },
  });
