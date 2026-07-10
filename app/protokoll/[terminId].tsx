import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { showAlert } from "../../utils/alert";
import { StammtischTermin, Protokoll } from "../../types";
import {
  loadTermine,
  loadProtokoll,
  saveProtokoll,
  deleteProtokoll,
  logActivity,
} from "../../utils/storage";
import { useSession } from "../../contexts/SessionContext";
import { COLORS, SHADOWS } from "../../constants/design";

function formatDatum(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatUpdated(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ProtokollEditor() {
  const { activeMemberId } = useSession();
  const { terminId } = useLocalSearchParams<{ terminId: string }>();
  const [termin, setTermin] = useState<StammtischTermin | null>(null);
  const [protokoll, setProtokoll] = useState<Protokoll | null>(null);
  const [titel, setTitel] = useState("");
  const [inhalt, setInhalt] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const [termine, existing] = await Promise.all([
          loadTermine(),
          loadProtokoll(terminId),
        ]);
        const t = termine.find((x) => x.id === terminId) ?? null;
        setTermin(t);
        if (existing) {
          setProtokoll(existing);
          setTitel(existing.titel ?? "");
          setInhalt(existing.inhalt);
        }
        setDirty(false);
      }
      load();
    }, [terminId])
  );

  function handleChange(field: "titel" | "inhalt", value: string) {
    if (field === "titel") setTitel(value);
    else setInhalt(value);
    setDirty(true);

    // Debounced auto-save
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => autoSave(
      field === "titel" ? value : titel,
      field === "inhalt" ? value : inhalt,
    ), 2000);
  }

  async function autoSave(t: string, i: string) {
    if (!i.trim()) return;
    const saved = await saveProtokoll(terminId, i, t.trim() || undefined);
    setProtokoll(saved);
    setDirty(false);
  }

  async function handleSave() {
    if (!inhalt.trim()) {
      showAlert("Leer", "Bitte mindestens den Inhalt eintragen.");
      return;
    }
    setSaving(true);
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    const saved = await saveProtokoll(terminId, inhalt, titel.trim() || undefined);
    setProtokoll(saved);
    setDirty(false);
    setSaving(false);
    await logActivity({
      actorMemberId: activeMemberId ?? undefined,
      actionType: "protokoll_updated",
      terminId,
      refId: saved.id,
    });
  }

  async function handleDelete() {
    showAlert(
      "Protokoll löschen?",
      "Das Protokoll wird unwiderruflich gelöscht.",
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Löschen",
          style: "destructive",
          onPress: async () => {
            await deleteProtokoll(terminId);
            router.back();
          },
        },
      ]
    );
  }

  const terminName = termin
    ? (termin.titel ?? (termin.art === "stammtisch" ? "Stammtisch" : "Veranstaltung")) +
      " · " + formatDatum(termin.datum)
    : "Protokoll";

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <SafeAreaView style={styles.safe} edges={["top"]}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color={COLORS.blue} />
            <Text style={styles.backText}>Zurück</Text>
          </TouchableOpacity>
          <View style={styles.topActions}>
            {protokoll && (
              <TouchableOpacity onPress={handleDelete} style={styles.topBtn}>
                <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.saveBtn, (!dirty || saving) && styles.saveBtnDim]}
              onPress={handleSave}
              disabled={!dirty || saving}
            >
              <Ionicons name="checkmark" size={18} color="#FFFFFF" />
              <Text style={styles.saveBtnText}>{saving ? "Speichert…" : "Speichern"}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Termin-Badge */}
          <View style={styles.terminBadge}>
            <Text style={styles.terminBadgeEmoji}>
              {termin?.art === "stammtisch" ? "🍺" : "🎉"}
            </Text>
            <Text style={styles.terminBadgeText} numberOfLines={1}>{terminName}</Text>
          </View>

          {/* Status */}
          {protokoll && (
            <View style={styles.statusRow}>
              <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
              <Text style={styles.statusText}>
                Gespeichert · {formatUpdated(protokoll.updatedAt)}
              </Text>
              {dirty && <Text style={styles.dirtyDot}> · Ungespeicherte Änderungen</Text>}
            </View>
          )}

          {/* Titel */}
          <TextInput
            style={styles.titelInput}
            value={titel}
            onChangeText={(v) => handleChange("titel", v)}
            placeholder="Protokolltitel (optional)"
            placeholderTextColor={COLORS.textLight}
            returnKeyType="next"
          />

          {/* Inhalt */}
          <TextInput
            style={styles.inhaltInput}
            value={inhalt}
            onChangeText={(v) => handleChange("inhalt", v)}
            placeholder={`Stammtisch vom ${termin ? formatDatum(termin.datum) : "…"}\n\nAnwesende: …\n\nThemen & Beschlüsse:\n1. …\n\nSonstiges: …`}
            placeholderTextColor={COLORS.textLight}
            multiline
            textAlignVertical="top"
            autoCorrect
          />

          {/* Hinweis für Sepp */}
          <View style={styles.seppHint}>
            <Text style={styles.seppHintEmoji}>🧔</Text>
            <Text style={styles.seppHintText}>
              Sepp kennt den Inhalt dieses Protokolls und kann darauf eingehen.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  backText: { fontSize: 15, color: COLORS.blue, fontWeight: "600" },
  topActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  topBtn: { padding: 4 },
  saveBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: COLORS.blue, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  saveBtnDim: { opacity: 0.45 },
  saveBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },

  content: { padding: 20, paddingBottom: 60 },

  terminBadge: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: COLORS.goldBg, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10,
    borderWidth: 1, borderColor: COLORS.gold + "55",
    alignSelf: "flex-start",
  },
  terminBadgeEmoji: { fontSize: 16 },
  terminBadgeText: { fontSize: 13, fontWeight: "700", color: COLORS.gold },

  statusRow: {
    flexDirection: "row", alignItems: "center", gap: 5,
    marginBottom: 14,
  },
  statusText: { fontSize: 12, color: COLORS.success, fontWeight: "500" },
  dirtyDot: { fontSize: 12, color: COLORS.warning },

  titelInput: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.textDark,
    marginBottom: 14,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  inhaltInput: {
    fontSize: 15,
    color: COLORS.textDark,
    lineHeight: 24,
    minHeight: 340,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
    ...SHADOWS.light,
  },

  seppHint: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: COLORS.blue + "10",
    borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: COLORS.blue + "22",
  },
  seppHintEmoji: { fontSize: 20 },
  seppHintText: { flex: 1, fontSize: 12, color: COLORS.blue, lineHeight: 17 },
});
