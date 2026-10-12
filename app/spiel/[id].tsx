import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { showAlert } from "../../utils/alert";
import { StrafKategorie } from "../../types";
import {
  loadSpiele,
  updateSpiel,
  deleteSpiel,
  loadEreignisTypen,
  addEreignisTyp,
  updateEreignisTyp,
  deleteEreignisTyp,
  loadVerordnung,
  saveVerordnung,
} from "../../utils/storage";
import { ThemeColors, FONT } from "../../constants/design";
import { useColors, useThemedStyles } from "../../contexts/ThemeContext";
import LoadingSpinner from "../../components/LoadingSpinner";

interface EreignisRow {
  key: string;
  id?: string;                       // gesetzt bei bereits gespeicherten Ereignistypen
  label: string;
  emoji: string;
  strafAktiv: boolean;
  strafBetrag: string;
  strafKategorie?: StrafKategorie;   // fest verdrahtete Kategorie (z.B. schock_niederlage) bleibt beim Speichern erhalten
}

function neueZeile(): EreignisRow {
  return { key: Date.now().toString() + Math.random().toString(36).slice(2, 6), label: "", emoji: "", strafAktiv: false, strafBetrag: "" };
}

export default function EditSpielScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("");
  const [ereignisse, setEreignisse] = useState<EreignisRow[]>([]);
  const [urspruenglicheIds, setUrspruenglicheIds] = useState<string[]>([]);
  const [aktivesSpielId, setAktivesSpielId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const [alle, typen, verordnung] = await Promise.all([
          loadSpiele(),
          loadEreignisTypen(id),
          loadVerordnung(),
        ]);
        const spiel = alle.find((s) => s.id === id);
        if (!spiel) {
          router.back();
          return;
        }
        setName(spiel.name);
        setEmoji(spiel.emoji ?? "");
        setAktivesSpielId(verordnung.aktivesSpielId);
        const rows = typen.map((t) => ({
          key: t.id,
          id: t.id,
          label: t.label,
          emoji: t.emoji ?? "",
          strafAktiv: !!t.strafKategorie,
          strafBetrag: t.strafBetrag != null ? String(t.strafBetrag) : "",
          strafKategorie: t.strafKategorie,
        }));
        setEreignisse(rows);
        setUrspruenglicheIds(typen.map((t) => t.id));
        setLoading(false);
      }
      load();
    }, [id])
  );

  function updateRow(key: string, partial: Partial<EreignisRow>) {
    setEreignisse((prev) => prev.map((r) => (r.key === key ? { ...r, ...partial } : r)));
  }

  function addRow() {
    if (ereignisse.length >= 4) return;
    setEreignisse((prev) => [...prev, neueZeile()]);
  }

  function removeRow(key: string) {
    if (ereignisse.length <= 1) return;
    setEreignisse((prev) => prev.filter((r) => r.key !== key));
  }

  async function save() {
    if (!name.trim()) {
      showAlert("Name fehlt", "Bitte einen Namen für das Spiel eingeben.");
      return;
    }
    const gueltig = ereignisse.filter((r) => r.label.trim());
    if (gueltig.length === 0) {
      showAlert("Ereignis fehlt", "Bitte mindestens einen Ereignistyp mit Bezeichnung anlegen.");
      return;
    }
    setSaving(true);
    try {
      await updateSpiel(id, { name: name.trim(), emoji: emoji.trim() || undefined });

      for (let i = 0; i < gueltig.length; i++) {
        const r = gueltig[i];
        const strafBetrag = r.strafAktiv ? Number(r.strafBetrag.replace(",", ".")) || 0 : undefined;
        if (r.id) {
          await updateEreignisTyp(r.id, {
            label: r.label.trim(),
            emoji: r.emoji.trim() || undefined,
            reihenfolge: i + 1,
            strafBetrag,
          });
        } else {
          await addEreignisTyp(id, {
            label: r.label.trim(),
            emoji: r.emoji.trim() || undefined,
            reihenfolge: i + 1,
            strafBetrag,
          });
        }
      }

      const verbleibendeIds = new Set(gueltig.filter((r) => r.id).map((r) => r.id!));
      for (const alteId of urspruenglicheIds) {
        if (!verbleibendeIds.has(alteId)) {
          await deleteEreignisTyp(alteId);
        }
      }

      router.back();
    } catch {
      showAlert("Fehler", "Spiel konnte nicht gespeichert werden.");
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    const istAktiv = aktivesSpielId === id;
    showAlert(
      "Spiel löschen?",
      istAktiv
        ? "Dieses Spiel ist aktuell aktiv. Alle zugehörigen Ereignistypen und Einträge werden unwiderruflich gelöscht, das aktive Spiel wird zurückgesetzt."
        : "Alle zugehörigen Ereignistypen und Einträge werden unwiderruflich gelöscht.",
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Löschen",
          style: "destructive",
          onPress: async () => {
            await deleteSpiel(id);
            if (istAktiv) {
              const v = await loadVerordnung();
              await saveVerordnung({ ...v, aktivesSpielId: undefined });
            }
            router.replace("/spiele");
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={0}>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={20} color={c.blue} />
            </TouchableOpacity>
            <Text style={styles.title}>Spiel bearbeiten</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="z.B. Doppelkopf"
              placeholderTextColor={c.textLight}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Emoji</Text>
            <TextInput
              style={styles.input}
              value={emoji}
              onChangeText={setEmoji}
              placeholder="🎴"
              placeholderTextColor={c.textLight}
              maxLength={4}
            />
          </View>

          <Text style={styles.sectionTitle}>Ereignistypen (1–4)</Text>
          {ereignisse.map((r, i) => (
            <View key={r.key} style={styles.ereignisCard}>
              <View style={styles.ereignisHeader}>
                <Text style={styles.ereignisNr}>{i + 1}.</Text>
                {ereignisse.length > 1 && (
                  <TouchableOpacity onPress={() => removeRow(r.key)} style={{ marginLeft: "auto" }}>
                    <Ionicons name="close-circle" size={20} color={c.danger} />
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.ereignisRow}>
                <TextInput
                  style={[styles.input, styles.emojiInput]}
                  value={r.emoji}
                  onChangeText={(t) => updateRow(r.key, { emoji: t })}
                  placeholder="🎯"
                  placeholderTextColor={c.textLight}
                  maxLength={4}
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={r.label}
                  onChangeText={(t) => updateRow(r.key, { label: t })}
                  placeholder="z.B. Verloren"
                  placeholderTextColor={c.textLight}
                />
              </View>
              <View style={styles.strafRow}>
                <Text style={styles.strafLabel}>Strafe koppeln?</Text>
                <Switch
                  value={r.strafAktiv}
                  onValueChange={(v) => updateRow(r.key, { strafAktiv: v })}
                  trackColor={{ true: c.blue }}
                />
              </View>
              {r.strafAktiv && (
                <TextInput
                  style={styles.input}
                  value={r.strafBetrag}
                  onChangeText={(t) => updateRow(r.key, { strafBetrag: t })}
                  placeholder="Betrag in €"
                  placeholderTextColor={c.textLight}
                  keyboardType="decimal-pad"
                />
              )}
            </View>
          ))}

          {ereignisse.length < 4 && (
            <TouchableOpacity style={styles.addRowBtn} onPress={addRow}>
              <Ionicons name="add" size={18} color={c.blue} />
              <Text style={styles.addRowBtnText}>Ereignistyp hinzufügen</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
            <Ionicons name="checkmark" size={20} color={c.onAccent} />
            <Text style={styles.saveBtnText}>{saving ? "Wird gespeichert …" : "Spiel speichern"}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={18} color={c.danger} />
            <Text style={styles.deleteBtnText}>Spiel löschen</Text>
          </TouchableOpacity>

        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background },
  content: { padding: 20, paddingBottom: 48 },

  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20, paddingTop: 4 },
  backBtn: { padding: 4 },
  title: { fontSize: 22, fontFamily: FONT.w800, color: c.textDark },

  card: { backgroundColor: c.card, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: c.border },
  fieldLabel: { fontSize: 12, fontFamily: FONT.w700, color: c.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },

  input: { fontFamily: FONT.w400, backgroundColor: c.background, borderRadius: 10, borderWidth: 1, borderColor: c.border,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: c.textDark,
  },

  sectionTitle: { fontSize: 15, fontFamily: FONT.w800, color: c.textDark, marginTop: 12, marginBottom: 10 },

  ereignisCard: {
    backgroundColor: c.card, borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: c.border, gap: 10,
  },
  ereignisHeader: { flexDirection: "row", alignItems: "center" },
  ereignisNr: { fontSize: 13, fontFamily: FONT.w700, color: c.gold },
  ereignisRow: { flexDirection: "row", gap: 8 },
  emojiInput: { width: 56, textAlign: "center" },

  strafRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  strafLabel: { fontSize: 13, fontFamily: FONT.w600, color: c.textDark },

  addRowBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    borderRadius: 12, borderWidth: 1.5, borderColor: c.blue, borderStyle: "dashed",
    paddingVertical: 12, marginBottom: 10,
  },
  addRowBtnText: { fontSize: 13, fontFamily: FONT.w700, color: c.blue },

  saveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: c.blue, borderRadius: 16, paddingVertical: 16, marginTop: 8,
  },
  saveBtnText: { color: c.onAccent, fontSize: 16, fontFamily: FONT.w700 },

  deleteBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 14, marginTop: 12,
  },
  deleteBtnText: { color: c.danger, fontSize: 14, fontFamily: FONT.w700 },
});
