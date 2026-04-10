import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ParentProfile } from "../../types";
import { loadParentProfiles, saveParentProfiles } from "../../utils/storage";

const ROLES: { label: string; value: ParentProfile["role"]; icon: string }[] = [
  { label: "Mutter", value: "Mutter", icon: "👩" },
  { label: "Vater", value: "Vater", icon: "👨" },
  { label: "Andere", value: "andere", icon: "🧑" },
];

export default function NewParentProfileScreen() {
  const [name, setName] = useState("");
  const [role, setRole] = useState<ParentProfile["role"]>("Mutter");
  const [description, setDescription] = useState("");

  async function handleSave() {
    if (!name.trim()) return;
    const profile: ParentProfile = {
      id: Date.now().toString(),
      name: name.trim(),
      role,
      createdAt: new Date().toISOString(),
      ...(description.trim() ? { description: description.trim() } : {}),
    };
    const existing = await loadParentProfiles();
    await saveParentProfiles([...existing, profile]);
    router.back();
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#4A7C6F" />
          </TouchableOpacity>
          <Text style={styles.title}>Elternteil anlegen</Text>
          <View style={{ width: 40 }} />
        </View>

        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          placeholder="z. B. Sarah"
          placeholderTextColor="#B0A89A"
          value={name}
          onChangeText={setName}
          autoFocus
        />

        <Text style={styles.label}>Rolle</Text>
        <View style={styles.roleRow}>
          {ROLES.map((r) => (
            <TouchableOpacity
              key={r.value}
              style={[styles.roleBtn, role === r.value && styles.roleBtnActive]}
              onPress={() => setRole(r.value)}
            >
              <Text style={styles.roleIcon}>{r.icon}</Text>
              <Text style={[styles.roleLabel, role === r.value && styles.roleLabelActive]}>
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Beschreibung für Mia */}
        <Text style={styles.label}>Für Mia — freie Beschreibung</Text>
        <Text style={styles.fieldHint}>
          Was soll Mia über dich wissen? Z. B. wie es dir gerade geht, deine größten Sorgen oder was dir besonders wichtig ist.
        </Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          placeholder={"z. B. Bin gerade sehr müde und etwas überfordert. Mache mir oft Sorgen, ob ich alles richtig mache."}
          placeholderTextColor="#B0A89A"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
        />

        <TouchableOpacity
          style={[styles.saveBtn, !name.trim() && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!name.trim()}
        >
          <Text style={styles.saveBtnText}>Speichern</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FDFAF6" },
  content: { padding: 24, paddingBottom: 48 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 32,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: "700", color: "#2D2A26" },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#7A7269",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  input: {
    backgroundColor: "#F0EBE3",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#2D2A26",
    marginBottom: 28,
  },
  inputMultiline: {
    height: 110,
    textAlignVertical: "top",
    paddingTop: 14,
    marginBottom: 24,
  },
  fieldHint: {
    fontSize: 13,
    color: "#7A7269",
    marginBottom: 10,
    marginTop: -4,
    lineHeight: 18,
  },
  roleRow: { flexDirection: "row", gap: 12, marginBottom: 32 },
  roleBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#F0EBE3",
    gap: 6,
  },
  roleBtnActive: { backgroundColor: "#4A7C6F" },
  roleIcon: { fontSize: 28 },
  roleLabel: { fontSize: 14, fontWeight: "600", color: "#7A7269" },
  roleLabelActive: { color: "#FFFFFF" },
  saveBtn: {
    backgroundColor: "#4A7C6F",
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: "center",
    marginTop: 8,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },
});
