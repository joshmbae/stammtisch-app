import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Swipeable from "react-native-gesture-handler/Swipeable";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StrafLog, MemberProfile, StrafKategorieDef } from "../types";
import {
  loadMembers,
  loadAllStrafLogs,
  loadStrafKategorien,
  addStrafLog,
  updateStrafLog,
  deleteStrafLog,
  logActivity,
  addKassenEintrag,
} from "../utils/storage";
import { SHADOWS, ThemeColors, FONT } from "../constants/design";
import { useColors, useThemedStyles } from "../contexts/ThemeContext";
import { HamburgerButton } from "../components/HamburgerButton";
import { BackButton } from "../components/BackButton";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorState from "../components/ErrorState";
import OfflineBanner from "../components/OfflineBanner";
import { useScreenLoad } from "../utils/useScreenLoad";
import { useSession } from "../contexts/SessionContext";
import { formatEuro, getInitial } from "../utils/format";
import { useSingleFlight } from "../utils/useSingleFlight";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDatum(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function katMeta(kategorie: StrafLog["kategorie"], strafKategorien: StrafKategorieDef[]) {
  return strafKategorien.find((k) => k.id === kategorie);
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function StrafenScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const { memberId: memberIdParam } = useLocalSearchParams<{ memberId?: string }>();
  const { activeMemberId } = useSession();
  const guard = useSingleFlight();
  const [logs, setLogs] = useState<StrafLog[]>([]);
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [strafKategorien, setStrafKategorien] = useState<StrafKategorieDef[]>([]);
  const [filterMemberId, setFilterMemberId] = useState<string | null>(memberIdParam ?? null);
  const [showBeglichen, setShowBeglichen] = useState(false);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newMemberId, setNewMemberId] = useState<string | null>(null);
  const [newBetrag, setNewBetrag] = useState("");
  const [newNotiz, setNewNotiz] = useState("");

  async function load() {
    const [ms, kats] = await Promise.all([loadMembers(), loadStrafKategorien()]);
    setMembers(ms);
    setStrafKategorien(kats);
    const all = await loadAllStrafLogs(ms.map((m) => m.id));
    setLogs(all.sort((a, b) => b.loggedAt.localeCompare(a.loggedAt)));
  }

  const { loading, refreshing, error, onRefresh, retry } = useScreenLoad(load, []);

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
      const kat = katMeta(log.kategorie, strafKategorien);
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
        meta: { betrag: log.betrag, kategorie: log.kategorie },
      });
    }
  }

  function toggleAddForm() {
    setShowAddForm((v) => !v);
    setNewMemberId(null);
    setNewBetrag("");
    setNewNotiz("");
  }

  async function handleAddStraf() {
    if (!newMemberId) return;
    const betrag = parseFloat(newBetrag.replace(",", "."));
    if (isNaN(betrag) || betrag < 0) return;
    const sonstiges = strafKategorien.find((k) => k.systemKey === "sonstiges");
    if (!sonstiges) return;
    const log = await addStrafLog(newMemberId, {
      kategorie: sonstiges.id,
      betrag,
      notiz: newNotiz.trim() || undefined,
      loggedAt: new Date().toISOString(),
      beglichen: false,
    });
    setLogs((prev) => [log, ...prev]);
    await logActivity({
      actorMemberId: activeMemberId ?? undefined,
      subjectMemberId: newMemberId,
      actionType: "straf_log_created",
      refId: log.id,
      meta: { kategorie: log.kategorie, betrag: log.betrag, notiz: log.notiz },
    });
    toggleAddForm();
  }

  async function handleDelete(log: StrafLog) {
    await deleteStrafLog(log.memberId, log.id);
    setLogs((prev) => prev.filter((l) => l.id !== log.id));
    await logActivity({
      actorMemberId: activeMemberId ?? undefined,
      subjectMemberId: log.memberId,
      actionType: "straf_log_deleted",
      terminId: log.terminId,
      refId: log.id,
      meta: { kategorie: log.kategorie, betrag: log.betrag },
    });
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        {loading ? <LoadingSpinner /> : error ? <ErrorState message={error} onRetry={retry} /> : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.blue} />}
        >
          <OfflineBanner />

          {/* Header */}
          <View style={styles.header}>
            <BackButton />
            <HamburgerButton />
            <View style={styles.headerTexts}>
              <Text style={styles.headerTitle}>Strafen</Text>
              <Text style={styles.headerSub}>Alle Strafen der Runde</Text>
            </View>
            <TouchableOpacity onPress={toggleAddForm} activeOpacity={0.8}>
              <Ionicons
                name={showAddForm ? "close-circle" : "add-circle"}
                size={32}
                color={c.blue}
              />
            </TouchableOpacity>
          </View>

          {showAddForm && (
            <View style={styles.addCard}>
              <Text style={styles.addCardTitle}>Neue Strafe</Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 4 }}>
                {members.map((m) => {
                  const isSelected = m.id === newMemberId;
                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.memberChip, isSelected && { backgroundColor: m.avatarColor, borderColor: m.avatarColor }]}
                      onPress={() => setNewMemberId(isSelected ? null : m.id)}
                      activeOpacity={0.8}
                    >
                      {m.photoUri ? (
                        <Image source={{ uri: m.photoUri }} style={styles.chipAvatar} />
                      ) : (
                        <View style={[styles.chipAvatarFallback, { backgroundColor: isSelected ? "rgba(255,255,255,0.3)" : m.avatarColor + "33" }]}>
                          <Text style={{ fontSize: 11, fontFamily: FONT.w700, color: isSelected ? c.onAvatar : m.avatarColor }}>
                            {getInitial(m.name)}
                          </Text>
                        </View>
                      )}
                      <Text style={[styles.chipName, isSelected && { color: c.onAvatar }]}>
                        {m.spitzname ?? m.name.split(" ")[0]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {newMemberId && (
                <>
                  <View style={styles.strafFormRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.strafFormLabel}>Betrag (€)</Text>
                      <TextInput
                        style={styles.strafFormInput}
                        value={newBetrag}
                        onChangeText={setNewBetrag}
                        placeholder="0,00"
                        placeholderTextColor={c.textLight}
                        keyboardType="decimal-pad"
                      />
                    </View>
                    <View style={{ flex: 2 }}>
                      <Text style={styles.strafFormLabel}>Grund</Text>
                      <TextInput
                        style={styles.strafFormInput}
                        value={newNotiz}
                        onChangeText={setNewNotiz}
                        placeholder="z. B. 20 Min. zu spät, kein Grund"
                        placeholderTextColor={c.textLight}
                      />
                    </View>
                  </View>
                  <TouchableOpacity style={styles.strafSubmitBtn} onPress={() => guard(handleAddStraf)} activeOpacity={0.8}>
                    <Ionicons name="checkmark" size={16} color={c.onAccent} />
                    <Text style={styles.strafSubmitText}>Strafe eintragen</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          {/* Summe offen */}
          <View style={[styles.saldoCard, { borderColor: summeOffen > 0 ? c.danger + "44" : c.success + "44" }]}>
            <Text style={styles.saldoLabel}>Offene Strafen{filterMemberId ? ` · ${membersById.get(filterMemberId)?.name.split(" ")[0]}` : ""}</Text>
            <Text style={[styles.saldoValue, { color: summeOffen > 0 ? c.danger : c.success }]}>
              {formatEuro(summeOffen)} €
            </Text>
          </View>

          {/* Filter nach Person */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <View style={styles.filterGridTwoRows}>
              <TouchableOpacity
                style={[styles.memberChip, !filterMemberId && styles.memberChipActive]}
                onPress={() => setFilterMemberId(null)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipName, !filterMemberId && { color: c.onAccent }]}>Alle</Text>
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
                      <Text style={{ fontSize: 11, fontFamily: FONT.w700, color: filterMemberId === m.id ? c.onAvatar : m.avatarColor }}>
                        {getInitial(m.name)}
                      </Text>
                    </View>
                  )}
                  <Text style={[styles.chipName, filterMemberId === m.id && { color: c.onAvatar }]}>
                    {m.name.split(" ")[0]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
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
                const kat = katMeta(log.kategorie, strafKategorien);
                const member = membersById.get(log.memberId);
                return (
                  <Swipeable
                    key={log.id}
                    renderRightActions={() => (
                      <TouchableOpacity style={styles.deleteAction} onPress={() => handleDelete(log)} activeOpacity={0.8}>
                        <Ionicons name="trash-outline" size={20} color={c.onAccent} />
                      </TouchableOpacity>
                    )}
                    overshootRight={false}
                  >
                    <View style={[
                      styles.eintragRow,
                      { borderLeftColor: log.beglichen ? c.success : c.danger },
                      log.beglichen && { backgroundColor: c.successBg },
                    ]}>
                      <View style={[styles.eintragIcon, { backgroundColor: log.beglichen ? c.success + "15" : c.danger + "12" }]}>
                        <Text style={{ fontFamily: FONT.w400, fontSize: 18 }}>{log.beglichen ? "✅" : kat?.emoji ?? "💰"}</Text>
                      </View>
                      <View style={styles.eintragMeta}>
                        <Text style={styles.eintragTypLabel}>{member?.name ?? "Unbekannt"}</Text>
                        <Text style={styles.eintragDesc}>{kat?.label ?? log.kategorie}</Text>
                        {log.notiz && (
                          <Text style={styles.eintragNotiz}>„{log.notiz}"</Text>
                        )}
                        <Text style={styles.eintragDatum}>{formatDatum(log.loggedAt)}</Text>
                      </View>
                      <Text style={[
                        styles.eintragBetrag,
                        { color: log.beglichen ? c.textLight : c.danger },
                        log.beglichen && { textDecorationLine: "line-through" },
                      ]}>
                        {formatEuro(log.betrag)} €
                      </Text>
                      <TouchableOpacity
                        onPress={() => guard(() => handleToggleBeglichen(log))}
                        activeOpacity={0.8}
                        style={{ paddingLeft: 8 }}
                      >
                        <Ionicons
                          name={log.beglichen ? "checkmark-circle" : "ellipse-outline"}
                          size={22}
                          color={log.beglichen ? c.success : c.border}
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

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background },
  content: { padding: 20, paddingBottom: 60 },

  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: c.cardAlt, borderRadius: 20,
    padding: 16, marginBottom: 16, ...SHADOWS.card,
    borderWidth: 1, borderColor: c.border,
  },
  headerTexts: { flex: 1 },
  headerTitle: { fontSize: 18, fontFamily: FONT.w800, color: c.textDark },
  headerSub: { fontFamily: FONT.w400, fontSize: 12, color: c.textMuted, marginTop: 2 },

  addCard: {
    backgroundColor: c.card, borderRadius: 18, padding: 16,
    marginBottom: 14, borderWidth: 1.5, borderColor: c.blue + "33", gap: 10, ...SHADOWS.card,
  },
  addCardTitle: { fontSize: 14, fontFamily: FONT.w800, color: c.textDark },

  strafFormRow: { flexDirection: "row", gap: 10 },
  strafFormLabel: { fontSize: 11, fontFamily: FONT.w700, color: c.textMuted, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 5 },
  strafFormInput: { fontFamily: FONT.w400, backgroundColor: c.background, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9,
    fontSize: 14, color: c.textDark, borderWidth: 1, borderColor: c.border,
  },
  strafSubmitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7,
    backgroundColor: c.danger, borderRadius: 12, paddingVertical: 12,
  },
  strafSubmitText: { color: c.onAccent, fontFamily: FONT.w700, fontSize: 14 },

  saldoCard: {
    backgroundColor: c.card, borderRadius: 20, padding: 18,
    marginBottom: 14, borderWidth: 1.5, ...SHADOWS.card,
    alignItems: "center",
  },
  saldoLabel: { fontSize: 13, fontFamily: FONT.w700, color: c.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  saldoValue: { fontSize: 34, fontFamily: FONT.w900, letterSpacing: -1 },

  filterScroll: { marginBottom: 16 },
  filterGridTwoRows: {
    flexDirection: "column", flexWrap: "wrap", height: 88, gap: 8, alignContent: "flex-start",
  },
  memberChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: c.background, borderWidth: 1.5, borderColor: c.border,
  },
  memberChipActive: { backgroundColor: c.blue, borderColor: c.blue },
  chipAvatar: { width: 22, height: 22, borderRadius: 11 },
  chipAvatarFallback: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  chipName: { fontSize: 13, fontFamily: FONT.w600, color: c.textMid },

  section: { marginBottom: 8 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  sectionTitle: { fontSize: 13, fontFamily: FONT.w800, color: c.textMid, letterSpacing: 0.2 },
  sectionToggle: { fontSize: 12, fontFamily: FONT.w600, color: c.blue },

  eintragRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: c.card, borderRadius: 14, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: c.border, borderLeftWidth: 3, ...SHADOWS.light,
  },
  eintragIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  eintragMeta: { flex: 1 },
  eintragTypLabel: { fontSize: 13, fontFamily: FONT.w700, color: c.textDark },
  eintragDesc: { fontFamily: FONT.w400, fontSize: 12, color: c.textMuted, marginTop: 1 },
  eintragNotiz: { fontFamily: FONT.w400i, fontSize: 12, color: c.textLight, marginTop: 1 },
  eintragDatum: { fontFamily: FONT.w400, fontSize: 11, color: c.textLight, marginTop: 2 },
  eintragBetrag: { fontSize: 16, fontFamily: FONT.w800, minWidth: 70, textAlign: "right" },

  deleteAction: {
    backgroundColor: c.danger, borderRadius: 14, marginBottom: 8,
    justifyContent: "center", alignItems: "center", width: 64,
  },

  emptyState: { alignItems: "center", paddingVertical: 40, gap: 8 },
  emptyEmoji: { fontFamily: FONT.w400, fontSize: 40 },
  emptyTitle: { fontSize: 17, fontFamily: FONT.w800, color: c.textDark },
  emptySub: { fontFamily: FONT.w400, fontSize: 13, color: c.textMuted, textAlign: "center", paddingHorizontal: 20 },
});
