import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Swipeable from "react-native-gesture-handler/Swipeable";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BabyProfile, ChatSession, Memory } from "../../types";
import {
  loadProfiles,
  loadSessions,
  createSession,
  deleteSession,
  loadMemories,
  saveMemories,
  loadMilestoneProgress,
} from "../../utils/storage";
import { getActiveMilestones, MILESTONES } from "../../utils/milestoneData";
import { MilestoneProgress } from "../../types";
import { getCurrentPhase, getAgeWeeks, getPhaseBadgeNumber } from "../../utils/developmentPhases";

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<Memory["category"], string> = {
  sleep: "Schlaf",
  feeding: "Ernährung",
  health: "Gesundheit",
  development: "Entwicklung",
  general: "Allgemein",
  mood: "Stimmung",
};

const CATEGORY_COLORS: Record<Memory["category"], string> = {
  sleep: "#7B9EC8",
  feeding: "#4A7C6F",
  health: "#D4856A",
  development: "#9B7BB8",
  general: "#C8A96E",
  mood: "#D4856A",
};

const FEEDING_LABELS: Record<BabyProfile["feedingType"], string> = {
  breastfed: "Gestillt",
  formula: "Formulanahrung",
  mixed: "Gestillt & Formula",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function berechneAlter(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d < 14) return `${d} ${d === 1 ? "Tag" : "Tage"} alt`;
  const w = Math.floor(d / 7), wd = d % 7;
  if (d < 112) return wd > 0 ? `${w} Wo. ${wd} T. alt` : `${w} Wochen alt`;
  const mo = Math.floor(d / 30.44), mw = Math.floor((d % 30.44) / 7);
  if (d < 730) return mw > 0 ? `${mo} Mo. ${mw} Wo. alt` : `${mo} Monate alt`;
  const y = Math.floor(d / 365), m = Math.floor((d % 365) / 30);
  return m > 0 ? `${y} J. ${m} Mo.` : `${y} Jahre alt`;
}

