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
  Platform,
  KeyboardAvoidingView,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { showAlert } from "../../utils/alert";
import { StammtischVerordnung, Spiel, SPIEL_VORLAGEN } from "../../types";
import { loadVerordnung, saveVerordnung, uploadStammtischLogo, loadSpiele, instantiateSpielVorlage, deleteStammtisch } from "../../utils/storage";
import { seedTestData, clearAllData } from "../../utils/seed";
import { hashStammtischPassword } from "../../utils/pin";
import { COLORS, SHADOWS } from "../../constants/design";
import { HamburgerButton } from "../../components/HamburgerButton";
import LoadingSpinner from "../../components/LoadingSpinner";
import InlineDateTimePicker from "../../components/InlineDateTimePicker";
import { useStammtisch } from "../../contexts/StammtischContext";
import { useSession } from "../../contexts/SessionContext";

/** Parst "YYYY" oder "YYYY-MM" (legacy: nur Jahr -> Januar). */
function parseGruendung(value?: string): Date {
  const match = value?.match(/^(\d{4})(?:-(\d{2}))?/);
  if (!match) return new Date();
  const jahr = parseInt(match[1], 10);
  const monat = match[2] ? parseInt(match[2], 10) - 1 : 0;
  return new Date(jahr, monat, 1);
}

function formatGruendungMonat(value?: string): string {
  return parseGruendung(value).toLocaleDateString("de-DE", { month: "long", year: "numeric" });
}

