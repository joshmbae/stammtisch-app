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
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Swipeable from "react-native-gesture-handler/Swipeable";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StrafLog, MemberProfile, STRAF_KATEGORIEN } from "../types";
import {
  loadMembers,
  loadAllStrafLogs,
  updateStrafLog,
  deleteStrafLog,
  logActivity,
  addKassenEintrag,
} from "../utils/storage";
import { COLORS, SHADOWS } from "../constants/design";
import { HamburgerButton } from "../components/HamburgerButton";
import LoadingSpinner from "../components/LoadingSpinner";
import { useSession } from "../contexts/SessionContext";
import { formatEuro, getInitial } from "../utils/format";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDatum(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function katMeta(kategorie: StrafLog["kategorie"]) {
  return STRAF_KATEGORIEN.find((k) => k.key === kategorie);
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function StrafenScreen() {
  const { activeMemberId } = useSession();
  const [logs, setLogs] = useState<StrafLog[]>([]);
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [filterMemberId, setFilterMemberId] = useState<string | null>(null);
  const [showBeglichen, setShowBeglichen] = useState(false);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const ms = await loadMembers();
        setMembers(ms);
        const all = await loadAllStrafLogs(ms.map((m) => m.id));
        setLogs(all.sort((a, b) => b.loggedAt.localeCompare(a.loggedAt)));
        setLoading(false);
      }
      load();
    }, [])
  );

  const membersById = new Map(members.map((m) => [m.id, m]));

  const gefiltert = logs.filter((l) => !filterMemberId || l.memberId === filterMemberId);
  const offen = gefiltert.filter((l) => !l.beglichen);
  const beglichenCount = gefiltert.length - offen.length;
  const sichtbar = showBeglichen ? gefiltert : offen;

  const summeOffen = offen.reduce((s, l) => s + l.betrag, 0);

  async function handleToggleBeglichen(log: StrafLog) {
    const next = !log.beglichen;
    await updateStrafLog(log.memberId, log.id, { beglichen: next });
    setLogs((prev) => prev.map((l) => l.id === log.id ? { ...l, beglichen: next } : l));
    if (next) {
      const member = membersById.get(log.memberId);
      const kat = katMeta(log.kategorie);
      await addKassenEintrag({
        typ: "einnahme",
        betrag: log.betrag,
        beschreibung: `Strafe beglichen: ${member?.name ?? "Unbekannt"} – ${kat?.label ?? log.kategorie}`,
        terminId: log.terminId,
        datum: new Date().toISOString(),
      });
      await logActivity({
        actorMemberId: activeMemberId ?? undefined,
        subjectMemberId: log.memberId,
        actionType: "straf_log_beglichen",
        terminId: log.terminId,
        refId: log.id,
        meta: { betrag: log.betrag },
      });
    }
  }

  async function handleDelete(log: StrafLog) {
    await deleteStrafLog(log.memberId, log.id);
    setLogs((prev) => prev.filter((l) => l.id !== log.id));
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        {loading ? <LoadingSpinner /> : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={styles.header}>
            <HamburgerButton />
            <View style={styles.headerTexts}>
              <Text style={styles.headerTitle}>Strafen</Text>
              <Text style={styles.headerSub}>Alle Strafen der Runde</Text>
            </View>
          </View>

          {/* Summe offen */}
          <View style={[styles.saldoCard, { borderColor: summeOffen > 0 ? COLORS.danger + "44" : COLORS.success + "44" }]}>
            <Text style={styles.saldoLabel}>Offene Strafen{filterMemberId ? ` · ${membersById.get(filterMemberId)?.name.split(" ")[0]}` : ""}</Text>
            <Text style={[styles.saldoValue, { color: summeOffen > 0 ? COLORS.danger : COLORS.success }]}>
              {formatEuro(summeOffen)} €
            </Text>
          </View>

          {/* Filter nach Person */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={{ paddingRight: 8 }}>
            <TouchableOpacity
              style={[styles.memberChip, !filterMemberId && styles.memberChipActive]}
              onPress={() => setFilterMemberId(null)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipName, !filterMemberId && { color: "#FFFFFF" }]}>Alle</Text>
            </TouchableOpacity>
            {members.map((m) => (
              <TouchableOpacity
                key={m.id}
                style={[styles.memberChip, filterMemberId === m.id && { backgroundColor: m.avatarColor, borderColor: m.avatarColor }]}
                onPress={() => setFilterMemberId(filterMemberId === m.id ? null : m.id)}
                activeOpacity={0.8}
              >
                {m.photoUri ? (
                  <Image source={{ uri: m.photoUri }} style={styles.chipAvatar} />
                ) : (
                  <View style={[styles.chipAvatarFallback, { backgroundColor: filterMemberId === m.id ? "rgba(255,255,255,0.3)" : m.avatarColor + "33" }]}>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: filterMemberId === m.id ? "#FFF" : m.avatarColor }}>
                      {getInitial(m.name)}
                    </Text>
                  </View>
                )}
                <Text style={[styles.chipName, filterMemberId === m.id && { color: "#FFFFFF" }]}>
                  {m.name.split(" ")[0]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Liste */}
          {gefiltert.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>📋 {offen.length} offen</Text>
                {beglichenCount > 0 && (
                  <TouchableOpacity onPress={() => setShowBeglichen((v) => !v)}>
                    <Text style={styles.sectionToggle}>
                      {showBeglichen ? "Beglichene ausblenden" : `+ ${beglichenCount} beglichen`}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              {sichtbar.map((log) => {
                const kat = katMeta(log.kategorie);
                const member = membersById.get(log.memberId);
                return (
                  <Swipeable
                    key={log.id}
                    renderRightActions={() => (
                      <TouchableOpacity style={styles.deleteAction} onPress={() => handleDelete(log)} activeOpacity={0.8}>
                        <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
                      </TouchableOpacity>
                    )}
                    overshootRight={false}
                  >
                    <View style={[
                      styles.eintragRow,
                      { borderLeftColor: log.beglichen ? COLORS.success : COLORS.danger },
                      log.beglichen && { backgroundColor: "#F8FDF9" },
                    ]}>
                      <View style={[styles.eintragIcon, { backgroundColor: log.beglichen ? COLORS.success + "15" : COLORS.danger + "12" }]}>
                        <Text style={{ fontSize: 18 }}>{log.beglichen ? "✅" : kat?.emoji ?? "💰"}</Text>
                      </View>
                      <View style={styles.eintragMeta}>
                        <Text style={styles.eintragTypLabel}>{member?.name ?? "Unbekannt"}</Text>
                        <Text style={styles.eintragDesc} numberOfLines={1}>
                          {kat?.label ?? log.kategorie}{log.notiz ? ` · ${log.notiz}` : ""}
                        </Text>
                        <Text style={styles.eintragDatum}>{formatDatum(log.loggedAt)}</Text>
                      </View>
                      <Text style={[
                        styles.eintragBetrag,
                        { color: log.beglichen ? COLORS.textLight : COLORS.danger },
                        log.beglichen && { textDecorationLine: "line-through" },
                      ]}>
                        {formatEuro(log.betrag)} €
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleToggleBeglichen(log)}
                        activeOpacity={0.8}
                        style={{ paddingLeft: 8 }}
                      >
                        <Ionicons
                          name={log.beglichen ? "checkmark-circle" : "ellipse-outline"}
                          size={22}
                          color={log.beglichen ? COLORS.success : COLORS.border}
                        />
                      </TouchableOpacity>
                    </View>
                  </Swipeable>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🎉</Text>
              <Text style={styles.emptyTitle}>
                {filterMemberId ? "Keine Strafen" : "Keine Strafen in der Runde"}
              </Text>
              <Text style={styles.emptySub}>Strafen werden im jeweiligen Stammtisch-Termin eingetragen.</Text>
            </View>
          )}

        </ScrollView>
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, paddingBottom: 60 },

  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: COLORS.cardAlt, borderRadius: 20,
    padding: 16, marginBottom: 16, ...SHADOWS.card,
    borderWidth: 1, borderColor: COLORS.border,
  },
  headerTexts: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: COLORS.textDark },
  headerSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

  saldoCard: {
    backgroundColor: COLORS.card, borderRadius: 20, padding: 18,
    marginBottom: 14, borderWidth: 1.5, ...SHADOWS.card,
    alignItems: "center",
  },
  saldoLabel: { fontSize: 13, fontWeight: "700", color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  saldoValue: { fontSize: 34, fontWeight: "900", letterSpacing: -1 },

  filterScroll: { marginBottom: 16 },
  memberChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: COLORS.background, borderWidth: 1.5, borderColor: COLORS.border, marginRight: 8,
  },
  memberChipActive: { backgroundColor: COLORS.blue, borderColor: COLORS.blue },
  chipAvatar: { width: 22, height: 22, borderRadius: 11 },
  chipAvatarFallback: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  chipName: { fontSize: 13, fontWeight: "600", color: COLORS.textMid },

  section: { marginBottom: 8 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  sectionTitle: { fontSize: 13, fontWeight: "800", color: COLORS.textMid, letterSpacing: 0.2 },
  sectionToggle: { fontSize: 12, fontWeight: "600", color: COLORS.blue },

  eintragRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: COLORS.card, borderRadius: 14, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: COLORS.border, borderLeftWidth: 3, ...SHADOWS.light,
  },
  eintragIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  eintragMeta: { flex: 1 },
  eintragTypLabel: { fontSize: 13, fontWeight: "700", color: COLORS.textDark },
  eintragDesc: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  eintragDatum: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
  eintragBetrag: { fontSize: 16, fontWeight: "800", minWidth: 70, textAlign: "right" },

  deleteAction: {
    backgroundColor: COLORS.danger, borderRadius: 14, marginBottom: 8,
    justifyContent: "center", alignItems: "center", width: 64,
  },

  emptyState: { alignItems: "center", paddingVertical: 40, gap: 8 },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 17, fontWeight: "800", color: COLORS.textDark },
  emptySub: { fontSize: 13, color: COLORS.textMuted, textAlign: "center", paddingHorizontal: 20 },
});