function formatDay(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (iso === today.toISOString().slice(0, 10)) return "Heute";
  if (iso === yesterday.toISOString().slice(0, 10)) return "Gestern";
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<BabyProfile | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [milestoneProgress, setMilestoneProgress] = useState<MilestoneProgress[]>([]);
  const [newMemoryText, setNewMemoryText] = useState("");
  const [newMemoryCategory, setNewMemoryCategory] = useState<Memory["category"]>("general");
  const [showAddMemory, setShowAddMemory] = useState(false);
  const [showAllChats, setShowAllChats] = useState(false);
  const [showAllMemories, setShowAllMemories] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const profiles = await loadProfiles();
        const found = profiles.find((p) => p.id === id) ?? null;
        setProfile(found);
        const sess = await loadSessions(id);
        setSessions(sess);
        const mems = await loadMemories(id);
        setMemories(mems);
        const mp = await loadMilestoneProgress(id);
        setMilestoneProgress(mp);
      }
      load();
    }, [id])
  );

  async function deleteMemory(memId: string) {
    const updated = memories.filter((m) => m.id !== memId);
    setMemories(updated);
    await saveMemories(id, updated);
  }

  async function addMemory() {
    if (!newMemoryText.trim()) return;
    const mem: Memory = {
      id: Date.now().toString(),
      babyId: id,
      content: newMemoryText.trim(),
      category: newMemoryCategory,
      createdAt: new Date().toISOString(),
    };
    const updated = [...memories, mem];
    setMemories(updated);
    await saveMemories(id, updated);
    setNewMemoryText("");
    setShowAddMemory(false);
  }

  async function startNewChat() {
    const session = await createSession(id);
    setSessions((prev) => [session, ...prev]);
    router.push(`/chat/${session.id}?babyId=${id}`);
  }

  async function removeSession(sessionId: string) {
    await deleteSession(id, sessionId);
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
  }

  if (!profile) return null;

  const GENDER_LABELS: Record<string, string> = { male: "Junge", female: "Mädchen", other: "Divers" };

  const rows: { label: string; value: string }[] = [
    {
      label: "Geburtsdatum",
      value: new Date(profile.birthDate).toLocaleDateString("de-DE", {
        day: "2-digit", month: "long", year: "numeric",
      }),
    },
    { label: "Ernährung", value: FEEDING_LABELS[profile.feedingType] },
  ];
  if (profile.gender) rows.push({ label: "Geschlecht", value: GENDER_LABELS[profile.gender] });
  if (profile.premature !== undefined) rows.push({ label: "Frühgeburt", value: profile.premature ? "Ja" : "Nein" });
  if (profile.siblings) rows.push({ label: "Geschwister", value: profile.siblings });
  if (profile.medicalNotes) rows.push({ label: "Med. Besonderheiten", value: profile.medicalNotes });

  const visibleSessions = showAllChats ? sessions : sessions.slice(0, 3);
  const visibleMemories = showAllMemories ? memories : memories.slice(0, 3);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={0}
        >

          {/* ── Hero Header ── */}
          <View style={styles.hero}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={24} color="#4A7C6F" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.editBtn} onPress={() => router.push(`/profile/edit/${id}`)}>
              <Ionicons name="create-outline" size={22} color="#4A7C6F" />
            </TouchableOpacity>

            {profile.photoUri ? (
              <Image source={{ uri: profile.photoUri }} style={styles.heroPhoto} />
            ) : (
              <View style={[styles.heroAvatar, { backgroundColor: profile.avatarColor }]}>
                <Text style={styles.heroAvatarText}>{profile.name.charAt(0).toUpperCase()}</Text>
              </View>
            )}

            <Text style={styles.heroName}>{profile.name}</Text>
            <Text style={styles.heroAge}>{berechneAlter(profile.birthDate)}</Text>
          </View>

          {/* ── Scrollable Body ── */}
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >

            {/* ── 1. Entwicklung ── */}
            {(() => {
              const ageWeeks = getAgeWeeks(profile.birthDate);
              const currentPhase = getCurrentPhase(profile.birthDate);
              const active = getActiveMilestones(ageWeeks);
              const activeIds = new Set(active.map((m) => m.id));
              const achieved = milestoneProgress.filter(
                (p) => p.status === "achieved" && activeIds.has(p.milestoneId)
              ).length;
              const totalRelevant = active.length;
              const achievedAllIds = new Set(milestoneProgress.filter((p) => p.status === "achieved").map((p) => p.milestoneId));
              const badgeNum = getPhaseBadgeNumber(profile.birthDate, achievedAllIds, MILESTONES);
              return (
                <>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>🌱 Entwicklung</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.devCard}
                    onPress={() => router.push(`/profile/development/${id}`)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.devCardTop}>
                      <View style={styles.devCardBadge}>
                        <Text style={styles.devCardBadgeText}>Woche {ageWeeks}</Text>
                      </View>
                      {currentPhase && (
                        <View style={[styles.devCardPhaseBadge, { backgroundColor: "#EAF2EF" }]}>
                          <Text style={[styles.devCardPhaseText, { color: "#4A7C6F" }]}>
                            {currentPhase.emoji} {currentPhase.title}
                          </Text>
                        </View>
                      )}
                      {badgeNum > 0 && (
                        <View style={styles.phaseBadgeChip}>
                          <Text style={styles.phaseBadgeChipText}>⭐ {badgeNum}</Text>
                        </View>
                      )}
                      <Ionicons name="chevron-forward" size={16} color="#4A7C6F" />
                    </View>
                    <Text style={styles.devCardTitle}>{currentPhase?.title ?? "Entwicklung ansehen"}</Text>
                    <Text style={styles.devCardSummary} numberOfLines={2}>
                      {currentPhase?.summary ?? "Öffne den Entwicklungsbereich für dein Kind."}
                    </Text>
                    <View style={styles.devCardFooter}>
                      <View style={styles.devCardProgressPill}>
                        <Text style={styles.devCardProgressText}>
                          {achieved} von {totalRelevant} Meilensteinen erreicht
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                </>
              );
            })()}

            {/* ── 2. Chats ── */}
            <View style={[styles.sectionHeader, { marginTop: 8 }]}>
              <Text style={styles.sectionTitle}>💬 Gespräche</Text>
              <TouchableOpacity style={styles.newChatPill} onPress={startNewChat}>
                <Ionicons name="add" size={15} color="#4A7C6F" />
                <Text style={styles.newChatPillText}>Neu</Text>
              </TouchableOpacity>
            </View>

            {sessions.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>Noch keine Gespräche — starte das erste!</Text>
              </View>
            ) : (
              <>
                {visibleSessions.map((item) => (
                  <Swipeable
                    key={item.id}
                    renderRightActions={() => (
                      <TouchableOpacity
                        style={styles.deleteAction}
                        onPress={() =>
                          Alert.alert("Gespräch löschen?", "Alle Nachrichten dieses Gesprächs werden entfernt.", [
                            { text: "Abbrechen", style: "cancel" },
                            { text: "Löschen", style: "destructive", onPress: () => removeSession(item.id) },
                          ])
                        }
                      >
                        <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
                      </TouchableOpacity>
                    )}
                  >
                    <TouchableOpacity
                      style={styles.chatCard}
                      onPress={() => router.push(`/chat/${item.id}?babyId=${id}`)}
                    >
                      <View style={styles.chatCardIcon}>
                        <Ionicons name="chatbubbles-outline" size={20} color="#4A7C6F" />
                      </View>
                      <View style={styles.chatCardInfo}>
                        <Text style={styles.chatCardDate}>{formatDay(item.updatedAt.slice(0, 10))}</Text>
                        <Text style={styles.chatCardPreview} numberOfLines={1}>{item.preview}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#B0A89A" />
                    </TouchableOpacity>
                  </Swipeable>
                ))}
                {sessions.length > 3 && (
                  <TouchableOpacity
                    style={styles.showMoreBtn}
                    onPress={() => setShowAllChats((v) => !v)}
                  >
                    <Text style={styles.showMoreText}>
                      {showAllChats ? "Weniger anzeigen" : `Alle ${sessions.length} Gespräche anzeigen`}
                    </Text>
                    <Ionicons name={showAllChats ? "chevron-up" : "chevron-down"} size={14} color="#4A7C6F" />
                  </TouchableOpacity>
                )}
              </>
            )}

            {/* ── 3. Tracker ── */}
            <View style={[styles.sectionHeader, { marginTop: 24 }]}>
              <Text style={styles.sectionTitle}>📊 Tracker</Text>
            </View>

            <TouchableOpacity
              style={[styles.toolBtn, { borderColor: "#C5DDD8" }]}
              onPress={() => router.push(`/profile/weight/${profile.id}`)}
              activeOpacity={0.85}
            >
              <View style={[styles.toolBtnIcon, { backgroundColor: "#EAF2EF" }]}>
                <Text style={{ fontSize: 18 }}>📈</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.toolBtnTitle}>Gewichtsverlauf</Text>
                <Text style={styles.toolBtnSub}>
                  {profile.weightGrams ? `Geburtsgewicht: ${profile.weightGrams} g` : "Wachstum & WHO-Kurven"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#4A7C6F" />
            </TouchableOpacity>

            {/* ── 4. Still & Schlaf Tracker ── */}
            <TouchableOpacity
              style={[styles.toolBtn, { borderColor: "#DEC8F0" }]}
              onPress={() => router.push(`/profile/tracker/${profile.id}`)}
              activeOpacity={0.85}
            >
              <View style={[styles.toolBtnIcon, { backgroundColor: "#EEE0F8" }]}>
                <Text style={{ fontSize: 18 }}>🤱</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.toolBtnTitle}>Still & Schlaf Tracker</Text>
                <Text style={styles.toolBtnSub}>Zeiten aufzeichnen & auswerten</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#9B7BB8" />
            </TouchableOpacity>

            {/* ── 5. Für Mia ── */}
            {profile.description ? (
              <View style={[styles.descriptionCard, { marginTop: 24 }]}>
                <Text style={styles.descriptionTitle}>💜 Für Mia</Text>
                <Text style={styles.descriptionText}>{profile.description}</Text>
              </View>
            ) : null}

            {/* ── 6. Erinnerungen ── */}
            <View style={[styles.sectionHeader, { marginTop: 24 }]}>
              <Text style={styles.sectionTitle}>🧠 Erinnerungen</Text>
              <TouchableOpacity
                style={styles.newChatPill}
                onPress={() => setShowAddMemory((v) => !v)}
              >
                <Ionicons name={showAddMemory ? "close" : "add"} size={15} color="#4A7C6F" />
                <Text style={styles.newChatPillText}>{showAddMemory ? "Abbrechen" : "Neu"}</Text>
              </TouchableOpacity>
            </View>

            {showAddMemory && (
              <View style={styles.addMemoryForm}>
                <TextInput
                  style={styles.addMemoryInput}
                  placeholder="z. B. Schläft am besten bei Weißem Rauschen"
                  placeholderTextColor="#B0A89A"
                  value={newMemoryText}
                  onChangeText={setNewMemoryText}
                  multiline
                  autoFocus
                />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {(Object.keys(CATEGORY_LABELS) as Memory["category"][]).map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.catChip,
                          { borderColor: CATEGORY_COLORS[cat] },
                          newMemoryCategory === cat && { backgroundColor: CATEGORY_COLORS[cat] },
                        ]}
                        onPress={() => setNewMemoryCategory(cat)}
                      >
                        <Text style={[styles.catChipText, newMemoryCategory === cat && { color: "#FFFFFF" }]}>
                          {CATEGORY_LABELS[cat]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
                <TouchableOpacity
                  style={[styles.saveMemBtn, !newMemoryText.trim() && { opacity: 0.4 }]}
                  onPress={addMemory}
                  disabled={!newMemoryText.trim()}
                >
                  <Text style={styles.saveMemBtnText}>Speichern</Text>
                </TouchableOpacity>
              </View>
            )}

            {memories.length === 0 && !showAddMemory ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>Mia speichert Erinnerungen beim Chatten — oder füge selbst eine hinzu.</Text>
              </View>
            ) : (
              <>
                {visibleMemories.map((item) => (
                  <Swipeable
                    key={item.id}
                    renderRightActions={() => (
                      <TouchableOpacity
                        style={[styles.deleteAction, { marginBottom: 10 }]}
                        onPress={() =>
                          Alert.alert("Löschen?", "Diese Erinnerung wird dauerhaft entfernt.", [
                            { text: "Abbrechen", style: "cancel" },
                            { text: "Löschen", style: "destructive", onPress: () => deleteMemory(item.id) },
                          ])
                        }
                      >
                        <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
                      </TouchableOpacity>
                    )}
                  >
                    <View style={styles.memoryCard}>
                      <View style={[styles.categoryBadge, { backgroundColor: CATEGORY_COLORS[item.category] }]}>
                        <Text style={styles.categoryText}>{CATEGORY_LABELS[item.category]}</Text>
                      </View>
                      <Text style={styles.memoryContent}>{item.content}</Text>
                      <Text style={styles.memoryDate}>
                        {new Date(item.createdAt).toLocaleDateString("de-DE", {
                          day: "2-digit", month: "2-digit", year: "numeric",
                        })}
                      </Text>
                    </View>
                  </Swipeable>
                ))}
                {memories.length > 3 && (
                  <TouchableOpacity
                    style={styles.showMoreBtn}
                    onPress={() => setShowAllMemories((v) => !v)}
                  >
                    <Text style={styles.showMoreText}>
                      {showAllMemories ? "Weniger anzeigen" : `Alle ${memories.length} Erinnerungen anzeigen`}
                    </Text>
                    <Ionicons name={showAllMemories ? "chevron-up" : "chevron-down"} size={14} color="#4A7C6F" />
                  </TouchableOpacity>
                )}
              </>
            )}

            {/* ── 7. Profil-Infos (klappbar) ── */}
            <TouchableOpacity
              style={[styles.sectionHeader, { marginTop: 24 }]}
              onPress={() => setShowInfo((v) => !v)}
              activeOpacity={0.7}
            >
              <Text style={styles.sectionTitle}>📋 Profilinfos</Text>
              <Ionicons name={showInfo ? "chevron-up" : "chevron-down"} size={16} color="#B0A89A" />
            </TouchableOpacity>

            {showInfo && (
              <View style={styles.infoCard}>
                {rows.map((row, i) => (
                  <View key={row.label} style={[styles.infoRow, i < rows.length - 1 && styles.infoRowBorder]}>
                    <Text style={styles.infoLabel}>{row.label}</Text>
                    <Text style={styles.infoValue}>{row.value}</Text>
                  </View>
                ))}
              </View>
            )}

          </ScrollView>

          {/* ── Floating Chat Button ── */}
          <View style={styles.chatBtnWrapper}>
            <TouchableOpacity style={styles.chatBtnLarge} onPress={startNewChat}>
              <Ionicons name="chatbubble-ellipses" size={20} color="#FFFFFF" />
              <Text style={styles.chatBtnLargeText}>Mia zu {profile.name} fragen</Text>
            </TouchableOpacity>
          </View>

        </KeyboardAvoidingView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const SHADOW = {
  shadowColor: "#2D2A26",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.07,
  shadowRadius: 10,
  elevation: 3,
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FDFAF6" },

  // Hero
  hero: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 20,
    backgroundColor: "#FDFAF6",
  },
  backBtn: { position: "absolute", top: 8, left: 16, padding: 4, zIndex: 10 },
  editBtn: { position: "absolute", top: 8, right: 16, padding: 4, zIndex: 10 },
  heroPhoto: { width: 96, height: 96, borderRadius: 48, marginBottom: 12 },
  heroAvatar: {
    width: 96, height: 96, borderRadius: 48,
    alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  heroAvatarText: { fontSize: 40, fontWeight: "800", color: "#FFFFFF" },
  heroName: { fontSize: 26, fontWeight: "800", color: "#2D2A26", letterSpacing: -0.3 },
  heroAge: { fontSize: 14, color: "#7A7269", marginTop: 4 },

  // Scrollable content
  content: { padding: 20, paddingBottom: 110 },

  // Info Card
  infoCard: {
    backgroundColor: "#F0EBE3",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 16,
  },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: "#E5DDD5" },
  infoLabel: { fontSize: 14, color: "#7A7269", fontWeight: "500", flex: 1 },
  infoValue: { fontSize: 14, color: "#2D2A26", fontWeight: "600", flex: 2, textAlign: "right" },

  // Development entry card
  devCard: {
    backgroundColor: "#EAF2EF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: "#C5DDD8",
  },
  devCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  devCardBadge: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  devCardBadgeText: { fontSize: 12, fontWeight: "700", color: "#4A7C6F" },
  devCardTitle: { fontSize: 17, fontWeight: "800", color: "#2D2A26", marginBottom: 6 },
  devCardSummary: { fontSize: 13, color: "#4A6B62", lineHeight: 19, marginBottom: 12 },
  devCardFooter: { flexDirection: "row" },
  devCardProgressPill: {
    backgroundColor: "#4A7C6F",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  devCardProgressText: { fontSize: 12, fontWeight: "700", color: "#FFFFFF" },
  devCardPhaseBadge: {
    flex: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginRight: 4,
  },
  devCardPhaseText: { fontSize: 11, fontWeight: "700" },
  phaseBadgeChip: {
    backgroundColor: "#4A7C6F", borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3,
  },
  phaseBadgeChipText: { fontSize: 11, fontWeight: "800", color: "#FFFFFF" },

  // Description
  descriptionCard: {
    backgroundColor: "#EAF2EF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#C5DDD8",
  },
  descriptionTitle: {
    fontSize: 12, fontWeight: "700", color: "#4A7C6F",
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8,
  },
  descriptionText: { fontSize: 14, color: "#2D2A26", lineHeight: 21 },

  // Tool buttons (Gewicht, Tracker)
  toolBtn: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#FFFFFF", borderRadius: 16,
    padding: 14, marginBottom: 10, gap: 12,
    borderWidth: 1.5,
    shadowColor: "#2D2A26", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
  },
  toolBtnIcon: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: "center", justifyContent: "center",
  },
  toolBtnTitle: { fontSize: 15, fontWeight: "700", color: "#2D2A26" },
  toolBtnSub: { fontSize: 12, color: "#7A7269", marginTop: 2 },

  // Section header
  sectionHeader: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginBottom: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: "#2D2A26", letterSpacing: -0.2 },
  newChatPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#EAF2EF", borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  newChatPillText: { fontSize: 13, fontWeight: "600", color: "#4A7C6F" },

  // Chat cards
  chatCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#F0EBE3", borderRadius: 14,
    padding: 14, gap: 12, marginBottom: 8,
  },
  chatCardIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#EAF2EF", alignItems: "center", justifyContent: "center",
  },
  chatCardInfo: { flex: 1 },
  chatCardDate: { fontSize: 14, fontWeight: "700", color: "#2D2A26" },
  chatCardPreview: { fontSize: 13, color: "#7A7269", marginTop: 2 },

  // Show more
  showMoreBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 10, marginBottom: 4,
  },
  showMoreText: { fontSize: 14, color: "#4A7C6F", fontWeight: "600" },

  // Memory cards
  memoryCard: {
    backgroundColor: "#F0EBE3", borderRadius: 14,
    padding: 14, marginBottom: 10, gap: 6,
  },
  categoryBadge: { alignSelf: "flex-start", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  categoryText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  memoryContent: { fontSize: 14, color: "#2D2A26", lineHeight: 20 },
  memoryDate: { fontSize: 12, color: "#B0A89A" },

  // Add memory form
  addMemoryForm: {
    backgroundColor: "#F0EBE3", borderRadius: 14,
    padding: 14, marginBottom: 12,
  },
  addMemoryInput: {
    backgroundColor: "#FFFFFF", borderRadius: 10,
    padding: 12, fontSize: 15, color: "#2D2A26",
    minHeight: 72, textAlignVertical: "top", marginBottom: 12,
  },
  catChip: { borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  catChipText: { fontSize: 13, fontWeight: "600", color: "#7A7269" },
  saveMemBtn: {
    paddingVertical: 12, borderRadius: 10,
    backgroundColor: "#4A7C6F", alignItems: "center",
  },
  saveMemBtnText: { color: "#FFFFFF", fontWeight: "700" },

  // Delete action
  deleteAction: {
    backgroundColor: "#C0392B", width: 70, borderRadius: 14,
    marginLeft: 8, marginBottom: 8,
    alignItems: "center", justifyContent: "center",
  },

  // Empty state
  emptyCard: {
    backgroundColor: "#F0EBE3", borderRadius: 14,
    padding: 16, marginBottom: 8, alignItems: "center",
  },
  emptyText: { fontSize: 14, color: "#7A7269", textAlign: "center", lineHeight: 20 },

  // Floating chat button
  chatBtnWrapper: {
    position: "absolute", bottom: 24, left: 20, right: 20,
  },
  chatBtnLarge: {
    backgroundColor: "#4A7C6F", borderRadius: 16, paddingVertical: 17,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10,
    shadowColor: "#4A7C6F", shadowOpacity: 0.3, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  chatBtnLargeText: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },
});
