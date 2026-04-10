import { useState, useEffect } from "react";
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
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { BabyProfile, PregnancyProfile } from "../../../types";
import { loadPregnancyProfiles, migratePregnancyToBaby } from "../../../utils/storage";

const FEEDING_OPTIONS: { label: string; value: BabyProfile["feedingType"] }[] = [
  { label: "Gestillt", value: "breastfed" },
  { label: "Formula", value: "formula" },
  { label: "Beides", value: "mixed" },
];

const AVATAR_COLORS = ["#4A7C6F", "#D4856A", "#7B9EC8", "#9B7BB8", "#C8A96E"];

export default function PregnancyConvertScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [pregnancy, setPregnancy] = useState<PregnancyProfile | null>(null);

  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [feedingType, setFeedingType] = useState<BabyProfile["feedingType"]>("breastfed");
  const [weightGrams, setWeightGrams] = useState("");
  const [premature, setPremature] = useState(false);
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const profiles = await loadPregnancyProfiles();
      const found = profiles.find((p) => p.id === id) ?? null;
      setPregnancy(found);
      if (found) {
        setAvatarColor(found.avatarColor);
        // If due date is in the past, use it as default birth date
        const due = new Date(found.dueDate);
        if (due <= new Date()) setBirthDate(due);
      }
    }
    load();
  }, [id]);

  const formattedDate = birthDate.toLocaleDateString("de-DE", {
    day: "2-digit", month: "long", year: "numeric",
  });

  async function handleSave() {
    if (!name.trim() || saving) return;
    setSaving(true);
    const newBaby = await migratePregnancyToBaby(id, {
      name: name.trim(),
      birthDate: birthDate.toISOString(),
      feedingType,
      avatarColor,
      premature,
      ...(weightGrams ? { weightGrams: parseInt(weightGrams, 10) } : {}),
      ...(pregnancy?.description ? { description: pregnancy.description } : {}),
    });
    router.replace(`/profile/${newBaby.id}`);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#4A7C6F" />
          </TouchableOpacity>
          <Text style={styles.title}>Baby eintragen</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Celebration */}
        <View style={styles.celebration}>
          <Text style={styles.celebrationEmoji}>🎉</Text>
          <Text style={styles.celebrationTitle}>Herzlichen Glückwunsch!</Text>
          <Text style={styles.celebrationSub}>
            Alle bisherigen Chats und Erinnerungen{"\n"}werden auf das Kindprofil übertragen.
          </Text>
        </View>

        {/* Name */}
        <Text style={styles.label}>Name *</Text>
        <TextInput
          style={styles.input}
          placeholder={pregnancy?.nickname ?? "Vorname"}
          placeholderTextColor="#B0A89A"
          value={name}
          onChangeText={setName}
          autoFocus
        />

        {/* Geburtsdatum */}
        <Text style={styles.label}>Geburtstag *</Text>
        <TouchableOpacity style={styles.dateTrigger} onPress={() => setShowDatePicker(true)}>
          <Ionicons name="calendar-outline" size={18} color="#4A7C6F" />
          <Text style={styles.dateTriggerText}>{formattedDate}</Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={birthDate}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            maximumDate={new Date()}
            onChange={(_, date) => {
              setShowDatePicker(Platform.OS === "ios");
              if (date) setBirthDate(date);
            }}
          />
        )}
        {Platform.OS === "ios" && showDatePicker && (
          <TouchableOpacity style={styles.dateConfirmBtn} onPress={() => setShowDatePicker(false)}>
            <Text style={styles.dateConfirmText}>Fertig</Text>
          </TouchableOpacity>
        )}

        {/* Geburtsgewicht */}
        <Text style={styles.label}>Geburtsgewicht (Gramm)</Text>
        <TextInput
          style={styles.input}
          placeholder="z. B. 3420"
          placeholderTextColor="#B0A89A"
          value={weightGrams}
          onChangeText={setWeightGrams}
          keyboardType="numeric"
        />

        {/* Frühgeburt */}
        <Text style={styles.label}>Frühgeburt?</Text>
        <View style={[styles.row, { marginBottom: 28 }]}>
          <TouchableOpacity
            style={[styles.segBtn, !premature && styles.segBtnActive]}
            onPress={() => setPremature(false)}
          >
            <Text style={[styles.segBtnText, !premature && styles.segBtnTextActive]}>Nein</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segBtn, premature && styles.segBtnActive]}
            onPress={() => setPremature(true)}
          >
            <Text style={[styles.segBtnText, premature && styles.segBtnTextActive]}>Ja</Text>
          </TouchableOpacity>
        </View>

        {/* Ernährung */}
        <Text style={styles.label}>Ernährung</Text>
        <View style={styles.row}>
          {FEEDING_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.segBtn, feedingType === opt.value && styles.segBtnActive]}
              onPress={() => setFeedingType(opt.value)}
            >
              <Text style={[styles.segBtnText, feedingType === opt.value && styles.segBtnTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Avatar-Farbe */}
        <Text style={styles.label}>Avatar-Farbe</Text>
        <View style={[styles.row, { marginBottom: 32 }]}>
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

        <TouchableOpacity
          style={[styles.saveBtn, (!name.trim() || saving) && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!name.trim() || saving}
        >
          <Text style={styles.saveBtnText}>
            {saving ? "Wird gespeichert…" : "Kindprofil erstellen"}
          </Text>
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
    marginBottom: 24,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: "700", color: "#2D2A26" },

  celebration: {
    alignItems: "center",
    backgroundColor: "#EAF2EF",
    borderRadius: 20,
    padding: 24,
    marginBottom: 32,
    borderWidth: 1.5,
    borderColor: "#C5DDD8",
  },
  celebrationEmoji: { fontSize: 48, marginBottom: 10 },
  celebrationTitle: { fontSize: 20, fontWeight: "800", color: "#2D2A26", marginBottom: 8 },
  celebrationSub: { fontSize: 14, color: "#7A7269", textAlign: "center", lineHeight: 20 },

  label: {
    fontSize: 13, fontWeight: "700", color: "#7A7269",
    letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 10,
  },
  input: {
    backgroundColor: "#F0EBE3", borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: "#2D2A26", marginBottom: 24,
  },
  dateTrigger: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#F0EBE3", borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, marginBottom: 24,
  },
  dateTriggerText: { fontSize: 16, color: "#2D2A26" },
  dateConfirmBtn: { alignSelf: "flex-end", paddingVertical: 6, paddingHorizontal: 16, marginBottom: 16 },
  dateConfirmText: { color: "#4A7C6F", fontWeight: "700", fontSize: 15 },

  row: { flexDirection: "row", gap: 10, marginBottom: 24 },
  segBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    backgroundColor: "#F0EBE3", alignItems: "center",
  },
  segBtnActive: { backgroundColor: "#4A7C6F" },
  segBtnText: { fontSize: 14, fontWeight: "600", color: "#7A7269" },
  segBtnTextActive: { color: "#FFFFFF" },

  colorCircle: { width: 44, height: 44, borderRadius: 22 },
  colorCircleSelected: { borderWidth: 3, borderColor: "#2D2A26" },

  saveBtn: {
    backgroundColor: "#4A7C6F", borderRadius: 14,
    paddingVertical: 17, alignItems: "center",
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },
});
