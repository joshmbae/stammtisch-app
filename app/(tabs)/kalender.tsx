import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { MemberProfile, StammtischTermin, StammtischVerordnung } from "../../types";
import { FONT, ThemeColors } from "../../constants/design";
import { useColors, useThemedStyles } from "../../contexts/ThemeContext";
import { useSession } from "../../contexts/SessionContext";
import { deleteTermin, loadMembers, loadTermine, loadVerordnung } from "../../utils/storage";
import { useScreenLoad } from "../../utils/useScreenLoad";
import { useNow } from "../../utils/useNow";
import { terminPhase } from "../../utils/terminPhase";
import { formatWochentagDatum, toLocalIsoDate } from "../../utils/date";
import { showAlert } from "../../utils/alert";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorState from "../../components/ErrorState";
import OfflineBanner from "../../components/OfflineBanner";
import { HeaderIconButton, PressableScale, Screen, ScreenHeader, SegmentedTabs } from "../../components/ui";
import { KalenderKarte, MONATE, amTag } from "../../components/termine/KalenderKarte";
import { ListenEintrag, NaechsterStammtisch, TerminListe } from "../../components/termine/TerminListe";
import { NeuerTerminSheet } from "../../components/termine/NeuerTerminSheet";

/** Nächstes Vorkommen eines Geburtstags ab heute (heute zählt mit). */
function naechsterGeburtstag(geburtsdatum: string, heute: string): string {
  const md = geburtsdatum.slice(5, 10);
  const diesesJahr = `${heute.slice(0, 4)}-${md}`;
  return diesesJahr >= heute ? diesesJahr : `${Number(heute.slice(0, 4)) + 1}-${md}`;
}

/**
 * Termine: Kalender (Woche/Monat), der nächste Stammtisch groß, darunter
 * kommende bzw. vergangene Termine nach Monat – inklusive Geburtstagen der
 * Mitglieder. Neue Termine über das „+".
 */
