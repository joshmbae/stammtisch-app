import React, { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import {
  ActivityLogEntry,
  KassenEintrag,
  MemberProfile,
  SpielEreignisTyp,
  StammtischTermin,
  StammtischVerordnung,
  StrafKategorieDef,
  StrafLog,
} from "../../types";
import {
  loadActivityFeed,
  loadKasse,
  loadStrafKategorien,
  loadTermine,
  loadVerordnung,
  logActivity,
  setRsvpStatus,
} from "../../utils/storage";
import { loadStatsDaten } from "../../utils/statsDaten";
import { useSession } from "../../contexts/SessionContext";
import { useStammtisch } from "../../contexts/StammtischContext";
import { supabase } from "../../utils/supabase";
import { subscribeToActivityFeed } from "../../utils/realtime";
import { istUngelesen, useFeedSeen } from "../../utils/feedSeen";
import { useScreenLoad } from "../../utils/useScreenLoad";
import { useNow } from "../../utils/useNow";
import { aktuellesJahr, computeRanglisten, fuehrendeTitel, StatsDaten } from "../../utils/stats";
import { anwesenheitsQuote } from "../../utils/format";
import { naechsterGeburtstag } from "../../utils/date";
import { homeHero } from "../../utils/terminPhase";
import { abendStats } from "../../utils/abendStats";
import { hauptEreignis } from "../../utils/spiel";
import { monatsSalden, saldo } from "../../utils/kasse";
import { FONT, TYPE, ThemeColors } from "../../constants/design";
import { useThemedStyles } from "../../contexts/ThemeContext";
import StammtischLogo from "../../components/StammtischLogo";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorState from "../../components/ErrorState";
import OfflineBanner from "../../components/OfflineBanner";
import { Avatar, Button, Card, HeaderIconButton, IconSquircle, PressableScale, Screen } from "../../components/ui";
import { HeroCard, RsvpStatus } from "../../components/home/HeroCard";
import { BilanzRow, BilanzWerte, Platzierung } from "../../components/home/BilanzRow";
import { KasseTile } from "../../components/home/KasseTile";
import { GeburtstagTile } from "../../components/home/GeburtstagTile";
import { AktivitaetTimeline } from "../../components/home/AktivitaetTimeline";
import { RanglisteRotator } from "../../components/home/RanglisteRotator";
import { SYMBOL } from "../../constants/symbole";

function begruessung(name?: string): string {
  const h = new Date().getHours();
  const n = name ? `, ${name.split(" ")[0]}` : "";
  if (h < 11) return `Guten Morgen${n}`;
  if (h < 18) return `Hallo${n}`;
  if (h < 20) return `Guten Abend${n}`;
  return `Prost${n}!`;
}

/**
 * Home: oben der Abend (vorher / läuft / danach, wechselt von selbst),
 * darunter die eigene Jahresbilanz, Kasse und nächster Geburtstag, die
 * letzten Aktivitäten und eine rotierende Rangliste.
 */
export default function HomeScreen() {
  const styles = useThemedStyles(makeStyles);
  const { activeMemberId, activeMember } = useSession();
  const { stammtischId } = useStammtisch();
  const now = useNow(1000);
  const jahr = aktuellesJahr();

  const [verordnung, setVerordnung] = useState<StammtischVerordnung | null>(null);
  const [daten, setDaten] = useState<StatsDaten | null>(null);
  const [kasse, setKasse] = useState<KassenEintrag[]>([]);
  const [kategorien, setKategorien] = useState<StrafKategorieDef[]>([]);
  const [aktivitaet, setAktivitaet] = useState<ActivityLogEntry[]>([]);
  const [rsvpBusy, setRsvpBusy] = useState(false);
  const feedGesehen = useFeedSeen();

  async function load() {
    const [v, statsDaten, kasseData, feed, kats] = await Promise.all([
      loadVerordnung(), loadStatsDaten(), loadKasse(), loadActivityFeed(2), loadStrafKategorien(),
    ]);
    setVerordnung(v);
    setDaten(statsDaten);
    setKasse(kasseData);
    setAktivitaet(feed);
    setKategorien(kats);
  }

  const { loading, refreshing, error, onRefresh, retry } = useScreenLoad(load, []);

  // Neue Aktivität live oben einreihen; Strafen und Spiel-Einträge ändern
  // auch die Zahlen im laufenden Abend, also dann neu laden.
  useFocusEffect(
    useCallback(() => {
      if (!stammtischId) return;
      const channel = subscribeToActivityFeed(stammtischId, (entry) => {
        setAktivitaet((prev) => (prev.some((e) => e.id === entry.id) ? prev : [entry, ...prev].slice(0, 2)));
        if (entry.actionType.startsWith("straf") || entry.actionType.startsWith("spiel") || entry.actionType.startsWith("termin")) {
          load().catch(() => {});
        }
      });
      return () => { supabase.removeChannel(channel); };
    }, [stammtischId])
  );

  const abgeleitet = useMemo(() => {
    if (!daten) return null;
    const members = daten.members;
    const rangl = computeRanglisten(daten, jahr);
    const fuehrende = fuehrendeTitel(daten, jahr);

    // Nur das in den Einstellungen gewählte Spiel; „kein Spiel" ist eine bewusste Wahl.
    const spiel = daten.spiele.find((s) => s.spiel.id === verordnung?.aktivesSpielId);
    const haupt = spiel ? hauptEreignis(spiel.ereignisTypen) : null;
    const spielTypen: SpielEreignisTyp[] = spiel && haupt
      ? [haupt, ...[...spiel.ereignisTypen].filter((t) => t.id !== haupt.id).sort((a, b) => a.reihenfolge - b.reihenfolge)]
      : [];

    const listen = [
      haupt ? rangl.find((l) => l.key === `spiel_${haupt.id}`) : undefined,
      rangl.find((l) => l.key === "teilnahme"),
      rangl.find((l) => l.key === "strafen"),
    ].filter((l): l is NonNullable<typeof l> => !!l && l.eintraege.some((e) => e.wert > 0));

    return { members, rangl, fuehrende, spielTypen, listen };
  }, [daten, verordnung?.aktivesSpielId, jahr]);

  if (loading) return <LoadingSpinner />;
  if (error || !daten || !abgeleitet) return <ErrorState message={error ?? "Keine Daten."} onRetry={retry} />;

  const { members, rangl, fuehrende, spielTypen, listen } = abgeleitet;
  const membersById = new Map(members.map((m) => [m.id, m]));
  const hero = homeHero(daten.termine, now, verordnung?.stammtischzeit);
  const heroStats = hero.phase === "leer" ? null : abendStats(hero.termin, members, daten.strafLogs, daten.spielLogs);
  const meinStatus: RsvpStatus =
    hero.phase === "vorher" && activeMemberId
      ? hero.termin.anwesenheit?.includes(activeMemberId) ? "ja" : hero.termin.absagen?.includes(activeMemberId) ? "nein" : null
      : null;

  async function handleRsvp(status: RsvpStatus) {
    if (hero.phase !== "vorher" || !activeMemberId) return;
    const termin = hero.termin;
    setRsvpBusy(true);
    try {
      await setRsvpStatus(termin.id, activeMemberId, status);
      if (status) {
        await logActivity({
          actorMemberId: activeMemberId,
          subjectMemberId: activeMemberId,
          actionType: status === "ja" ? "termin_zusage" : "termin_absage",
          terminId: termin.id,
          meta: { terminDatum: termin.datum, terminTitel: termin.titel, terminArt: termin.art },
        });
      }
      const termine = await loadTermine();
      setDaten((d) => (d ? { ...d, termine } : d));
    } finally {
      setRsvpBusy(false);
    }
  }

  const bilanz = activeMember ? bilanzFuer(activeMember, daten, rangl, jahr) : null;
  const geburtstag = naechsterGeburtstag(members, now);
  const ungelesen = istUngelesen(aktivitaet[0]?.createdAt, feedGesehen);

  return (
    <Screen withNav refreshing={refreshing} onRefresh={onRefresh} header={<OfflineBanner />}>
      <View style={styles.kopf}>
        <StammtischLogo size={44} uri={verordnung?.logoUrl} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.name} numberOfLines={1} accessibilityRole="header">{verordnung?.name || "Mein Stammtisch"}</Text>
          <Text style={styles.gruss} numberOfLines={1}>{begruessung(activeMember?.spitzname ?? activeMember?.name)}</Text>
        </View>
        <HeaderIconButton icon="notifications-outline" label={ungelesen ? "Chronik, neue Einträge" : "Chronik"} dot={ungelesen} onPress={() => router.push("/feed")} />
        {activeMember ? (
          <PressableScale onPress={() => router.push(`/member/${activeMember.id}`)} hitSlop={6} accessibilityLabel="Mein Profil">
            <Avatar name={activeMember.name} color={activeMember.avatarColor} photoUri={activeMember.photoUri} size={44} />
          </PressableScale>
        ) : null}
      </View>

      {members.length === 0 ? (
        <Card enterIndex={0}>
          <Text style={styles.leerTitel}>Willkommen!</Text>
          <Text style={styles.leerText}>Leg die ersten Mitglieder an und trag eure Grunddaten ein, dann füllt sich hier alles.</Text>
          <View style={{ gap: 8, marginTop: 12 }}>
            <Button label="Mitglied anlegen" icon="person-add-outline" onPress={() => router.push("/member/new")} />
            <Button label="Grunddaten eintragen" icon="settings-outline" variant="secondary" onPress={() => router.push("/einstellungen")} />
          </View>
        </Card>
      ) : (
        <>
          <HeroCard
            hero={hero}
            now={now}
            members={members}
            stats={heroStats}
            stammtischzeit={verordnung?.stammtischzeit}
            spielTypen={spielTypen}
            meinStatus={meinStatus}
            onRsvp={handleRsvp}
            rsvpBusy={rsvpBusy}
          />

          {bilanz ? <BilanzRow werte={bilanz} onPress={() => router.push(`/member/${activeMember!.id}`)} /> : null}

          <View style={styles.kacheln}>
            <KasseTile saldo={saldo(kasse)} monate={monatsSalden(kasse, 6, now)} onPress={() => router.push("/kasse")} />
            {geburtstag ? (
              <GeburtstagTile {...geburtstag} onPress={() => router.push(`/member/${geburtstag.member.id}`)} />
            ) : (
              <Card style={styles.ohneGeburtstag} onPress={() => router.push("/mitglieder")} accessibilityLabel="Geburtstage eintragen">
                <IconSquircle emoji={SYMBOL.geburtstag} ton="mustard" size={36} />
                <Text style={styles.ohneGeburtstagTitel}>Geburtstage</Text>
                <Text style={styles.ohneGeburtstagText}>Noch keiner eingetragen. Im Profil nachtragen.</Text>
              </Card>
            )}
          </View>

          <AktivitaetTimeline eintraege={aktivitaet} membersById={membersById} kategorien={kategorien} />

          <RanglisteRotator listen={listen} jahr={jahr} fuehrende={fuehrende} onAlle={() => router.push("/ranglisten")} />
        </>
      )}
    </Screen>
  );
}

