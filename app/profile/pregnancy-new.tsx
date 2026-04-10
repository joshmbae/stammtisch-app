import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { PregnancyProfile } from "../../types";
import { loadPregnancyProfiles, savePregnancyProfiles } from "../../utils/storage";

const AVATAR_COLORS = ["#9B7BB8", "#D4856A", "#4A7C6F", "#7B9EC8", "#C8A96E"];

function calcWeeks(dueDate: Date): number {
  const today = new Date();
  const daysUntilDue = Math.floor((dueDate.getTime() - today.getTime()) / 86400000);
  const daysPregnant = 280 - daysUntilDue;
  return Math.max(0, Math.min(42, Math.floor(daysPregnant / 7)));
}

export default function NewPregnancyScreen() {
  const defaultDue = new Date();
  defaultDue.setDate(defaultDue.getDate() + 140); // ~20 Wochen ab heute

  const [nickname, setNickname] = useState("");
  const [dueDate, setDueDate] = useState(defaultDue);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
  const [description, setDescription] = useState("");

  const weeks = calcWeeks(dueDate);

  const formattedDate = dueDate.toLocaleDateString("de-DE", {
    day: "2-digit", month: "long", year: "numeric",
  });

  async function handleSave() {
    const profile: PregnancyProfile = {
      id: Date.now().toString(),
      nickname: nickname.trim() || "Mein Baby",
      dueDate: dueDate.toISOString(),
      avatarColor,
      createdAt: new Date().toISOString(),
      ...(description.trim() ? { description: description.trim() } : {}),
    };
    const existing = await loadPregnancyProfiles();
    await savePregnancyProfiles([...existing, profile]);
    router.replace("/(tabs)/home");
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#9B7BB8" />
          </TouchableOpacity>
          <Text style={styles.title}>Schwangerschaft</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Avatar */}
        <View style={styles.avatarWrapper}>
          <View style={[styles.avatarCircle, { backgroundColor: avatarColor }]}>
            <Text style={styles.avatarEmoji}>🤰</Text>
          </View>
        </View>
        <Text style={styles.avatarHint}>Wähle eine Farbe</Text>
        <View style={styles.colorRow}>
          {AVATAR_COLORS.map((color) => (
            <TouchableOpacity
              key={color}
              style={[
                styles.colorCircle,
                { backgroundColor: color },
                avatarColor === color && styles.colorCircleSelected,
              ]}
              onPress={() => setAvatarColor(color)}
            />
          ))}
        </View>

        {/* Spitzname */}
        <Text style={styles.label}>Spitzname fürs Baby</Text>
        <TextInput
          style={styles.input}
          placeholder="z. B. Erdnuss, Mein Baby, Sonnenschein"
          placeholderTextColor="#B0A89A"
          value={nickname}
          onChangeText={setNickname}
          autoFocus
        />

        {/* Errechneter Geburtstermin */}
        <Text style={styles.label}>Errechneter Geburtstermin *</Text>
        <TouchableOpacity style={styles.dateTrigger} onPress={() => setShowDatePicker(true)}>
          <Ionicons name="calendar-outline" size={18} color="#9B7BB8" />
          <Text style={styles.dateTriggerText}>{formattedDate}</Text>
          <View style={styles.weeksBadge}>
            <Text style={styles.weeksBadgeText}>SSW {weeks}</Text>
          </View>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={dueDate}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            minimumDate={new Date()}
            maximumDate={(() => { const d = new Date(); d.setDate(d.getDate() + 294); return d; })()}
            onChange={(_, date) => {
              setShowDatePicker(Platform.OS === "ios");
              if (date) setDueDate(date);
            }}
          />
        )}
        {Platform.OS === "ios" && showDatePicker && (
          <TouchableOpacity style={styles.dateConfirmBtn} onPress={() => setShowDatePicker(false)}>
            <Text style={styles.dateConfirmText}>Fertig</Text>
          </TouchableOpacity>
        )}

        {/* Beschreibung für Mia */}
        <Text style={styles.label}>Für Mia — freie Beschreibung</Text>
        <Text style={styles.fieldHint}>
          Was beschäftigt dich gerade? Z. B. Beschwerden, Sorgen, besondere Umstände.
        </Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          placeholder="z. B. Erste Schwangerschaft, leichte Übelkeit im 1. Trimester, Hebamme noch nicht gefunden."
          placeholderTextColor="#B0A89A"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
        />

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>Schwangerschaft anlegen</Text>
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
    marginBottom: 28,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: "700", color: "#2D2A26" },

  avatarWrapper: { alignItems: "center", marginBottom: 10 },
  avatarCircle: {
    width: 90, height: 90, borderRadius: 45,
    alignItems: "center", justifyContent: "center",
  },
  avatarEmoji: { fontSize: 40 },
  avatarHint: { textAlign: "center", color: "#7A7269", fontSize: 13, marginBottom: 14 },
  colorRow: { flexDirection: "row", justifyContent: "center", gap: 12, marginBottom: 32 },
  colorCircle: { width: 36, height: 36, borderRadius: 18 },
  colorCircleSelected: { borderWidth: 3, borderColor: "#2D2A26" },

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

  dateTrigger: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#F0EBE3", borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, marginBottom: 24,
  },
  dateTriggerText: { fontSize: 16, color: "#2D2A26", flex: 1 },
  weeksBadge: {
    backgroundColor: "#9B7BB8", borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  weeksBadgeText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  dateConfirmBtn: { alignSelf: "flex-end", paddingVertical: 6, paddingHorizontal: 16, marginBottom: 16 },
  dateConfirmText: { color: "#9B7BB8", fontWeight: "700", fontSize: 15 },

  saveBtn: {
    backgroundColor: "#9B7BB8", borderRadius: 14,
    paddingVertical: 17, alignItems: "center", marginTop: 8,
  },
  saveBtnText: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },
});
