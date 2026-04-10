import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
  LayoutChangeEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import Swipeable from "react-native-gesture-handler/Swipeable";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BabyProfile, WeightLog } from "../../../types";
import { loadProfiles, loadWeightLogs, addWeightLog, deleteWeightLog } from "../../../utils/storage";
import WeightChart from "../../../components/WeightChart";
import { WHO_WEIGHT, interpolateWho } from "../../../utils/whoData";

// ─── Clinical helpers ─────────────────────────────────────────────────────────

/** Expected daily gain in grams by age in days */
function expectedDailyGain(ageDays: number): { min: number; max: number; label: string } {
  if (ageDays < 14) return { min: 0, max: 999, label: "Geburtsgewicht zurückgewinnen" };
  if (ageDays < 90)  return { min: 20, max: 40, label: "20–40 g/Tag (0–3 Monate)" };
  if (ageDays < 180) return { min: 15, max: 25, label: "15–25 g/Tag (3–6 Monate)" };
  if (ageDays < 365) return { min: 10, max: 16, label: "10–16 g/Tag (6–12 Monate)" };
  return { min: 5, max: 10, label: "5–10 g/Tag (> 12 Monate)" };
}

type GainStatus = "ok" | "low" | "check" | "high" | "newborn";
function assessGain(gainGrams: number, days: number, ageDays: number): GainStatus {
  if (ageDays < 14) return "newborn";
  const daily = gainGrams / days;
  const expected = expectedDailyGain(ageDays);
  // Zu viel: mehr als das 2,5-fache des Maximums = deutlich über Normal
  if (daily > expected.max * 2.5) return "high";
  if (daily >= expected.min) return "ok";
  if (daily >= expected.min * 0.7) return "low";
  return "check";
}

const GAIN_STATUS_COLORS: Record<GainStatus, string> = {
  ok: "#4A7C6F",
  low: "#C8A96E",
  check: "#C0392B",
  high: "#C0392B",
  newborn: "#7B9EC8",
};
const GAIN_STATUS_LABELS: Record<GainStatus, string> = {
  ok: "Gute Zunahme",
  low: "Etwas langsam",
  check: "Bitte ansprechen",
  high: "Ungewöhnlich hoch",
  newborn: "Geburtsgewicht im Blick",
};

/** Schätzt das Perzentil anhand der WHO-Kurven */
function estimatePercentile(grams: number, ageMonths: number, sex: "m" | "f"): string {
  const curves = WHO_WEIGHT[sex];
  const p3  = interpolateWho(curves.p3,  ageMonths);
  const p15 = interpolateWho(curves.p15, ageMonths);
  const p50 = interpolateWho(curves.p50, ageMonths);
  const p85 = interpolateWho(curves.p85, ageMonths);
  const p97 = interpolateWho(curves.p97, ageMonths);
  if (grams < p3)  return "unter P3 ↓";
  if (grams < p15) return "P3–P15";
  if (grams < p50) return "P15–P50";
  if (grams < p85) return "P50–P85";
  if (grams < p97) return "P85–P97";
  return "über P97 ↑";
}

function percentileColor(label: string): string {
  if (label.startsWith("unter") || label.startsWith("über")) return "#C8A96E";
  if (label === "P3–P15" || label === "P85–P97") return "#C8A96E";
  return "#4A7C6F";
}

