import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { showAlert } from "../utils/alert";
import { StrafKategorieDef, STRAF_KATEGORIEN_VORLAGEN } from "../types";
import {
  loadStrafKategorien,
  addStrafKategorie,
  updateStrafKategorie,
  deleteStrafKategorie,
  instantiateStrafKategorieVorlage,
} from "../utils/storage";
import { COLORS, SHADOWS } from "../constants/design";
import LoadingSpinner from "../components/LoadingSpinner";
import { useSingleFlight } from "../utils/useSingleFlight";

function leereForm() {
  return { label: "", betrag: "", emoji: "", beschreibung: "" };
}

export default function StrafenKategorienScreen() {
  const guard = useSingleFlight();
  const [kategorien, setKategorien] = useState<StrafKategorieDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(leereForm());
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState(leereForm());

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const kats = await loadStrafKategorien();
        // Kategorien aus Spiel-Ereignissen werden beim jeweiligen Spiel verwaltet
        // (Betrag/Label dort editieren), nicht hier.
        setKategorien(kats.filter((k) => !k.spielEreignisTypId));
        setLoading(false);
      }
      load();
    }, [])
  );

  function openEdit(k: StrafKategorieDef) {
    setEditingId(k.id);
    setEditForm({
      label: k.label,
      betrag: String(k.betrag).replace(".", ","),
      emoji: k.emoji,
      beschreibung: k.beschreibung ?? "",
    });
  }

  async function handleSaveEdit(id: string) {
    const betrag = parseFloat(editForm.betrag.replace(",", ".")) || 0;
    if (!editForm.label.trim()) return;
    await updateStrafKategorie(id, {
      label: editForm.label.trim(),
      betrag,
      emoji: editForm.emoji.trim() || "💰",
      beschreibung: editForm.beschreibung.trim() || undefined,
    });
    setKategorien((prev) => prev.map((k) => k.id === id
      ? { ...k, label: editForm.label.trim(), betrag, emoji: editForm.emoji.trim() || "💰", beschreibung: editForm.beschreibung.trim() || undefined }
      : k
    ));
    setEditingId(null);
  }

  async function handleDelete(k: StrafKategorieDef) {
    showAlert("Kategorie löschen?", `„${k.label}" wird unwiderruflich gelöscht.`, [
      { text: "Abbrechen", style: "cancel" },
      {
        text: "Löschen", style: "destructive", onPress: async () => {
          await deleteStrafKategorie(k.id);
          setKategorien((prev) => prev.filter((x) => x.id !== k.id));
        },
      },
    ]);
  }

  async function handleAdd() {
    if (!addForm.label.trim()) return;
    const betrag = parseFloat(addForm.betrag.replace(",", ".")) || 0;
    const kat = await addStrafKategorie({
      label: addForm.label.trim(),
      betrag,
      emoji: addForm.emoji.trim() || "💰",
      beschreibung: addForm.beschreibung.trim() || undefined,
      reihenfolge: kategorien.length,
    });
    setKategorien((prev) => [...prev, kat]);
    setAddForm(leereForm());
    setShowAddForm(false);
  }

  async function handleVorlageHinzufuegen(vorlage: (typeof STRAF_KATEGORIEN_VORLAGEN)[number]) {
    const kat = await instantiateStrafKategorieVorlage(vorlage, kategorien.length);
    setKategorien((prev) => [...prev, kat]);
  }

  const vorlagenOffen = STRAF_KATEGORIEN_VORLAGEN.filter(
    (v) => !kategorien.some((k) => k.label === v.label)
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={0}>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        {loading ? <LoadingSpinner /> : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
              <Ionicons name="chevron-back" size={22} color={COLORS.textDark} />
            </TouchableOpacity>
            <View style={styles.headerTexts}>
              <Text style={styles.headerTitle}>Strafenkategorien</Text>
              <Text style={styles.headerSub}>Eigene Strafen & Beträge verwalten</Text>
            </View>
          </View>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={18} color={COLORS.blue} />
            <Text style={styles.infoBoxText}>
              Strafen, die bei einem Spiel-Ereignis automatisch entstehen (z. B. "Schock-Niederlage"),
              verwaltet ihr direkt beim jeweiligen Spiel unter „Spiele verwalten" — hier nur alles Manuelle.
            </Text>
          </View>

          {kategorien.map((k) => (
            <View key={k.id} style={styles.card}>
              {editingId === k.id ? (
                <View>
                  <View style={styles.editRow}>
                    <TextInput
                      style={[styles.input, { width: 48, textAlign: "center" }]}
                      value={editForm.emoji}
                      onChangeText={(t) => setEditForm((f) => ({ ...f, emoji: t }))}
                      placeholder="💰"
                    />
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      value={editForm.label}
                      onChangeText={(t) => setEditForm((f) => ({ ...f, label: t }))}
                      placeholder="Bezeichnung"
                      placeholderTextColor={COLORS.textLight}
                    />
                  </View>
                  <TextInput
                    style={styles.input}
                    value={editForm.betrag}
                    onChangeText={(t) => setEditForm((f) => ({ ...f, betrag: t }))}
                    placeholder="Betrag in €"
                    placeholderTextColor={COLORS.textLight}
                    keyboardType="decimal-pad"
                  />
                  <TextInput
                    style={styles.input}
                    value={editForm.beschreibung}
                    onChangeText={(t) => setEditForm((f) => ({ ...f, beschreibung: t }))}
                    placeholder="Beschreibung (optional)"
                    placeholderTextColor={COLORS.textLight}
                  />
                  <View style={styles.editActions}>
                    <TouchableOpacity onPress={() => setEditingId(null)} style={styles.editCancelBtn}>
                      <Text style={styles.editCancelText}>Abbrechen</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => guard(() => handleSaveEdit(k.id))} style={styles.editSaveBtn}>
                      <Text style={styles.editSaveText}>Speichern</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity style={styles.katRow} onPress={() => openEdit(k)} activeOpacity={0.8}>
                  <Text style={styles.katEmoji}>{k.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={styles.katLabel}>{k.label}</Text>
                      {k.istSystem && <Text style={styles.systemBadge}>automatisch</Text>}
                    </View>
                    {k.beschreibung && <Text style={styles.katBeschreibung} numberOfLines={2}>{k.beschreibung}</Text>}
                  </View>
                  <Text style={styles.katBetrag}>{k.betrag.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</Text>
                  {!k.istSystem && (
                    <TouchableOpacity onPress={() => handleDelete(k)} style={{ padding: 4 }}>
                      <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              )}
            </View>
          ))}

          {showAddForm ? (
            <View style={styles.card}>
              <Text style={styles.addCardTitle}>Neue Kategorie</Text>
              <View style={styles.editRow}>
                <TextInput
                  style={[styles.input, { width: 48, textAlign: "center" }]}
                  value={addForm.emoji}
                  onChangeText={(t) => setAddForm((f) => ({ ...f, emoji: t }))}
                  placeholder="💰"
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={addForm.label}
                  onChangeText={(t) => setAddForm((f) => ({ ...f, label: t }))}
                  placeholder="Bezeichnung"
                  placeholderTextColor={COLORS.textLight}
                  autoFocus
                />
              </View>
              <TextInput
                style={styles.input}
                value={addForm.betrag}
                onChangeText={(t) => setAddForm((f) => ({ ...f, betrag: t }))}
                placeholder="Betrag in €"
                placeholderTextColor={COLORS.textLight}
                keyboardType="decimal-pad"
              />
              <TextInput
                style={styles.input}
                value={addForm.beschreibung}
                onChangeText={(t) => setAddForm((f) => ({ ...f, beschreibung: t }))}
                placeholder="Beschreibung (optional)"
                placeholderTextColor={COLORS.textLight}
              />
              <View style={styles.editActions}>
                <TouchableOpacity onPress={() => { setShowAddForm(false); setAddForm(leereForm()); }} style={styles.editCancelBtn}>
                  <Text style={styles.editCancelText}>Abbrechen</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => guard(handleAdd)} style={styles.editSaveBtn}>
                  <Text style={styles.editSaveText}>Anlegen</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddForm(true)} activeOpacity={0.85}>
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.addBtnText}>Neue Kategorie</Text>
            </TouchableOpacity>
          )}

          {vorlagenOffen.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Vorlagen</Text>
              <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={18} color={COLORS.blue} />
                <Text style={styles.infoBoxText}>
                  Gängige Regeln zum Ein-Klick-Übernehmen — passt danach jederzeit Betrag & Text an.
                </Text>
              </View>
              {vorlagenOffen.map((v) => (
                <View key={v.label} style={styles.vorlageRow}>
                  <Text style={styles.katEmoji}>{v.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.katLabel}>{v.label}</Text>
                    {v.beschreibung && <Text style={styles.katBeschreibung} numberOfLines={2}>{v.beschreibung}</Text>}
                  </View>
                  <TouchableOpacity onPress={() => guard(() => handleVorlageHinzufuegen(v))} style={styles.vorlageAddBtn}>
                    <Ionicons name="add" size={18} color={COLORS.blue} />
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}

        </ScrollView>
        )}
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, paddingBottom: 48 },

  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: COLORS.cardAlt, borderRadius: 20,
    padding: 16, marginBottom: 16, ...SHADOWS.card,
    borderWidth: 1, borderColor: COLORS.border,
  },
  headerTexts: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: COLORS.textDark },
  headerSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

  sectionTitle: { fontSize: 15, fontWeight: "800", color: COLORS.textDark, marginTop: 12, marginBottom: 8 },

  infoBox: {
    flexDirection: "row", gap: 8, backgroundColor: COLORS.blue + "0F",
    borderRadius: 12, padding: 12, marginBottom: 12,
  },
  infoBoxText: { flex: 1, fontSize: 12, color: COLORS.textMuted, lineHeight: 17 },

  card: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.light,
  },
  katRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  katEmoji: { fontSize: 22, width: 30, textAlign: "center" },
  katLabel: { fontSize: 14, fontWeight: "700", color: COLORS.textDark },
  systemBadge: {
    fontSize: 10, fontWeight: "700", color: COLORS.textLight,
    backgroundColor: COLORS.border, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  katBeschreibung: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  katBetrag: { fontSize: 14, fontWeight: "800", color: COLORS.danger },

  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: COLORS.textDark,
    marginBottom: 8, backgroundColor: COLORS.background,
  },
  editRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  editActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 4 },
  editCancelBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  editCancelText: { color: COLORS.textMuted, fontWeight: "600", fontSize: 13 },
  editSaveBtn: { backgroundColor: COLORS.blue, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 16 },
  editSaveText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },

  addCardTitle: { fontSize: 14, fontWeight: "800", color: COLORS.textDark, marginBottom: 10 },
  addBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: COLORS.blue, borderRadius: 16, paddingVertical: 16, marginTop: 4, marginBottom: 8,
  },
  addBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },

  vorlageRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: COLORS.card, borderRadius: 14, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: COLORS.border,
  },
  vorlageAddBtn: {
    width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center",
    backgroundColor: COLORS.blue + "18",
  },
});
