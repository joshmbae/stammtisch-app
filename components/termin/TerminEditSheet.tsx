import React, { useEffect, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { StammtischTermin } from "../../types";
import { FONT, RADIUS, TYPE, ThemeColors } from "../../constants/design";
import { useColors, useThemedStyles } from "../../contexts/ThemeContext";
import { TerminEdit } from "../../utils/useTerminAbend";
import { parseTimeString, toLocalIsoDate, toTimeString } from "../../utils/date";
import { showAlert } from "../../utils/alert";
import InlineDateTimePicker from "../InlineDateTimePicker";
import { Button, PressableScale } from "../ui";

interface Props {
  visible: boolean;
  termin: StammtischTermin;
  onClose: () => void;
  onSave: (edit: TerminEdit) => Promise<void>;
  onDelete: () => Promise<void>;
}

type Picker = "datum" | "start" | "ende" | null;

/** Termin bearbeiten oder löschen, als Sheet über dem Termin. */
export function TerminEditSheet({ visible, termin, onClose, onSave, onDelete }: Props) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [titel, setTitel] = useState("");
  const [datum, setDatum] = useState(new Date());
  const [start, setStart] = useState<Date | null>(null);
  const [ende, setEnde] = useState<Date | null>(null);
  const [ort, setOrt] = useState("");
  const [notizen, setNotizen] = useState("");
  const [picker, setPicker] = useState<Picker>(null);
  const [busy, setBusy] = useState(false);

  // Beim Öffnen immer vom aktuellen Stand ausgehen.
  useEffect(() => {
    if (!visible) return;
    setTitel(termin.titel ?? "");
    setDatum(new Date(`${termin.datum}T00:00:00`));
    setStart(termin.startZeit ? parseTimeString(termin.startZeit) : null);
    setEnde(termin.endZeit ? parseTimeString(termin.endZeit) : null);
    setOrt(termin.ort ?? "");
    setNotizen(termin.notizen ?? "");
    setPicker(null);
  }, [visible]);

  async function speichern() {
    setBusy(true);
    try {
      await onSave({
        titel: titel.trim() || undefined,
        datum: toLocalIsoDate(datum),
        startZeit: start ? toTimeString(start) : undefined,
        endZeit: ende ? toTimeString(ende) : undefined,
        ort: ort.trim() || undefined,
        notizen: notizen.trim() || undefined,
      });
      onClose();
    } catch {
      showAlert("Fehler", "Der Termin konnte nicht gespeichert werden.");
    } finally {
      setBusy(false);
    }
  }

  function loeschen() {
    showAlert("Termin löschen?", "Der Termin wird für alle unwiderruflich gelöscht.", [
      { text: "Abbrechen", style: "cancel" },
      { text: "Löschen", style: "destructive", onPress: () => { onDelete().catch(() => showAlert("Fehler", "Der Termin konnte nicht gelöscht werden.")); } },
    ]);
  }

  // Löschen-Knopf neben statt im Feld: verschachtelte Knöpfe sind im Web ungültig.
  const zeitKnopf = (wert: Date | null, art: Picker, label: string) => (
    <View style={{ flex: 1, gap: 6 }}>
      <Text style={styles.feldLabel}>{label}</Text>
      <View>
        <PressableScale onPress={() => setPicker(picker === art ? null : art)} style={styles.feld} accessibilityLabel={`${label}: ${wert ? toTimeString(wert) : "keine Uhrzeit"}`}>
          <Ionicons name="time-outline" size={16} color={c.blue} />
          <Text style={[styles.feldText, !wert && { color: c.textLight }]}>{wert ? toTimeString(wert) : "optional"}</Text>
        </PressableScale>
        {wert ? (
          <PressableScale onPress={() => (art === "start" ? setStart(null) : setEnde(null))} accessibilityLabel={`${label} entfernen`} style={styles.leeren}>
            <Ionicons name="close-circle" size={18} color={c.textMuted} />
          </PressableScale>
        ) : null}
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.kopf}>
          <PressableScale onPress={onClose} style={styles.kopfKnopf} accessibilityLabel="Abbrechen">
            <Text style={styles.abbrechen}>Abbrechen</Text>
          </PressableScale>
          <Text style={styles.titel} accessibilityRole="header">Termin bearbeiten</Text>
          <View style={styles.kopfKnopf} />
        </View>
        <ScrollView contentContainerStyle={[styles.inhalt, { paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
          {termin.art !== "stammtisch" ? (
            <View style={{ gap: 6 }}>
              <Text style={styles.feldLabel}>Titel</Text>
              <TextInput style={styles.feld} value={titel} onChangeText={setTitel} placeholder="Titel" placeholderTextColor={c.textLight} />
            </View>
          ) : null}

          <View style={{ gap: 6 }}>
            <Text style={styles.feldLabel}>Datum</Text>
            <PressableScale onPress={() => setPicker(picker === "datum" ? null : "datum")} style={styles.feld} accessibilityLabel="Datum ändern">
              <Ionicons name="calendar-outline" size={16} color={c.blue} />
              <Text style={styles.feldText}>{datum.toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</Text>
            </PressableScale>
          </View>
          {picker === "datum" ? <InlineDateTimePicker value={datum} mode="date" onChange={setDatum} onClose={() => setPicker(null)} /> : null}

          <View style={{ flexDirection: "row", gap: 10 }}>
            {zeitKnopf(start, "start", "Beginn")}
            {zeitKnopf(ende, "ende", "Ende")}
          </View>
          {picker === "start" ? (
            <InlineDateTimePicker value={start ?? parseTimeString("19:30")} mode="time" is24Hour onChange={setStart} onClose={() => setPicker(null)} />
          ) : null}
          {picker === "ende" ? (
            <InlineDateTimePicker value={ende ?? parseTimeString("23:00")} mode="time" is24Hour onChange={setEnde} onClose={() => setPicker(null)} />
          ) : null}

          <View style={{ gap: 6 }}>
            <Text style={styles.feldLabel}>Ort</Text>
            <TextInput style={styles.feld} value={ort} onChangeText={setOrt} placeholder="z. B. Gasthof Kandler, Stammtisch-Ecke" placeholderTextColor={c.textLight} />
          </View>

          <View style={{ gap: 6 }}>
            <Text style={styles.feldLabel}>Notizen</Text>
            <TextInput
              style={[styles.feld, { minHeight: 88, paddingTop: 12 }]}
              value={notizen}
              onChangeText={setNotizen}
              placeholder="Hinweise zum Abend …"
              placeholderTextColor={c.textLight}
              multiline
              textAlignVertical="top"
            />
          </View>

          <Button label="Speichern" icon="checkmark" variant="blue" onPress={speichern} loading={busy} />
          <Button label="Termin löschen" icon="trash-outline" variant="ghost" colors={{ bg: "transparent", fg: c.dangerText }} onPress={loeschen} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    kopf: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border,
    },
    kopfKnopf: { minWidth: 88, height: 44, justifyContent: "center", paddingHorizontal: 4 },
    abbrechen: { fontFamily: FONT.w600, fontSize: 16, color: c.blue },
    titel: { ...TYPE.heading, color: c.textDark },
    inhalt: { padding: 16, gap: 16 },
    feldLabel: { ...TYPE.label, color: c.textMuted },
    feld: {
      minHeight: 48, borderRadius: RADIUS.md, paddingHorizontal: 14, backgroundColor: c.card,
      borderWidth: StyleSheet.hairlineWidth, borderColor: c.hairline,
      flexDirection: "row", alignItems: "center", gap: 10,
      fontFamily: FONT.w500, fontSize: 15, color: c.textDark,
    },
    feldText: { flex: 1, fontFamily: FONT.w600, fontSize: 15, color: c.textDark },
    leeren: { position: "absolute", right: 2, top: 2, width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  });
