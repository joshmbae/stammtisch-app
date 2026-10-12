import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  MemberProfile,
  VerspätungLog,
  SpielLog,
  Spiel,
  SpielEreignisTyp,
  StrafLog,
  StammtischVerordnung,
  StammtischTermin,
} from "../../types";
import {
  loadMembers,
  loadSpiele,
  loadAllEreignisTypen,
  loadAllVerspätungLogs,
  loadAllSpielLogs,
  loadAllStrafLogs,
  loadVerordnung,
  loadTermine,
} from "../../utils/storage";
import { SHADOWS, ThemeColors, FONT } from "../../constants/design";
import { useColors, useThemedStyles } from "../../contexts/ThemeContext";
import { formatEuro, getInitial, displayName, anwesenheitsQuote } from "../../utils/format";
import PinPrompt from "../../components/PinPrompt";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorState from "../../components/ErrorState";
import OfflineBanner from "../../components/OfflineBanner";
import SiegerBadge from "../../components/SiegerBadge";
import { useScreenLoad } from "../../utils/useScreenLoad";
import { verifyPin } from "../../utils/pin";
import {
  StatsDaten,
  aktuellesJahr,
  fuehrendeTitel,
  jahresTitelFuer,
} from "../../utils/stats";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMitgliedSeit(iso: string): string {
  const years = Math.floor((Date.now() - new Date(iso).getTime()) / (365.25 * 86400000));
  const date = new Date(iso).toLocaleDateString("de-DE", { month: "long", year: "numeric" });
  if (years < 1) return `Seit ${date}`;
  return `Seit ${date} (${years} ${years === 1 ? "Jahr" : "Jahre"})`;
}

function formatDatumKurz(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("de-DE", {
    weekday: "short", day: "2-digit", month: "short", year: "2-digit",
  });
}

// ─── Termin History Row ───────────────────────────────────────────────────────