export default function EinstellungenScreen() {
  const [verordnung, setVerordnung] = useState<StammtischVerordnung>({ name: "Mein Stammtisch", regeln: [] });
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [neueRegel, setNeueRegel] = useState("");
  const [seeding, setSeeding] = useState(false);
  const [showGruendungPicker, setShowGruendungPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [spiele, setSpiele] = useState<Spiel[]>([]);
  const [activatingSpiel, setActivatingSpiel] = useState<string | null>(null);
  const [showDeleteForm, setShowDeleteForm] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const { stammtischId, clearStammtisch } = useStammtisch();
  const { clearSession } = useSession();

  async function handleSelectSpiel(spiel: Spiel | null) {
    setActivatingSpiel(spiel?.id ?? "none");
    try {
      const updated = { ...verordnung, aktivesSpielId: spiel?.id };
      await saveVerordnung(updated);
      setVerordnung(updated);
      setDirty(false);
    } catch (e: any) {
      showAlert("Fehler", "Spiel konnte nicht aktiviert werden: " + (e?.message ?? "Unbekannter Fehler."));
    } finally {
      setActivatingSpiel(null);
    }
  }

  async function handleActivateVorlage(vorlage: (typeof SPIEL_VORLAGEN)[number]) {
    setActivatingSpiel(vorlage.name);
    try {
      const spiel = await instantiateSpielVorlage(vorlage);
      setSpiele((prev) => [...prev, spiel]);
      const updated = { ...verordnung, aktivesSpielId: spiel.id };
      await saveVerordnung(updated);
      setVerordnung(updated);
      setDirty(false);
    } catch {
      showAlert("Fehler", "Spiel-Vorlage konnte nicht angelegt werden.");
    } finally {
      setActivatingSpiel(null);
    }
  }

  async function pickLogo() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showAlert("Kein Zugriff", "Bitte erlaube den Zugriff auf die Fotobibliothek in den Einstellungen.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;
    if (!stammtischId) return;
    setUploadingLogo(true);
    try {
      const url = await uploadStammtischLogo(stammtischId, result.assets[0].uri);
      update({ logoUrl: url });
    } catch {
      showAlert("Fehler", "Logo konnte nicht hochgeladen werden.");
    } finally {
      setUploadingLogo(false);
    }
  }

  function removeLogo() {
    update({ logoUrl: undefined });
  }

  async function handleSeed() {
    showAlert(
      "⚠️ Echte Daten löschen?",
      "Alle aktuell eingegebenen echten Daten (Mitglieder, Termine, Logs) werden unwiderruflich gelöscht und durch einen Beispiel-Teststammtisch ersetzt. Nur zum Ausprobieren gedacht.",
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Löschen & Testdaten laden",
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

  async function handleDeleteStammtisch() {
    if (!stammtischId || !deletePassword) {
      showAlert("Passwort fehlt", "Bitte das Stammtisch-Passwort eingeben.");
      return;
    }
    showAlert(
      "⚠️ Stammtisch endgültig löschen?",
      "Alle Daten – Mitglieder, Termine, Kasse, Strafen, Protokolle – werden für alle unwiderruflich gelöscht. Das kann nicht rückgängig gemacht werden.",
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Endgültig löschen",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              const passwordHash = await hashStammtischPassword(verordnung.name, deletePassword);
              const ok = await deleteStammtisch(stammtischId, passwordHash);
              if (!ok) {
                showAlert("Falsches Passwort", "Der Stammtisch wurde nicht gelöscht.");
                return;
              }
              await clearSession();
              await clearStammtisch();
              router.replace("/stammtisch-waehlen");
            } catch (e) {
              showAlert("Fehler", "Stammtisch konnte nicht gelöscht werden.");
            } finally {
              setDeleting(false);
              setDeletePassword("");
            }
          },
        },
      ]
    );
  }

  useFocusEffect(
    useCallback(() => {
      Promise.all([loadVerordnung(), loadSpiele()]).then(([v, s]) => {
        setVerordnung(v);
        setSpiele(s);
        setLoading(false);
      });
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
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={0}>
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {loading ? <LoadingSpinner /> : (
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <HamburgerButton />
          <View style={styles.headerTexts}>
            <Text style={styles.headerTitle}>Einstellungen</Text>
            <Text style={styles.headerSub}>Stammtischverordnung & Verwaltung</Text>
          </View>
        </View>

        {/* ── Stammtischverordnung ── */}
        <Text style={styles.sectionTitle}>📜 Stammtischverordnung</Text>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Stammtisch-Logo</Text>
          <View style={styles.logoRow}>
            <View style={styles.logoPreview}>
              {verordnung.logoUrl ? (
                <Image source={{ uri: verordnung.logoUrl }} style={styles.logoImg} resizeMode="contain" />
              ) : (
                <Ionicons name="image-outline" size={26} color={COLORS.textLight} />
              )}
            </View>
            <View style={styles.logoActions}>
              <TouchableOpacity style={styles.logoBtn} onPress={pickLogo} disabled={uploadingLogo}>
                {uploadingLogo ? (
                  <ActivityIndicator size="small" color={COLORS.blue} />
                ) : (
                  <Text style={styles.logoBtnText}>{verordnung.logoUrl ? "Logo ändern" : "Logo hochladen"}</Text>
                )}
              </TouchableOpacity>
              {verordnung.logoUrl && (
                <TouchableOpacity onPress={removeLogo}>
                  <Text style={styles.logoRemoveText}>Entfernen</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

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
          <Text style={styles.fieldLabel}>Gegründet</Text>
          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowGruendungPicker(true)}>
            <Ionicons name="calendar-outline" size={18} color={COLORS.blue} />
            <Text style={[styles.dateBtnText, !verordnung.gruendungsjahr && { color: COLORS.textLight }]}>
              {verordnung.gruendungsjahr ? formatGruendungMonat(verordnung.gruendungsjahr) : "Monat & Jahr auswählen"}
            </Text>
          </TouchableOpacity>
          {showGruendungPicker && (
            <InlineDateTimePicker
              value={parseGruendung(verordnung.gruendungsjahr)}
              mode="date"
              maximumDate={new Date()}
              onChange={(date) => {
                const jahrMonat = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
                update({ gruendungsjahr: jahrMonat });
              }}
              onClose={() => setShowGruendungPicker(false)}
            />
          )}
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

        {/* Aktives Spiel */}
        <Text style={styles.sectionTitle}>🎲 Aktives Spiel</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={[styles.spielRow, !verordnung.aktivesSpielId && styles.spielRowActive]}
            onPress={() => handleSelectSpiel(null)}
            activeOpacity={0.8}
          >
            <Text style={styles.spielRowEmoji}>🚫</Text>
            <Text style={styles.spielRowLabel}>Kein Spiel</Text>
            {activatingSpiel === "none" ? (
              <ActivityIndicator size="small" color={COLORS.blue} />
            ) : !verordnung.aktivesSpielId ? (
              <Ionicons name="checkmark-circle" size={20} color={COLORS.blue} />
            ) : null}
          </TouchableOpacity>

          {spiele.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={[styles.spielRow, verordnung.aktivesSpielId === s.id && styles.spielRowActive]}
              onPress={() => handleSelectSpiel(s)}
              activeOpacity={0.8}
            >
              <Text style={styles.spielRowEmoji}>{s.emoji ?? "🎮"}</Text>
              <Text style={styles.spielRowLabel}>{s.name}</Text>
              {activatingSpiel === s.id ? (
                <ActivityIndicator size="small" color={COLORS.blue} />
              ) : verordnung.aktivesSpielId === s.id ? (
                <Ionicons name="checkmark-circle" size={20} color={COLORS.blue} />
              ) : null}
            </TouchableOpacity>
          ))}

          {SPIEL_VORLAGEN.filter((v) => !spiele.some((s) => s.name === v.name)).map((v) => (
            <TouchableOpacity
              key={v.name}
              style={styles.spielRow}
              onPress={() => handleActivateVorlage(v)}
              activeOpacity={0.8}
            >
              <Text style={styles.spielRowEmoji}>{v.emoji}</Text>
              <Text style={styles.spielRowLabel}>{v.name}</Text>
              {activatingSpiel === v.name ? (
                <ActivityIndicator size="small" color={COLORS.blue} />
              ) : (
                <Text style={styles.spielRowHint}>+ Vorlage</Text>
              )}
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.spielManageLink} onPress={() => router.push("/spiele")}>
            <Text style={styles.spielManageLinkText}>Spiele verwalten →</Text>
          </TouchableOpacity>
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
            Falls du sehen willst, wie ein Teststammtisch aussieht: lädt 11 Beispiel-Mitglieder, monatliche Stammtische und Beispiel-Logs als Demo-Daten. Achtung: Das löscht alle aktuell eingegebenen echten Daten unwiderruflich.
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
              {seeding ? "Wird geladen …" : "Teststammtisch anzeigen"}
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

        {/* ── Gefahrenzone ── */}
        <Text style={[styles.sectionTitle, { marginTop: 32 }]}>⚠️ Gefahrenzone</Text>
        <View style={styles.devCard}>
          <Text style={styles.devHint}>
            Löscht diesen Stammtisch komplett und unwiderruflich — für alle Mitglieder. Alle
            Termine, Kasse, Strafen, Spiele-Logs und Protokolle gehen dabei verloren.
          </Text>
          {!showDeleteForm ? (
            <TouchableOpacity
              style={[styles.devBtn, styles.devBtnDanger]}
              onPress={() => setShowDeleteForm(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
              <Text style={styles.devBtnText}>Stammtisch löschen</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TextInput
                style={styles.input}
                value={deletePassword}
                onChangeText={setDeletePassword}
                placeholder="Stammtisch-Passwort zur Bestätigung"
                placeholderTextColor={COLORS.textLight}
                secureTextEntry
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={[styles.devBtn, styles.devBtnDanger, deleting && styles.devBtnDisabled]}
                onPress={handleDeleteStammtisch}
                disabled={deleting}
                activeOpacity={0.85}
              >
                {deleting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Ionicons name="warning-outline" size={18} color="#FFFFFF" />
                )}
                <Text style={styles.devBtnText}>
                  {deleting ? "Wird gelöscht …" : "Endgültig löschen"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setShowDeleteForm(false); setDeletePassword(""); }}>
                <Text style={styles.logoRemoveText}>Abbrechen</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

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
  dateBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: COLORS.background, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  dateBtnText: { fontSize: 14, color: COLORS.textDark, fontWeight: "600" },

  logoRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  logoPreview: {
    width: 56, height: 56, borderRadius: 14, backgroundColor: COLORS.background,
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: COLORS.border, overflow: "hidden",
  },
  logoImg: { width: 56, height: 56 },
  logoActions: { gap: 6 },
  logoBtn: {
    backgroundColor: COLORS.background, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 14, paddingVertical: 8, alignSelf: "flex-start", minWidth: 120, alignItems: "center",
  },
  logoBtnText: { fontSize: 13, fontWeight: "700", color: COLORS.blue },
  logoRemoveText: { fontSize: 12, color: COLORS.danger, fontWeight: "600" },

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

  spielRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 10, paddingHorizontal: 4, borderRadius: 10,
  },
  spielRowActive: { backgroundColor: COLORS.blue + "10" },
  spielRowEmoji: { fontSize: 20, width: 26, textAlign: "center" },
  spielRowLabel: { flex: 1, fontSize: 14, fontWeight: "600", color: COLORS.textDark },
  spielRowHint: { fontSize: 12, fontWeight: "700", color: COLORS.blue },
  spielManageLink: { marginTop: 6, paddingVertical: 6 },
  spielManageLinkText: { fontSize: 13, fontWeight: "700", color: COLORS.blue },

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
