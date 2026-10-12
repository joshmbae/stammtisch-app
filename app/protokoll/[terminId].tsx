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
import { SHADOWS, ThemeColors, FONT } from "../../constants/design";
import { useColors, useThemedStyles } from "../../contexts/ThemeContext";
import LoadingSpinner from "../../components/LoadingSpinner";

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
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const { activeMemberId } = useSession();
  const { terminId } = useLocalSearchParams<{ terminId: string }>();
  const [termin, setTermin] = useState<StammtischTermin | null>(null);
  const [protokoll, setProtokoll] = useState<Protokoll | null>(null);
  const [titel, setTitel] = useState("");
  const [inhalt, setInhalt] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
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
          setEditing(false);
        } else {
          setEditing(true);
        }
        setDirty(false);
        setLoading(false);
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
    setEditing(false);
    await logActivity({
      actorMemberId: activeMemberId ?? undefined,
      actionType: "protokoll_updated",
      terminId,
      refId: saved.id,
      meta: termin ? { terminDatum: termin.datum, terminTitel: termin.titel, terminArt: termin.art } : {},
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
            <Ionicons name="chevron-back" size={20} color={c.blue} />
            <Text style={styles.backText}>Zurück</Text>
          </TouchableOpacity>
          <View style={styles.topActions}>
            {protokoll && (
              <TouchableOpacity onPress={handleDelete} style={styles.topBtn}>
                <Ionicons name="trash-outline" size={20} color={c.danger} />
              </TouchableOpacity>
            )}
            {editing ? (
              <TouchableOpacity
                style={[styles.saveBtn, (!dirty || saving) && styles.saveBtnDim]}
                onPress={handleSave}
                disabled={!dirty || saving}
              >
                <Ionicons name="checkmark" size={18} color={c.onAccent} />
                <Text style={styles.saveBtnText}>{saving ? "Speichert…" : "Speichern"}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.saveBtn} onPress={() => setEditing(true)}>
                <Ionicons name="pencil" size={16} color={c.onAccent} />
                <Text style={styles.saveBtnText}>Bearbeiten</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {loading ? <LoadingSpinner /> : (
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
              <Ionicons name="checkmark-circle" size={14} color={c.success} />
              <Text style={styles.statusText}>
                Gespeichert · {formatUpdated(protokoll.updatedAt)}
              </Text>
              {dirty && <Text style={styles.dirtyDot}> · Ungespeicherte Änderungen</Text>}
            </View>
          )}

          {editing ? (
            <>
              {/* Titel */}
              <TextInput
                style={styles.titelInput}
                value={titel}
                onChangeText={(v) => handleChange("titel", v)}
                placeholder="Protokolltitel (optional)"
                placeholderTextColor={c.textLight}
                returnKeyType="next"
              />

              {/* Inhalt */}
              <TextInput
                style={styles.inhaltInput}
                value={inhalt}
                onChangeText={(v) => handleChange("inhalt", v)}
                placeholder={`Stammtisch vom ${termin ? formatDatum(termin.datum) : "…"}\n\nAnwesende: …\n\nThemen & Beschlüsse:\n1. …\n\nSonstiges: …`}
                placeholderTextColor={c.textLight}
                multiline
                textAlignVertical="top"
                autoCorrect
              />
            </>
          ) : (
            <>
              {/* Titel (read-only) */}
              <Text style={styles.readTitel}>{titel || terminName}</Text>

              {/* Inhalt (read-only) */}
              <Text style={styles.readInhalt} selectable>{inhalt}</Text>
            </>
          )}
        </ScrollView>
        )}
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    backgroundColor: c.card,
  },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  backText: { fontSize: 15, color: c.blue, fontFamily: FONT.w600 },
  topActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  topBtn: { padding: 4 },
  saveBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: c.blue, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  saveBtnDim: { opacity: 0.45 },
  saveBtnText: { color: c.onAccent, fontFamily: FONT.w700, fontSize: 14 },

  content: { padding: 20, paddingBottom: 60 },

  terminBadge: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: c.goldBg, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10,
    borderWidth: 1, borderColor: c.gold + "55",
    alignSelf: "flex-start",
  },
  terminBadgeEmoji: { fontFamily: FONT.w400, fontSize: 16 },
  terminBadgeText: { fontSize: 13, fontFamily: FONT.w700, color: c.gold },

  statusRow: {
    flexDirection: "row", alignItems: "center", gap: 5,
    marginBottom: 14,
  },
  statusText: { fontSize: 12, color: c.success, fontFamily: FONT.w500 },
  dirtyDot: { fontFamily: FONT.w400, fontSize: 12, color: c.warning },

  titelInput: {
    fontSize: 22,
    fontFamily: FONT.w800,
    color: c.textDark,
    marginBottom: 14,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  inhaltInput: { fontFamily: FONT.w400, fontSize: 15,
    color: c.textDark,
    lineHeight: 24,
    minHeight: 340,
    backgroundColor: c.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: c.border,
    marginBottom: 16,
    ...SHADOWS.light,
  },

  readTitel: {
    fontSize: 22,
    fontFamily: FONT.w800,
    color: c.textDark,
    marginBottom: 14,
  },
  readInhalt: { fontFamily: FONT.w400, fontSize: 15,
    color: c.textDark,
    lineHeight: 24,
    backgroundColor: c.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: c.border,
    marginBottom: 16,
    ...SHADOWS.light,
  },

});
