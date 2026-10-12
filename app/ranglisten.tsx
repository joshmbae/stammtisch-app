import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  MemberProfile,
  StammtischVerordnung,
  VerspätungLog,
  SpielLog,
  Spiel,
  SpielEreignisTyp,
  StrafLog,
  StammtischTermin,
} from "../types";
import {
  loadMembers,
  loadVerordnung,
  loadTermine,
  loadSpiele,
  loadAllEreignisTypen,
  loadAllVerspätungLogs,
  loadAllSpielLogs,
  loadAllStrafLogs,
} from "../utils/storage";
import { SHADOWS, ThemeColors, FONT } from "../constants/design";
import { useColors, useThemedStyles } from "../contexts/ThemeContext";
import { useSession } from "../contexts/SessionContext";
import RangVerlaufChart, { VerlaufSerie } from "../components/RangVerlaufChart";
import { HamburgerButton } from "../components/HamburgerButton";
import { BackButton } from "../components/BackButton";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorState from "../components/ErrorState";
import OfflineBanner from "../components/OfflineBanner";
import { useScreenLoad } from "../utils/useScreenLoad";
import { getInitial, displayName } from "../utils/format";
import SiegerBadge from "../components/SiegerBadge";
import {
  ALLZEIT,
  FuehrenderTitel,
  JahrFilter,
  RangEintrag,
  Rangliste,
  StatsDaten,
  aktuellesJahr,
  computeRanglisten,
  computeRangVerlauf,
  fuehrendeTitel,
  verfuegbareJahre,
} from "../utils/stats";

const MAX_HERVORGEHOBEN = 3;

