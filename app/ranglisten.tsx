import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  MemberProfile,
  StammtischVerordnung,
  VerspätungLog,
  SpielLog,
  Spiel,
  SpielEreignisTyp,
  StrafLog,
} from "../types";
import {
  loadMembers,
  loadVerordnung,
  loadTermine,
  loadVerspätungLogs,
  loadSpiele,
  loadEreignisTypen,
  loadSpielLogs,
  loadStrafLogs,
} from "../utils/storage";
import { COLORS, SHADOWS } from "../constants/design";
import { HamburgerButton } from "../components/HamburgerButton";
import LoadingSpinner from "../components/LoadingSpinner";
import { formatEuro, getInitial, displayName } from "../utils/format";

interface MemberStats {
  member: MemberProfile;
  anwesenheitCount: number;
  anwesenheitPct: number;
  verspätungMin: number;
  spielLogs: SpielLog[];
  strafGesamt: number;
  strafOffen: number;
}

function RangRow({ rank, member, value, valueLabel, sub }: {
  rank: number; member: MemberProfile; value: string; valueLabel: string; sub?: string;
}) {
  const medals = ["🥇", "🥈", "🥉"];
  return (
    <TouchableOpacity
      style={styles.rangRow}
      onPress={() => router.push(`/member/${member.id}`)}
      activeOpacity={0.85}
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
        {sub ? <Text style={styles.rangSub}>{sub}</Text> : null}
      </View>
      <View style={styles.rangValueWrap}>
        <Text style={styles.rangValue}>{value}</Text>
        <Text style={styles.rangValueLabel}>{valueLabel}</Text>
      </View>
    </TouchableOpacity>
  );
}

interface SpielMitTypen {
  spiel: Spiel;
  ereignisTypen: SpielEreignisTyp[];
}

