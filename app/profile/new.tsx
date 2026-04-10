import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { BabyProfile } from "../../types";
import { loadProfiles, saveProfiles } from "../../utils/storage";

const FEEDING_OPTIONS: { label: string; value: BabyProfile["feedingType"] }[] = [
  { label: "Gestillt", value: "breastfed" },
  { label: "Formula", value: "formula" },
  { label: "Beides", value: "mixed" },
];

const AVATAR_COLORS = ["#4A7C6F", "#D4856A", "#7B9EC8", "#9B7BB8", "#C8A96E"];
const GENDER_OPTIONS: { label: string; value: BabyProfile["gender"] }[] = [
  { label: "Junge", value: "male" },
  { label: "Mädchen", value: "female" },
  { label: "Divers", value: "other" },
];

export default function NewProfileScreen() {
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [feedingType, setFeedingType] = useState<BabyProfile["feedingType"]>("breastfed");
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [gender, setGender] = useState<BabyProfile["gender"]>(undefined);
  const [weightGrams, setWeightGrams] = useState("");
  const [premature, setPremature] = useState(false);
  const [siblings, setSiblings] = useState("");
  const [medicalNotes, setMedicalNotes] = useState("");
  const [description, setDescription] = useState("");

  async function pickFromGallery() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Kein Zugriff", "Bitte erlaube den Zugriff auf deine Fotos in den Einstellungen.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Kein Zugriff", "Bitte erlaube den Kamera-Zugriff in den Einstellungen.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  }

  function showPhotoOptions() {
    Alert.alert("Foto hinzufügen", "", [
      { text: "Kamera", onPress: takePhoto },
      { text: "Aus Galerie", onPress: pickFromGallery },
      { text: "Abbrechen", style: "cancel" },
    ]);
  }

  async function handleSave() {
    if (!name.trim()) return;
    const newProfile: BabyProfile = {
      id: Date.now().toString(),
      name: name.trim(),
      birthDate: birthDate.toISOString(),
      feedingType,
      avatarColor,
      createdAt: new Date().toISOString(),
      ...(photoUri ? { photoUri } : {}),
      ...(weightGrams ? { weightGrams: parseInt(weightGrams, 10) } : {}),
      premature,
      ...(siblings.trim() ? { siblings: siblings.trim() } : {}),
      ...(medicalNotes.trim() ? { medicalNotes: medicalNotes.trim() } : {}),
      ...(description.trim() ? { description: description.trim() } : {}),
      ...(gender ? { gender } : {}),
    };
    const existing = await loadProfiles();
    await saveProfiles([...existing, newProfile]);
    router.replace("/(tabs)/home");
  }

  const formattedDate = birthDate.toLocaleDateString("de-DE", {
    day: "2-digit", month: "long", year: "numeric",
  });

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#4A7C6F" />
          </TouchableOpacity>
          <Text style={styles.title}>Kind anlegen</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Photo / Avatar */}
        <TouchableOpacity style={styles.photoWrapper} onPress={showPhotoOptions} activeOpacity={0.8}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photo} />
          ) : (
            <View style={[styles.avatarCircle, { backgroundColor: avatarColor }]}>
              <Text style={styles.avatarInitial}>
                {name ? name.charAt(0).toUpperCase() : "?"}
              </Text>
            </View>
          )}
          <View style={styles.cameraOverlay}>
            <Ionicons name="camera" size={18} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
        <Text style={styles.photoHint}>Foto aufnehmen oder aus Galerie wählen</Text>

        {/* Name */}
        <Text style={styles.label}>Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="z. B. Luca"
          placeholderTextColor="#B0A89A"
          value={name}
          onChangeText={setName}
        />

        {/* Geburtsdatum */}
        <Text style={styles.label}>Geburtsdatum *</Text>
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

        {/* Ernährung */}
        <Text style={styles.label}>Ernährung *</Text>
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

        {/* Geschlecht */}
        <Text style={styles.label}>Geschlecht</Text>
        <View style={styles.row}>
          {GENDER_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.segBtn, gender === opt.value && styles.segBtnActive]}
              onPress={() => setGender(gender === opt.value ? undefined : opt.value)}
            >
              <Text style={[styles.segBtnText, gender === opt.value && styles.segBtnTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

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

        {/* Geschwister */}
        <Text style={styles.label}>Geschwister</Text>
        <TextInput
          style={styles.input}
          placeholder="z. B. Emma (3 Jahre), Jonas (6 Jahre)"
          placeholderTextColor="#B0A89A"
          value={siblings}
          onChangeText={setSiblings}
        />

        {/* Medizinische Besonderheiten */}
        <Text style={styles.label}>Medizinische Besonderheiten</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          placeholder="z. B. Kuhmilchallergie, Laktoseintoleranz, Reflux…"
          placeholderTextColor="#B0A89A"
          value={medicalNotes}
          onChangeText={setMedicalNotes}
          multiline
          numberOfLines={3}
        />

        {/* Beschreibung für Mia */}
        <Text style={styles.label}>Für Mia — freie Beschreibung</Text>
        <Text style={styles.fieldHint}>
          Was soll Mia von Anfang an über {name || "dein Kind"} wissen? Z. B. Schlafgewohnheiten, Besonderheiten im Alltag, aktuelle Themen.
        </Text>
        <TextInput
          style={[styles.input, styles.inputMultiline, { height: 110 }]}
          placeholder={"z. B. Schläft noch unruhig, wacht 2× pro Nacht auf. Mag das Schaukeln sehr. Trinkt gut aber langsam."}
          placeholderTextColor="#B0A89A"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
        />

        {/* Avatar-Farbe (nur wenn kein Foto) */}
        {!photoUri && (
          <>
            <Text style={styles.label}>Avatar-Farbe</Text>
            <View style={[styles.row, { marginBottom: 28 }]}>
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
          </>
        )}

        {/* Speichern */}
        <TouchableOpacity
          style={[styles.saveBtn, !name.trim() && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!name.trim()}
        >
          <Text style={styles.saveBtnText}>Profil speichern</Text>
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

  // Photo
  photoWrapper: {
    alignSelf: "center",
    width: 100,
    height: 100,
    marginBottom: 10,
  },
  photo: { width: 100, height: 100, borderRadius: 50 },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: { fontSize: 40, fontWeight: "800", color: "#FFFFFF" },
  cameraOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#4A7C6F",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FDFAF6",
  },
  photoHint: {
    textAlign: "center",
    color: "#7A7269",
    fontSize: 13,
    marginBottom: 28,
  },

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
    marginBottom: 24,
  },
  inputMultiline: {
    height: 90,
    textAlignVertical: "top",
    paddingTop: 14,
  },
  fieldHint: {
    fontSize: 13,
    color: "#7A7269",
    marginBottom: 10,
    marginTop: -4,
    lineHeight: 18,
  },
  row: { flexDirection: "row", gap: 10, marginBottom: 24 },

  dateTrigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F0EBE3",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 24,
  },
  dateTriggerText: { fontSize: 16, color: "#2D2A26" },
  dateConfirmBtn: {
    alignSelf: "flex-end",
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  dateConfirmText: { color: "#4A7C6F", fontWeight: "700", fontSize: 15 },

  segBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#F0EBE3",
    alignItems: "center",
  },
  segBtnActive: { backgroundColor: "#4A7C6F" },
  segBtnText: { fontSize: 14, fontWeight: "600", color: "#7A7269" },
  segBtnTextActive: { color: "#FFFFFF" },

  colorCircle: { width: 44, height: 44, borderRadius: 22 },
  colorCircleSelected: { borderWidth: 3, borderColor: "#2D2A26" },

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
