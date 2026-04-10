import { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BabyProfile, MilestoneProgress, MilestoneStatus } from "../../../types";
import { loadProfiles, loadMilestoneProgress, setMilestoneStatus } from "../../../utils/storage";
import {
  Milestone,
  MilestoneCategory,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  CATEGORY_EMOJIS,
  MILESTONES,
  getActiveMilestones,
  getAllMilestonesSorted,
  formatMilestoneAge,
  formatMilestoneStart,
} from "../../../utils/milestoneData";
import {
  DEVELOPMENT_PHASES,
  DevelopmentPhase,
  getCurrentPhase,
  getNextPhase,
  getAgeWeeks,
  getPhaseBadgeNumber,
} from "../../../utils/developmentPhases";

type Tab = "jetzt" | "meilensteine" | "spruenge";

const STATUS_LABELS: Record<MilestoneStatus, string> = {
  not_yet: "Noch nicht",
  trying: "Übt es",
  achieved: "Kann es ✓",
};
const STATUS_COLORS: Record<MilestoneStatus, string> = {
  not_yet: "#E5DDD5",
  trying: "#F5E6C8",
  achieved: "#4A7C6F",
};
const STATUS_TEXT_COLORS: Record<MilestoneStatus, string> = {
  not_yet: "#7A7269",
  trying: "#8A6A2A",
  achieved: "#FFFFFF",
};

const CONFETTI_COLORS = ["#4A7C6F", "#C8A96E", "#D4856A", "#7B9EC8", "#9B7BB8", "#EAB84A"];

function berechneAlterLabel(birthDateISO: string): string {
  const d = Math.floor((Date.now() - new Date(birthDateISO).getTime()) / 86400000);
  if (d < 14) return `${d} ${d === 1 ? "Tag" : "Tage"} alt`;
  const w = Math.floor(d / 7), wd = d % 7;
  if (d < 112) return wd > 0 ? `${w} Wo. ${wd} T. alt` : `${w} Wochen alt`;
  const mo = Math.floor(d / 30.44), mw = Math.floor((d % 30.44) / 7);
  if (d < 730) return mw > 0 ? `${mo} Mo. ${mw} Wo. alt` : `${mo} Monate alt`;
  const y = Math.floor(d / 365), m = Math.floor((d % 365) / 30);
  return m > 0 ? `${y} J. ${m} Mo.` : `${y} Jahre alt`;
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function DevelopmentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<BabyProfile | null>(null);
  const [milestoneProgress, setMilestoneProgressState] = useState<MilestoneProgress[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("jetzt");
  const [selectedCategory, setSelectedCategory] = useState<MilestoneCategory | "all">("all");

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const profiles = await loadProfiles();
        setProfile(profiles.find((p) => p.id === id) ?? null);
        const mp = await loadMilestoneProgress(id);
        setMilestoneProgressState(mp);
      }
      load();
    }, [id])
  );

  async function handleStatusChange(milestoneId: string, status: MilestoneStatus) {
    const updated = await setMilestoneStatus(id, milestoneId, status);
    setMilestoneProgressState(updated);
  }

  if (!profile) return null;

  const ageWeeks = getAgeWeeks(profile.birthDate);
  const currentPhase = getCurrentPhase(profile.birthDate);
  const getStatus = (milestoneId: string): MilestoneStatus =>
    milestoneProgress.find((p) => p.milestoneId === milestoneId)?.status ?? "not_yet";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#4A7C6F" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerName}>{profile.name}</Text>
          <Text style={styles.headerAge}>{berechneAlterLabel(profile.birthDate)}</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* ── Tab Bar ── */}
      <View style={styles.tabBar}>
        {(["jetzt", "meilensteine", "spruenge"] as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabBtnText, activeTab === tab && styles.tabBtnTextActive]}>
              {tab === "jetzt" ? "Aktuelle Phase" : tab === "meilensteine" ? "Meilensteine" : "Phasen"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === "jetzt" && (
        <JetztTab
          phase={currentPhase}
          birthDate={profile.birthDate}
          onGoToMilestones={() => setActiveTab("meilensteine")}
          onGoToPhasen={() => setActiveTab("spruenge")}
        />
      )}
      {activeTab === "meilensteine" && (
        <MeilensteineTab
          ageWeeks={ageWeeks}
          birthDate={profile.birthDate}
          milestoneProgress={milestoneProgress}
          getStatus={getStatus}
          onStatusChange={handleStatusChange}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />
      )}
      {activeTab === "spruenge" && (
        <SpruengeTab birthDate={profile.birthDate} />
      )}
    </SafeAreaView>
  );
}

// ─── Tab 1: Aktuelle Phase ────────────────────────────────────────────────────