function TerminHistoryRow({
  termin,
  anwesend,
  verspätungMin,
  spielChips,
  strafen,
}: {
  termin: StammtischTermin;
  anwesend: boolean;
  verspätungMin: number;
  spielChips: { key: string; emoji: string; count: number }[];
  strafen: StrafLog[];
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const strafSumme = strafen.reduce((s, l) => s + l.betrag, 0);

  return (
    <TouchableOpacity
      style={styles.historyRow}
      onPress={() => router.push(`/termin/${termin.id}`)}
      activeOpacity={0.85}
    >
      <View style={[styles.historyDot, { backgroundColor: anwesend ? c.success : c.border }]} />
      <View style={styles.historyInfo}>
        <Text style={styles.historyTitel}>
          {termin.titel ?? (termin.art === "stammtisch" ? "Stammtisch" : "Veranstaltung")}
        </Text>
        <Text style={styles.historyDatum}>{formatDatumKurz(termin.datum)}</Text>
      </View>
      {anwesend ? (
        <View style={styles.historyChips}>
          {/* Steht immer vorn: dass jemand da war, geht sonst unter, sobald an dem
              Abend auch eine Verspätung oder Strafe angefallen ist. */}
          <View style={styles.historyChipDabei}>
            <Text style={styles.historyChipDabeiText}>✓ Dabei</Text>
          </View>
          {verspätungMin > 0 && (
            <View style={styles.historyChip}>
              <Text style={styles.historyChipText}>⏱️ {verspätungMin} Min.</Text>
            </View>
          )}
          {spielChips.map((chip) => (
            <View key={chip.key} style={[styles.historyChip, { backgroundColor: c.blue + "12" }]}>
              <Text style={[styles.historyChipText, { color: c.blue }]}>{chip.emoji} {chip.count}</Text>
            </View>
          ))}
          {strafSumme > 0 && (
            <View style={[styles.historyChip, { backgroundColor: c.goldBg }]}>
              <Text style={[styles.historyChipText, { color: c.gold }]}>
                💰 {strafSumme.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
              </Text>
            </View>
          )}
        </View>
      ) : (
        <Text style={styles.historyAbwesend}>Gefehlt</Text>
      )}
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function MemberDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const [member, setMember] = useState<MemberProfile | null>(null);
  const [verspätungLogs, setVerspätungLogs] = useState<VerspätungLog[]>([]);
  const [spielLogs, setSpielLogs] = useState<SpielLog[]>([]);
  const [spiele, setSpiele] = useState<{ spiel: Spiel; ereignisTypen: SpielEreignisTyp[] }[]>([]);
  const [strafLogs, setStrafLogs] = useState<StrafLog[]>([]);
  const [verordnung, setVerordnung] = useState<StammtischVerordnung | null>(null);
  const [termine, setTermine] = useState<StammtischTermin[]>([]);
  const [showAllTermine, setShowAllTermine] = useState(false);
  const [pinPromptVisible, setPinPromptVisible] = useState(false);
  const [pinError, setPinError] = useState<string | undefined>(undefined);
  // Alle Mitglieder samt Logs — für die Jahrestitel muss die komplette
  // Rangliste gerechnet werden, nicht nur die eigenen Zahlen.
  const [alleMembers, setAlleMembers] = useState<MemberProfile[]>([]);
  const [alleVerspätungLogs, setAlleVerspätungLogs] = useState<VerspätungLog[]>([]);
  const [alleSpielLogs, setAlleSpielLogs] = useState<SpielLog[]>([]);
  const [alleStrafLogs, setAlleStrafLogs] = useState<StrafLog[]>([]);

  async function load() {
    const [members, v, ts, alleSpiele] = await Promise.all([
      loadMembers(), loadVerordnung(), loadTermine(), loadSpiele(),
    ]);
    const alleTypen = await loadAllEreignisTypen(alleSpiele.map((sp) => sp.id));
    const memberIds = members.map((m) => m.id);
    const [vl, spl, stl] = await Promise.all([
      loadAllVerspätungLogs(memberIds), loadAllSpielLogs(memberIds), loadAllStrafLogs(memberIds),
    ]);

    setMember(members.find((m) => m.id === id) ?? null);
    setAlleMembers(members);
    setSpiele(alleSpiele.map((spiel) => ({
      spiel,
      ereignisTypen: alleTypen.filter((et) => et.spielId === spiel.id),
    })));
    setAlleVerspätungLogs(vl);
    setAlleSpielLogs(spl);
    setAlleStrafLogs(stl);
    setVerspätungLogs(vl.filter((l) => l.memberId === id));
    setSpielLogs(spl.filter((l) => l.memberId === id));
    setStrafLogs(stl.filter((l) => l.memberId === id));
    setVerordnung(v);
    // Sort termine newest first
    setTermine([...ts].sort((a, b) => b.datum.localeCompare(a.datum)));
  }

  const { loading, refreshing, error, onRefresh, retry } = useScreenLoad(load, [id]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={retry} />;
  if (!member) return null;

  function handleEditPress() {
    if (!member) return;
    if (!member.pinHash) {
      router.push(`/member/edit/${id}`);
      return;
    }
    setPinError(undefined);
    setPinPromptVisible(true);
  }

  async function handlePinVerify(pin: string) {
    if (!member?.pinHash) return;
    const ok = await verifyPin(member.id, pin);
    if (!ok) {
      setPinError("Falscher PIN.");
      return;
    }
    setPinPromptVisible(false);
    router.push(`/member/edit/${id}`);
  }

  // ── Lifetime stats ──────────────────────────────────────────────────────────
  const verspätungGesamt = verspätungLogs.reduce((s, l) => s + l.minutenVerspätet, 0);
  const spielStatsGesamt = spiele.flatMap(({ spiel, ereignisTypen }) => ereignisTypen.map((et) => ({
    key: spiel.id + ":" + et.id,
    emoji: et.emoji ?? "🎯",
    label: et.label,
    count: spielLogs.filter((l) => l.spielId === spiel.id && l.ereignisTypId === et.id).length,
  }))).filter((s) => s.count > 0);
  const strafGesamt = strafLogs.reduce((s, l) => s + l.betrag, 0);
  const strafOffen = strafLogs.filter((l) => !l.beglichen).reduce((s, l) => s + l.betrag, 0);
  const { count: anwesenheitCount, total: anwesenheitTotal, pct: anwesenheitPct } = anwesenheitsQuote(termine, id, member.mitgliedSeit);

  // ── Jahrestitel ─────────────────────────────────────────────────────────────
  const statsDaten: StatsDaten = {
    members: alleMembers,
    termine,
    verspätungLogs: alleVerspätungLogs,
    spielLogs: alleSpielLogs,
    strafLogs: alleStrafLogs,
    spiele,
  };
  const titel = jahresTitelFuer(statsDaten, id);
  const titelNachJahr = titel.reduce<Record<string, typeof titel>>((acc, t) => {
    acc[t.jahr] = [...(acc[t.jahr] ?? []), t];
    return acc;
  }, {});
  const fuehrtAktuell = fuehrendeTitel(statsDaten, aktuellesJahr()).get(id) ?? [];

  // ── Per-termin history ──────────────────────────────────────────────────────
  const displayedTermine = showAllTermine ? termine : termine.slice(0, 8);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.blue} />}
      >
        <OfflineBanner />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{member.name}</Text>
          <TouchableOpacity onPress={handleEditPress} style={styles.editBtn}>
            <Ionicons name="pencil-outline" size={18} color={c.blue} />
          </TouchableOpacity>
        </View>

        {/* Hero */}
        <View style={[styles.heroCard, { borderColor: member.avatarColor + "44" }]}>
          <View style={styles.heroAvatarWrap}>
            {member.photoUri ? (
              <Image source={{ uri: member.photoUri }} style={styles.heroAvatar} />
            ) : (
              <View style={[styles.heroAvatarPlaceholder, { backgroundColor: member.avatarColor }]}>
                <Text style={styles.heroAvatarLetter}>{getInitial(member.name)}</Text>
              </View>
            )}
            <SiegerBadge titel={fuehrtAktuell} size={20} />
          </View>
          <View style={styles.heroInfo}>
            <Text style={styles.heroName}>{displayName(member)}</Text>
            <View style={[styles.rolleBadge, { backgroundColor: member.avatarColor + "22", borderColor: member.avatarColor + "66" }]}>
              <Text style={[styles.rolleBadgeText, { color: member.avatarColor }]}>{member.rollen.join(", ")}</Text>
            </View>
          </View>
        </View>

        {/* Jahrestitel */}
        {titel.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>🏅 Jahrestitel</Text>
            {Object.keys(titelNachJahr).sort((a, b) => b.localeCompare(a)).map((jahr) => (
              <View key={jahr} style={styles.titelJahrRow}>
                <Text style={styles.titelJahr}>{jahr}</Text>
                <View style={styles.titelChips}>
                  {titelNachJahr[jahr].map((t) => (
                    <View key={t.ranglisteKey} style={styles.titelChip}>
                      <Text style={styles.titelChipText}>{t.emoji} {t.titel}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
            <Text style={styles.titelHinweis}>
              {fuehrtAktuell.length > 0
                ? `Führt aktuell: ${fuehrtAktuell.map((t) => t.titel).join(", ")}`
                : "Platz 1 im jeweiligen Kalenderjahr"}
            </Text>
          </View>
        )}

        {/* Info */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Informationen</Text>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color={c.textMuted} />
            <Text style={styles.infoText}>{getMitgliedSeit(member.mitgliedSeit)}</Text>
          </View>
          {member.geburtsdatum && (
            <View style={styles.infoRow}>
              <Text style={styles.infoEmoji}>🎂</Text>
              <Text style={styles.infoText}>
                {new Date(member.geburtsdatum + "T00:00:00").toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}
                {" · "}
                {new Date().getFullYear() - new Date(member.geburtsdatum + "T00:00:00").getFullYear()} Jahre
              </Text>
            </View>
          )}
          {member.lieblingsgetraenk && (
            <View style={styles.infoRow}>
              <Text style={styles.infoEmoji}>🍺</Text>
              <Text style={styles.infoText}>Lieblingsgetränk: {member.lieblingsgetraenk}</Text>
            </View>
          )}
          {member.beruf && (
            <View style={styles.infoRow}>
              <Ionicons name="briefcase-outline" size={16} color={c.textMuted} />
              <Text style={styles.infoText}>{member.beruf}</Text>
            </View>
          )}
          {member.notizen && (
            <View style={styles.infoRow}>
              <Ionicons name="document-text-outline" size={16} color={c.textMuted} />
              <Text style={styles.infoText}>{member.notizen}</Text>
            </View>
          )}
        </View>

        {/* Lifetime Statistiken */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Stammtisch-Bilanz</Text>
          <View style={styles.statsGrid}>
            {anwesenheitPct !== null && (
              <View style={styles.statBox}>
                <Text style={styles.statEmoji}>✅</Text>
                <Text style={[styles.statValue, { color: c.success }]}>{anwesenheitPct} %</Text>
                <Text style={styles.statLabel}>{anwesenheitCount}/{anwesenheitTotal} Abende</Text>
              </View>
            )}
            {verspätungGesamt > 0 && (
              <View style={styles.statBox}>
                <Text style={styles.statEmoji}>⏱️</Text>
                <Text style={[styles.statValue, { color: c.danger }]}>{verspätungGesamt}</Text>
                <Text style={styles.statLabel}>Min. zu spät</Text>
              </View>
            )}
            {spielStatsGesamt.map((s) => (
              <View key={s.key} style={styles.statBox}>
                <Text style={styles.statEmoji}>{s.emoji}</Text>
                <Text style={[styles.statValue, { color: c.blue }]}>{s.count}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
            {strafGesamt > 0 && (
              /* Große Zahl ist die Gesamtsumme; der offene Rest steht als eigene
                 Zeile darunter und die Kachel färbt sich entsprechend — rot,
                 solange etwas aussteht, grün sobald alles beglichen ist. */
              <TouchableOpacity
                style={[styles.statBox, strafOffen > 0 ? styles.statBoxOffen : styles.statBoxBeglichen]}
                onPress={() => router.push(`/kasse?tab=strafen&memberId=${id}`)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={strafOffen > 0
                  ? `${formatEuro(strafGesamt)} Euro Strafen gesamt, davon ${formatEuro(strafOffen)} Euro offen`
                  : `${formatEuro(strafGesamt)} Euro Strafen gesamt, alles beglichen`}
              >
                <Text style={styles.statEmoji}>💰</Text>
                <Text style={[styles.statValue, { fontFamily: FONT.w400, fontSize: 15 }]}>
                  {formatEuro(strafGesamt)} €
                </Text>
                <Text style={styles.statLabel}>Strafen gesamt</Text>
                <Text style={[styles.statLabel, { fontFamily: FONT.w700, color: strafOffen > 0 ? c.danger : c.success }]}>
                  {strafOffen > 0 ? `offen: ${formatEuro(strafOffen)} €` : "✓ alles beglichen"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Termin-Verlauf */}
        {termine.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Stammtisch-Verlauf</Text>
            {displayedTermine.map((t) => {
              const tVerspätung = verspätungLogs
                .filter((l) => l.terminId === t.id)
                .reduce((s, l) => s + l.minutenVerspätet, 0);
              const tSpielChips = spiele.flatMap(({ spiel, ereignisTypen }) => ereignisTypen.map((et) => ({
                key: spiel.id + ":" + et.id,
                emoji: et.emoji ?? "🎯",
                count: spielLogs.filter((l) => l.terminId === t.id && l.spielId === spiel.id && l.ereignisTypId === et.id).length,
              }))).filter((c) => c.count > 0);
              const tStrafen = strafLogs.filter((l) => l.terminId === t.id);
              return (
                <TerminHistoryRow
                  key={t.id}
                  termin={t}
                  anwesend={(t.anwesenheit ?? []).includes(id)}
                  verspätungMin={tVerspätung}
                  spielChips={tSpielChips}
                  strafen={tStrafen}
                />
              );
            })}
            {termine.length > 8 && (
              <TouchableOpacity
                style={styles.showMoreBtn}
                onPress={() => setShowAllTermine((v) => !v)}
              >
                <Text style={styles.showMoreText}>
                  {showAllTermine ? "Weniger anzeigen" : `Alle ${termine.length} Termine anzeigen`}
                </Text>
                <Ionicons
                  name={showAllTermine ? "chevron-up" : "chevron-down"}
                  size={14}
                  color={c.blue}
                />
              </TouchableOpacity>
            )}
          </View>
        )}

      </ScrollView>

      <PinPrompt
        visible={pinPromptVisible}
        mode="verify"
        memberName={member.name}
        error={pinError}
        onCancel={() => setPinPromptVisible(false)}
        onSubmit={handlePinVerify}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background },
  content: { padding: 20, paddingBottom: 48 },

  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16, paddingTop: 4 },
  backBtn: { padding: 4 },
  backText: { fontFamily: FONT.w400, fontSize: 32, color: c.blue, lineHeight: 36 },
  headerTitle: { fontSize: 20, fontFamily: FONT.w800, color: c.textDark, flex: 1 },
  editBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: c.card,
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: c.border,
  },

  heroCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: c.card, borderRadius: 20, padding: 16, marginBottom: 12,
    borderWidth: 1.5, ...SHADOWS.card,
  },
  heroAvatar: { width: 64, height: 64, borderRadius: 32 },
  heroAvatarPlaceholder: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  heroAvatarLetter: { fontSize: 26, fontFamily: FONT.w700, color: c.onAvatar },
  heroInfo: { flex: 1, gap: 4 },
  heroAvatarWrap: { width: 64, height: 64 },
  titelJahrRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 6 },
  titelJahr: { fontSize: 13, fontFamily: FONT.w800, color: c.textMuted, width: 44, paddingTop: 3 },
  titelChips: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 6 },
  titelChip: {
    backgroundColor: c.goldBg, borderRadius: 10,
    borderWidth: 1, borderColor: c.gold + "44",
    paddingHorizontal: 9, paddingVertical: 4,
  },
  titelChipText: { fontSize: 12, fontFamily: FONT.w700, color: c.textMid },
  titelHinweis: { fontFamily: FONT.w400, fontSize: 11, color: c.textLight, marginTop: 8 },
  heroName: { fontSize: 18, fontFamily: FONT.w800, color: c.textDark },
  rolleBadge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  rolleBadgeText: { fontSize: 12, fontFamily: FONT.w700 },

  card: {
    backgroundColor: c.card, borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: c.border,
  },
  sectionTitle: { fontSize: 14, fontFamily: FONT.w800, color: c.textDark, marginBottom: 12, letterSpacing: -0.1 },

  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 8 },
  infoEmoji: { fontFamily: FONT.w400, fontSize: 16, lineHeight: 20 },
  infoText: { fontFamily: FONT.w400, fontSize: 14, color: c.textMid, flex: 1, lineHeight: 20 },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statBox: {
    flex: 1, minWidth: "40%", alignItems: "center", gap: 4,
    backgroundColor: c.background, borderRadius: 12, padding: 12,
  },
  statBoxOffen: {
    backgroundColor: c.dangerBg,
    borderWidth: 1, borderColor: c.danger + "33",
  },
  statBoxBeglichen: {
    backgroundColor: c.successBg,
    borderWidth: 1, borderColor: c.success + "33",
  },
  statEmoji: { fontFamily: FONT.w400, fontSize: 22 },
  statValue: { fontSize: 20, fontFamily: FONT.w800, color: c.textDark },
  statLabel: { fontFamily: FONT.w400, fontSize: 11, color: c.textMuted, textAlign: "center" },

  // Termin history
  historyRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border,
  },
  historyDot: { width: 8, height: 8, borderRadius: 4 },
  historyInfo: { minWidth: 90 },
  historyTitel: { fontSize: 13, fontFamily: FONT.w700, color: c.textDark },
  historyDatum: { fontFamily: FONT.w400, fontSize: 11, color: c.textMuted, marginTop: 1 },
  historyChips: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 4, justifyContent: "flex-end" },
  historyChip: {
    backgroundColor: c.dangerBg, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3,
  },
  historyChipText: { fontSize: 11, fontFamily: FONT.w700, color: c.danger },
  historyChipDabei: {
    backgroundColor: c.success + "16", borderRadius: 8,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  historyChipDabeiText: { fontSize: 11, fontFamily: FONT.w700, color: c.success },
  historyAbwesend: { fontFamily: FONT.w400i, fontSize: 12, color: c.textLight },
  showMoreBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5,
    paddingTop: 12, marginTop: 4,
  },
  showMoreText: { fontSize: 13, fontFamily: FONT.w600, color: c.blue },
});
