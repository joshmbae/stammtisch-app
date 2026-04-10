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
import { ParentProfile, Memory } from "../../../types";
import {
  loadParentProfiles,
  saveParentProfiles,
  loadMemories,
  saveMemories,
  deleteParentProfile,
} from "../../../utils/storage";

const CATEGORY_LABELS: Partial<Record<Memory["category"], string>> = {
  mood: "Stimmung",
  health: "Gesundheit",
  general: "Allgemein",
};

const CATEGORY_COLORS: Partial<Record<Memory["category"], string>> = {
  mood: "#D4856A",
  health: "#7B9EC8",
  general: "#C8A96E",
};

const ROLES: { label: string; value: ParentProfile["role"]; icon: string }[] = [
  { label: "Mutter", value: "Mutter", icon: "👩" },
  { label: "Vater", value: "Vater", icon: "👨" },
  { label: "Andere", value: "andere", icon: "🧑" },
];

type Tab = "info" | "memory";

export default function ParentProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<ParentProfile | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("info");
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<ParentProfile["role"]>("Mutter");
  const [editDescription, setEditDescription] = useState("");

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const parents = await loadParentProfiles();
        const found = parents.find((p) => p.id === id) ?? null;
        setProfile(found);
        if (found) {
          setEditName(found.name);
          setEditRole(found.role);
          setEditDescription(found.description ?? "");
        }
        const mems = await loadMemories(id);
        setMemories(mems);
      }
      load();
    }, [id])
  );

  async function handleSave() {
    if (!editName.trim() || !profile) return;
    const parents = await loadParentProfiles();
    const updated = parents.map((p) =>
      p.id === id
        ? {
            ...p,
            name: editName.trim(),
            role: editRole,
            description: editDescription.trim() || undefined,
          }
        : p
    );
    await saveParentProfiles(updated);
    setProfile((prev) =>
      prev
        ? { ...prev, name: editName.trim(), role: editRole, description: editDescription.trim() || undefined }
        : prev
    );
    setEditing(false);
  }

  function handleDelete() {
    Alert.alert(
      "Profil löschen?",
      "Alle Erinnerungen dieses Elternteils werden dauerhaft gelöscht.",
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Löschen",
          style: "destructive",
          onPress: async () => {
            await deleteParentProfile(id);
            router.replace("/(tabs)/home");
          },
        },
      ]
    );
  }

  async function deleteMemory(memId: string) {
    const updated = memories.filter((m) => m.id !== memId);
    setMemories(updated);
    await saveMemories(id, updated);
  }

  if (!profile) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.safe} edges={["top"]}>

        {/* Hero */}
        <View style={styles.hero}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#4A7C6F" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.editBtn} onPress={() => setEditing((v) => !v)}>
            <Ionicons name={editing ? "close" : "create-outline"} size={22} color="#4A7C6F" />
          </TouchableOpacity>
          <View style={styles.heroAvatar}>
            <Text style={styles.heroAvatarText}>{profile.name.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.heroName}>{profile.name}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{profile.role}</Text>
          </View>
        </View>

        {/* Tab Bar */}
        <View style={styles.tabBar}>
          {(["info", "memory"] as Tab[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabBtnText, activeTab === tab && styles.tabBtnTextActive]}>
                {tab === "info" ? "Info" : "Gedächtnis"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Info Tab */}
        {activeTab === "info" && (
          <ScrollView contentContainerStyle={styles.infoContent}>
            {editing ? (
              <View>
                <Text style={styles.label}>Name</Text>
                <TextInput
                  style={styles.input}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Name"
                  placeholderTextColor="#B0A89A"
                />

                <Text style={styles.label}>Rolle</Text>
                <View style={styles.roleRow}>
                  {ROLES.map((r) => (
                    <TouchableOpacity
                      key={r.value}
                      style={[styles.roleBtn, editRole === r.value && styles.roleBtnActive]}
                      onPress={() => setEditRole(r.value)}
                    >
                      <Text style={styles.roleIcon}>{r.icon}</Text>
                      <Text style={[styles.roleBtnText, editRole === r.value && styles.roleBtnTextActive]}>
                        {r.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>Für Mia — freie Beschreibung</Text>
                <Text style={styles.fieldHint}>
                  Was soll Mia über dich wissen?
                </Text>
                <TextInput
                  style={[styles.input, styles.inputMultiline]}
                  placeholder="z. B. Bin gerade sehr müde und etwas überfordert..."
                  placeholderTextColor="#B0A89A"
                  value={editDescription}
                  onChangeText={setEditDescription}
                  multiline
                  numberOfLines={4}
                />

                <TouchableOpacity
                  style={[styles.saveBtn, !editName.trim() && { opacity: 0.4 }]}
                  onPress={handleSave}
                  disabled={!editName.trim()}
                >
                  <Text style={styles.saveBtnText}>Speichern</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
                  <Text style={styles.deleteBtnText}>Profil löschen</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <View style={styles.infoCard}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Rolle</Text>
                    <Text style={styles.infoValue}>{profile.role}</Text>
                  </View>
                </View>
                {profile.description ? (
                  <View style={styles.descriptionCard}>
                    <Text style={styles.descriptionTitle}>Für Mia</Text>
                    <Text style={styles.descriptionText}>{profile.description}</Text>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.addDescBtn} onPress={() => setEditing(true)}>
                    <Ionicons name="add-circle-outline" size={18} color="#4A7C6F" />
                    <Text style={styles.addDescBtnText}>Beschreibung für Mia hinzufügen</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </ScrollView>
        )}

        {/* Memory Tab */}
        {activeTab === "memory" && (
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <FlatList
              data={memories}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.memoryList}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>🧠</Text>
                  <Text style={styles.emptyText}>
                    Noch keine Erinnerungen.{"\n"}Mia speichert sie beim Chatten.
                  </Text>
                </View>
              }
              renderItem={({ item }) => (
                <Swipeable
                  renderRightActions={() => (
                    <TouchableOpacity
                      style={styles.deleteAction}
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
                    <View style={[
                      styles.categoryBadge,
                      { backgroundColor: CATEGORY_COLORS[item.category] ?? "#C8A96E" },
                    ]}>
                      <Text style={styles.categoryText}>
                        {CATEGORY_LABELS[item.category] ?? item.category}
                      </Text>
                    </View>
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

      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FDFAF6" },

  hero: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 20,
    backgroundColor: "#FDFAF6",
  },
  backBtn: { position: "absolute", top: 8, left: 16, padding: 4, zIndex: 10 },
  editBtn: { position: "absolute", top: 8, right: 16, padding: 4, zIndex: 10 },
  heroAvatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "#C8A96E",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  heroAvatarText: { fontSize: 34, fontWeight: "800", color: "#FFFFFF" },
  heroName: { fontSize: 26, fontWeight: "800", color: "#2D2A26", letterSpacing: -0.3 },
  roleBadge: {
    marginTop: 6,
    backgroundColor: "#EAF2EF",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  roleBadgeText: { fontSize: 13, fontWeight: "600", color: "#4A7C6F" },

  tabBar: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 4,
    backgroundColor: "#F0EBE3",
    borderRadius: 12,
    padding: 4,
  },
  tabBtn: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: "center" },
  tabBtnActive: { backgroundColor: "#FFFFFF", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  tabBtnText: { fontSize: 13, fontWeight: "600", color: "#7A7269" },
  tabBtnTextActive: { color: "#2D2A26" },

  infoContent: { padding: 20, paddingBottom: 40 },
  infoCard: { backgroundColor: "#F0EBE3", borderRadius: 16, overflow: "hidden", marginBottom: 16 },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  infoLabel: { fontSize: 14, color: "#7A7269", fontWeight: "500" },
  infoValue: { fontSize: 14, color: "#2D2A26", fontWeight: "600" },

  descriptionCard: {
    backgroundColor: "#EAF2EF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#C5DDD8",
  },
  descriptionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4A7C6F",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  descriptionText: { fontSize: 14, color: "#2D2A26", lineHeight: 21 },

  addDescBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: "#C5DDD8",
    borderStyle: "dashed",
    borderRadius: 14,
  },
  addDescBtnText: { color: "#4A7C6F", fontSize: 15, fontWeight: "600" },

  label: {
    fontSize: 13, fontWeight: "700", color: "#7A7269",
    letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 10,
  },
  fieldHint: { fontSize: 13, color: "#7A7269", marginBottom: 10, marginTop: -4, lineHeight: 18 },
  input: {
    backgroundColor: "#F0EBE3", borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: "#2D2A26", marginBottom: 24,
  },
  inputMultiline: { height: 110, textAlignVertical: "top", paddingTop: 14 },
  roleRow: { flexDirection: "row", gap: 12, marginBottom: 28 },
  roleBtn: {
    flex: 1, alignItems: "center", paddingVertical: 14,
    borderRadius: 14, backgroundColor: "#F0EBE3", gap: 6,
  },
  roleBtnActive: { backgroundColor: "#4A7C6F" },
  roleIcon: { fontSize: 24 },
  roleBtnText: { fontSize: 13, fontWeight: "600", color: "#7A7269" },
  roleBtnTextActive: { color: "#FFFFFF" },
  saveBtn: {
    backgroundColor: "#4A7C6F", borderRadius: 14,
    paddingVertical: 17, alignItems: "center", marginTop: 8,
  },
  saveBtnText: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },
  deleteBtn: {
    marginTop: 16,
    paddingVertical: 16,
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#C0392B",
  },
  deleteBtnText: { color: "#C0392B", fontSize: 16, fontWeight: "600" },

  memoryList: { padding: 20, paddingBottom: 40 },
  memoryCard: {
    backgroundColor: "#F0EBE3", borderRadius: 14,
    padding: 14, marginBottom: 10, gap: 6,
  },
  categoryBadge: { alignSelf: "flex-start", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  categoryText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  memoryContent: { fontSize: 14, color: "#2D2A26", lineHeight: 20 },
  memoryDate: { fontSize: 12, color: "#B0A89A" },
  deleteAction: {
    backgroundColor: "#C0392B", width: 70, borderRadius: 14,
    marginLeft: 8, marginBottom: 10, alignItems: "center", justifyContent: "center",
  },
  emptyState: { alignItems: "center", padding: 48, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 15, color: "#7A7269", textAlign: "center", lineHeight: 22 },
});