function JetztTab({
  phase,
  birthDate,
  onGoToMilestones,
  onGoToPhasen,
}: {
  phase: DevelopmentPhase | null;
  birthDate: string;
  onGoToMilestones: () => void;
  onGoToPhasen: () => void;
}) {
  const displayPhase = phase ?? DEVELOPMENT_PHASES[DEVELOPMENT_PHASES.length - 1];
  const nextPhase = getNextPhase(displayPhase.id);
  const phaseMilestones = MILESTONES.filter(
    (m) => m.typicalWeeksFrom < displayPhase.weeksTo && m.typicalWeeksTo > displayPhase.weeksFrom
  );

  return (
    <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.phaseHero}>
        <View style={styles.phaseHeroTop}>
          <Text style={styles.phaseLabel}>{displayPhase.ageLabel}</Text>
        </View>
        <Text style={styles.phaseTitle}>{displayPhase.emoji} {displayPhase.title}</Text>
        <Text style={styles.phaseSummary}>{displayPhase.summary}</Text>
      </View>

      {displayPhase.developmentHint && (
        <View style={[styles.sectionCard, { backgroundColor: "#FFF8ED", borderColor: "#F0D898" }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEmoji}>⚡</Text>
            <Text style={[styles.sectionTitle, { color: "#7A5A10" }]}>Intensive Entwicklungsphase</Text>
          </View>
          <Text style={[styles.sectionItemText, { color: "#7A5A10", paddingLeft: 4 }]}>{displayPhase.developmentHint}</Text>
        </View>
      )}

      {/* Meilenstein-Chips dieser Phase — tappable zu Meilensteinen */}
      <TouchableOpacity
        style={[styles.sectionCard, { backgroundColor: "#EAF2EF", borderColor: "#C5DDD8" }]}
        onPress={onGoToMilestones}
        activeOpacity={0.8}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEmoji}>⭐</Text>
          <Text style={styles.sectionTitle}>Mögliche Meilensteine</Text>
          <Ionicons name="chevron-forward" size={14} color="#4A7C6F" style={{ marginLeft: "auto" }} />
        </View>
        <View style={styles.chipRow}>
          {phaseMilestones.map((m) => (
            <View key={m.id} style={[styles.chip, { backgroundColor: CATEGORY_COLORS[m.category] + "18", borderColor: CATEGORY_COLORS[m.category] + "66" }]}>
              <Text style={[styles.chipText, { color: CATEGORY_COLORS[m.category] }]}>{m.title}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.chipHint}>Tippe um Meilensteine abzuhaken →</Text>
      </TouchableOpacity>

      <SectionCard title="Typisches Verhalten" emoji="📍" bgColor="#F5F0E8" borderColor="#E5D8C8" items={displayPhase.typical} dotColor="#C8A96E" />

      <View style={[styles.sectionCard, { backgroundColor: "#FDF5F0", borderColor: "#F0D8C8" }]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEmoji}>🔍</Text>
          <Text style={[styles.sectionTitle, { color: "#8A4A2A" }]}>Sprich mit deinem Kinderarzt, wenn</Text>
        </View>
        {displayPhase.watchOut.map((item: string, i: number) => (
          <View key={i} style={styles.sectionItem}>
            <View style={[styles.sectionDot, { backgroundColor: "#D4856A" }]} />
            <Text style={styles.sectionItemText}>{item}</Text>
          </View>
        ))}
        <Text style={styles.watchOutNote}>
          Diese Hinweise ersetzen keine ärztliche Untersuchung — sie helfen dir, das Gespräch zu suchen.
        </Text>
      </View>

      <View style={styles.parentsCard}>
        <Text style={styles.parentsTitle}>💜 Für dich als Elternteil</Text>
        <Text style={styles.parentsText}>{displayPhase.forParents}</Text>
      </View>

      {nextPhase && (
        <TouchableOpacity
          style={[styles.sectionCard, { backgroundColor: "#F5F0E8", borderColor: "#E5D8C8" }]}
          onPress={onGoToPhasen}
          activeOpacity={0.8}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEmoji}>🔜</Text>
            <Text style={[styles.sectionTitle, { color: "#6A5A48" }]}>Nächste Phase: {nextPhase.emoji} {nextPhase.title}</Text>
            <Ionicons name="chevron-forward" size={14} color="#6A5A48" style={{ marginLeft: "auto" }} />
          </View>
          <Text style={[styles.sectionItemText, { color: "#6A5A48", paddingLeft: 4 }]}>{nextPhase.ageLabel} · {nextPhase.summary}</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

function SectionCard({ title, emoji, bgColor, borderColor, items, dotColor }: {
  title: string; emoji: string; bgColor: string; borderColor: string; items: string[]; dotColor: string;
}) {
  return (
    <View style={[styles.sectionCard, { backgroundColor: bgColor, borderColor }]}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionEmoji}>{emoji}</Text>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {items.map((item, i) => (
        <View key={i} style={styles.sectionItem}>
          <View style={[styles.sectionDot, { backgroundColor: dotColor }]} />
          <Text style={styles.sectionItemText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Tab 2: Meilensteine (merged Bereiche + Liste) ────────────────────────────

function MeilensteineTab({
  ageWeeks,
  birthDate,
  milestoneProgress,
  getStatus,
  onStatusChange,
  selectedCategory,
  onSelectCategory,
}: {
  ageWeeks: number;
  birthDate: string;
  milestoneProgress: MilestoneProgress[];
  getStatus: (id: string) => MilestoneStatus;
  onStatusChange: (id: string, status: MilestoneStatus) => void;
  selectedCategory: MilestoneCategory | "all";
  onSelectCategory: (c: MilestoneCategory | "all") => void;
}) {
  const categories: MilestoneCategory[] = ["motorik", "sprache", "sozial", "kognitiv"];

  // Active = aktuell typisch oder bis 4 Wochen voraus (für Zählung & Fortschritt)
  const active = getActiveMilestones(ageWeeks);
  // All = vollständige sortierte Liste (inkl. zukünftiger, ausgegraut)
  const all = getAllMilestonesSorted(ageWeeks);

  const activeIds = new Set(active.map((m) => m.id));

  const achieved = active.filter((m) => getStatus(m.id) === "achieved").length;
  const trying = active.filter((m) => getStatus(m.id) === "trying").length;
  const isAhead = achieved > active.length; // kann passieren wenn Kind früh Zukünftige abhakt

  // Category filter: Kacheln zeigen nur aktive Meilensteine
  // Liste zeigt alle, gefiltert nach Kategorie wenn ausgewählt
  const listAll = selectedCategory === "all"
    ? all
    : all.filter((m) => m.category === selectedCategory);

  const achievedIds = new Set(milestoneProgress.filter((p) => p.status === "achieved").map((p) => p.milestoneId));
  const badgeNum = getPhaseBadgeNumber(birthDate, achievedIds, MILESTONES);

  const [disclaimerOpen, setDisclaimerOpen] = useState(false);

  return (
    <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>

      {/* Kompakte Summary + Disclaimer in einer Zeile */}
      <View style={styles.milestoneHeaderRow}>
        <View style={styles.milestoneSumCompact}>
          <Text style={[styles.milestoneSumNumSm, { color: "#4A7C6F" }]}>{achieved}</Text>
          <Text style={styles.milestoneSumLabelSm}>Erreicht</Text>
        </View>
        <View style={styles.milestoneSumDividerSm} />
        <View style={styles.milestoneSumCompact}>
          <Text style={[styles.milestoneSumNumSm, { color: "#C8A96E" }]}>{trying}</Text>
          <Text style={styles.milestoneSumLabelSm}>Übt gerade</Text>
        </View>
        <View style={styles.milestoneSumDividerSm} />
        <View style={styles.milestoneSumCompact}>
          <Text style={[styles.milestoneSumNumSm, { color: "#B0A89A" }]}>{active.length}</Text>
          <Text style={styles.milestoneSumLabelSm}>Aktuell</Text>
        </View>
        {badgeNum > 0 && (
          <>
            <View style={styles.milestoneSumDividerSm} />
            <View style={styles.milestoneSumCompact}>
              <View style={styles.phaseBadgeChip}>
                <Text style={styles.phaseBadgeChipText}>⭐ {badgeNum}</Text>
              </View>
              <Text style={styles.milestoneSumLabelSm}>Phasen</Text>
            </View>
          </>
        )}
        <TouchableOpacity
          style={styles.disclaimerToggleBtn}
          onPress={() => setDisclaimerOpen(!disclaimerOpen)}
          activeOpacity={0.7}
        >
          <Ionicons name="information-circle-outline" size={18} color="#6A5A48" />
        </TouchableOpacity>
      </View>

      {/* Ausklappbarer Disclaimer */}
      {disclaimerOpen && (
        <View style={styles.milestoneDisclaimer}>
          <Text style={styles.milestoneDisclaimerText}>
            Meilensteine zeigen, was viele Kinder in einem bestimmten Zeitraum können — nicht was dein Kind genau jetzt können muss. Früher oder später zu sein ist fast immer normal.{"\n\n"}
            Ein Gespräch mit der Kinderärztin lohnt sich, wenn mehrere Meilensteine einer Kategorie nach dem angegebenen Zeitraum noch nicht in Sicht sind — oder wenn dein Kind Fähigkeiten verliert, die es vorher hatte.{"\n\n"}
            Die U-Untersuchungen (U3–U9) sind genau dafür da: frühzeitig hinschauen, begleiten, beruhigen.
          </Text>
        </View>
      )}

      {/* Category filter — horizontale Chip-Zeile */}
      <View style={styles.categoryChipRow}>
        {categories.map((cat) => {
          const catActive = active.filter((m) => m.category === cat);
          const catAchieved = catActive.filter((m) => getStatus(m.id) === "achieved").length;
          const isSelected = selectedCategory === cat;
          const isOver = catAchieved > catActive.length;
          return (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryChip,
                isSelected && { backgroundColor: CATEGORY_COLORS[cat] + "22", borderColor: CATEGORY_COLORS[cat] },
              ]}
              onPress={() => onSelectCategory(isSelected ? "all" : cat)}
              activeOpacity={0.8}
            >
              <Text style={styles.categoryChipEmoji}>{CATEGORY_EMOJIS[cat]}</Text>
              <Text style={[styles.categoryChipName, isSelected && { color: CATEGORY_COLORS[cat] }]}>
                {CATEGORY_LABELS[cat]}
              </Text>
              <Text style={[styles.categoryChipCount, isOver && { color: "#C8A96E" }]}>
                {catAchieved}/{catActive.length}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Filter heading */}
      {selectedCategory !== "all" && (
        <View style={styles.filterRow}>
          <Text style={[styles.filterLabel, { color: CATEGORY_COLORS[selectedCategory] }]}>
            {CATEGORY_EMOJIS[selectedCategory]} {CATEGORY_LABELS[selectedCategory]}
          </Text>
          <TouchableOpacity onPress={() => onSelectCategory("all")} style={styles.filterClear}>
            <Ionicons name="close-circle" size={16} color="#B0A89A" />
            <Text style={styles.filterClearText}>Alle</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Milestone list: aktive normal, dann Trenner, dann zukünftige ausgegraut */}
      {listAll.map((milestone, idx) => {
        const isActive = activeIds.has(milestone.id);
        const prevIsActive = idx > 0 ? activeIds.has(listAll[idx - 1].id) : true;
        const showDivider = !isActive && prevIsActive;
        return (
          <View key={milestone.id}>
            {showDivider && (
              <View style={styles.futureDivider}>
                <View style={styles.futureDividerLine} />
                <Text style={styles.futureDividerText}>Demnächst</Text>
                <View style={styles.futureDividerLine} />
              </View>
            )}
            <MilestoneCard
              milestone={milestone}
              status={getStatus(milestone.id)}
              ageWeeks={ageWeeks}
              onStatusChange={onStatusChange}
              dimmed={!isActive}
            />
          </View>
        );
      })}

    </ScrollView>
  );
}

// ─── Tab 3: Entwicklungs-Timeline ────────────────────────────────────────────

function SpruengeTab({
  birthDate,
}: {
  birthDate: string;
}) {
  const ageWeeks = getAgeWeeks(birthDate);
  const currentPhaseInTab = getCurrentPhase(birthDate);
  const [expanded, setExpanded] = useState<string | null>(currentPhaseInTab?.id ?? null);

  return (
    <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.timelineIntro}>
        Entwicklung im Überblick — von der Geburt bis zum dritten Lebensjahr. Jede Phase bringt neue Fähigkeiten und typische Verhaltensweisen.
      </Text>

      {DEVELOPMENT_PHASES.map((phase, index) => {
        const isPast = ageWeeks >= phase.weeksTo;
        const isCurrent = ageWeeks >= phase.weeksFrom && ageWeeks < phase.weeksTo;
        const isExpanded = expanded === phase.id;
        const isLast = index === DEVELOPMENT_PHASES.length - 1;
        const weeksUntil = Math.ceil(phase.weeksFrom - ageWeeks);

        const accentColor = isCurrent ? "#4A7C6F" : isPast ? "#B0C8B8" : "#C8C0B4";

        return (
          <View key={phase.id} style={{ flexDirection: "row" }}>
            <View style={styles.ltSpineCol}>
              <View style={[styles.ltDot, {
                backgroundColor: isPast ? "#B0C8B8" : isCurrent ? "#4A7C6F" : "#FFFFFF",
                borderColor: accentColor,
              }]}>
                {isPast
                  ? <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                  : <Text style={{ fontSize: 12 }}>{phase.emoji}</Text>
                }
              </View>
              {!isLast && <View style={[styles.ltLine, { backgroundColor: isPast ? "#B0C8B8" : "#E8E0D8" }]} />}
            </View>

            <View style={{ flex: 1, paddingBottom: 16 }}>
              <TouchableOpacity
                style={[
                  styles.ltCard,
                  isCurrent && { borderColor: "#4A7C6F", borderWidth: 2, backgroundColor: "#F4FAF8" },
                  isPast && { opacity: 0.6 },
                ]}
                onPress={() => setExpanded(isExpanded ? null : phase.id)}
                activeOpacity={0.8}
              >
                <View style={styles.ltCardTop}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <Text style={[styles.ltName, isPast && { color: "#8A8278" }]}>{phase.title}</Text>
                      {isCurrent && (
                        <View style={styles.ltNowBadge}>
                          <Text style={styles.ltNowBadgeText}>● Jetzt</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.ltWeekLabel}>
                      {phase.ageLabel}
                      {isPast ? " · abgeschlossen" : isCurrent ? ` · Woche ${ageWeeks}` : ` · in ${weeksUntil} ${weeksUntil === 1 ? "Woche" : "Wochen"}`}
                    </Text>
                  </View>
                  <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color="#B0A89A" />
                </View>

                {isExpanded && (
                  <View style={styles.ltExpanded}>
                    <Text style={styles.ltDesc}>{phase.summary}</Text>

                    {phase.developmentHint && (
                      <View style={[styles.ltHintBox, { backgroundColor: "#FFF8ED", borderColor: "#F0D898" }]}>
                        <Text style={[styles.ltHintText, { color: "#7A5A10", fontWeight: "600" }]}>
                          ⚡ Intensive Entwicklungsphase
                        </Text>
                        <Text style={[styles.ltHintText, { color: "#7A5A10", marginTop: 4 }]}>
                          {phase.developmentHint}
                        </Text>
                      </View>
                    )}

                    <Text style={styles.ltSkillsTitle}>Mögliche Meilensteine</Text>
                    <View style={[styles.chipRow, { marginBottom: 10 }]}>
                      {MILESTONES.filter(
                        (m) => m.typicalWeeksFrom < phase.weeksTo && m.typicalWeeksTo > phase.weeksFrom
                      ).map((m) => (
                        <View key={m.id} style={[styles.chip, { backgroundColor: CATEGORY_COLORS[m.category] + "18", borderColor: CATEGORY_COLORS[m.category] + "66" }]}>
                          <Text style={[styles.chipText, { color: CATEGORY_COLORS[m.category] }]}>{m.title}</Text>
                        </View>
                      ))}
                    </View>

                    <View style={[styles.ltHintBox, { backgroundColor: "#EAF2EF", borderColor: "#C5DDD8" }]}>
                      <Text style={[styles.ltHintText, { color: "#2D5A50" }]}>
                        💡 {phase.parentTip}
                      </Text>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      <Text style={styles.ltSource}>
        Basierend auf CDC-Entwicklungsmeilensteinen (cdc.gov/actearly), AAP-Richtlinien und Piaget-Entwicklungspsychologie. Jedes Kind entwickelt sich in seinem eigenen Tempo — bei Fragen wende dich an deine Kinderärztin.
      </Text>
    </ScrollView>
  );
}

// ─── Confetti Burst ───────────────────────────────────────────────────────────

function ConfettiBurst({ onDone }: { onDone: () => void }) {
  const particles = useRef(
    Array.from({ length: 10 }, (_, i) => ({
      angle: (i * 360) / 10 + Math.random() * 20,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      anim: new Animated.ValueXY({ x: 0, y: 0 }),
      opacity: new Animated.Value(1),
      scale: new Animated.Value(0.3),
    }))
  ).current;

  useEffect(() => {
    const anims = particles.map((p) => {
      const rad = (p.angle * Math.PI) / 180;
      const dist = 40 + Math.random() * 20;
      return Animated.parallel([
        Animated.timing(p.anim, {
          toValue: { x: Math.cos(rad) * dist, y: Math.sin(rad) * dist },
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.spring(p.scale, { toValue: 1, friction: 4, useNativeDriver: true }),
          Animated.timing(p.opacity, { toValue: 0, duration: 350, delay: 200, useNativeDriver: true }),
        ]),
      ]);
    });
    Animated.parallel(anims).start(() => onDone());
  }, []);

  return (
    <View
      style={[StyleSheet.absoluteFillObject, { alignItems: "center", justifyContent: "center" }]}
      pointerEvents="none"
    >
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: "absolute",
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: p.color,
            transform: [
              { translateX: p.anim.x },
              { translateY: p.anim.y },
              { scale: p.scale },
            ],
            opacity: p.opacity,
          }}
        />
      ))}
    </View>
  );
}

// ─── Milestone Card ───────────────────────────────────────────────────────────

function MilestoneCard({
  milestone,
  status,
  ageWeeks,
  onStatusChange,
  dimmed = false,
}: {
  milestone: Milestone;
  status: MilestoneStatus;
  ageWeeks: number;
  onStatusChange: (id: string, status: MilestoneStatus) => void;
  dimmed?: boolean;
}) {
  const [showConfetti, setShowConfetti] = useState(false);
  const prevStatus = useRef(status);
  const achievedScale = useRef(new Animated.Value(1)).current;
  const catColor = CATEGORY_COLORS[milestone.category];
  const isTypicalNow = ageWeeks >= milestone.typicalWeeksFrom && ageWeeks <= milestone.typicalWeeksTo;
  const isUpcoming = ageWeeks < milestone.typicalWeeksFrom;

  function handleStatusChange(newStatus: MilestoneStatus) {
    const wasAchieved = prevStatus.current === "achieved";
    prevStatus.current = newStatus;
    onStatusChange(milestone.id, newStatus);
    if (newStatus === "achieved" && !wasAchieved) {
      setShowConfetti(true);
      Animated.sequence([
        Animated.spring(achievedScale, { toValue: 1.4, friction: 3, useNativeDriver: true }),
        Animated.spring(achievedScale, { toValue: 1, friction: 5, useNativeDriver: true }),
      ]).start();
    }
  }

  return (
    <View style={[
      styles.milestoneCard,
      isTypicalNow && status !== "achieved" && !dimmed && styles.milestoneCardHighlight,
      dimmed && styles.milestoneCardDimmed,
    ]}>
      {showConfetti && <ConfettiBurst onDone={() => setShowConfetti(false)} />}

      {/* Category tag + title */}
      <View style={styles.milestoneCardHeader}>
        <View style={{ flex: 1 }}>
          <View style={[styles.catTag, { backgroundColor: catColor + "22" }]}>
            <Text style={[styles.catTagText, { color: catColor }]}>
              {CATEGORY_EMOJIS[milestone.category]} {CATEGORY_LABELS[milestone.category]}
            </Text>
          </View>
          <Text style={styles.milestoneTitle}>{milestone.title}</Text>
          <Text style={styles.milestoneAgeRange}>
            {isTypicalNow
              ? "⏰ Jetzt typisch"
              : isUpcoming
              ? `📅 Ab ${formatMilestoneStart(milestone.typicalWeeksFrom)}`
              : `Typisch: ${formatMilestoneAge(milestone.typicalWeeksFrom, milestone.typicalWeeksTo)}`}
          </Text>
        </View>
        {status === "achieved" && (
          <Animated.View style={[styles.achievedBadge, { transform: [{ scale: achievedScale }] }]}>
            <Text style={styles.achievedBadgeText}>✓</Text>
          </Animated.View>
        )}
      </View>

      {/* Description */}
      <Text style={styles.milestoneDesc}>{milestone.description}</Text>

      {/* Tip */}
      {milestone.tip && status !== "achieved" && (
        <View style={styles.milestoneTip}>
          <Ionicons name="bulb-outline" size={14} color="#C8A96E" />
          <Text style={styles.milestoneTipText}>{milestone.tip}</Text>
        </View>
      )}

      {/* Status buttons */}
      <View style={styles.statusRow}>
        {(["not_yet", "trying", "achieved"] as MilestoneStatus[]).map((s) => (
          <TouchableOpacity
            key={s}
            style={[
              styles.statusBtn,
              { backgroundColor: status === s ? STATUS_COLORS[s] : "#F0EBE3" },
            ]}
            onPress={() => handleStatusChange(s)}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.statusBtnText,
              { color: status === s ? STATUS_TEXT_COLORS[s] : "#B0A89A" },
            ]}>
              {STATUS_LABELS[s]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FDFAF6" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1, alignItems: "center" },
  headerName: { fontSize: 17, fontWeight: "800", color: "#2D2A26" },
  headerAge: { fontSize: 12, color: "#7A7269", marginTop: 1 },

  tabBar: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 4,
    backgroundColor: "#F0EBE3",
    borderRadius: 12,
    padding: 3,
    gap: 3,
  },
  tabBtn: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: "center" },
  tabBtnActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  tabBtnText: { fontSize: 12, fontWeight: "600", color: "#7A7269" },
  tabBtnTextActive: { color: "#2D2A26" },

  tabContent: { padding: 16, paddingBottom: 48 },

  // Jetzt tab
  phaseHero: {
    backgroundColor: "#4A7C6F",
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
  },
  phaseHeroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  phaseLabel: {
    fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.7)",
    textTransform: "uppercase", letterSpacing: 0.8,
  },
  phaseTitle: { fontSize: 22, fontWeight: "800", color: "#FFFFFF", marginBottom: 8 },
  phaseSummary: { fontSize: 14, color: "rgba(255,255,255,0.85)", lineHeight: 21 },

  sectionCard: {
    borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  sectionEmoji: { fontSize: 16 },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: "#2D2A26", flex: 1 },
  sectionItem: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 7 },
  sectionDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6, flexShrink: 0 },
  sectionItemText: { fontSize: 14, color: "#2D2A26", lineHeight: 20, flex: 1 },
  watchOutNote: { fontSize: 12, color: "#9A7A6A", marginTop: 10, lineHeight: 17, fontStyle: "italic" },
  parentsCard: {
    backgroundColor: "#F5EEF9", borderRadius: 16, padding: 16, marginBottom: 4,
    borderWidth: 1, borderColor: "#DEC8F0",
  },
  parentsTitle: { fontSize: 14, fontWeight: "800", color: "#7B5B9A", marginBottom: 8 },
  parentsText: { fontSize: 14, color: "#4A3A5A", lineHeight: 21 },

  // Meilensteine tab
  milestoneSummary: {
    flexDirection: "row",
    backgroundColor: "#F0EBE3",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: "center",
  },
  milestoneSumItem: { flex: 1, alignItems: "center", gap: 3 },
  milestoneSumNum: { fontSize: 26, fontWeight: "800" },
  milestoneSumLabel: { fontSize: 12, color: "#7A7269" },
  milestoneSumDivider: { width: 1, height: 40, backgroundColor: "#E5DDD5" },

  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  categoryCard: {
    width: "47%",
    backgroundColor: "#F0EBE3",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: "#E5DDD5",
  },
  categoryEmoji: { fontSize: 22, marginBottom: 4 },
  categoryName: { fontSize: 13, fontWeight: "700", color: "#2D2A26", marginBottom: 8 },
  categoryProgress: {
    height: 4, backgroundColor: "#E5DDD5", borderRadius: 2, overflow: "hidden", marginBottom: 4,
  },
  categoryProgressBar: { height: 4, borderRadius: 2 },
  categoryProgressLabel: { fontSize: 11, color: "#7A7269" },

  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  filterLabel: { fontSize: 14, fontWeight: "800" },
  filterClear: { flexDirection: "row", alignItems: "center", gap: 4 },
  filterClearText: { fontSize: 13, color: "#B0A89A" },

  // Milestone card
  milestoneCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    overflow: "hidden",
    shadowColor: "#2D2A26",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  milestoneCardHighlight: {
    borderWidth: 2,
    borderColor: "#4A7C6F",
    shadowOpacity: 0.1,
  },
  milestoneCardDimmed: {
    opacity: 0.45,
    backgroundColor: "#F5F2EE",
  },

  // Progress bar in milestone tab
  progressBlock: { marginBottom: 16 },
  progressBarTrack: {
    height: 6, backgroundColor: "#E5DDD5",
    borderRadius: 3, overflow: "hidden", marginBottom: 6,
  },
  progressBarFill: { height: 6, borderRadius: 3 },
  progressBarLabel: { fontSize: 12, color: "#7A7269", textAlign: "center" },

  // Future divider
  futureDivider: {
    flexDirection: "row", alignItems: "center", gap: 8, marginVertical: 12,
  },
  futureDividerLine: { flex: 1, height: 1, backgroundColor: "#E5DDD5" },
  futureDividerText: { fontSize: 12, fontWeight: "700", color: "#B0A89A" },
  milestoneCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
    gap: 10,
  },
  catTag: {
    alignSelf: "flex-start",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 5,
  },
  catTagText: { fontSize: 11, fontWeight: "700" },
  milestoneTitle: { fontSize: 15, fontWeight: "700", color: "#2D2A26" },
  milestoneAgeRange: { fontSize: 12, color: "#7A7269", marginTop: 3 },
  achievedBadge: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "#4A7C6F",
    alignItems: "center", justifyContent: "center",
  },
  achievedBadgeText: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },
  milestoneDesc: { fontSize: 13, color: "#4A4440", lineHeight: 19, marginBottom: 10 },
  milestoneTip: {
    flexDirection: "row", alignItems: "flex-start", gap: 6,
    backgroundColor: "#FFFBF0", borderRadius: 10, padding: 10, marginBottom: 10,
  },
  milestoneTipText: { fontSize: 12, color: "#7A6A4A", flex: 1, lineHeight: 17 },

  statusRow: { flexDirection: "row", gap: 6 },
  statusBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center" },
  statusBtnText: { fontSize: 12, fontWeight: "700" },

  milestoneNote: {
    fontSize: 12, color: "#B0A89A", textAlign: "center",
    marginTop: 8, marginBottom: 4, lineHeight: 17, fontStyle: "italic",
  },

  // Sprünge Timeline
  timelineIntro: {
    fontSize: 13, color: "#7A7269", lineHeight: 19,
    marginBottom: 20, textAlign: "center",
  },
  ltSpineCol: { width: 32, alignItems: "center" },
  ltDot: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, alignItems: "center", justifyContent: "center",
    zIndex: 1,
  },
  ltLine: { width: 2, flex: 1, minHeight: 12 },
  ltCard: {
    backgroundColor: "#FFFFFF", borderRadius: 14, padding: 14,
    marginLeft: 8, borderWidth: 1, borderColor: "#E8E0D8",
    shadowColor: "#2D2A26", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  ltCardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  ltEmoji: { fontSize: 20, width: 28, textAlign: "center" },
  ltName: { fontSize: 14, fontWeight: "800", color: "#2D2A26" },
  ltNowBadge: {
    borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2,
  },
  ltNowBadgeText: { fontSize: 11, fontWeight: "700" },
  ltWeekLabel: { fontSize: 11, color: "#7A7269", marginTop: 2 },
  ltExpanded: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: "#F0EBE3" },
  ltDesc: { fontSize: 13, color: "#4A4440", lineHeight: 19, marginBottom: 12 },
  ltHintBox: {
    borderRadius: 10, padding: 10, marginBottom: 12, borderWidth: 1,
  },
  ltHintText: { fontSize: 12, lineHeight: 17 },
  ltSkillsTitle: {
    fontSize: 12, fontWeight: "800", color: "#2D2A26",
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8,
  },
  ltSkillRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 6 },
  ltSkillDot: { width: 6, height: 6, borderRadius: 3, marginTop: 5, flexShrink: 0 },
  ltSkillText: { fontSize: 13, color: "#2D2A26", lineHeight: 18, flex: 1 },
  ltSource: {
    fontSize: 11, color: "#B0A89A", textAlign: "center",
    marginTop: 16, lineHeight: 16, fontStyle: "italic",
  },
  chipRow: {
    flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8,
  },
  chip: {
    backgroundColor: "#FFFFFF", borderRadius: 16, paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: "#B0D8C8",
  },
  chipText: {
    fontSize: 11, color: "#2D5A50", lineHeight: 15,
  },
  chipEmoji: {
    fontSize: 11, marginRight: 3,
  },
  chipHint: {
    fontSize: 11, color: "#4A7C6F", marginTop: 10, fontStyle: "italic",
  },
  milestoneHeaderRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#F0EBE3", borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 8,
    marginBottom: 8, gap: 2,
  },
  milestoneSumCompact: { flex: 1, alignItems: "center", gap: 1 },
  milestoneSumNumSm: { fontSize: 18, fontWeight: "800" },
  milestoneSumLabelSm: { fontSize: 10, color: "#7A7269" },
  milestoneSumDividerSm: { width: 1, height: 24, backgroundColor: "#E5DDD5" },
  disclaimerToggleBtn: { paddingLeft: 8 },
  milestoneDisclaimer: {
    backgroundColor: "#F5F0E8", borderRadius: 10, padding: 12,
    marginBottom: 8, borderWidth: 1, borderColor: "#E5D8C8",
  },
  milestoneDisclaimerTitle: {
    fontSize: 13, fontWeight: "700", color: "#6A5A48", marginBottom: 8,
  },
  milestoneDisclaimerText: {
    fontSize: 12, color: "#7A7269", lineHeight: 18,
  },
  categoryChipRow: {
    flexDirection: "row", gap: 8, marginBottom: 16, flexWrap: "nowrap",
  },
  categoryChip: {
    flex: 1, flexDirection: "column", alignItems: "center",
    backgroundColor: "#F0EBE3", borderRadius: 10,
    paddingVertical: 7, paddingHorizontal: 4,
    borderWidth: 1.5, borderColor: "#E5DDD5", gap: 2,
  },
  categoryChipEmoji: { fontSize: 16 },
  categoryChipName: { fontSize: 10, fontWeight: "700", color: "#2D2A26", textAlign: "center" },
  categoryChipCount: { fontSize: 10, color: "#7A7269" },
  phaseBadgeChip: {
    backgroundColor: "#4A7C6F", borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3,
  },
  phaseBadgeChipText: { fontSize: 11, fontWeight: "800", color: "#FFFFFF" },
});
