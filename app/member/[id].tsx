import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StrafKategorieDef } from "../../types";
import { FONT, RADIUS, ThemeColors } from "../../constants/design";
import { useColors, useThemedStyles } from "../../contexts/ThemeContext";
import { useSession } from "../../contexts/SessionContext";
import { loadStrafKategorien } from "../../utils/storage";
import { loadStatsDaten } from "../../utils/statsDaten";
import { useScreenLoad } from "../../utils/useScreenLoad";
import { verifyPin } from "../../utils/pin";
import { anwesenheitsQuote, formatEuro } from "../../utils/format";
import { toLocalIsoDate } from "../../utils/date";
import {
  ALLZEIT,
  Rangliste,
  StatsDaten,
  aktuellesJahr,
  computeRangVerlauf,
  computeRanglisten,
  jahresTitelFuer,
  siegerIds,
  verfuegbareJahre,
  vornSeit,
  wertKurz,
} from "../../utils/stats";
import PinPrompt from "../../components/PinPrompt";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorState from "../../components/ErrorState";
import OfflineBanner from "../../components/OfflineBanner";
import { PressableScale, Screen, ScreenHeader } from "../../components/ui";
import { AbendZeile, AbendeKarte, BilanzKachel, BilanzKarte, Fuehrung, FuehrtGerade, ProfilHero, StrafenKarte, TitelKarte } from "../../components/profil/ProfilKarten";

/**
 * Profil einer Person: wer sie ist, was sie gerade anführt, ihre Titel, die
 * Bilanz der Saison, Strafen und die letzten Abende. Bearbeiten ist durch den
 * PIN geschützt, falls einer gesetzt ist.
 */