export default function TermineScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const { activeMemberId } = useSession();
  const now = useNow(30_000);
  const [termine, setTermine] = useState<StammtischTermin[]>([]);
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [verordnung, setVerordnung] = useState<StammtischVerordnung | null>(null);
  const [tab, setTab] = useState<"kommend" | "vergangen">("kommend");
  const [tag, setTag] = useState<string | null>(null);
  const [neu, setNeu] = useState(false);

  async function load() {
    const [ts, ms, v] = await Promise.all([loadTermine(), loadMembers(), loadVerordnung()]);
    setTermine(ts);
    setMembers(ms);
    setVerordnung(v);
  }
  const screen = useScreenLoad(load, []);

  const heute = toLocalIsoDate(now);
  const stammtischzeit = verordnung?.stammtischzeit;

  // Mitglieder-Geburtstage als Punkte im Kalender (jährlich wiederkehrend).
  const fuerKalender = useMemo(() => [
    ...termine,
    ...members.filter((m) => m.geburtsdatum).map((m) => ({ id: `bd_${m.id}`, art: "geburtstag" as const, datum: m.geburtsdatum!, aktiv: false, createdAt: "" })),
  ], [termine, members]);

  const hero = useMemo(() => {
    const kandidaten = termine
      .filter((t) => t.art === "stammtisch" && terminPhase(t, now, stammtischzeit) !== "danach")
      .sort((a, b) => a.datum.localeCompare(b.datum));
    const live = kandidaten.find((t) => terminPhase(t, now, stammtischzeit) === "live");
    const t = live ?? kandidaten[0];
    return t ? { termin: t, phase: terminPhase(t, now, stammtischzeit) } : null;
  }, [termine, now, stammtischzeit]);

  const eintraege: ListenEintrag[] = useMemo(() => {
    if (tab === "vergangen") {
      return termine
        .filter((t) => (t.datumBis ?? t.datum) < heute)
        .sort((a, b) => b.datum.localeCompare(a.datum))
        .map((t) => ({ art: "termin" as const, datum: t.datum, termin: t }));
    }
    const kommend = termine
      .filter((t) => (t.datumBis ?? t.datum) >= heute && t.id !== hero?.termin.id)
      .map((t) => ({ art: "termin" as const, datum: t.datum, termin: t }));
    // Geburtstage bis zum letzten geplanten Termin, mindestens aber zwei Monate voraus.
    const grenze = kommend.reduce((m, e) => (e.datum > m ? e.datum : m), toLocalIsoDate(new Date(now.getTime() + 60 * 86_400_000)));
    const geburtstage = members
      .filter((m) => m.geburtsdatum)
      .map((m) => {
        const datum = naechsterGeburtstag(m.geburtsdatum!, heute);
        const jahr = parseInt(m.geburtsdatum!.slice(0, 4), 10);
        return { art: "geburtstag" as const, datum, member: m, alter: jahr > 1900 ? parseInt(datum.slice(0, 4), 10) - jahr : null };
      })
      .filter((g) => g.datum <= grenze);
    return [...kommend, ...geburtstage].sort((a, b) => a.datum.localeCompare(b.datum));
  }, [termine, members, tab, heute, hero?.termin.id]);

  // Gewählter Tag: nur, was an dem Tag liegt (auch vergangene Termine).
  const amGewaehltenTag: ListenEintrag[] = tag
    ? [
        ...termine.filter((t) => amTag(t, tag)).map((t) => ({ art: "termin" as const, datum: tag, termin: t })),
        ...members.filter((m) => m.geburtsdatum && m.geburtsdatum.slice(5, 10) === tag.slice(5)).map((m) => {
          const jahr = parseInt(m.geburtsdatum!.slice(0, 4), 10);
          return { art: "geburtstag" as const, datum: tag, member: m, alter: jahr > 1900 ? parseInt(tag.slice(0, 4), 10) - jahr : null };
        }),
      ]
    : [];

  function geburtstagTermin(t: StammtischTermin) {
    showAlert(t.titel ?? "Geburtstag", `Geburtstag am ${formatWochentagDatum(new Date(`${t.datum}T00:00:00`))}`, [
      { text: "Schließen", style: "cancel" },
      { text: "Löschen", style: "destructive", onPress: async () => { await deleteTermin(t.id); await load(); } },
    ]);
  }

  return (
    <Screen
      withNav
      refreshing={screen.refreshing}
      onRefresh={screen.onRefresh}
      header={
        <ScreenHeader
          title="Termine"
          subtitle={`${MONATE[now.getMonth()]} ${now.getFullYear()}`}
          right={<HeaderIconButton icon="add" label="Neuer Termin" onPress={() => setNeu(true)} />}
        />
      }
    >
      <OfflineBanner />
      {screen.loading ? (
        <LoadingSpinner />
      ) : screen.error ? (
        <ErrorState message={screen.error} onRetry={screen.retry} />
      ) : (
        <>
          <KalenderKarte termine={fuerKalender} gewaehlt={tag} onWaehlen={setTag} />

          {tag ? (
            <>
              <View style={styles.tagKopf}>
                <Text style={styles.tagTitel}>{formatWochentagDatum(new Date(`${tag}T00:00:00`))}</Text>
                <PressableScale onPress={() => setNeu(true)} style={styles.tagAktion} accessibilityLabel="Termin an diesem Tag anlegen">
                  <Text style={[styles.tagAktionText, { color: c.blue }]}>+ Termin</Text>
                </PressableScale>
                <PressableScale onPress={() => setTag(null)} style={styles.tagAktion} accessibilityLabel="Tagesauswahl aufheben">
                  <Text style={styles.tagAktionText}>Alle</Text>
                </PressableScale>
              </View>
              <TerminListe eintraege={amGewaehltenTag} vergangen={tag < heute} members={members} onGeburtstagTermin={geburtstagTermin} />
            </>
          ) : (
            <>
              <SegmentedTabs variant="blue" value={tab} onChange={setTab} items={[{ key: "kommend", label: "Kommend" }, { key: "vergangen", label: "Vergangen" }]} />
              {tab === "kommend" && hero ? (
                <NaechsterStammtisch termin={hero.termin} phase={hero.phase} ichId={activeMemberId} stammtischzeit={stammtischzeit} now={now} />
              ) : null}
              <TerminListe
                eintraege={eintraege}
                vergangen={tab === "vergangen"}
                members={members}
                onGeburtstagTermin={geburtstagTermin}
                leerText={tab === "kommend" && hero ? "Danach ist noch nichts geplant. Mit + den nächsten anlegen." : undefined}
              />
            </>
          )}
        </>
      )}

      <NeuerTerminSheet visible={neu} tag={tag} verordnung={verordnung} onClose={() => setNeu(false)} onSaved={() => { setNeu(false); load(); }} />
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    tagKopf: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 4 },
    tagTitel: { flex: 1, fontFamily: FONT.w700, fontSize: 17, color: c.textDark },
    tagAktion: { height: 44, paddingHorizontal: 10, justifyContent: "center" },
    tagAktionText: { fontFamily: FONT.w600, fontSize: 14, color: c.textMuted },
  });
