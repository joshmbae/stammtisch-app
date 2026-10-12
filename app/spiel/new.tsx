import React, { useState } from "react";
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
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { showAlert } from "../../utils/alert";
import { addSpiel, addEreignisTyp } from "../../utils/storage";
import { ThemeColors, FONT } from "../../constants/design";
import { useColors, useThemedStyles } from "../../contexts/ThemeContext";

interface EreignisRow {
  key: string;
  label: string;
  emoji: string;
  strafAktiv: boolean;
  strafBetrag: string;
}

function neueZeile(): EreignisRow {
  return { key: Date.now().toString() + Math.random().toString(36).slice(2, 6), label: "", emoji: "", strafAktiv: false, strafBetrag: "" };
}

export default function NewSpielScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("");
  const [ereignisse, setEreignisse] = useState<EreignisRow[]>([neueZeile()]);
  const [saving, setSaving] = useState(false);

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
      const spiel = await addSpiel({ name: name.trim(), emoji: emoji.trim() || undefined });
      for (let i = 0; i < gueltig.length; i++) {
        const r = gueltig[i];
        await addEreignisTyp(spiel.id, {
          label: r.label.trim(),
          emoji: r.emoji.trim() || undefined,
          reihenfolge: i + 1,
          strafBetrag: r.strafAktiv ? Number(r.strafBetrag.replace(",", ".")) || 0 : undefined,
        });
      }
      router.replace(`/spiel/${spiel.id}`);
    } catch {
      showAlert("Fehler", "Spiel konnte nicht gespeichert werden.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={0}>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={20} color={c.blue} />
            </TouchableOpacity>
            <Text style={styles.title}>Neues Spiel</Text>
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
});