function RangRow({ eintrag, titel }: { eintrag: RangEintrag; titel: FuehrenderTitel[] }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const medals = ["🥇", "🥈", "🥉"];
  const { member, platz } = eintrag;
  return (
    <TouchableOpacity
      style={styles.rangRow}
      onPress={() => router.push(`/member/${member.id}`)}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`Platz ${platz}: ${displayName(member)}, ${eintrag.anzeige} ${eintrag.label}`}
    >
      <Text style={styles.rangMedal}>{medals[platz - 1] ?? `${platz}.`}</Text>
      <View style={styles.rangAvatarWrap}>
        {member.photoUri ? (
          <Image source={{ uri: member.photoUri }} style={styles.rangAvatar} />
        ) : (
          <View style={[styles.rangAvatar, { backgroundColor: member.avatarColor, alignItems: "center", justifyContent: "center" }]}>
            <Text style={{ fontSize: 13, fontFamily: FONT.w700, color: c.onAvatar }}>{getInitial(member.name)}</Text>
          </View>
        )}
        <SiegerBadge titel={titel} size={13} />
      </View>
      <View style={styles.rangInfo}>
        <Text style={styles.rangName}>{displayName(member)}</Text>
        {eintrag.sub ? <Text style={styles.rangSub}>{eintrag.sub}</Text> : null}
      </View>
      <View style={styles.rangValueWrap}>
        <Text style={styles.rangValue}>{eintrag.anzeige}</Text>
        <Text style={styles.rangValueLabel}>{eintrag.label}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function RanglistenScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const { activeMemberId } = useSession();
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [termine, setTermine] = useState<StammtischTermin[]>([]);
  const [verspätungLogs, setVerspätungLogs] = useState<VerspätungLog[]>([]);
  const [spielLogs, setSpielLogs] = useState<SpielLog[]>([]);
  const [strafLogs, setStrafLogs] = useState<StrafLog[]>([]);
  const [spiele, setSpiele] = useState<{ spiel: Spiel; ereignisTypen: SpielEreignisTyp[] }[]>([]);
  const [verordnung, setVerordnung] = useState<StammtischVerordnung | null>(null);
  // Standardmäßig das laufende Jahr — die Gesamtwertung liegt eine Chip-Breite daneben.
  const [jahr, setJahr] = useState<JahrFilter>(aktuellesJahr());
  // Pro Rangliste: Liste oder Verlauf. Die Hervorhebung gilt für alle Diagramme,
  // damit eine Person überall dieselbe Farbe trägt. Wert = Farb-Slot.
  const [verlaufOffen, setVerlaufOffen] = useState<Set<string>>(new Set());
  const [hervorgehoben, setHervorgehoben] = useState<Map<string, number> | null>(null);

  async function load() {
    const [ms, v, ts, alleSpiele] = await Promise.all([
      loadMembers(), loadVerordnung(), loadTermine(), loadSpiele(),
    ]);
    setMembers(ms);
    setVerordnung(v);
    setTermine(ts);

    const alleTypen = await loadAllEreignisTypen(alleSpiele.map((s) => s.id));
    setSpiele(alleSpiele.map((spiel) => ({
      spiel,
      ereignisTypen: alleTypen.filter((et) => et.spielId === spiel.id),
    })));

    const memberIds = ms.map((m) => m.id);
    const [vLogs, spLogs, stLogs] = await Promise.all([
      loadAllVerspätungLogs(memberIds), loadAllSpielLogs(memberIds), loadAllStrafLogs(memberIds),
    ]);
    setVerspätungLogs(vLogs);
    setSpielLogs(spLogs);
    setStrafLogs(stLogs);
  }

  const { loading, refreshing, error, onRefresh, retry } = useScreenLoad(load, []);

  const daten: StatsDaten = useMemo(
    () => ({ members, termine, verspätungLogs, spielLogs, strafLogs, spiele }),
    [members, termine, verspätungLogs, spielLogs, strafLogs, spiele]
  );
  const jahre = useMemo(() => verfuegbareJahre(daten), [daten]);
  const listen: Rangliste[] = useMemo(() => computeRanglisten(daten, jahr), [daten, jahr]);
  // Badge zeigt immer die laufende Jahreswertung, unabhängig vom gewählten Filter.
  const fuehrend = useMemo(() => fuehrendeTitel(daten, aktuellesJahr()), [daten]);
  // Verlauf ist teurer (eine Wertung pro Stammtisch) — erst rechnen, wenn ihn jemand aufklappt.
  const verlauf = useMemo(
    () => (verlaufOffen.size > 0 ? computeRangVerlauf(daten, jahr) : null),
    [daten, jahr, verlaufOffen.size > 0]
  );
  // Standard: das eigene Profil ist hervorgehoben, bis jemand selbst auswählt.
  const highlight = hervorgehoben ?? new Map(activeMemberId ? [[activeMemberId, 0]] : []);

  function toggleVerlauf(key: string) {
    setVerlaufOffen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  /** Farbe folgt der Person: ein neu hervorgehobenes Mitglied bekommt den ersten freien Slot. */
  function toggleHighlight(memberId: string) {
    const next = new Map(highlight);
    if (next.has(memberId)) {
      next.delete(memberId);
    } else {
      if (next.size >= MAX_HERVORGEHOBEN) next.delete(next.keys().next().value!);
      const belegt = new Set(next.values());
      const frei = [0, 1, 2].find((slot) => !belegt.has(slot)) ?? 0;
      next.set(memberId, frei);
    }
    setHervorgehoben(next);
  }
  const jahrLabel = jahr === ALLZEIT ? "Allzeit" : jahr;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {loading ? <LoadingSpinner /> : error ? <ErrorState message={error} onRetry={retry} /> : (
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.blue} />}
      >
        <OfflineBanner />

        <View style={styles.header}>
          <BackButton />
          <HamburgerButton />
          <View style={styles.headerTexts}>
            <Text style={styles.headerTitle}>Ranglisten</Text>
            <Text style={styles.headerSub}>
              {jahr === ALLZEIT ? "Gesamtwertung über alle Jahre" : `Wertung ${jahr}`}
            </Text>
          </View>
        </View>

        {/* Jahresfilter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.jahrRow}
        >
          {jahre.map((j) => (
            <TouchableOpacity
              key={j}
              style={[styles.jahrChip, jahr === j && styles.jahrChipAktiv]}
              onPress={() => setJahr(j)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`Wertung ${j} anzeigen`}
            >
              <Text style={[styles.jahrChipText, jahr === j && styles.jahrChipTextAktiv]}>{j}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.jahrChip, jahr === ALLZEIT && styles.jahrChipAktiv]}
            onPress={() => setJahr(ALLZEIT)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Gesamtwertung über alle Jahre anzeigen"
          >
            <Text style={[styles.jahrChipText, jahr === ALLZEIT && styles.jahrChipTextAktiv]}>Allzeit</Text>
          </TouchableOpacity>
        </ScrollView>

        {members.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🏆</Text>
            <Text style={styles.emptyText}>Noch keine Mitglieder angelegt.</Text>
          </View>
        ) : listen.every((l) => l.eintraege.length === 0) ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>Für {jahrLabel} gibt's noch nichts zu werten.</Text>
          </View>
        ) : (
          listen.filter((l) => l.eintraege.length > 0).map((liste) => {
            const zeigeVerlauf = verlaufOffen.has(liste.key);
            const serien: VerlaufSerie[] = zeigeVerlauf && verlauf
              ? [...(verlauf.plaetze.get(liste.key) ?? new Map()).entries()].flatMap(([id, plaetze]) => {
                  const member = members.find((m) => m.id === id);
                  return member ? [{ member, plaetze }] : [];
                })
              : [];
            return (
              <View key={liste.key} style={styles.rangCard}>
                <View style={styles.rangCardHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rangCardTitle}>{liste.emoji} {liste.titel}</Text>
                    <Text style={styles.rangCardSub}>{liste.untertitel} · {jahrLabel}</Text>
                  </View>
                  <View style={styles.ansichtToggle}>
                    {(["Liste", "Verlauf"] as const).map((ansicht) => {
                      const aktiv = (ansicht === "Verlauf") === zeigeVerlauf;
                      return (
                        <TouchableOpacity
                          key={ansicht}
                          style={[styles.ansichtBtn, aktiv && styles.ansichtBtnAktiv]}
                          onPress={() => { if (!aktiv) toggleVerlauf(liste.key); }}
                          activeOpacity={0.8}
                          accessibilityRole="button"
                          accessibilityState={{ selected: aktiv }}
                          accessibilityLabel={`${liste.titel} als ${ansicht} anzeigen`}
                        >
                          <Text style={[styles.ansichtText, aktiv && styles.ansichtTextAktiv]}>{ansicht}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
                {!zeigeVerlauf ? (
                  liste.eintraege.map((e) => (
                    <RangRow key={e.member.id} eintrag={e} titel={fuehrend.get(e.member.id) ?? []} />
                  ))
                ) : !verlauf || verlauf.punkte.length < 2 ? (
                  <Text style={styles.verlaufLeer}>
                    Der Verlauf entsteht ab dem zweiten Stammtisch {jahr === ALLZEIT ? "" : `in ${jahr}`} — bis dahin gibt es nur einen Stand.
                  </Text>
                ) : (
                  <RangVerlaufChart
                    punkte={verlauf.punkte}
                    serien={serien}
                    highlight={highlight}
                    onToggleMember={toggleHighlight}
                  />
                )}
              </View>
            );
          })
        )}

        {verordnung?.name ? <Text style={styles.footer}>{verordnung.name}</Text> : null}

      </ScrollView>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background },
  content: { padding: 20, paddingBottom: 48 },

  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: c.cardAlt, borderRadius: 20,
    padding: 16, marginBottom: 14, ...SHADOWS.card,
    borderWidth: 1, borderColor: c.border,
  },
  headerTexts: { flex: 1 },
  headerTitle: { fontSize: 18, fontFamily: FONT.w800, color: c.textDark },
  headerSub: { fontFamily: FONT.w400, fontSize: 12, color: c.textMuted, marginTop: 2 },

  jahrRow: { gap: 8, paddingRight: 4, paddingBottom: 14 },
  jahrChip: {
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999,
    backgroundColor: c.card, borderWidth: 1, borderColor: c.border,
  },
  jahrChipAktiv: { backgroundColor: c.blue, borderColor: c.blue },
  jahrChipText: { fontSize: 13, fontFamily: FONT.w700, color: c.textMuted },
  jahrChipTextAktiv: { color: c.onAccent },

  empty: { alignItems: "center", paddingTop: 56, gap: 12 },
  emptyIcon: { fontFamily: FONT.w400, fontSize: 48 },
  emptyText: { fontFamily: FONT.w400, fontSize: 15, color: c.textMuted, textAlign: "center" },

  rangCard: {
    backgroundColor: c.card, borderRadius: 20, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: c.border, ...SHADOWS.card,
  },
  rangCardHead: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 14 },
  rangCardTitle: { fontSize: 15, fontFamily: FONT.w800, color: c.textDark, letterSpacing: -0.2 },
  rangCardSub: { fontFamily: FONT.w400, fontSize: 12, color: c.textMuted, marginTop: 2 },
  ansichtToggle: {
    flexDirection: "row", backgroundColor: c.cardAlt, borderRadius: 999, padding: 2,
    borderWidth: 1, borderColor: c.border,
  },
  ansichtBtn: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999 },
  ansichtBtnAktiv: { backgroundColor: c.blue },
  ansichtText: { fontSize: 12, fontFamily: FONT.w700, color: c.textMuted },
  ansichtTextAktiv: { color: c.onAccent },
  verlaufLeer: { fontFamily: FONT.w400, fontSize: 13, color: c.textMuted, lineHeight: 19, paddingVertical: 8 },

  rangRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: c.border,
  },
  rangMedal: { fontFamily: FONT.w400, fontSize: 18, width: 28, textAlign: "center" },
  rangAvatarWrap: { width: 36, height: 36 },
  rangAvatar: { width: 36, height: 36, borderRadius: 18 },
  rangInfo: { flex: 1 },
  rangName: { fontSize: 14, fontFamily: FONT.w700, color: c.textDark },
  rangSub: { fontFamily: FONT.w400, fontSize: 11, color: c.textMuted, marginTop: 1 },
  rangValueWrap: { alignItems: "flex-end" },
  rangValue: { fontSize: 16, fontFamily: FONT.w800, color: c.blue },
  rangValueLabel: { fontFamily: FONT.w400, fontSize: 10, color: c.textMuted },

  footer: { fontFamily: FONT.w400, textAlign: "center", fontSize: 11, color: c.textLight, marginTop: 8 },
});
