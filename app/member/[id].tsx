import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
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
  STRAF_KATEGORIEN,
  StammtischVerordnung,
  StammtischTermin,
} from "../../types";
import {
  loadMembers,
  loadVerspätungLogs,
  loadSpiele,
  loadEreignisTypen,
  loadSpielLogs,
  loadStrafLogs,
  loadVerordnung,
  loadTermine,
} from "../../utils/storage";
import { COLORS, SHADOWS } from "../../constants/design";
import { formatEuro, getInitial } from "../../utils/format";
import PinPrompt from "../../components/PinPrompt";
import LoadingSpinner from "../../components/LoadingSpinner";
import { verifyPin } from "../../utils/pin";

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
  const strafSumme = strafen.reduce((s, l) => s + l.betrag, 0);

  return (
    <TouchableOpacity
      style={styles.historyRow}
      onPress={() => router.push(`/termin/${termin.id}`)}
      activeOpacity={0.85}
    >
      <View style={[styles.historyDot, { backgroundColor: anwesend ? COLORS.success : COLORS.border }]} />
      <View style={styles.historyInfo}>
        <Text style={styles.historyTitel}>
          {termin.titel ?? (termin.art === "stammtisch" ? "Stammtisch" : "Veranstaltung")}
        </Text>
        <Text style={styles.historyDatum}>{formatDatumKurz(termin.datum)}</Text>
      </View>
      {anwesend ? (
        <View style={styles.historyChips}>
          {verspätungMin > 0 && (
            <View style={styles.historyChip}>
              <Text style={styles.historyChipText}>⏱️ {verspätungMin} Min.</Text>
            </View>
          )}
          {spielChips.map((c) => (
            <View key={c.key} style={[styles.historyChip, { backgroundColor: COLORS.blue + "12" }]}>
              <Text style={[styles.historyChipText, { color: COLORS.blue }]}>{c.emoji} {c.count}</Text>
            </View>
          ))}
          {strafSumme > 0 && (
            <View style={[styles.historyChip, { backgroundColor: "#FFF3D6" }]}>
              <Text style={[styles.historyChipText, { color: COLORS.gold }]}>
                💰 {strafSumme.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
              </Text>
            </View>
          )}
          {verspätungMin === 0 && spielChips.length === 0 && strafSumme === 0 && (
            <Text style={styles.historyClean}>✓ Dabei</Text>
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
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const [members, vl, spl, stl, v, ts, alleSpiele] = await Promise.all([
          loadMembers(),
          loadVerspätungLogs(id),
          loadSpielLogs(id),
          loadStrafLogs(id),
          loadVerordnung(),
          loadTermine(),
          loadSpiele(),
        ]);
        const spieleMitTypen = await Promise.all(
          alleSpiele.map(async (spiel) => ({ spiel, ereignisTypen: await loadEreignisTypen(spiel.id) }))
        );
        setMember(members.find((m) => m.id === id) ?? null);
        setVerspätungLogs(vl);
        setSpielLogs(spl);
        setSpiele(spieleMitTypen);
        setStrafLogs(stl);
        setVerordnung(v);
        // Sort termine newest first
        setTermine([...ts].sort((a, b) => b.datum.localeCompare(a.datum)));
        setLoading(false);
      }
      load();
    }, [id])
  );

  if (loading) return <LoadingSpinner />;
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
  const anwesenheitCount = termine.filter((t) => (t.anwesenheit ?? []).includes(id)).length;
  const anwesenheitPct = termine.length > 0 ? Math.round((anwesenheitCount / termine.length) * 100) : null;

  // ── Per-termin history ──────────────────────────────────────────────────────
  const displayedTermine = showAllTermine ? termine : termine.slice(0, 8);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{member.name}</Text>
          <TouchableOpacity onPress={handleEditPress} style={styles.editBtn}>
            <Ionicons name="pencil-outline" size={18} color={COLORS.blue} />
          </TouchableOpacity>
        </View>

        {/* Hero */}
        <View style={[styles.heroCard, { borderColor: member.avatarColor + "44" }]}>
          {member.photoUri ? (
            <Image source={{ uri: member.photoUri }} style={styles.heroAvatar} />
          ) : (
            <View style={[styles.heroAvatarPlaceholder, { backgroundColor: member.avatarColor }]}>
              <Text style={styles.heroAvatarLetter}>{getInitial(member.name)}</Text>
            </View>
          )}
          <View style={styles.heroInfo}>
            <Text style={styles.heroName}>{member.name}</Text>
            {member.spitzname && <Text style={styles.heroSpitzname}>„{member.spitzname}"</Text>}
            <View style={[styles.rolleBadge, { backgroundColor: member.avatarColor + "22", borderColor: member.avatarColor + "66" }]}>
              <Text style={[styles.rolleBadgeText, { color: member.avatarColor }]}>{member.rollen.join(", ")}</Text>
            </View>
          </View>
        </View>

        {/* Info */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Informationen</Text>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color={COLORS.textMuted} />
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
              <Ionicons name="briefcase-outline" size={16} color={COLORS.textMuted} />
              <Text style={styles.infoText}>{member.beruf}</Text>
            </View>
          )}
          {member.notizen && (
            <View style={styles.infoRow}>
              <Ionicons name="document-text-outline" size={16} color={COLORS.textMuted} />
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
                <Text style={[styles.statValue, { color: COLORS.success }]}>{anwesenheitPct} %</Text>
                <Text style={styles.statLabel}>{anwesenheitCount}/{termine.length} Abende</Text>
              </View>
            )}
            {verspätungGesamt > 0 && (
              <View style={styles.statBox}>
                <Text style={styles.statEmoji}>⏱️</Text>
                <Text style={[styles.statValue, { color: COLORS.danger }]}>{verspätungGesamt}</Text>
                <Text style={styles.statLabel}>Min. zu spät</Text>
              </View>
            )}
            {spielStatsGesamt.map((s) => (
              <View key={s.key} style={styles.statBox}>
                <Text style={styles.statEmoji}>{s.emoji}</Text>
                <Text style={[styles.statValue, { color: COLORS.blue }]}>{s.count}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
            {strafGesamt > 0 && (
              <View style={styles.statBox}>
                <Text style={styles.statEmoji}>💰</Text>
                <Text style={[styles.statValue, { fontSize: 15, color: COLORS.danger }]}>
                  {strafGesamt.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
                </Text>
                <Text style={styles.statLabel}>
                  Strafen{strafOffen > 0 ? ` (${strafOffen.toLocaleString("de-DE", { minimumFractionDigits: 2 })} € offen)` : " ✓"}
                </Text>
              </View>
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
                  color={COLORS.blue}
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, paddingBottom: 48 },

  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16, paddingTop: 4 },
  backBtn: { padding: 4 },
  backText: { fontSize: 32, color: COLORS.blue, lineHeight: 36 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: COLORS.textDark, flex: 1 },
  editBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.card,
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: COLORS.border,
  },

  heroCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: COLORS.card, borderRadius: 20, padding: 16, marginBottom: 12,
    borderWidth: 1.5, ...SHADOWS.card,
  },
  heroAvatar: { width: 64, height: 64, borderRadius: 32 },
  heroAvatarPlaceholder: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  heroAvatarLetter: { fontSize: 26, fontWeight: "700", color: "#FFFFFF" },
  heroInfo: { flex: 1, gap: 4 },
  heroName: { fontSize: 18, fontWeight: "800", color: COLORS.textDark },
  heroSpitzname: { fontSize: 13, color: COLORS.textMuted, fontStyle: "italic" },
  rolleBadge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  rolleBadgeText: { fontSize: 12, fontWeight: "700" },

  card: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: COLORS.textDark, marginBottom: 12, letterSpacing: -0.1 },

  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 8 },
  infoEmoji: { fontSize: 16, lineHeight: 20 },
  infoText: { fontSize: 14, color: COLORS.textMid, flex: 1, lineHeight: 20 },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statBox: {
    flex: 1, minWidth: "40%", alignItems: "center", gap: 4,
    backgroundColor: COLORS.background, borderRadius: 12, padding: 12,
  },
  statEmoji: { fontSize: 22 },
  statValue: { fontSize: 20, fontWeight: "800", color: COLORS.textDark },
  statLabel: { fontSize: 11, color: COLORS.textMuted, textAlign: "center" },

  // Termin history
  historyRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  historyDot: { width: 8, height: 8, borderRadius: 4 },
  historyInfo: { minWidth: 90 },
  historyTitel: { fontSize: 13, fontWeight: "700", color: COLORS.textDark },
  historyDatum: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  historyChips: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 4, justifyContent: "flex-end" },
  historyChip: {
    backgroundColor: "#FFF0F0", borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3,
  },
  historyChipText: { fontSize: 11, fontWeight: "700", color: COLORS.danger },
  historyClean: { fontSize: 12, color: COLORS.success, fontWeight: "600" },
  historyAbwesend: { fontSize: 12, color: COLORS.textLight, fontStyle: "italic" },
  showMoreBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5,
    paddingTop: 12, marginTop: 4,
  },
  showMoreText: { fontSize: 13, fontWeight: "600", color: COLORS.blue },
});