export default function WeightScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<BabyProfile | null>(null);
  const [logs, setLogs] = useState<WeightLog[]>([]);
  const [sex, setSex] = useState<"m" | "f">("m");
  const [chartWidth, setChartWidth] = useState(320);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [weightInput, setWeightInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [measuredDate, setMeasuredDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const profiles = await loadProfiles();
        const p = profiles.find((x) => x.id === id) ?? null;
        setProfile(p);
        // Auto-set sex from profile gender
        if (p?.gender === "female") setSex("f");
        else if (p?.gender === "male") setSex("m");
        const w = await loadWeightLogs(id);
        setLogs(w);
      }
      load();
    }, [id])
  );

  async function handleAdd() {
    const grams = parseInt(weightInput.replace(",", ".").replace(/[^0-9]/g, ""), 10);
    if (!grams || grams < 500 || grams > 30000) {
      Alert.alert("Ungültiges Gewicht", "Bitte Gewicht in Gramm eingeben (500–30000 g).");
      return;
    }
    const dateStr = measuredDate.toISOString().slice(0, 10);
    const log = await addWeightLog(id, grams, dateStr, noteInput.trim() || undefined);
    setLogs((prev) => [...prev, log].sort((a, b) => a.measuredAt.localeCompare(b.measuredAt)));
    setWeightInput("");
    setNoteInput("");
    setMeasuredDate(new Date());
    setShowForm(false);
  }

  async function handleDelete(logId: string) {
    await deleteWeightLog(id, logId);
    setLogs((prev) => prev.filter((l) => l.id !== logId));
  }

  function formatWeight(grams: number): string {
    return (grams / 1000).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 3 }) + " kg";
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });
  }

  function onLayout(e: LayoutChangeEvent) {
    setChartWidth(e.nativeEvent.layout.width);
  }

  // ── Analytics ────────────────────────────────────────────────────────────────
  const sortedLogs = [...logs].sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));
  const latest = sortedLogs[sortedLogs.length - 1];
  const prev = sortedLogs.length >= 2 ? sortedLogs[sortedLogs.length - 2] : null;
  const birthLog = sortedLogs[0]; // first entry = birth weight proxy

  // Gain since last measurement
  const gainSinceLastG = latest && prev ? latest.weightGrams - prev.weightGrams : null;
  const daysSinceLast = latest && prev
    ? Math.max(1, Math.round((new Date(latest.measuredAt).getTime() - new Date(prev.measuredAt).getTime()) / 86400000))
    : null;
  const ageDaysAtLatest = latest && profile
    ? Math.round((new Date(latest.measuredAt).getTime() - new Date(profile.birthDate).getTime()) / 86400000)
    : null;
  const gainStatus: GainStatus | null = gainSinceLastG !== null && daysSinceLast !== null && ageDaysAtLatest !== null
    ? assessGain(gainSinceLastG, daysSinceLast, ageDaysAtLatest)
    : null;

  // Birth weight dynamics (first 2 weeks)
  const birthWeight = profile?.weightGrams ?? birthLog?.weightGrams;
  const minWeightLog = sortedLogs.reduce<WeightLog | null>((min, l) => (!min || l.weightGrams < min.weightGrams) ? l : min, null);
  const maxLossGrams = birthWeight && minWeightLog ? birthWeight - minWeightLog.weightGrams : null;
  const maxLossPct = birthWeight && maxLossGrams !== null ? (maxLossGrams / birthWeight) * 100 : null;
  const regainedBirthWeight = birthWeight && sortedLogs.some((l, i) => i > 0 && l.weightGrams >= birthWeight);
  const regainedLog = birthWeight
    ? sortedLogs.find((l, i) => i > 0 && l.weightGrams >= birthWeight)
    : null;
  const regainedDays = regainedLog && profile
    ? Math.round((new Date(regainedLog.measuredAt).getTime() - new Date(profile.birthDate).getTime()) / 86400000)
    : null;

  // Percentile of latest
  const ageMonthsAtLatest = ageDaysAtLatest != null ? ageDaysAtLatest / 30.44 : null;
  const percentileLabel = latest && ageMonthsAtLatest != null
    ? estimatePercentile(latest.weightGrams, ageMonthsAtLatest, sex)
    : null;

  // Gain since birth (for summary)
  const gainSinceBirth = latest && birthWeight && latest.weightGrams !== birthWeight
    ? latest.weightGrams - birthWeight
    : null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={24} color="#4A7C6F" />
            </TouchableOpacity>
            <Text style={styles.title}>Gewichtsverlauf{profile ? ` · ${profile.name}` : ""}</Text>
            <TouchableOpacity
              style={[styles.addBtn, showForm && styles.addBtnActive]}
              onPress={() => setShowForm((v) => !v)}
            >
              <Ionicons name={showForm ? "close" : "add"} size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Sex toggle — only show if gender not set in profile */}
          {!profile?.gender && (
            <View style={styles.sexToggle}>
              <TouchableOpacity
                style={[styles.sexBtn, sex === "m" && styles.sexBtnActive]}
                onPress={() => setSex("m")}
              >
                <Text style={[styles.sexBtnText, sex === "m" && styles.sexBtnTextActive]}>Junge</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sexBtn, sex === "f" && { ...styles.sexBtnActive, backgroundColor: "#D4856A" }]}
                onPress={() => setSex("f")}
              >
                <Text style={[styles.sexBtnText, sex === "f" && styles.sexBtnTextActive]}>Mädchen</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Summary chips */}
          {latest && (
            <View style={styles.summaryRow}>
              <View style={styles.summaryChip}>
                <Text style={styles.summaryLabel}>Aktuell</Text>
                <Text style={styles.summaryValue}>{formatWeight(latest.weightGrams)}</Text>
                {percentileLabel && (
                  <Text style={[styles.percentileLabel, { color: percentileColor(percentileLabel) }]}>
                    {percentileLabel}
                  </Text>
                )}
              </View>
              {gainSinceBirth !== null && (
                <View style={styles.summaryChip}>
                  <Text style={styles.summaryLabel}>
                    {gainSinceBirth >= 0 ? "Zunahme gesamt" : "Verlust gesamt"}
                  </Text>
                  <Text style={[styles.summaryValue, { color: gainSinceBirth >= 0 ? "#4A7C6F" : "#C0392B" }]}>
                    {gainSinceBirth >= 0 ? "+" : ""}{formatWeight(gainSinceBirth)}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* ── Frühphase: erste 2 Wochen ── */}
          {birthWeight != null && ageDaysAtLatest != null && ageDaysAtLatest <= 21 && sortedLogs.length >= 2 && (
            <View style={styles.earlyCard}>
              <Text style={styles.earlyCardTitle}>⚖️ Erste Wochen</Text>

              {/* Max loss */}
              {maxLossPct != null && maxLossPct > 0 && (
                <View style={[
                  styles.earlyRow,
                  maxLossPct > 10 && { backgroundColor: "#FDF0EB", borderRadius: 8, padding: 8 }
                ]}>
                  <Text style={styles.earlyLabel}>Maximaler Gewichtsverlust</Text>
                  <Text style={[
                    styles.earlyValue,
                    { color: maxLossPct > 10 ? "#C0392B" : maxLossPct > 7 ? "#C8A96E" : "#4A7C6F" }
                  ]}>
                    {maxLossPct.toFixed(1)} %
                  </Text>
                </View>
              )}
              {maxLossPct != null && maxLossPct > 10 && (
                <Text style={styles.earlyWarning}>
                  Über 10% Gewichtsverlust — bitte mit Kinderarzt oder Hebamme besprechen.
                </Text>
              )}

              {/* Geburtsgewicht zurück */}
              <View style={styles.earlyRow}>
                <Text style={styles.earlyLabel}>Geburtsgewicht wieder erreicht</Text>
                {regainedBirthWeight ? (
                  <Text style={[styles.earlyValue, { color: "#4A7C6F" }]}>
                    Tag {regainedDays} ✓
                  </Text>
                ) : (
                  <Text style={[styles.earlyValue, { color: ageDaysAtLatest > 14 ? "#C0392B" : "#C8A96E" }]}>
                    {ageDaysAtLatest > 14 ? "Noch nicht (Tag " + ageDaysAtLatest + ")" : "Noch nicht"}
                  </Text>
                )}
              </View>
              {!regainedBirthWeight && ageDaysAtLatest > 14 && (
                <Text style={styles.earlyWarning}>
                  Bis Tag 14 sollte das Geburtsgewicht zurück sein — bitte ansprechen.
                </Text>
              )}
            </View>
          )}

          {/* ── Zunahme-Analyse ── */}
          {gainSinceLastG !== null && daysSinceLast !== null && gainStatus !== null && (
            <View style={[styles.gainCard, { borderColor: GAIN_STATUS_COLORS[gainStatus] + "66" }]}>
              <View style={styles.gainCardHeader}>
                <View style={[styles.gainStatusDot, { backgroundColor: GAIN_STATUS_COLORS[gainStatus] }]} />
                <Text style={[styles.gainStatusLabel, { color: GAIN_STATUS_COLORS[gainStatus] }]}>
                  {GAIN_STATUS_LABELS[gainStatus]}
                </Text>
              </View>
              <View style={styles.gainRow}>
                <View style={styles.gainItem}>
                  <Text style={styles.gainItemLabel}>Seit letztem Eintrag</Text>
                  <Text style={[styles.gainItemValue, { color: gainSinceLastG >= 0 ? "#2D2A26" : "#C0392B" }]}>
                    {gainSinceLastG >= 0 ? "+" : ""}{gainSinceLastG} g
                  </Text>
                  <Text style={styles.gainItemSub}>in {daysSinceLast} {daysSinceLast === 1 ? "Tag" : "Tagen"}</Text>
                </View>
                {gainStatus !== "newborn" && (
                  <View style={styles.gainDivider} />
                )}
                {gainStatus !== "newborn" && (
                  <View style={styles.gainItem}>
                    <Text style={styles.gainItemLabel}>Ø pro Tag</Text>
                    <Text style={[styles.gainItemValue, { color: GAIN_STATUS_COLORS[gainStatus] }]}>
                      {(gainSinceLastG / daysSinceLast).toFixed(0)} g/Tag
                    </Text>
                    <Text style={styles.gainItemSub}>
                      {expectedDailyGain(ageDaysAtLatest ?? 90).label}
                    </Text>
                  </View>
                )}
              </View>
              {gainStatus === "check" && (
                <Text style={styles.gainWarning}>
                  Die Zunahme ist niedriger als erwartet. Kein Grund zur Panik — beim nächsten U-Termin oder mit der Hebamme ansprechen.
                </Text>
              )}
              {gainStatus === "high" && (
                <Text style={styles.gainWarning}>
                  Diese Zunahme ist deutlich höher als üblich. Bitte prüfe, ob die Messung korrekt ist — oder sprich beim nächsten Termin mit der Hebamme oder dem Kinderarzt.
                </Text>
              )}
            </View>
          )}

          {/* Chart */}
          <View style={styles.chartCard} onLayout={onLayout}>
            {profile && chartWidth > 0 ? (
              <WeightChart
                logs={logs}
                birthDate={profile.birthDate}
                sex={sex}
                width={chartWidth - 32}
              />
            ) : (
              <View style={styles.chartEmpty}>
                <Text style={styles.chartEmptyText}>Noch keine Einträge</Text>
              </View>
            )}
          </View>

          {/* Inline add form */}
          {showForm && (
            <View style={styles.form}>
              <Text style={styles.formTitle}>Neuer Eintrag</Text>

              <Text style={styles.formLabel}>Gewicht (Gramm) *</Text>
              <TextInput
                style={styles.input}
                placeholder="z. B. 6250"
                placeholderTextColor="#B0A89A"
                value={weightInput}
                onChangeText={setWeightInput}
                keyboardType="numeric"
                autoFocus
              />

              <Text style={styles.formLabel}>Datum</Text>
              <TouchableOpacity style={styles.dateTrigger} onPress={() => setShowDatePicker(true)}>
                <Ionicons name="calendar-outline" size={16} color="#4A7C6F" />
                <Text style={styles.dateTriggerText}>
                  {measuredDate.toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={measuredDate}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  maximumDate={new Date()}
                  onChange={(_, date) => {
                    setShowDatePicker(Platform.OS === "ios");
                    if (date) setMeasuredDate(date);
                  }}
                />
              )}
              {Platform.OS === "ios" && showDatePicker && (
                <TouchableOpacity onPress={() => setShowDatePicker(false)} style={styles.dateConfirm}>
                  <Text style={styles.dateConfirmText}>Fertig</Text>
                </TouchableOpacity>
              )}

              <Text style={styles.formLabel}>Notiz (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="z. B. U4-Vorsorge"
                placeholderTextColor="#B0A89A"
                value={noteInput}
                onChangeText={setNoteInput}
              />

              <TouchableOpacity
                style={[styles.saveBtn, !weightInput.trim() && styles.saveBtnDisabled]}
                onPress={handleAdd}
                disabled={!weightInput.trim()}
              >
                <Text style={styles.saveBtnText}>Speichern</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Log list */}
          {logs.length > 0 && (
            <Text style={styles.sectionLabel}>Einträge</Text>
          )}

          {[...sortedLogs].reverse().map((log, reversedIndex) => {
            const originalIndex = sortedLogs.length - 1 - reversedIndex;
            const prevLog = originalIndex > 0 ? sortedLogs[originalIndex - 1] : null;
            const delta = prevLog ? log.weightGrams - prevLog.weightGrams : null;
            const days = prevLog
              ? Math.max(1, Math.round((new Date(log.measuredAt).getTime() - new Date(prevLog.measuredAt).getTime()) / 86400000))
              : null;
            return (
              <Swipeable
                key={log.id}
                renderRightActions={() => (
                  <TouchableOpacity
                    style={styles.deleteAction}
                    onPress={() => handleDelete(log.id)}
                  >
                    <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                )}
              >
                <View style={styles.logRow}>
                  <View style={styles.logLeft}>
                    <Text style={styles.logWeight}>{formatWeight(log.weightGrams)}</Text>
                    {log.note ? <Text style={styles.logNote}>{log.note}</Text> : null}
                  </View>
                  <View style={styles.logRight}>
                    <Text style={styles.logDate}>{formatDate(log.measuredAt)}</Text>
                    {delta !== null && days !== null && (
                      <Text style={[styles.logDelta, { color: delta >= 0 ? "#4A7C6F" : "#C0392B" }]}>
                        {delta >= 0 ? "+" : ""}{delta} g · {(delta / days).toFixed(0)} g/Tag
                      </Text>
                    )}
                  </View>
                </View>
              </Swipeable>
            );
          })}

          {logs.length === 0 && !showForm && (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>⚖️</Text>
              <Text style={styles.emptyText}>
                Noch keine Einträge.{"\n"}Tippe auf + um das erste Gewicht einzutragen.
              </Text>
            </View>
          )}

          {/* WHO note */}
          <Text style={styles.whoNote}>
            Referenzkurven basieren auf WHO Child Growth Standards. Nur zur Orientierung — kein Ersatz für ärztliche Beratung.
          </Text>

        </ScrollView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FDFAF6" },
  content: { padding: 20, paddingBottom: 48 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingTop: 4,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 16, fontWeight: "700", color: "#2D2A26", flex: 1, textAlign: "center" },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "#4A7C6F",
    alignItems: "center", justifyContent: "center",
  },
  addBtnActive: { backgroundColor: "#7A7269" },

  sexToggle: {
    flexDirection: "row",
    backgroundColor: "#F0EBE3",
    borderRadius: 12,
    padding: 3,
    marginBottom: 14,
    gap: 3,
  },
  sexBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center",
  },
  sexBtnActive: { backgroundColor: "#7B9EC8" },
  sexBtnText: { fontSize: 13, fontWeight: "600", color: "#7A7269" },
  sexBtnTextActive: { color: "#FFFFFF" },

  summaryRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  summaryChip: {
    flex: 1, backgroundColor: "#EAF2EF",
    borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: "#C5DDD8",
  },
  summaryLabel: { fontSize: 11, color: "#7A7269", marginBottom: 3 },
  summaryValue: { fontSize: 16, fontWeight: "800", color: "#2D2A26" },
  percentileLabel: { fontSize: 11, fontWeight: "700", marginTop: 4 },

  // Early phase card
  earlyCard: {
    backgroundColor: "#F5F0E8", borderRadius: 14,
    padding: 14, marginBottom: 14,
    borderWidth: 1, borderColor: "#E5D8C8",
  },
  earlyCardTitle: { fontSize: 13, fontWeight: "800", color: "#2D2A26", marginBottom: 10 },
  earlyRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 6,
  },
  earlyLabel: { fontSize: 13, color: "#4A4440", flex: 1 },
  earlyValue: { fontSize: 13, fontWeight: "700" },
  earlyWarning: {
    fontSize: 12, color: "#8A4A2A", lineHeight: 17,
    marginTop: 4, fontStyle: "italic",
  },

  // Gain analysis card
  gainCard: {
    backgroundColor: "#FFFFFF", borderRadius: 14,
    padding: 14, marginBottom: 14,
    borderWidth: 1.5,
    shadowColor: "#2D2A26", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  gainCardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  gainStatusDot: { width: 8, height: 8, borderRadius: 4 },
  gainStatusLabel: { fontSize: 13, fontWeight: "800" },
  gainRow: { flexDirection: "row", alignItems: "center" },
  gainItem: { flex: 1, alignItems: "center" },
  gainItemLabel: { fontSize: 11, color: "#7A7269", marginBottom: 2 },
  gainItemValue: { fontSize: 20, fontWeight: "800", color: "#2D2A26" },
  gainItemSub: { fontSize: 10, color: "#B0A89A", marginTop: 2, textAlign: "center" },
  gainDivider: { width: 1, height: 40, backgroundColor: "#E5DDD5" },
  gainWarning: {
    fontSize: 12, color: "#7A7269", marginTop: 10,
    lineHeight: 17, fontStyle: "italic",
  },

  chartCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#2D2A26",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  chartEmpty: { height: 120, alignItems: "center", justifyContent: "center" },
  chartEmptyText: { color: "#B0A89A", fontSize: 14 },

  form: {
    backgroundColor: "#F0EBE3",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 14, fontWeight: "700", color: "#2D2A26", marginBottom: 14,
  },
  formLabel: {
    fontSize: 12, fontWeight: "700", color: "#7A7269",
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8,
  },
  input: {
    backgroundColor: "#FDFAF6", borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: "#2D2A26", marginBottom: 14,
  },
  dateTrigger: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#FDFAF6", borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 14,
  },
  dateTriggerText: { fontSize: 15, color: "#2D2A26" },
  dateConfirm: { alignSelf: "flex-end", paddingVertical: 4, marginBottom: 10 },
  dateConfirmText: { color: "#4A7C6F", fontWeight: "700" },
  saveBtn: {
    backgroundColor: "#4A7C6F", borderRadius: 12,
    paddingVertical: 14, alignItems: "center",
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },

  sectionLabel: {
    fontSize: 12, fontWeight: "700", color: "#7A7269",
    textTransform: "uppercase", letterSpacing: 0.8,
    marginBottom: 10, marginTop: 4,
  },
  logRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: "#2D2A26",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  logLeft: { flex: 1 },
  logWeight: { fontSize: 16, fontWeight: "700", color: "#2D2A26" },
  logNote: { fontSize: 12, color: "#7A7269", marginTop: 2 },
  logRight: { alignItems: "flex-end" },
  logDate: { fontSize: 13, color: "#B0A89A" },
  logDelta: { fontSize: 11, fontWeight: "600", marginTop: 3 },
  deleteAction: {
    backgroundColor: "#C0392B", borderRadius: 12,
    width: 60, alignItems: "center", justifyContent: "center",
    marginBottom: 8,
  },

  empty: { alignItems: "center", paddingVertical: 32, gap: 10 },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: 14, color: "#7A7269", textAlign: "center", lineHeight: 20 },

  whoNote: {
    fontSize: 11, color: "#B0A89A", textAlign: "center",
    marginTop: 24, lineHeight: 16, paddingHorizontal: 8,
  },
});
