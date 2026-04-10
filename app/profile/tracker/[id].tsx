import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Swipeable from "react-native-gesture-handler/Swipeable";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BabyProfile, FeedingLog, SleepLog, ActiveTimer, BreastSide, SleepType } from "../../../types";
import {
  loadProfiles,
  loadFeedingLogs,
  loadSleepLogs,
  addFeedingLog,
  addSleepLog,
  deleteFeedingLog,
  deleteSleepLog,
  loadWeightLogs,
} from "../../../utils/storage";
import TimerCard from "../../../components/TimerCard";

type ViewMode = "today" | "week";
type LogEntry = (FeedingLog & { kind: "feeding" }) | (SleepLog & { kind: "sleep" });

const SIDE_LABELS: Record<BreastSide, string> = { left: "Links", right: "Rechts", both: "Beide" };
const SLEEP_LABELS: Record<SleepType, string> = { nap: "Mittagsschlaf", night: "Nachtschlaf" };

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}
function formatDuration(min: number) {
  if (min < 60) return `${min} Min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}
function isSameDay(iso: string, ref: Date) {
  const d = new Date(iso);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth() && d.getDate() === ref.getDate();
}
function isWithinDays(iso: string, days: number) {
  return Date.now() - new Date(iso).getTime() < days * 86400000;
}

export default function TrackerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<BabyProfile | null>(null);
  const [feedingLogs, setFeedingLogs] = useState<FeedingLog[]>([]);
  const [sleepLogs, setSleepLogs] = useState<SleepLog[]>([]);
  const [latestWeight, setLatestWeight] = useState<number | null>(null);
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("today");
  const [showBreastPicker, setShowBreastPicker] = useState(false);
  const [showSleepPicker, setShowSleepPicker] = useState(false);

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const profiles = await loadProfiles();
        setProfile(profiles.find((p) => p.id === id) ?? null);
        const [fl, sl, wl] = await Promise.all([
          loadFeedingLogs(id),
          loadSleepLogs(id),
          loadWeightLogs(id),
        ]);
        setFeedingLogs(fl);
        setSleepLogs(sl);
        setLatestWeight(wl.length > 0 ? wl[wl.length - 1].weightGrams : null);
        const saved = await AsyncStorage.getItem(`mia_active_timer_${id}`);
        setActiveTimer(saved ? JSON.parse(saved) : null);
      }
      load();
    }, [id])
  );

  async function startTimer(timer: ActiveTimer) {
    setActiveTimer(timer);
    await AsyncStorage.setItem(`mia_active_timer_${timer.babyId}`, JSON.stringify(timer));
    setShowBreastPicker(false);
    setShowSleepPicker(false);
  }

  async function stopTimer() {
    if (!activeTimer) return;
    const endedAt = new Date().toISOString();
    const durationMinutes = Math.max(
      1,
      Math.round((new Date(endedAt).getTime() - new Date(activeTimer.startedAt).getTime()) / 60000)
    );
    if (activeTimer.timerType === "feeding") {
      const log = await addFeedingLog(activeTimer.babyId, {
        type: activeTimer.feedingType ?? "breast",
        startedAt: activeTimer.startedAt,
        durationMinutes,
        side: activeTimer.side,
      });
      setFeedingLogs((prev) => [log, ...prev]);
    } else {
      const log = await addSleepLog(activeTimer.babyId, {
        type: activeTimer.sleepType ?? "nap",
        startedAt: activeTimer.startedAt,
        endedAt,
        durationMinutes,
      });
      setSleepLogs((prev) => [log, ...prev]);
    }
    await AsyncStorage.removeItem(`mia_active_timer_${activeTimer.babyId}`);
    setActiveTimer(null);
  }

  async function handleDeleteFeeding(logId: string) {
    await deleteFeedingLog(id, logId);
    setFeedingLogs((prev) => prev.filter((l) => l.id !== logId));
  }
  async function handleDeleteSleep(logId: string) {
    await deleteSleepLog(id, logId);
    setSleepLogs((prev) => prev.filter((l) => l.id !== logId));
  }

  const today = new Date();
  const filteredFeedings = feedingLogs.filter((l) =>
    viewMode === "today" ? isSameDay(l.startedAt, today) : isWithinDays(l.startedAt, 7)
  );
  const filteredSleeps = sleepLogs.filter((l) =>
    viewMode === "today" ? isSameDay(l.startedAt, today) : isWithinDays(l.startedAt, 7)
  );
  const combined: LogEntry[] = [
    ...filteredFeedings.map((l) => ({ ...l, kind: "feeding" as const })),
    ...filteredSleeps.map((l) => ({ ...l, kind: "sleep" as const })),
  ].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  const todayFeedings = feedingLogs.filter((l) => isSameDay(l.startedAt, today));
  const todaySleeps = sleepLogs.filter((l) => isSameDay(l.startedAt, today));
  const totalSleepMin = todaySleeps.reduce((s, l) => s + l.durationMinutes, 0);
  const totalFeedMin = todayFeedings.reduce((s, l) => s + l.durationMinutes, 0);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Header with back button */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={24} color="#4A7C6F" />
            </TouchableOpacity>
            <Text style={styles.title}>
              {profile ? `${profile.name} · Tracker` : "Tracker"}
            </Text>
            <View style={{ width: 36 }} />
          </View>

          {/* Active timer */}
          {activeTimer && <TimerCard timer={activeTimer} onStop={stopTimer} />}

          {/* Quick-start */}
          {!activeTimer && (
            <View style={styles.quickRow}>
              <TouchableOpacity
                style={[styles.quickBtn, { backgroundColor: "#EAF2EF", borderColor: "#C5DDD8" }]}
                onPress={() => { setShowBreastPicker((v) => !v); setShowSleepPicker(false); }}
                activeOpacity={0.85}
              >
                <Text style={styles.quickEmoji}>🤱</Text>
                <Text style={[styles.quickLabel, { color: "#4A7C6F" }]}>Stillen</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickBtn, { backgroundColor: "#F5EEF9", borderColor: "#DEC8F0" }]}
                onPress={() => { setShowSleepPicker((v) => !v); setShowBreastPicker(false); }}
                activeOpacity={0.85}
              >
                <Text style={styles.quickEmoji}>😴</Text>
                <Text style={[styles.quickLabel, { color: "#9B7BB8" }]}>Schlaf</Text>
              </TouchableOpacity>
            </View>
          )}

          {showBreastPicker && (
            <View style={styles.pickerCard}>
              <Text style={styles.pickerTitle}>Welche Seite?</Text>
              <View style={styles.pickerRow}>
                {(["left", "right", "both"] as BreastSide[]).map((side) => (
                  <TouchableOpacity
                    key={side}
                    style={styles.pickerBtn}
                    onPress={() => startTimer({ babyId: id, timerType: "feeding", feedingType: "breast", side, startedAt: new Date().toISOString() })}
                  >
                    <Text style={styles.pickerBtnText}>{SIDE_LABELS[side]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={styles.pickerBottleBtn}
                onPress={() => startTimer({ babyId: id, timerType: "feeding", feedingType: "bottle", startedAt: new Date().toISOString() })}
              >
                <Ionicons name="water-outline" size={16} color="#7B9EC8" />
                <Text style={styles.pickerBottleText}>Flasche</Text>
              </TouchableOpacity>
            </View>
          )}

          {showSleepPicker && (
            <View style={styles.pickerCard}>
              <Text style={styles.pickerTitle}>Welche Art?</Text>
              <View style={styles.pickerRow}>
                {(["nap", "night"] as SleepType[]).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.pickerBtn, { backgroundColor: "#F5EEF9", borderColor: "#DEC8F0" }]}
                    onPress={() => startTimer({ babyId: id, timerType: "sleep", sleepType: type, startedAt: new Date().toISOString() })}
                  >
                    <Text style={styles.pickerBtnText}>{SLEEP_LABELS[type]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Summary */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryEmoji}>🤱</Text>
                <Text style={styles.summaryCount}>{todayFeedings.length}×</Text>
                <Text style={styles.summaryLabel}>
                  {totalFeedMin > 0 ? `Ø ${Math.round(totalFeedMin / Math.max(todayFeedings.length, 1))} Min` : "Heute"}
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryEmoji}>😴</Text>
                <Text style={styles.summaryCount}>{todaySleeps.length}×</Text>
                <Text style={styles.summaryLabel}>
                  {totalSleepMin > 0 ? formatDuration(totalSleepMin) : "Heute"}
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <TouchableOpacity
                style={styles.summaryItem}
                onPress={() => router.push(`/profile/weight/${id}`)}
              >
                <Text style={styles.summaryEmoji}>⚖️</Text>
                <Text style={styles.summaryCount}>
                  {latestWeight ? `${(latestWeight / 1000).toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 2 })}` : "—"}
                </Text>
                <Text style={[styles.summaryLabel, { color: "#4A7C6F" }]}>
                  {latestWeight ? "kg →" : "Gewicht"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* View toggle */}
          <View style={styles.viewToggle}>
            {(["today", "week"] as ViewMode[]).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[styles.viewBtn, viewMode === mode && styles.viewBtnActive]}
                onPress={() => setViewMode(mode)}
              >
                <Text style={[styles.viewBtnText, viewMode === mode && styles.viewBtnTextActive]}>
                  {mode === "today" ? "Heute" : "Diese Woche"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Log list */}
          {combined.map((entry) => (
            <Swipeable
              key={entry.id}
              renderRightActions={() => (
                <TouchableOpacity
                  style={styles.deleteAction}
                  onPress={() => entry.kind === "feeding" ? handleDeleteFeeding(entry.id) : handleDeleteSleep(entry.id)}
                >
                  <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            >
              {entry.kind === "feeding" ? <FeedingRow log={entry} /> : <SleepRow log={entry} />}
            </Swipeable>
          ))}

          {combined.length === 0 && (
            <View style={styles.listEmpty}>
              <Text style={styles.listEmptyIcon}>{viewMode === "today" ? "🌅" : "📅"}</Text>
              <Text style={styles.listEmptyText}>
                {viewMode === "today" ? "Noch keine Einträge heute." : "Keine Einträge diese Woche."}
              </Text>
            </View>
          )}

        </ScrollView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

function FeedingRow({ log }: { log: FeedingLog }) {
  const sideMap: Record<string, string> = { left: "links", right: "rechts", both: "beide Seiten" };
  const label = log.type === "bottle"
    ? `Flasche${log.amountMl ? ` · ${log.amountMl} ml` : ""}`
    : `Stillen${log.side ? " · " + sideMap[log.side] : ""}`;
  return (
    <View style={styles.logRow}>
      <View style={[styles.logIcon, { backgroundColor: "#EAF2EF" }]}>
        <Text style={styles.logIconEmoji}>🤱</Text>
      </View>
      <View style={styles.logBody}>
        <Text style={styles.logTitle}>{label}</Text>
        <Text style={styles.logMeta}>{formatDuration(log.durationMinutes)}</Text>
      </View>
      <Text style={styles.logTime}>{formatTime(log.startedAt)}</Text>
    </View>
  );
}

function SleepRow({ log }: { log: SleepLog }) {
  return (
    <View style={styles.logRow}>
      <View style={[styles.logIcon, { backgroundColor: "#F5EEF9" }]}>
        <Text style={styles.logIconEmoji}>😴</Text>
      </View>
      <View style={styles.logBody}>
        <Text style={styles.logTitle}>{SLEEP_LABELS[log.type]}</Text>
        <Text style={styles.logMeta}>
          {formatTime(log.startedAt)} – {formatTime(log.endedAt)} · {formatDuration(log.durationMinutes)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FDFAF6" },
  content: { padding: 20, paddingBottom: 48 },

  header: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginBottom: 20,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 17, fontWeight: "800", color: "#2D2A26" },

  quickRow: { flexDirection: "row", gap: 12, marginBottom: 14 },
  quickBtn: {
    flex: 1, alignItems: "center", paddingVertical: 18,
    borderRadius: 18, borderWidth: 1.5, gap: 6,
  },
  quickEmoji: { fontSize: 28 },
  quickLabel: { fontSize: 15, fontWeight: "700" },

  pickerCard: { backgroundColor: "#F0EBE3", borderRadius: 16, padding: 16, marginBottom: 14 },
  pickerTitle: { fontSize: 13, fontWeight: "700", color: "#7A7269", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 },
  pickerRow: { flexDirection: "row", gap: 10 },
  pickerBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center", backgroundColor: "#EAF2EF", borderWidth: 1, borderColor: "#C5DDD8" },
  pickerBtnText: { fontSize: 14, fontWeight: "600", color: "#2D2A26" },
  pickerBottleBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 10, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: "#C5DDD8", backgroundColor: "#EEF4F9" },
  pickerBottleText: { fontSize: 14, fontWeight: "600", color: "#7B9EC8" },

  summaryCard: {
    backgroundColor: "#FFFFFF", borderRadius: 18, padding: 16, marginBottom: 14,
    shadowColor: "#2D2A26", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  summaryRow: { flexDirection: "row", alignItems: "center" },
  summaryItem: { flex: 1, alignItems: "center", gap: 4 },
  summaryEmoji: { fontSize: 22 },
  summaryCount: { fontSize: 18, fontWeight: "800", color: "#2D2A26" },
  summaryLabel: { fontSize: 11, color: "#7A7269" },
  summaryDivider: { width: 1, height: 48, backgroundColor: "#E5DDD5" },

  viewToggle: { flexDirection: "row", backgroundColor: "#F0EBE3", borderRadius: 12, padding: 3, marginBottom: 14, gap: 3 },
  viewBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center" },
  viewBtnActive: { backgroundColor: "#4A7C6F" },
  viewBtnText: { fontSize: 13, fontWeight: "600", color: "#7A7269" },
  viewBtnTextActive: { color: "#FFFFFF" },

  logRow: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF",
    borderRadius: 14, padding: 12, marginBottom: 8, gap: 12,
    shadowColor: "#2D2A26", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  logIcon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  logIconEmoji: { fontSize: 20 },
  logBody: { flex: 1 },
  logTitle: { fontSize: 15, fontWeight: "600", color: "#2D2A26" },
  logMeta: { fontSize: 12, color: "#7A7269", marginTop: 2 },
  logTime: { fontSize: 13, color: "#B0A89A" },
  deleteAction: { backgroundColor: "#C0392B", borderRadius: 14, width: 60, alignItems: "center", justifyContent: "center", marginBottom: 8 },

  listEmpty: { alignItems: "center", paddingVertical: 32, gap: 8 },
  listEmptyIcon: { fontSize: 36 },
  listEmptyText: { fontSize: 14, color: "#B0A89A" },
});
