import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { PregnancyProfile } from "../../../types";
import { loadPregnancyProfiles } from "../../../utils/storage";
import {
  getPregnancyBlock,
  PREGNANCY_BLOCKS,
  PREGNANCY_MILESTONES,
  PregnancyBlock,
} from "../../../utils/pregnancyDevelopmentContent";

type Tab = "woche" | "timeline";

function calcSSW(dueDateISO: string): number {
  const daysUntilDue = Math.floor((new Date(dueDateISO).getTime() - Date.now()) / 86400000);
  return Math.max(0, Math.min(42, Math.floor((280 - daysUntilDue) / 7)));
}

function calcDaysLeft(dueDateISO: string): number {
  return Math.max(0, Math.floor((new Date(dueDateISO).getTime() - Date.now()) / 86400000));
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function PregnancyDevelopmentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<PregnancyProfile | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("woche");

  useFocusEffect(
    useCallback(() => {
      loadPregnancyProfiles().then((profiles) => {
        setProfile(profiles.find((p) => p.id === id) ?? null);
      });
    }, [id])
  );

  if (!profile) return null;

  const ssw = calcSSW(profile.dueDate);
  const daysLeft = calcDaysLeft(profile.dueDate);
  const block = getPregnancyBlock(ssw);
  const trimesterLabel = block.trimester === 1 ? "1. Trimester" : block.trimester === 2 ? "2. Trimester" : "3. Trimester";
  const progress = Math.min(1, Math.max(0, ssw / 40));

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#9B7BB8" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerName}>{profile.nickname}</Text>
          <Text style={styles.headerSub}>{trimesterLabel}</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* ── Progress Bar ── */}
      <View style={styles.progressRow}>
        <Text style={styles.progressLabel}>SSW {ssw}</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` as `${number}%` }]} />
        </View>
        <Text style={styles.progressLabel}>
          {daysLeft > 0 ? `noch ${daysLeft} T.` : "ET erreicht 🎉"}
        </Text>
      </View>

      {/* ── Tab Bar ── */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "woche" && styles.tabBtnActive]}
          onPress={() => setActiveTab("woche")}
        >
          <Text style={[styles.tabBtnText, activeTab === "woche" && styles.tabBtnTextActive]}>
            Diese Woche
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "timeline" && styles.tabBtnActive]}
          onPress={() => setActiveTab("timeline")}
        >
          <Text style={[styles.tabBtnText, activeTab === "timeline" && styles.tabBtnTextActive]}>
            Timeline
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === "woche" && <WocheTab block={block} ssw={ssw} />}
      {activeTab === "timeline" && <TimelineTab ssw={ssw} dueDate={profile.dueDate} />}
    </SafeAreaView>
  );
}

// ─── Tab 1: Diese Woche ───────────────────────────────────────────────────────

function WocheTab({ block, ssw }: { block: PregnancyBlock; ssw: number }) {
  return (
    <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>

      {/* Hero */}
      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>{block.ageLabel}</Text>
          </View>
          <View style={styles.heroSize}>
            <Text style={styles.heroSizeEmoji}>📏</Text>
            <Text style={styles.heroSizeText}>{block.babySize} · {block.babyWeightApprox}</Text>
          </View>
        </View>
        <Text style={styles.heroTitle}>Woche {ssw}</Text>
        <Text style={styles.heroSub}>{block.babyDev[0]}</Text>
      </View>

      {/* Baby Entwicklung */}
      <SectionCard
        title="Was passiert beim Baby"
        emoji="👶"
        bgColor="#EEE0F8"
        borderColor="#DEC8F0"
        textColor="#4A3A5A"
        dotColor="#9B7BB8"
        items={block.babyDev}
      />

      {/* Dein Körper */}
      <SectionCard
        title="Was passiert in deinem Körper"
        emoji="🌸"
        bgColor="#FDF5F0"
        borderColor="#F0D8C8"
        textColor="#5A3020"
        dotColor="#D4856A"
        items={block.bodyChanges}
      />

      {/* Das ist normal */}
      <View style={[styles.sectionCard, { backgroundColor: "#EAF2EF", borderColor: "#C5DDD8" }]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEmoji}>✅</Text>
          <Text style={[styles.sectionTitle, { color: "#2A5A4A" }]}>Das ist normal</Text>
        </View>
        {block.isNormal.map((item, i) => (
          <View key={i} style={styles.sectionItem}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#4A7C6F" style={{ marginTop: 1 }} />
            <Text style={[styles.sectionItemText, { color: "#2D2A26" }]}>{item}</Text>
          </View>
        ))}
      </View>

      {/* Warnzeichen */}
      <View style={[styles.sectionCard, { backgroundColor: "#FDF5F0", borderColor: "#F0D8C8" }]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEmoji}>🔍</Text>
          <Text style={[styles.sectionTitle, { color: "#8A3A1A" }]}>Bitte sofort melden</Text>
        </View>
        {block.watchOut.map((item, i) => (
          <View key={i} style={styles.sectionItem}>
            <View style={[styles.dot, { backgroundColor: "#D4856A" }]} />
            <Text style={[styles.sectionItemText, { color: "#5A2A10" }]}>{item}</Text>
          </View>
        ))}
        <Text style={styles.watchOutNote}>
          Bei Unsicherheit lieber einmal zu viel anrufen als abwarten.
        </Text>
      </View>

      {/* ToDos */}
      <View style={[styles.sectionCard, { backgroundColor: "#F5F0E8", borderColor: "#E5D8C8" }]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEmoji}>📋</Text>
          <Text style={[styles.sectionTitle, { color: "#5A4A20" }]}>Diese Woche wichtig</Text>
        </View>
        {block.todos.map((item, i) => (
          <View key={i} style={styles.sectionItem}>
            <View style={[styles.todoBox]}>
              <View style={styles.todoInner} />
            </View>
            <Text style={[styles.sectionItemText, { color: "#2D2A26" }]}>{item}</Text>
          </View>
        ))}
      </View>

      {/* Tipps */}
      <SectionCard
        title="Tipps für diese Phase"
        emoji="💡"
        bgColor="#FFFBF0"
        borderColor="#F0E8C0"
        textColor="#4A4020"
        dotColor="#C8A96E"
        items={block.tips}
      />

      {/* Für dich */}
      <View style={styles.parentsCard}>
        <Text style={styles.parentsTitle}>💜 Für dich</Text>
        <Text style={styles.parentsText}>{block.forParents}</Text>
      </View>

      {/* Was kommt als nächstes */}
      <View style={styles.nextCard}>
        <View style={styles.nextHeader}>
          <Ionicons name="arrow-forward-circle-outline" size={18} color="#9B7BB8" />
          <Text style={styles.nextTitle}>Was kommt als nächstes</Text>
        </View>
        <Text style={styles.nextText}>{block.nextWeekPreview}</Text>
      </View>

    </ScrollView>
  );
}

function SectionCard({
  title, emoji, bgColor, borderColor, textColor, dotColor, items,
}: {
  title: string; emoji: string; bgColor: string; borderColor: string;
  textColor: string; dotColor: string; items: string[];
}) {
  return (
    <View style={[styles.sectionCard, { backgroundColor: bgColor, borderColor }]}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionEmoji}>{emoji}</Text>
        <Text style={[styles.sectionTitle, { color: textColor }]}>{title}</Text>
      </View>
      {items.map((item, i) => (
        <View key={i} style={styles.sectionItem}>
          <View style={[styles.dot, { backgroundColor: dotColor }]} />
          <Text style={[styles.sectionItemText, { color: "#2D2A26" }]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Tab 2: Timeline ─────────────────────────────────────────────────────────

function TimelineTab({ ssw, dueDate }: { ssw: number; dueDate: string }) {
  const trimesterBoundaries = [
    { label: "1. Trimester", from: 1, to: 12, color: "#DEC8F0" },
    { label: "2. Trimester", from: 13, to: 27, color: "#C5DDD8" },
    { label: "3. Trimester", from: 28, to: 40, color: "#F0D8C8" },
  ];

  const currentTrimester = ssw <= 12 ? 1 : ssw <= 27 ? 2 : 3;

  return (
    <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>

      {/* Trimester summary */}
      <View style={styles.trimesterRow}>
        {trimesterBoundaries.map((t) => (
          <View
            key={t.label}
            style={[
              styles.trimesterChip,
              { borderColor: t.color },
              t.from <= ssw && ssw <= t.to + 1 && { backgroundColor: t.color },
            ]}
          >
            <Text style={styles.trimesterChipText}>{t.label}</Text>
            <Text style={styles.trimesterChipSub}>SSW {t.from}–{t.to}</Text>
          </View>
        ))}
      </View>

      {/* Milestone blocks */}
      {PREGNANCY_BLOCKS.map((block) => {
        const isPast = block.sswTo < ssw;
        const isCurrent = ssw >= block.sswFrom && ssw <= block.sswTo;
        const isFuture = block.sswFrom > ssw;

        // Get milestones that fall in this block
        const blockMilestones = PREGNANCY_MILESTONES.filter(
          (m) => m.ssw >= block.sswFrom && m.ssw <= block.sswTo
        );

        return (
          <View
            key={block.ageLabel}
            style={[
              styles.timelineBlock,
              isCurrent && styles.timelineBlockCurrent,
              isPast && styles.timelineBlockPast,
            ]}
          >
            {/* Block header */}
            <View style={styles.timelineBlockHeader}>
              <View style={[
                styles.timelineDot,
                isPast && { backgroundColor: "#9B7BB8" },
                isCurrent && { backgroundColor: "#9B7BB8", transform: [{ scale: 1.3 }] },
                isFuture && { backgroundColor: "#E5DDD5" },
              ]} />
              <View style={{ flex: 1 }}>
                <View style={styles.timelineBlockTitleRow}>
                  <Text style={[
                    styles.timelineBlockLabel,
                    isCurrent && { color: "#9B7BB8", fontWeight: "800" },
                    isPast && { color: "#7A7269" },
                    isFuture && { color: "#B0A89A" },
                  ]}>
                    {block.ageLabel}
                  </Text>
                  {isCurrent && (
                    <View style={styles.currentPill}>
                      <Text style={styles.currentPillText}>Du bist hier</Text>
                    </View>
                  )}
                  {isPast && (
                    <Ionicons name="checkmark-circle" size={16} color="#9B7BB8" />
                  )}
                </View>
                <Text style={[
                  styles.timelineBlockSize,
                  isFuture && { color: "#C0B8B0" },
                ]}>
                  {block.babySize} · {block.babyWeightApprox}
                </Text>
              </View>
            </View>

            {/* Milestones in this block */}
            {blockMilestones.length > 0 && (
              <View style={styles.milestonesInBlock}>
                {blockMilestones.map((m) => (
                  <View key={m.ssw + m.label} style={styles.milestoneRow}>
                    <Text style={styles.milestoneEmoji}>{m.emoji}</Text>
                    <Text style={[
                      styles.milestoneLabel,
                      isFuture && { color: "#B0A89A" },
                    ]}>
                      SSW {m.ssw} — {m.label}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* First baby dev item as teaser */}
            {(isCurrent || isPast) && (
              <Text style={styles.timelineTeaser} numberOfLines={1}>
                {block.babyDev[0]}
              </Text>
            )}
          </View>
        );
      })}

      {/* Due date at the bottom */}
      <View style={styles.dueDateCard}>
        <Text style={styles.dueDateEmoji}>🍼</Text>
        <Text style={styles.dueDateTitle}>Errechneter Geburtstermin</Text>
        <Text style={styles.dueDateValue}>
          {new Date(dueDate).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}
        </Text>
      </View>

    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FDFAF6" },

  header: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1, alignItems: "center" },
  headerName: { fontSize: 17, fontWeight: "800", color: "#2D2A26" },
  headerSub: { fontSize: 12, color: "#9B7BB8", marginTop: 1 },

  progressRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingBottom: 10, gap: 10,
  },
  progressLabel: { fontSize: 12, fontWeight: "700", color: "#7A7269", minWidth: 52 },
  progressTrack: {
    flex: 1, height: 6, backgroundColor: "#E5DDD5",
    borderRadius: 3, overflow: "hidden",
  },
  progressFill: {
    height: 6, backgroundColor: "#9B7BB8", borderRadius: 3,
  },

  tabBar: {
    flexDirection: "row", marginHorizontal: 16, marginBottom: 4,
    backgroundColor: "#F0EBE3", borderRadius: 12, padding: 3, gap: 3,
  },
  tabBtn: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: "center" },
  tabBtnActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  tabBtnText: { fontSize: 12, fontWeight: "600", color: "#7A7269" },
  tabBtnTextActive: { color: "#2D2A26" },

  tabContent: { padding: 16, paddingBottom: 48 },

  // Hero
  heroCard: {
    backgroundColor: "#9B7BB8",
    borderRadius: 20, padding: 20, marginBottom: 14,
  },
  heroTop: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 8,
  },
  heroBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  heroBadgeText: { fontSize: 12, fontWeight: "700", color: "#FFFFFF" },
  heroSize: { flexDirection: "row", alignItems: "center", gap: 4 },
  heroSizeEmoji: { fontSize: 14 },
  heroSizeText: { fontSize: 12, color: "rgba(255,255,255,0.8)", fontWeight: "600" },
  heroTitle: { fontSize: 26, fontWeight: "800", color: "#FFFFFF", marginBottom: 6 },
  heroSub: { fontSize: 14, color: "rgba(255,255,255,0.85)", lineHeight: 20 },

  // Section cards
  sectionCard: {
    borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  sectionEmoji: { fontSize: 16 },
  sectionTitle: { fontSize: 14, fontWeight: "800", flex: 1 },
  sectionItem: {
    flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 7,
  },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 6, flexShrink: 0 },
  sectionItemText: { fontSize: 14, lineHeight: 20, flex: 1 },
  watchOutNote: {
    fontSize: 12, color: "#9A7A6A", marginTop: 10, lineHeight: 17, fontStyle: "italic",
  },

  // ToDo checkbox
  todoBox: {
    width: 16, height: 16, borderRadius: 4,
    borderWidth: 1.5, borderColor: "#C8A96E",
    marginTop: 3, flexShrink: 0,
    alignItems: "center", justifyContent: "center",
  },
  todoInner: { width: 8, height: 8, borderRadius: 2 },

  // Parents card
  parentsCard: {
    backgroundColor: "#F5EEF9", borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: "#DEC8F0",
  },
  parentsTitle: { fontSize: 14, fontWeight: "800", color: "#7B5B9A", marginBottom: 8 },
  parentsText: { fontSize: 14, color: "#4A3A5A", lineHeight: 21 },

  // Next week preview
  nextCard: {
    backgroundColor: "#F0EBE3", borderRadius: 16, padding: 14,
    marginBottom: 4, borderWidth: 1, borderColor: "#E5DDD5",
  },
  nextHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  nextTitle: { fontSize: 13, fontWeight: "700", color: "#7A7269" },
  nextText: { fontSize: 14, color: "#2D2A26", lineHeight: 20 },

  // Timeline tab
  trimesterRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  trimesterChip: {
    flex: 1, alignItems: "center", padding: 10,
    borderRadius: 12, borderWidth: 1.5, borderColor: "#E5DDD5",
    backgroundColor: "#F0EBE3",
  },
  trimesterChipText: { fontSize: 10, fontWeight: "700", color: "#2D2A26" },
  trimesterChipSub: { fontSize: 10, color: "#7A7269", marginTop: 2 },

  timelineBlock: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: "#F0EBE3",
    shadowColor: "#2D2A26", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  timelineBlockCurrent: {
    borderColor: "#9B7BB8",
    borderWidth: 2,
    shadowOpacity: 0.1,
  },
  timelineBlockPast: {
    backgroundColor: "#FDFAF6",
  },
  timelineBlockHeader: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
  },
  timelineDot: {
    width: 12, height: 12, borderRadius: 6,
    marginTop: 3, flexShrink: 0,
  },
  timelineBlockTitleRow: {
    flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap",
  },
  timelineBlockLabel: { fontSize: 15, fontWeight: "700", color: "#2D2A26" },
  timelineBlockSize: { fontSize: 12, color: "#7A7269", marginTop: 2 },
  currentPill: {
    backgroundColor: "#9B7BB8", borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  currentPillText: { fontSize: 10, fontWeight: "700", color: "#FFFFFF" },
  milestonesInBlock: {
    marginTop: 10, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: "#F0EBE3",
    gap: 6,
  },
  milestoneRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  milestoneEmoji: { fontSize: 14 },
  milestoneLabel: { fontSize: 13, color: "#2D2A26", fontWeight: "500", flex: 1 },
  timelineTeaser: {
    fontSize: 12, color: "#7A7269", marginTop: 8, fontStyle: "italic",
  },

  dueDateCard: {
    backgroundColor: "#9B7BB8", borderRadius: 18,
    padding: 20, marginTop: 8, alignItems: "center", gap: 4,
  },
  dueDateEmoji: { fontSize: 32, marginBottom: 4 },
  dueDateTitle: { fontSize: 14, fontWeight: "700", color: "rgba(255,255,255,0.8)" },
  dueDateValue: { fontSize: 20, fontWeight: "800", color: "#FFFFFF" },
});
