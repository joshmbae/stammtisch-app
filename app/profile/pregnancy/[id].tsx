import { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Swipeable from "react-native-gesture-handler/Swipeable";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import DateTimePicker from "@react-native-community/datetimepicker";
import { PregnancyProfile, Memory } from "../../../types";
import {
  loadPregnancyProfiles,
  savePregnancyProfiles,
  deletePregnancyProfile,
  loadMemories,
  saveMemories,
  loadSessions,
  createSession,
  deleteSession,
} from "../../../utils/storage";
import { ChatSession } from "../../../types";

const AVATAR_COLORS = ["#9B7BB8", "#D4856A", "#4A7C6F", "#7B9EC8", "#C8A96E"];

function calcWeeks(dueDateISO: string): number {
  const daysUntilDue = Math.floor(
    (new Date(dueDateISO).getTime() - Date.now()) / 86400000
  );
  const daysPregnant = 280 - daysUntilDue;
  return Math.max(0, Math.min(42, Math.floor(daysPregnant / 7)));
}

function calcDaysLeft(dueDateISO: string): number {
  return Math.max(0, Math.floor((new Date(dueDateISO).getTime() - Date.now()) / 86400000));
}

type Tab = "info" | "chats" | "memory";

export default function PregnancyProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<PregnancyProfile | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("info");
  const [editing, setEditing] = useState(false);
  const [editNickname, setEditNickname] = useState("");
  const [editDueDate, setEditDueDate] = useState(new Date());
  const [editDescription, setEditDescription] = useState("");
  const [editAvatarColor, setEditAvatarColor] = useState(AVATAR_COLORS[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAddMemory, setShowAddMemory] = useState(false);
  const [newMemoryText, setNewMemoryText] = useState("");

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const profiles = await loadPregnancyProfiles();
        const found = profiles.find((p) => p.id === id) ?? null;
        setProfile(found);
        setLoaded(true);
        if (!found) {
          router.replace("/(tabs)/home");
          return;
        }
        if (found) {
          setEditNickname(found.nickname);
          setEditDueDate(new Date(found.dueDate));
          setEditDescription(found.description ?? "");
          setEditAvatarColor(found.avatarColor);
        }
        const sess = await loadSessions(id);
        setSessions(sess);
        const mems = await loadMemories(id);
        setMemories(mems);
      }
      load();
    }, [id])
  );

  async function handleSave() {
    if (!profile) return;
    const profiles = await loadPregnancyProfiles();
    const updated = profiles.map((p) =>
      p.id === id
        ? {
            ...p,
            nickname: editNickname.trim() || "Mein Baby",
            dueDate: editDueDate.toISOString(),
            avatarColor: editAvatarColor,
            description: editDescription.trim() || undefined,
          }
        : p
    );
    await savePregnancyProfiles(updated);
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            nickname: editNickname.trim() || "Mein Baby",
            dueDate: editDueDate.toISOString(),
            avatarColor: editAvatarColor,
            description: editDescription.trim() || undefined,
          }
        : prev
    );
    setEditing(false);
  }

  function handleDelete() {
    Alert.alert(
      "Schwangerschaft löschen?",
      "Alle Chats und Erinnerungen werden dauerhaft gelöscht.",
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Löschen",
          style: "destructive",
          onPress: async () => {
            await deletePregnancyProfile(id);
            router.replace("/(tabs)/home");
          },
        },
      ]
    );
  }

  async function startNewChat() {
    const session = await createSession(id);
    setSessions((prev) => [session, ...prev]);
    router.push(`/chat/${session.id}?pregnancyId=${id}`);
  }

  async function removeSession(sessionId: string) {
    await deleteSession(id, sessionId);
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
  }

  async function addMemory() {
    if (!newMemoryText.trim()) return;
    const mem: Memory = {
      id: Date.now().toString(),
      babyId: id,
      content: newMemoryText.trim(),
      category: "general",
      createdAt: new Date().toISOString(),
    };
    const updated = [...memories, mem];
    setMemories(updated);
    await saveMemories(id, updated);
    setNewMemoryText("");
    setShowAddMemory(false);
  }

  async function deleteMemory(memId: string) {
    const updated = memories.filter((m) => m.id !== memId);
    setMemories(updated);
    await saveMemories(id, updated);
  }

  if (!profile) return null;

  const weeks = calcWeeks(profile.dueDate);
  const daysLeft = calcDaysLeft(profile.dueDate);
  const formattedDue = new Date(profile.dueDate).toLocaleDateString("de-DE", {
    day: "2-digit", month: "long", year: "numeric",
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.safe} edges={["top"]}>

        {/* Hero */}
        <View style={styles.hero}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#9B7BB8" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.editBtn} onPress={() => setEditing((v) => !v)}>
            <Ionicons name={editing ? "close" : "create-outline"} size={22} color="#9B7BB8" />
          </TouchableOpacity>
          <View style={[styles.heroAvatar, { backgroundColor: profile.avatarColor }]}>
            <Text style={styles.heroEmoji}>🤰</Text>
          </View>
          <Text style={styles.heroName}>{profile.nickname}</Text>
          <View style={styles.progressRow}>
            <View style={styles.weeksBadge}>
              <Text style={styles.weeksBadgeText}>SSW {weeks}</Text>
            </View>
            <Text style={styles.daysLeft}>
              {daysLeft > 0 ? `noch ${daysLeft} Tage` : "Geburtstermin erreicht 🎉"}
            </Text>
          </View>
        </View>

        {/* Tab Bar */}
        <View style={styles.tabBar}>
          {(["info", "chats", "memory"] as Tab[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabBtnText, activeTab === tab && styles.tabBtnTextActive]}>
                {tab === "info" ? "Info" : tab === "chats" ? "Chats" : "Notizen"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Info Tab */}
        {activeTab === "info" && (
          <ScrollView contentContainerStyle={styles.infoContent}>
            {editing ? (
              <View>
                <Text style={styles.label}>Spitzname</Text>
                <TextInput
                  style={styles.input}
                  value={editNickname}
                  onChangeText={setEditNickname}
                  placeholder="z. B. Erdnuss"
                  placeholderTextColor="#B0A89A"
                />

                <Text style={styles.label}>Errechneter Geburtstermin</Text>
                <TouchableOpacity style={styles.dateTrigger} onPress={() => setShowDatePicker(true)}>
                  <Ionicons name="calendar-outline" size={18} color="#9B7BB8" />
                  <Text style={styles.dateTriggerText}>
                    {editDueDate.toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}
                  </Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={editDueDate}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={(_, date) => {
                      setShowDatePicker(Platform.OS === "ios");
                      if (date) setEditDueDate(date);
                    }}
                  />
                )}
                {Platform.OS === "ios" && showDatePicker && (
                  <TouchableOpacity onPress={() => setShowDatePicker(false)} style={styles.dateConfirmBtn}>
                    <Text style={styles.dateConfirmText}>Fertig</Text>
                  </TouchableOpacity>
                )}

                <Text style={styles.label}>Avatar-Farbe</Text>
                <View style={styles.colorRow}>
                  {AVATAR_COLORS.map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorCircle,
                        { backgroundColor: color },
                        editAvatarColor === color && styles.colorCircleSelected,
                      ]}
                      onPress={() => setEditAvatarColor(color)}
                    />
                  ))}
                </View>

                <Text style={styles.label}>Für Mia — freie Beschreibung</Text>
                <TextInput
                  style={[styles.input, styles.inputMultiline]}
                  placeholder="z. B. Erste Schwangerschaft, leichte Übelkeit..."
                  placeholderTextColor="#B0A89A"
                  value={editDescription}
                  onChangeText={setEditDescription}
                  multiline
                  numberOfLines={4}
                />

                <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                  <Text style={styles.saveBtnText}>Speichern</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
                  <Text style={styles.deleteBtnText}>Schwangerschaft löschen</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                {/* ── Entwicklungs-Einstieg ── */}
                <TouchableOpacity
                  style={styles.devCard}
                  onPress={() => router.push(`/profile/pregnancy-development/${id}`)}
                  activeOpacity={0.85}
                >
                  <View style={styles.devCardTop}>
                    <View style={styles.devCardBadge}>
                      <Text style={styles.devCardBadgeText}>🧬 SSW {weeks}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#9B7BB8" />
                  </View>
                  <Text style={styles.devCardTitle}>Entwicklung diese Woche</Text>
                  <Text style={styles.devCardSub}>Baby, Körper, Warnzeichen & To-Dos</Text>
                </TouchableOpacity>

                <View style={styles.infoCard}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Geburtstermin</Text>
                    <Text style={styles.infoValue}>{formattedDue}</Text>
                  </View>
                  <View style={[styles.infoRow, styles.infoRowBorder]}>
                    <Text style={styles.infoLabel}>Schwangerschaftswoche</Text>
                    <Text style={styles.infoValue}>SSW {weeks}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Noch bis Termin</Text>
                    <Text style={styles.infoValue}>{daysLeft > 0 ? `${daysLeft} Tage` : "Termin erreicht"}</Text>
                  </View>
                </View>

                {profile.description ? (
                  <View style={styles.descriptionCard}>
                    <Text style={styles.descriptionTitle}>Für Mia</Text>
                    <Text style={styles.descriptionText}>{profile.description}</Text>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.addDescBtn} onPress={() => setEditing(true)}>
                    <Ionicons name="add-circle-outline" size={18} color="#9B7BB8" />
                    <Text style={styles.addDescBtnText}>Beschreibung für Mia hinzufügen</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </ScrollView>
        )}

        {/* Chats Tab */}
        {activeTab === "chats" && (
          <View style={{ flex: 1 }}>
            <FlatList
              data={sessions}
              keyExtractor={(item) => item.id}
              style={{ flex: 1 }}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>💬</Text>
                  <Text style={styles.emptyText}>Noch keine Gespräche.{"\n"}Starte das erste!</Text>
                </View>
              }
              ListFooterComponent={
                <TouchableOpacity style={styles.newChatBtn} onPress={startNewChat}>
                  <Ionicons name="add-circle-outline" size={18} color="#9B7BB8" />
                  <Text style={[styles.newChatBtnText, { color: "#9B7BB8" }]}>Neues Gespräch</Text>
                </TouchableOpacity>
              }
              renderItem={({ item }) => (
                <Swipeable
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
                    style={styles.sessionCard}
                    onPress={() => router.push(`/chat/${item.id}?pregnancyId=${id}`)}
                  >
                    <View style={[styles.sessionIcon, { backgroundColor: "#F0EAF7" }]}>
                      <Ionicons name="chatbubbles-outline" size={20} color="#9B7BB8" />
                    </View>
                    <View style={styles.sessionInfo}>
                      <Text style={styles.sessionDate}>
                        {new Date(item.updatedAt).toLocaleDateString("de-DE", {
                          day: "2-digit", month: "long",
                        })}
                      </Text>
                      <Text style={styles.sessionPreview} numberOfLines={1}>{item.preview}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#B0A89A" />
                  </TouchableOpacity>
                </Swipeable>
              )}
            />
          </View>
        )}

        {/* Memory/Notizen Tab */}
        {activeTab === "memory" && (
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <FlatList
              data={memories}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>📝</Text>
                  <Text style={styles.emptyText}>
                    Noch keine Notizen.{"\n"}Mia speichert sie beim Chatten — oder füge selbst eine hinzu.
                  </Text>
                </View>
              }
              ListFooterComponent={
                <View style={{ marginTop: 8 }}>
                  {showAddMemory ? (
                    <View style={styles.addMemoryForm}>
                      <TextInput
                        style={styles.addMemoryInput}
                        placeholder="z. B. Übelkeit morgens lässt nach"
                        placeholderTextColor="#B0A89A"
                        value={newMemoryText}
                        onChangeText={setNewMemoryText}
                        multiline
                        autoFocus
                      />
                      <View style={styles.addMemoryBtns}>
                        <TouchableOpacity
                          style={styles.cancelBtn}
                          onPress={() => setShowAddMemory(false)}
                        >
                          <Text style={styles.cancelBtnText}>Abbrechen</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.saveMemBtn, !newMemoryText.trim() && { opacity: 0.4 }]}
                          onPress={addMemory}
                          disabled={!newMemoryText.trim()}
                        >
                          <Text style={styles.saveMemBtnText}>Speichern</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.newChatBtn, { borderColor: "#C5ADE0" }]}
                      onPress={() => setShowAddMemory(true)}
                    >
                      <Ionicons name="add-circle-outline" size={18} color="#9B7BB8" />
                      <Text style={[styles.newChatBtnText, { color: "#9B7BB8" }]}>Notiz hinzufügen</Text>
                    </TouchableOpacity>
                  )}
                </View>
              }
              renderItem={({ item }) => (
                <Swipeable
                  renderRightActions={() => (
                    <TouchableOpacity
                      style={styles.deleteAction}
                      onPress={() =>
                        Alert.alert("Löschen?", "Diese Notiz wird dauerhaft entfernt.", [
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
                    <Text style={styles.memoryContent}>{item.content}</Text>
                    <Text style={styles.memoryDate}>
                      {new Date(item.createdAt).toLocaleDateString("de-DE", {
                        day: "2-digit", month: "2-digit", year: "numeric",
                      })}
                    </Text>
                  </View>
                </Swipeable>
              )}
            />
          </KeyboardAvoidingView>
        )}

        {/* Bottom buttons (only on info tab, not editing) */}
        {activeTab === "info" && !editing && (
          <View style={styles.chatBtnWrapper}>
            <TouchableOpacity
              style={styles.babyIsDaBtn}
              onPress={() => router.push(`/profile/pregnancy-convert/${id}`)}
            >
              <Text style={styles.babyIsDaBtnText}>🎉 Baby ist da!</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.chatBtnLarge} onPress={startNewChat}>
              <Ionicons name="chatbubble-ellipses" size={20} color="#FFFFFF" />
              <Text style={styles.chatBtnLargeText}>Mia fragen</Text>
            </TouchableOpacity>
          </View>
        )}

      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FDFAF6" },

  // Development entry card
  devCard: {
    backgroundColor: "#F5EEF9",
    borderRadius: 18, padding: 16, marginBottom: 12,
    borderWidth: 1.5, borderColor: "#DEC8F0",
  },
  devCardTop: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 8,
  },
  devCardBadge: {
    backgroundColor: "#FFFFFF", borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  devCardBadgeText: { fontSize: 12, fontWeight: "700", color: "#9B7BB8" },
  devCardTitle: { fontSize: 17, fontWeight: "800", color: "#2D2A26", marginBottom: 4 },
  devCardSub: { fontSize: 13, color: "#7B5B9A" },

  hero: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 20,
    backgroundColor: "#FDFAF6",
  },
  backBtn: { position: "absolute", top: 8, left: 16, padding: 4, zIndex: 10 },
  editBtn: { position: "absolute", top: 8, right: 16, padding: 4, zIndex: 10 },
  heroAvatar: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: "center", justifyContent: "center", marginBottom: 10,
  },
  heroEmoji: { fontSize: 40 },
  heroName: { fontSize: 24, fontWeight: "800", color: "#2D2A26", letterSpacing: -0.3 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 },
  weeksBadge: {
    backgroundColor: "#9B7BB8", borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 4,
  },
  weeksBadgeText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  daysLeft: { fontSize: 13, color: "#7A7269" },

  tabBar: {
    flexDirection: "row",
    marginHorizontal: 20, marginBottom: 4,
    backgroundColor: "#F0EBE3", borderRadius: 12, padding: 4,
  },
  tabBtn: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: "center" },
  tabBtnActive: { backgroundColor: "#FFFFFF", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  tabBtnText: { fontSize: 13, fontWeight: "600", color: "#7A7269" },
  tabBtnTextActive: { color: "#2D2A26" },

  infoContent: { padding: 20, paddingBottom: 120 },
  listContent: { padding: 20, gap: 10, paddingBottom: 40 },

  infoCard: { backgroundColor: "#F0EBE3", borderRadius: 16, overflow: "hidden", marginBottom: 16 },
  infoRow: {
    flexDirection: "row", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14,
  },
  infoRowBorder: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#E5DDD5" },
  infoLabel: { fontSize: 14, color: "#7A7269", fontWeight: "500" },
  infoValue: { fontSize: 14, color: "#2D2A26", fontWeight: "600" },

  descriptionCard: {
    backgroundColor: "#F0EAF7", borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: "#C5ADE0",
  },
  descriptionTitle: {
    fontSize: 12, fontWeight: "700", color: "#9B7BB8",
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8,
  },
  descriptionText: { fontSize: 14, color: "#2D2A26", lineHeight: 21 },
  addDescBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 14, borderWidth: 1.5, borderColor: "#C5ADE0",
    borderStyle: "dashed", borderRadius: 14,
  },
  addDescBtnText: { color: "#9B7BB8", fontSize: 15, fontWeight: "600" },

  label: {
    fontSize: 13, fontWeight: "700", color: "#7A7269",
    letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 10,
  },
  input: {
    backgroundColor: "#F0EBE3", borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: "#2D2A26", marginBottom: 24,
  },
  inputMultiline: { height: 110, textAlignVertical: "top", paddingTop: 14 },
  dateTrigger: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#F0EBE3", borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, marginBottom: 24,
  },
  dateTriggerText: { fontSize: 16, color: "#2D2A26", flex: 1 },
  dateConfirmBtn: { alignSelf: "flex-end", paddingVertical: 6, paddingHorizontal: 16, marginBottom: 16 },
  dateConfirmText: { color: "#9B7BB8", fontWeight: "700", fontSize: 15 },
  colorRow: { flexDirection: "row", gap: 12, marginBottom: 28 },
  colorCircle: { width: 36, height: 36, borderRadius: 18 },
  colorCircleSelected: { borderWidth: 3, borderColor: "#2D2A26" },
  saveBtn: {
    backgroundColor: "#9B7BB8", borderRadius: 14,
    paddingVertical: 17, alignItems: "center", marginTop: 8,
  },
  saveBtnText: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },
  deleteBtn: {
    marginTop: 16, paddingVertical: 16, alignItems: "center",
    borderRadius: 14, borderWidth: 1.5, borderColor: "#C0392B",
  },
  deleteBtnText: { color: "#C0392B", fontSize: 16, fontWeight: "600" },

  sessionCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#F0EBE3", borderRadius: 14, padding: 14, gap: 12,
  },
  sessionIcon: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
  },
  sessionInfo: { flex: 1 },
  sessionDate: { fontSize: 14, fontWeight: "700", color: "#2D2A26" },
  sessionPreview: { fontSize: 13, color: "#7A7269", marginTop: 2 },
  newChatBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 14, marginTop: 4,
    borderWidth: 1.5, borderColor: "#C5DDD8", borderStyle: "dashed", borderRadius: 14,
  },
  newChatBtnText: { fontSize: 15, fontWeight: "600" },
  deleteAction: {
    backgroundColor: "#C0392B", width: 70, borderRadius: 14,
    marginLeft: 8, alignItems: "center", justifyContent: "center",
  },

  memoryCard: {
    backgroundColor: "#F0EBE3", borderRadius: 14, padding: 14,
    marginBottom: 0, gap: 6,
  },
  memoryContent: { fontSize: 14, color: "#2D2A26", lineHeight: 20 },
  memoryDate: { fontSize: 12, color: "#B0A89A" },
  addMemoryForm: { backgroundColor: "#F0EBE3", borderRadius: 14, padding: 14 },
  addMemoryInput: {
    backgroundColor: "#FFFFFF", borderRadius: 10, padding: 12,
    fontSize: 15, color: "#2D2A26", minHeight: 72,
    textAlignVertical: "top", marginBottom: 12,
  },
  addMemoryBtns: { flexDirection: "row", gap: 10 },
  cancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    backgroundColor: "#E5DDD5", alignItems: "center",
  },
  cancelBtnText: { color: "#7A7269", fontWeight: "600" },
  saveMemBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    backgroundColor: "#9B7BB8", alignItems: "center",
  },
  saveMemBtnText: { color: "#FFFFFF", fontWeight: "700" },

  chatBtnWrapper: { position: "absolute", bottom: 24, left: 20, right: 20, gap: 10 },
  babyIsDaBtn: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#4A7C6F",
  },
  babyIsDaBtnText: { fontSize: 16, fontWeight: "700", color: "#4A7C6F" },
  chatBtnLarge: {
    backgroundColor: "#9B7BB8", borderRadius: 16, paddingVertical: 17,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    shadowColor: "#9B7BB8", shadowOpacity: 0.3, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  chatBtnLargeText: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },

  emptyState: { alignItems: "center", padding: 48, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 15, color: "#7A7269", textAlign: "center", lineHeight: 22 },
});
