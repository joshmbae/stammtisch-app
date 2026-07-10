import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { showAlert } from "../../utils/alert";
import { StammtischVerordnung } from "../../types";
import { loadVerordnung, saveVerordnung } from "../../utils/storage";
import { seedTestData, clearAllData } from "../../utils/seed";
import { COLORS, SHADOWS } from "../../constants/design";
import { HamburgerButton } from "../../components/HamburgerButton";

export default function EinstellungenScreen() {
  const [verordnung, setVerordnung] = useState<StammtischVerordnung>({ name: "Die Hellen", regeln: [] });
  const [dirty, setDirty] = useState(false);
  const [neueRegel, setNeueRegel] = useState("");
  const [seeding, setSeeding] = useState(false);

  async function handleSeed() {
    showAlert(
      "Testdaten laden?",
      "Bestehende Daten werden überschrieben. 11 Mitglieder, monatliche Stammtische seit Oktober 2024 und alle Logs werden angelegt.",
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Laden",
          style: "destructive",
          onPress: async () => {
            setSeeding(true);
            try {
              await seedTestData();
              showAlert("Fertig! 🍺", "Testdaten wurden geladen. Du kannst die App jetzt erkunden.");
            } catch (e) {
              showAlert("Fehler", "Testdaten konnten nicht geladen werden.");
            } finally {
              setSeeding(false);
            }
          },
        },
      ]
    );
  }

  async function handleClear() {
    showAlert(
      "Alle Daten löschen?",
      "Sämtliche Mitglieder, Termine und Logs werden unwiderruflich gelöscht.",
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Alles löschen",
          style: "destructive",
          onPress: async () => {
            setSeeding(true);
            try {
              await clearAllData();
              showAlert("Gelöscht", "Alle Stammtisch-Daten wurden entfernt.");
            } finally {
              setSeeding(false);
            }
          },
        },
      ]
    );
  }

  useFocusEffect(
    useCallback(() => {
      loadVerordnung().then(setVerordnung);
      setDirty(false);
    }, [])
  );

  function update(partial: Partial<StammtischVerordnung>) {
    setVerordnung((v) => ({ ...v, ...partial }));
    setDirty(true);
  }

  async function speichern() {
    await saveVerordnung(verordnung);
    setDirty(false);
    showAlert("Gespeichert", "Die Stammtischverordnung wurde gespeichert.");
  }

  function regelHinzufügen() {
    const r = neueRegel.trim();
    if (!r) return;
    update({ regeln: [...verordnung.regeln, r] });
    setNeueRegel("");
  }

  function regelLöschen(index: number) {
    update({ regeln: verordnung.regeln.filter((_, i) => i !== index) });
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <HamburgerButton />
          <View style={styles.headerTexts}>
            <Text style={styles.headerTitle}>Einstellungen</Text>
            <Text style={styles.headerSub}>Stammtischverordnung & Verwaltung</Text>
          </View>
        </View>

        {/* ── Satzung ansehen ── */}
        <TouchableOpacity
          style={styles.mitgliederCard}
          onPress={() => router.push("/satzung")}
          activeOpacity={0.85}
        >
          <View style={styles.mitgliederIcon}>
            <Text style={{ fontSize: 24 }}>📜</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.mitgliederTitle}>Satzung ansehen</Text>
            <Text style={styles.mitgliederSub}>Regeln, Infos & Verordnung</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
        </TouchableOpacity>

        {/* ── Mitglieder verwalten ── */}
        <TouchableOpacity
          style={styles.mitgliederCard}
          onPress={() => router.push("/mitglieder")}
          activeOpacity={0.85}
        >
          <View style={styles.mitgliederIcon}>
            <Text style={{ fontSize: 24 }}>🧔</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.mitgliederTitle}>Mitglieder verwalten</Text>
            <Text style={styles.mitgliederSub}>Hinzufügen, bearbeiten, entfernen</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
        </TouchableOpacity>

        {/* ── Stammtischverordnung ── */}
        <Text style={styles.sectionTitle}>📜 Stammtischverordnung</Text>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Name des Stammtischs</Text>
          <TextInput
            style={styles.input}
            value={verordnung.name}
            onChangeText={(t) => update({ name: t })}
            placeholder="z.B. Die Hellen"
            placeholderTextColor={COLORS.textLight}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Treffpunkt</Text>
          <TextInput
            style={styles.input}
            value={verordnung.treffpunkt ?? ""}
            onChangeText={(t) => update({ treffpunkt: t })}
            placeholder="z.B. Gasthof Zum Wirt, hinten links"
            placeholderTextColor={COLORS.textLight}
          />
        </View>

        <View style={styles.cardRow}>
          <View style={[styles.card, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>Stammtischtag</Text>
            <TextInput
              style={styles.input}
              value={verordnung.stammtischTag ?? ""}
              onChangeText={(t) => update({ stammtischTag: t })}
              placeholder="Jeden Donnerstag"
              placeholderTextColor={COLORS.textLight}
            />
          </View>
          <View style={[styles.card, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>Uhrzeit</Text>
            <TextInput
              style={styles.input}
              value={verordnung.stammtischzeit ?? ""}
              onChangeText={(t) => update({ stammtischzeit: t })}
              placeholder="19:30 Uhr"
              placeholderTextColor={COLORS.textLight}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Gründungsjahr</Text>
          <TextInput
            style={styles.input}
            value={verordnung.gruendungsjahr ?? ""}
            onChangeText={(t) => update({ gruendungsjahr: t })}
            placeholder="z.B. 2018"
            placeholderTextColor={COLORS.textLight}
            keyboardType="number-pad"
          />
        </View>

        {/* Regeln */}
        <Text style={styles.sectionTitle}>📋 Regeln</Text>

        {verordnung.regeln.map((regel, i) => (
          <View key={i} style={styles.regelRow}>
            <Text style={styles.regelNr}>{i + 1}.</Text>
            <Text style={styles.regelText} numberOfLines={3}>{regel}</Text>
            <TouchableOpacity onPress={() => regelLöschen(i)} style={styles.regelDelete}>
              <Ionicons name="close-circle" size={20} color={COLORS.danger} />
            </TouchableOpacity>
          </View>
        ))}

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Neue Regel hinzufügen</Text>
          <View style={styles.regelInputRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              value={neueRegel}
              onChangeText={setNeueRegel}
              placeholder="Wer zu spät kommt..."
              placeholderTextColor={COLORS.textLight}
              multiline
            />
            <TouchableOpacity style={styles.regelAddBtn} onPress={regelHinzufügen}>
              <Ionicons name="add" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Sonstiges */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Sonstige Anmerkungen</Text>
          <TextInput
            style={[styles.input, { minHeight: 80 }]}
            value={verordnung.sonstiges ?? ""}
            onChangeText={(t) => update({ sonstiges: t })}
            placeholder="Weitere Hinweise für den Stammtisch..."
            placeholderTextColor={COLORS.textLight}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* Speichern */}
        <TouchableOpacity
          style={[styles.saveBtn, !dirty && styles.saveBtnDisabled]}
          onPress={speichern}
          disabled={!dirty}
        >
          <Ionicons name="checkmark" size={20} color="#FFFFFF" />
          <Text style={styles.saveBtnText}>Verordnung speichern</Text>
        </TouchableOpacity>

        {/* ── Entwicklerwerkzeuge ── */}
        <Text style={[styles.sectionTitle, { marginTop: 32 }]}>🧪 Entwickler</Text>
        <View style={styles.devCard}>
          <Text style={styles.devHint}>
            Lädt 11 Mitglieder, monatliche Stammtische seit Oktober 2024 und alle Logs (Verspätungen, Schocken, Strafen, Kasse, Protokolle) als realistische Testdaten.
          </Text>
          <TouchableOpacity
            style={[styles.devBtn, styles.devBtnPrimary, seeding && styles.devBtnDisabled]}
            onPress={handleSeed}
            disabled={seeding}
            activeOpacity={0.85}
          >
            {seeding ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Ionicons name="flask-outline" size={18} color="#FFFFFF" />
            )}
            <Text style={styles.devBtnText}>
              {seeding ? "Wird geladen …" : "Testdaten laden"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.devBtn, styles.devBtnDanger, seeding && styles.devBtnDisabled]}
            onPress={handleClear}
            disabled={seeding}
            activeOpacity={0.85}
          >
            <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
            <Text style={styles.devBtnText}>Alle Daten löschen</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
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

  mitgliederCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 24,
    borderWidth: 1.5, borderColor: COLORS.blue + "44", ...SHADOWS.light,
  },
  mitgliederIcon: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: COLORS.goldBg, alignItems: "center", justifyContent: "center",
  },
  mitgliederTitle: { fontSize: 16, fontWeight: "700", color: COLORS.textDark },
  mitgliederSub: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },

  sectionTitle: {
    fontSize: 15, fontWeight: "800", color: COLORS.textDark,
    marginBottom: 10, marginTop: 8, letterSpacing: -0.2,
  },

  card: {
    backgroundColor: COLORS.card, borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: COLORS.border,
  },
  cardRow: { flexDirection: "row", gap: 10 },

  fieldLabel: { fontSize: 12, fontWeight: "700", color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },

  input: {
    backgroundColor: COLORS.background, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: COLORS.textDark,
  },

  regelRow: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: COLORS.card, borderRadius: 12, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: COLORS.border,
  },
  regelNr: { fontSize: 14, fontWeight: "700", color: COLORS.gold, minWidth: 20 },
  regelText: { flex: 1, fontSize: 14, color: COLORS.textDark, lineHeight: 20 },
  regelDelete: { padding: 2 },

  regelInputRow: { flexDirection: "row", gap: 8, alignItems: "flex-end" },
  regelAddBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: COLORS.blue, alignItems: "center", justifyContent: "center", flexShrink: 0,
  },

  saveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: COLORS.blue, borderRadius: 16, paddingVertical: 16, marginTop: 8,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },

  devCard: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1.5, borderColor: COLORS.danger + "44", gap: 10,
  },
  devHint: { fontSize: 13, color: COLORS.textMuted, lineHeight: 19 },
  devBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    borderRadius: 14, paddingVertical: 13,
  },
  devBtnPrimary: { backgroundColor: "#1A4480" },
  devBtnDanger:  { backgroundColor: COLORS.danger },
  devBtnDisabled: { opacity: 0.5 },
  devBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});