/**
 * Eigene Werte im laufenden Jahr; offene Strafen zählen über alle Jahre (ein
 * Kontostand). Platzierungen: nur Ranglisten, in denen man vorkommt, beste
 * zuerst, bei Gleichstand in der Reihenfolge der Tabelle.
 */
function bilanzFuer(
  me: MemberProfile,
  daten: StatsDaten,
  rangl: ReturnType<typeof computeRanglisten>,
  jahr: string
): BilanzWerte {
  const termineImJahr: StammtischTermin[] = daten.termine.filter((t) => t.datum.startsWith(jahr));
  const q = anwesenheitsQuote(termineImJahr, me.id, me.mitgliedSeit);
  const sLogs: StrafLog[] = daten.strafLogs.filter((l) => l.memberId === me.id && !l.beglichen);
  const platzierungen: Platzierung[] = rangl
    .map((l, i) => ({ l, i, e: l.eintraege.find((x) => x.member.id === me.id && x.wert > 0) }))
    .filter((x) => !!x.e)
    .sort((a, b) => a.e!.platz - b.e!.platz || a.i - b.i)
    .map(({ l, e }) => ({ key: l.key, emoji: l.emoji, kurz: l.kurz, platz: e!.platz }));
  return {
    jahr,
    quote: q.pct,
    dabei: q.count,
    abende: q.total,
    offen: sLogs.reduce((s, l) => s + l.betrag, 0),
    platzierungen,
  };
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    kopf: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 6, paddingBottom: 2, paddingHorizontal: 4 },
    name: { ...TYPE.title, color: c.textDark },
    gruss: { fontFamily: FONT.w600, fontSize: 13, color: c.textMuted },
    kacheln: { flexDirection: "row", gap: 12 },
    ohneGeburtstag: { flex: 1, minHeight: 132, gap: 4 },
    ohneGeburtstagTitel: { fontFamily: FONT.w800, fontSize: 16, color: c.textDark, marginTop: "auto" },
    ohneGeburtstagText: { ...TYPE.caption, fontSize: 13, color: c.textMuted },
    leerTitel: { ...TYPE.title, color: c.textDark },
    leerText: { ...TYPE.body, color: c.textMid, marginTop: 6 },
  });
