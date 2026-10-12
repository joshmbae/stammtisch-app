import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { StrafKategorieDef } from "../../types";
import { TYPE, ThemeColors } from "../../constants/design";
import { useColors, useThemedStyles } from "../../contexts/ThemeContext";
import { showAlert } from "../../utils/alert";
import { Button, Field, Sheet } from "../ui";

export interface KategorieForm {
  label: string;
  betrag: number;
  emoji: string;
  beschreibung?: string;
}

interface Props {
  visible: boolean;
  /** null = neue Kategorie anlegen. */
  kategorie: StrafKategorieDef | null;
  onClose: () => void;
  onSave: (form: KategorieForm) => Promise<void>;
  onDelete: (k: StrafKategorieDef) => Promise<void>;
}

/** Strafen-Kategorie anlegen, bearbeiten oder löschen. */
export function KategorieSheet({ visible, kategorie, onClose, onSave, onDelete }: Props) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const [emoji, setEmoji] = useState("");
  const [label, setLabel] = useState("");
  const [betrag, setBetrag] = useState("");
  const [beschreibung, setBeschreibung] = useState("");
  const [fehler, setFehler] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setEmoji(kategorie?.emoji ?? "");
    setLabel(kategorie?.label ?? "");
    setBetrag(kategorie ? String(kategorie.betrag).replace(".", ",") : "");
    setBeschreibung(kategorie?.beschreibung ?? "");
    setFehler(false);
  }, [visible, kategorie?.id]);

  async function speichern() {
    if (!label.trim()) {
      setFehler(true);
      return;
    }
    setBusy(true);
    try {
      await onSave({
        label: label.trim(),
        betrag: parseFloat(betrag.replace(",", ".")) || 0,
        emoji: emoji.trim() || "💰",
        beschreibung: beschreibung.trim() || undefined,
      });
      onClose();
    } catch {
      showAlert("Fehler", "Die Kategorie konnte nicht gespeichert werden.");
    } finally {
      setBusy(false);
    }
  }

  function loeschen() {
    if (!kategorie) return;
    showAlert("Kategorie löschen?", `„${kategorie.label}" wird unwiderruflich gelöscht.`, [
      { text: "Abbrechen", style: "cancel" },
      {
        text: "Löschen",
        style: "destructive",
        onPress: async () => {
          try {
            await onDelete(kategorie);
            onClose();
          } catch {
            showAlert("Fehler", "Die Kategorie konnte nicht gelöscht werden.");
          }
        },
      },
    ]);
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={kategorie ? "Kategorie bearbeiten" : "Neue Kategorie"}
      footer={
        <View style={{ gap: 4 }}>
          <Button label={kategorie ? "Speichern" : "Anlegen"} icon="checkmark" variant="blue" loading={busy} onPress={speichern} />
          {kategorie && !kategorie.istSystem ? (
            <Button label="Kategorie löschen" icon="trash-outline" variant="ghost" colors={{ bg: "transparent", fg: c.dangerText }} onPress={loeschen} />
          ) : null}
        </View>
      }
    >
      {kategorie?.istSystem ? <Text style={styles.hinweis}>Systemkategorie: lässt sich anpassen, aber nicht löschen.</Text> : null}
      <View style={styles.reihe}>
        <Field label="Symbol" value={emoji} onChangeText={setEmoji} placeholder="💰" maxLength={4} containerStyle={{ width: 84 }} style={styles.emoji} />
        <Field
          label="Bezeichnung"
          value={label}
          onChangeText={(t) => { setLabel(t); if (t.trim()) setFehler(false); }}
          placeholder="z. B. Handy am Tisch"
          autoFocus={!kategorie}
          containerStyle={{ flex: 1 }}
          error={fehler}
          hint={fehler ? "Bitte eine Bezeichnung eingeben" : undefined}
        />
      </View>
      <Field
        label="Betrag in €"
        value={betrag}
        onChangeText={setBetrag}
        placeholder="0"
        keyboardType="decimal-pad"
        hint="0 oder leer: Betrag beim Erfassen frei wählbar"
      />
      <Field label="Beschreibung" value={beschreibung} onChangeText={setBeschreibung} placeholder="optional, z. B. Pro angefangene Viertelstunde" />
    </Sheet>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    hinweis: { ...TYPE.body, fontSize: 14, color: c.textMuted, lineHeight: 20 },
    reihe: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
    emoji: { textAlign: "center", fontSize: 22 },
  });
