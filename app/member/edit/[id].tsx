import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { showAlert } from "../../../utils/alert";
import { MemberProfile } from "../../../types";
import { loadMembers, saveMembers, uploadAvatar } from "../../../utils/storage";
import { COLORS, AVATAR_COLORS, ROLLEN } from "../../../constants/design";
import { getInitial } from "../../../utils/format";
import { toLocalIsoDate } from "../../../utils/date";
import DateTimePicker from "@react-native-community/datetimepicker";

export default function EditMemberScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [name, setName] = useState("");
  const [spitzname, setSpitzname] = useState("");
  const [rolle, setRolle] = useState<MemberProfile["rolle"]>("Mitglied");
  const [lieblingsgetraenk, setLieblingsgetraenk] = useState("");
  const [beruf, setBeruf] = useState("");
  const [mitgliedSeit, setMitgliedSeit] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [geburtsdatum, setGeburtsdatum] = useState<Date | null>(null);
  const [showBirthdayPicker, setShowBirthdayPicker] = useState(false);
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
  const [photoUri, setPhotoUri] = useState<string | undefined>(undefined);
  const [notizen, setNotizen] = useState("");

  useEffect(() => {
    loadMembers().then((members) => {
      const m = members.find((x) => x.id === id);
      if (!m) return;
      setName(m.name);
      setSpitzname(m.spitzname ?? "");
      setRolle(m.rolle);
      setLieblingsgetraenk(m.lieblingsgetraenk ?? "");
      setBeruf(m.beruf ?? "");
      setMitgliedSeit(new Date(m.mitgliedSeit));
      setGeburtsdatum(m.geburtsdatum ? new Date(m.geburtsdatum + "T00:00:00") : null);
      setAvatarColor(m.avatarColor);
      setPhotoUri(m.photoUri);
      setNotizen(m.notizen ?? "");
    });
  }, [id]);

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showAlert("Kein Zugriff", "Bitte erlaube den Zugriff auf die Fotobibliothek in den Einstellungen.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  }

  async function save() {
    if (!name.trim()) {
      showAlert("Name fehlt", "Bitte einen Namen eingeben.");
      return;
    }
    const uploadedPhotoUri =
      photoUri && !photoUri.startsWith("http") ? await uploadAvatar(id, photoUri) : photoUri;
    const members = await loadMembers();
    const updated = members.map((m) =>
      m.id === id
        ? {
            ...m,
            name: name.trim(),
            spitzname: spitzname.trim() || undefined,
            mitgliedSeit: mitgliedSeit.toISOString(),
            geburtsdatum: geburtsdatum ? toLocalIsoDate(geburtsdatum) : undefined,
            rolle,
            lieblingsgetraenk: lieblingsgetraenk.trim() || undefined,
            beruf: beruf.trim() || undefined,
            avatarColor,
            photoUri: uploadedPhotoUri,
            notizen: notizen.trim() || undefined,
          }
        : m
    );
    await saveMembers(updated);
    router.back();
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={0}>
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color={COLORS.blue} />
          </TouchableOpacity>
          <Text style={styles.title}>Mitglied bearbeiten</Text>
        </View>

        {/* Foto & Farbe */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Foto & Farbe</Text>
          <View style={styles.avatarRow}>
            <TouchableOpacity onPress={pickPhoto} activeOpacity={0.8}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.avatarPreview} />
              ) : (
                <View style={[styles.avatarPreview, { backgroundColor: avatarColor }]}>
                  <Text style={styles.avatarPreviewText}>{name ? getInitial(name) : "?"}</Text>
                </View>
              )}
              <View style={styles.avatarCameraBtn}>
                <Ionicons name="camera" size={14} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            <View style={styles.colorGrid}>
              {AVATAR_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.colorDot, { backgroundColor: c }, avatarColor === c && styles.colorDotSelected]}
                  onPress={() => setAvatarColor(c)}
                >
                  {avatarColor === c && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
          {photoUri && (
            <TouchableOpacity onPress={() => setPhotoUri(undefined)} style={styles.removePhoto}>
              <Text style={styles.removePhotoText}>Foto entfernen</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Name *</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="z.B. Franz Huber" placeholderTextColor={COLORS.textLight} />
        </View>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Spitzname</Text>
          <TextInput style={styles.input} value={spitzname} onChangeText={setSpitzname} placeholder="z.B. Franzi" placeholderTextColor={COLORS.textLight} />
        </View>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Rolle am Stammtisch</Text>
          <View style={styles.rollenGrid}>
            {ROLLEN.map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.rolleChip, rolle === r && { backgroundColor: COLORS.blue, borderColor: COLORS.blue }]}
                onPress={() => setRolle(r)}
              >
                <Text style={[styles.rolleChipText, rolle === r && { color: "#FFFFFF" }]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Mitglied seit</Text>
          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
            <Ionicons name="calendar-outline" size={18} color={COLORS.blue} />
            <Text style={styles.dateBtnText}>
              {mitgliedSeit.toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={mitgliedSeit}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              maximumDate={new Date()}
              onChange={(_, date) => { setShowDatePicker(false); if (date) setMitgliedSeit(date); }}
            />
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Geburtstag</Text>
          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowBirthdayPicker(true)}>
            <Text style={{ fontSize: 16 }}>🎂</Text>
            <Text style={[styles.dateBtnText, !geburtsdatum && { color: COLORS.textLight }]}>
              {geburtsdatum
                ? geburtsdatum.toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })
                : "Geburtstag eintragen (optional)"}
            </Text>
            {geburtsdatum && (
              <TouchableOpacity onPress={() => setGeburtsdatum(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
          {showBirthdayPicker && (
            <DateTimePicker
              value={geburtsdatum ?? new Date(1990, 0, 1)}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              maximumDate={new Date()}
              onChange={(_, date) => { setShowBirthdayPicker(false); if (date) setGeburtsdatum(date); }}
            />
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Lieblingsgetränk</Text>
          <TextInput style={styles.input} value={lieblingsgetraenk} onChangeText={setLieblingsgetraenk} placeholder="z.B. Helles, Weißbier" placeholderTextColor={COLORS.textLight} />
        </View>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Beruf</Text>
          <TextInput style={styles.input} value={beruf} onChangeText={setBeruf} placeholder="z.B. Bäckermeister" placeholderTextColor={COLORS.textLight} />
        </View>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Notizen</Text>
          <TextInput
            style={[styles.input, { minHeight: 80 }]}
            value={notizen}
            onChangeText={setNotizen}
            placeholder="Besonderheiten..."
            placeholderTextColor={COLORS.textLight}
            multiline
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={save}>
          <Ionicons name="checkmark" size={20} color="#FFFFFF" />
          <Text style={styles.saveBtnText}>Änderungen speichern</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, paddingBottom: 48 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20, paddingTop: 4 },
  backBtn: { padding: 4 },
  title: { fontSize: 22, fontWeight: "800", color: COLORS.textDark },
  card: { backgroundColor: COLORS.card, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  fieldLabel: { fontSize: 12, fontWeight: "700", color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  input: { backgroundColor: COLORS.background, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: COLORS.textDark },
  avatarRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  avatarPreview: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  avatarPreviewText: { fontSize: 28, fontWeight: "700", color: "#FFFFFF" },
  avatarCameraBtn: {
    position: "absolute", bottom: 0, right: 0,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: COLORS.blue, alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: COLORS.card,
  },
  colorGrid: { flex: 1, flexDirection: "row", gap: 8, flexWrap: "wrap" },
  colorDot: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  colorDotSelected: { borderWidth: 3, borderColor: "#FFFFFF" },
  removePhoto: { marginTop: 8 },
  removePhotoText: { fontSize: 12, color: COLORS.danger, fontWeight: "600" },
  rollenGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  rolleChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.background, borderWidth: 1.5, borderColor: COLORS.border },
  rolleChipText: { fontSize: 13, fontWeight: "600", color: COLORS.textDark },
  dateBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: COLORS.background, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 10 },
  dateBtnText: { fontSize: 14, color: COLORS.textDark, fontWeight: "600" },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: COLORS.blue, borderRadius: 16, paddingVertical: 16, marginTop: 8 },
  saveBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});