export default function RanglistenScreen() {
  const [memberStats, setMemberStats] = useState<MemberStats[]>([]);
  const [spiele, setSpiele] = useState<SpielMitTypen[]>([]);
  const [verordnung, setVerordnung] = useState<StammtischVerordnung | null>(null);
  const [terminCount, setTerminCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => { load(); }, []));

  async function load() {
    const [ms, v, alle, alleSpiele] = await Promise.all([loadMembers(), loadVerordnung(), loadTermine(), loadSpiele()]);
    setVerordnung(v);
    setTerminCount(alle.length);

    const spieleMitTypen = await Promise.all(
      alleSpiele.map(async (spiel) => ({ spiel, ereignisTypen: await loadEreignisTypen(spiel.id) }))
    );
    setSpiele(spieleMitTypen);

    if (ms.length === 0) { setMemberStats([]); setLoading(false); return; }

    const stats = await Promise.all(ms.map(async (m) => {
      const [vLogs, spLogs, stLogs]: [VerspätungLog[], SpielLog[], StrafLog[]] = await Promise.all([
        loadVerspätungLogs(m.id), loadSpielLogs(m.id), loadStrafLogs(m.id),
      ]);
      const anwesenheitCount = alle.filter((t) => (t.anwesenheit ?? []).includes(m.id)).length;
      const anwesenheitPct = alle.length > 0 ? Math.round((anwesenheitCount / alle.length) * 100) : 0;
      return {
        member: m, anwesenheitCount, anwesenheitPct,
        verspätungMin: vLogs.reduce((s, l) => s + l.minutenVerspätet, 0),
        spielLogs: spLogs,
        strafGesamt: stLogs.reduce((s, l) => s + l.betrag, 0),
        strafOffen: stLogs.filter((l) => !l.beglichen).reduce((s, l) => s + l.betrag, 0),
      };
    }));
    setMemberStats(stats);
    setLoading(false);
  }

  const teilnahmeRang  = [...memberStats].sort((a, b) => b.anwesenheitCount - a.anwesenheitCount);
  const verspätungRang = [...memberStats].filter(s => s.verspätungMin > 0).sort((a, b) => b.verspätungMin - a.verspätungMin);
  const strafRang      = [...memberStats].filter(s => s.strafGesamt > 0).sort((a, b) => b.strafGesamt - a.strafGesamt);

  const spielRanglisten = spiele.flatMap(({ spiel, ereignisTypen }) =>
    ereignisTypen.map((et) => ({
      spiel, ereignisTyp: et,
      rang: [...memberStats]
        .map((s) => ({ member: s.member, count: s.spielLogs.filter((l) => l.spielId === spiel.id && l.ereignisTypId === et.id).length }))
        .filter((s) => s.count > 0)
        .sort((a, b) => b.count - a.count),
    }))
  ).filter((r) => r.rang.length > 0);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {loading ? <LoadingSpinner /> : (
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <HamburgerButton />
          <View style={styles.headerTexts}>
            <Text style={styles.headerTitle}>Ranglisten</Text>
            <Text style={styles.headerSub}>Spiele, Verspätungen & Strafen</Text>
          </View>
        </View>

        {memberStats.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🏆</Text>
            <Text style={styles.emptyText}>Noch keine Daten vorhanden.</Text>
          </View>
        ) : (
          <>
            {/* Teilnahme */}
            <View style={styles.rangCard}>
              <Text style={styles.rangCardTitle}>🏆 Teilnahme-Rangliste</Text>
              <Text style={styles.rangCardSub}>{terminCount} Stammtische insgesamt</Text>
              {teilnahmeRang.map((s, i) => (
                <RangRow key={s.member.id} rank={i} member={s.member}
                  value={`${s.anwesenheitCount}`} valueLabel="Abende"
                  sub={terminCount > 0 ? `${s.anwesenheitPct} % Anwesenheit` : undefined} />
              ))}
            </View>

            {/* Spiele (generisch, pro Spiel + Ereignistyp) */}
            {spielRanglisten.map(({ spiel, ereignisTyp, rang }) => (
              <View key={ereignisTyp.id} style={styles.rangCard}>
                <Text style={styles.rangCardTitle}>
                  {spiel.emoji ?? "🎮"} {spiel.name} — {ereignisTyp.label}-Rangliste
                </Text>
                <Text style={styles.rangCardSub}>Wer hat am meisten „{ereignisTyp.label}"</Text>
                {rang.map((s, i) => (
                  <RangRow key={s.member.id} rank={i} member={s.member}
                    value={`${s.count}`} valueLabel={ereignisTyp.label} />
                ))}
              </View>
            ))}

            {/* Verspätung */}
            {verspätungRang.length > 0 && (
              <View style={styles.rangCard}>
                <Text style={styles.rangCardTitle}>⏱️ Verspätungs-Rangliste</Text>
                <Text style={styles.rangCardSub}>Gesamte Verspätungsminuten</Text>
                {verspätungRang.map((s, i) => (
                  <RangRow key={s.member.id} rank={i} member={s.member}
                    value={`${s.verspätungMin}`} valueLabel="Min." />
                ))}
              </View>
            )}

            {/* Strafen */}
            {strafRang.length > 0 && (
              <View style={styles.rangCard}>
                <Text style={styles.rangCardTitle}>💰 Strafen-Rangliste</Text>
                <Text style={styles.rangCardSub}>Gesamte Strafbeträge</Text>
                {strafRang.map((s, i) => (
                  <RangRow key={s.member.id} rank={i} member={s.member}
                    value={`${formatEuro(s.strafGesamt)} €`} valueLabel="Gesamt"
                    sub={s.strafOffen > 0 ? `⚠️ ${formatEuro(s.strafOffen)} € noch offen` : "✅ alles beglichen"} />
                ))}
              </View>
            )}
          </>
        )}

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
    padding: 16, marginBottom: 16, ...SHADOWS.card,
    borderWidth: 1, borderColor: COLORS.border,
  },
  headerTexts: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: COLORS.textDark },
  headerSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

  empty: { alignItems: "center", paddingTop: 64, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 15, color: COLORS.textMuted },

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
});
