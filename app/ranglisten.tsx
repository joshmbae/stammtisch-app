import React, { useState } from "react";
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
import { COLORS, SHADOWS } from "../constants/design";
import { HamburgerButton } from "../components/HamburgerButton";
import { BackButton } from "../components/BackButton";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorState from "../components/ErrorState";
import OfflineBanner from "../components/OfflineBanner";
import { useScreenLoad } from "../utils/useScreenLoad";
import { getInitial, displayName } from "../utils/format";
import {
  ALLZEIT,
  JahrFilter,
  RangEintrag,
  Rangliste,
  StatsDaten,
  aktuellesJahr,
  computeRanglisten,
  verfuegbareJahre,
} from "../utils/stats";

function RangRow({ rank, eintrag }: { rank: number; eintrag: RangEintrag }) {
  const medals = ["🥇", "🥈", "🥉"];
  const { member } = eintrag;
  return (
    <TouchableOpacity
      style={styles.rangRow}
      onPress={() => router.push(`/member/${member.id}`)}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`Platz ${rank + 1}: ${displayName(member)}, ${eintrag.anzeige} ${eintrag.label}`}
    >
      <Text style={styles.rangMedal}>{medals[rank] ?? `${rank + 1}.`}</Text>
      {member.photoUri ? (
        <Image source={{ uri: member.photoUri }} style={styles.rangAvatar} />
      ) : (
        <View style={[styles.rangAvatar, { backgroundColor: member.avatarColor, alignItems: "center", justifyContent: "center" }]}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: "#FFF" }}>{getInitial(member.name)}</Text>
        </View>
      )}
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
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [termine, setTermine] = useState<StammtischTermin[]>([]);
  const [verspätungLogs, setVerspätungLogs] = useState<VerspätungLog[]>([]);
  const [spielLogs, setSpielLogs] = useState<SpielLog[]>([]);
  const [strafLogs, setStrafLogs] = useState<StrafLog[]>([]);
  const [spiele, setSpiele] = useState<{ spiel: Spiel; ereignisTypen: SpielEreignisTyp[] }[]>([]);
  const [verordnung, setVerordnung] = useState<StammtischVerordnung | null>(null);
  // Standardmäßig das laufende Jahr — die Gesamtwertung liegt eine Chip-Breite daneben.
  const [jahr, setJahr] = useState<JahrFilter>(aktuellesJahr());

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

  const daten: StatsDaten = { members, termine, verspätungLogs, spielLogs, strafLogs, spiele };
  const jahre = verfuegbareJahre(daten);
  const listen: Rangliste[] = computeRanglisten(daten, jahr);
  const jahrLabel = jahr === ALLZEIT ? "Allzeit" : jahr;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {loading ? <LoadingSpinner /> : error ? <ErrorState message={error} onRetry={retry} /> : (
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.blue} />}
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
          listen.filter((l) => l.eintraege.length > 0).map((liste) => (
            <View key={liste.key} style={styles.rangCard}>
              <Text style={styles.rangCardTitle}>{liste.emoji} {liste.titel}</Text>
              <Text style={styles.rangCardSub}>{liste.untertitel} · {jahrLabel}</Text>
              {liste.eintraege.map((e, i) => (
                <RangRow key={e.member.id} rank={i} eintrag={e} />
              ))}
            </View>
          ))
        )}

        {verordnung?.name ? <Text style={styles.footer}>{verordnung.name}</Text> : null}

      </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, paddingBottom: 48 },

  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: COLORS.cardAlt, borderRadius: 20,
    padding: 16, marginBottom: 14, ...SHADOWS.card,
    borderWidth: 1, borderColor: COLORS.border,
  },
  headerTexts: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: COLORS.textDark },
  headerSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

  jahrRow: { gap: 8, paddingRight: 4, paddingBottom: 14 },
  jahrChip: {
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
  },
  jahrChipAktiv: { backgroundColor: COLORS.blue, borderColor: COLORS.blue },
  jahrChipText: { fontSize: 13, fontWeight: "700", color: COLORS.textMuted },
  jahrChipTextAktiv: { color: "#FFFFFF" },

  empty: { alignItems: "center", paddingTop: 56, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 15, color: COLORS.textMuted, textAlign: "center" },

  rangCard: {
    backgroundColor: COLORS.card, borderRadius: 20, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.card,
  },
  rangCardTitle: { fontSize: 15, fontWeight: "800", color: COLORS.textDark, letterSpacing: -0.2 },
  rangCardSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2, marginBottom: 14 },

  rangRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  rangMedal: { fontSize: 18, width: 28, textAlign: "center" },
  rangAvatar: { width: 36, height: 36, borderRadius: 18 },
  rangInfo: { flex: 1 },
  rangName: { fontSize: 14, fontWeight: "700", color: COLORS.textDark },
  rangSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  rangValueWrap: { alignItems: "flex-end" },
  rangValue: { fontSize: 16, fontWeight: "800", color: COLORS.blue },
  rangValueLabel: { fontSize: 10, color: COLORS.textMuted },

  footer: { textAlign: "center", fontSize: 11, color: COLORS.textLight, marginTop: 8 },
});