export default function ProfilScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const { activeMemberId } = useSession();
  const [daten, setDaten] = useState<StatsDaten | null>(null);
  const [kategorien, setKategorien] = useState<StrafKategorieDef[]>([]);
  const [pinOffen, setPinOffen] = useState(false);
  const [pinFehler, setPinFehler] = useState<string | undefined>(undefined);

  const screen = useScreenLoad(async () => {
    const [d, k] = await Promise.all([loadStatsDaten(), loadStrafKategorien()]);
    setDaten(d);
    setKategorien(k);
  }, [id]);

  const jahr = aktuellesJahr();
  const member = daten?.members.find((m) => m.id === id) ?? null;

  const auswertung = useMemo(() => {
    if (!daten || !member) return null;
    const listen = computeRanglisten(daten, jahr);
    const ewig = computeRanglisten(daten, ALLZEIT);
    const fuehrtIn = (l: Rangliste) => siegerIds(l).includes(member.id);
    const verlauf = listen.some(fuehrtIn) ? computeRangVerlauf(daten, jahr) : null;

    const fuehrung = (l: Rangliste, jahrLabel: string, mitSeit: boolean): Fuehrung => {
      const meins = l.eintraege.find((e) => e.member.id === member.id)!;
      const naechster = l.eintraege.find((e) => e.wert < meins.wert);
      const gleichauf = l.eintraege.some((e) => e.member.id !== member.id && e.wert === meins.wert);
      return {
        liste: l, jahrLabel, wert: meins.wert,
        vorsprung: gleichauf ? 0 : naechster ? meins.wert - naechster.wert : null,
        zweiter: gleichauf ? undefined : naechster?.member,
        seit: mitSeit && verlauf ? vornSeit(verlauf, l.key, member.id) : null,
      };
    };
    const fuehrungen = [
      ...listen.filter(fuehrtIn).map((l) => fuehrung(l, jahr, true)),
      // Gibt es nur eine Saison, ist die Ewige Tabelle dieselbe – dann nicht doppelt zeigen.
      ...(verfuegbareJahre(daten).length > 1 ? ewig.filter(fuehrtIn).map((l) => fuehrung(l, "· Ewige Tabelle", false)) : []),
    ];

    const titel = jahresTitelFuer(daten, member.id).filter((t) => t.jahr !== jahr);

    // Bilanz: dieselben Zahlen wie Home (anwesenheitsQuote) und Tabelle (computeRanglisten).
    const platz = (key: string) => listen.find((l) => l.key === key)?.eintraege.find((e) => e.member.id === member.id);
    const q = anwesenheitsQuote(daten.termine.filter((t) => t.datum.startsWith(jahr)), member.id, member.mitgliedSeit);
    const kacheln: BilanzKachel[] = [
      { key: "teilnahme", emoji: "✅", wert: q.pct !== null ? `${q.pct} %` : "–", label: `dabei · ${q.count} von ${q.total}`, platz: platz("teilnahme")?.platz, farbe: c.successText },
      { key: "verspaetung", emoji: "⏱️", wert: wertKurz("verspaetung", platz("verspaetung")?.wert ?? 0), label: "zu spät", platz: platz("verspaetung")?.platz },
      ...listen
        .filter((l) => l.key.startsWith("spiel_"))
        .map((l) => ({ key: l.key, emoji: l.emoji, wert: wertKurz(l.key, platz(l.key)?.wert ?? 0), label: l.kurz, platz: platz(l.key)?.platz })),
    ];

    const strafenJahr = daten.strafLogs.filter((l) => l.memberId === member.id && l.loggedAt.startsWith(jahr));

    const heute = toLocalIsoDate(new Date());
    const typen = daten.spiele.flatMap((s) => s.ereignisTypen);
    const abende: AbendZeile[] = daten.termine
      .filter((t) => t.art === "stammtisch" && t.datum <= heute && t.datum >= member.mitgliedSeit.slice(0, 10))
      .sort((a, b) => b.datum.localeCompare(a.datum))
      .map((t) => {
        const spaet = daten.verspätungLogs.filter((l) => l.memberId === member.id && l.terminId === t.id).reduce((s, l) => s + l.minutenVerspätet, 0);
        const spiel = typen
          .map((typ) => ({ typ, n: daten.spielLogs.filter((l) => l.memberId === member.id && l.terminId === t.id && l.ereignisTypId === typ.id).length }))
          .filter((x) => x.n > 0)
          .map((x) => `${x.typ.emoji ?? "🎯"} ${x.n}`);
        const strafe = daten.strafLogs.filter((l) => l.memberId === member.id && l.terminId === t.id).reduce((s, l) => s + l.betrag, 0);
        return {
          id: t.id, datum: t.datum, titel: t.titel ?? "Stammtisch",
          dabei: (t.anwesenheit ?? []).includes(member.id),
          chips: [spaet > 0 ? `${spaet}′ spät` : null, ...spiel, strafe > 0 ? `${formatEuro(strafe).replace(",00", "")} €` : null].filter(Boolean) as string[],
        };
      });

    return { fuehrungen, titel, kacheln, strafenJahr, abende };
  }, [daten, member, jahr, c]);

  function bearbeiten() {
    if (!member) return;
    if (!member.pinHash) {
      router.push(`/member/edit/${member.id}`);
      return;
    }
    setPinFehler(undefined);
    setPinOffen(true);
  }

  async function pinPruefen(pin: string) {
    if (!member?.pinHash) return;
    if (!(await verifyPin(member.id, pin))) {
      setPinFehler("Falscher PIN.");
      return;
    }
    setPinOffen(false);
    router.push(`/member/edit/${member.id}`);
  }

  const ich = member?.id === activeMemberId;

  return (
    <Screen
      refreshing={screen.refreshing}
      onRefresh={screen.onRefresh}
      header={
        <ScreenHeader
          back
          title="Profil"
          subtitle={ich ? "Das bist du" : undefined}
          right={member ? (
            <PressableScale onPress={bearbeiten} style={styles.bearbeiten} accessibilityLabel="Profil bearbeiten">
              <Ionicons name="pencil" size={16} color={c.textDark} />
              <Text style={styles.bearbeitenText}>Bearbeiten</Text>
            </PressableScale>
          ) : undefined}
        />
      }
    >
      <OfflineBanner />
      {screen.loading ? (
        <LoadingSpinner />
      ) : screen.error ? (
        <ErrorState message={screen.error} onRetry={screen.retry} />
      ) : !member || !auswertung ? (
        <Text style={styles.leer}>Dieses Mitglied gibt es nicht mehr.</Text>
      ) : (
        <>
          <ProfilHero member={member} />
          <FuehrtGerade fuehrungen={auswertung.fuehrungen} />
          <TitelKarte titel={auswertung.titel} />
          <BilanzKarte jahr={jahr} kacheln={auswertung.kacheln} />
          <StrafenKarte jahr={jahr} memberId={member.id} strafen={auswertung.strafenJahr} kategorien={kategorien} />
          <AbendeKarte abende={auswertung.abende} />
        </>
      )}
      {member ? (
        <PinPrompt visible={pinOffen} mode="verify" memberName={member.name} error={pinFehler} onCancel={() => setPinOffen(false)} onSubmit={pinPruefen} />
      ) : null}
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    bearbeiten: {
      height: 44, paddingHorizontal: 14, borderRadius: RADIUS.pill, flexDirection: "row", alignItems: "center", gap: 6,
      backgroundColor: c.card, borderWidth: StyleSheet.hairlineWidth, borderColor: c.hairline,
    },
    bearbeitenText: { fontFamily: FONT.w600, fontSize: 14, color: c.textDark },
    leer: { fontFamily: FONT.w600, fontSize: 15, color: c.textMuted, textAlign: "center", paddingVertical: 32 },
  });
