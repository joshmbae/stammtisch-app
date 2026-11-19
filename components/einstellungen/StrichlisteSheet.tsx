import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SpielEreignisTyp, STRICH_VORLAGEN } from "../../types";
import { FONT, RADIUS, TYPE, ThemeColors } from "../../constants/design";
import { useColors, useThemedStyles } from "../../contexts/ThemeContext";
import { deleteEreignisTyp, loadStrichliste, strichEintragHinzufuegen } from "../../utils/storage";
import { showAlert } from "../../utils/alert";
import { Button, Card, Emoji, PressableScale, Sheet } from "../ui";

/** Höchstens so viele Einträge – mehr Knöpfe passen am Abend nicht in eine Zeile. */
export const MAX_STRICHE = 4;

/**
 * Was der Stammtisch am Abend pro Person mitzählt, ohne dass es ein Spiel
 * ist: Bier, Kurze, „Runde ausgegeben“. Vorschläge per Tipp, eigene mit
 * Symbol und Name. Entfernen löscht auch die gezählten Striche.
 */
export function StrichlisteSheet({ visible, onClose, onGeaendert }: {
  visible: boolean;
  onClose: () => void;
  /** Neue Anzahl der Einträge, z. B. für die Zeile in den Einstellungen. */
  onGeaendert: (anzahl: number) => void;
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const [eintraege, setEintraege] = useState<SpielEreignisTyp[] | null>(null);
  const [emoji, setEmoji] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setEmoji("");
    setLabel("");
    loadStrichliste().then((s) => setEintraege(s?.eintraege ?? [])).catch(() => setEintraege([]));
  }, [visible]);

  const liste = eintraege ?? [];
  const voll = liste.length >= MAX_STRICHE;
  const vorschlaege = STRICH_VORLAGEN.filter((v) => !liste.some((e) => e.label.toLowerCase() === v.label.toLowerCase()));

  async function hinzufuegen(eintrag: { label: string; emoji?: string }) {
    const name = eintrag.label.trim();
    if (!name || voll || busy) return;
    if (liste.some((e) => e.label.toLowerCase() === name.toLowerCase())) {
      showAlert("Schon drauf", `„${name}“ steht schon auf der Strichliste.`);
      return;
    }
    setBusy(name);
    try {
      const neu = await strichEintragHinzufuegen({ label: name, emoji: eintrag.emoji?.trim() || undefined });
      const naechste = [...liste, neu];
      setEintraege(naechste);
      onGeaendert(naechste.length);
      setEmoji("");
      setLabel("");
    } catch (e: any) {
      showAlert("Nicht gespeichert", e?.message ?? "Bitte nochmal versuchen.");
    } finally {
      setBusy(null);
    }
  }

  function entfernen(e: SpielEreignisTyp) {
    showAlert(
      `„${e.label}“ entfernen?`,
      "Damit verschwinden auch alle Striche dafür, bei allen Abenden und in der Tabelle.",
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Entfernen",
          style: "destructive",
          onPress: async () => {
            setBusy(e.id);
            try {
              await deleteEreignisTyp(e.id);
              const naechste = liste.filter((x) => x.id !== e.id);
              setEintraege(naechste);
              onGeaendert(naechste.length);
            } catch {
              showAlert("Nicht entfernt", "Bitte nochmal versuchen.");
            } finally {
              setBusy(null);
            }
          },
        },
      ],
    );
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Strichliste">
      <Text style={styles.hinweis}>
        Wie die Striche auf dem Bierdeckel: Am Abend zählt ihr pro Person mit, am Ende gibt's eine Rangliste – wer hat die meisten Bier getrunken?
      </Text>

      {eintraege === null ? (
        <ActivityIndicator color={c.blue} style={{ marginVertical: 16 }} />
      ) : liste.length > 0 ? (
        <Card style={styles.karte}>
          {liste.map((e, i) => (
            <View key={e.id} style={[styles.zeile, i > 0 && styles.trenner]}>
              <Emoji size={22}>{e.emoji ?? "✏️"}</Emoji>
              <Text style={styles.zeileText} numberOfLines={1}>{e.label}</Text>
              {busy === e.id ? (
                <ActivityIndicator size="small" color={c.textMuted} />
              ) : (
                <PressableScale onPress={() => entfernen(e)} hitSlop={8} style={styles.weg} accessibilityLabel={`${e.label} von der Strichliste entfernen`}>
                  <Ionicons name="trash-outline" size={19} color={c.coralText} />
                </PressableScale>
              )}
            </View>
          ))}
        </Card>
      ) : (
        <Text style={styles.leer}>Noch nichts auf der Strichliste.</Text>
      )}

      {voll ? (
        <Text style={styles.leer}>{`Mehr als ${MAX_STRICHE} passen am Abend nicht nebeneinander – erst einen entfernen.`}</Text>
      ) : (
        <>
          {vorschlaege.length > 0 ? (
            <View style={styles.chips}>
              {vorschlaege.map((v) => (
                <PressableScale
                  key={v.label}
                  onPress={() => hinzufuegen(v)}
                  disabled={!!busy}
                  scaleTo={0.95}
                  style={[styles.chip, { backgroundColor: c.cardAlt }]}
                  accessibilityLabel={`${v.label} zur Strichliste hinzufügen`}
                >
                  <Emoji size={16}>{v.emoji}</Emoji>
                  <Text style={styles.chipText}>{v.label}</Text>
                  {busy === v.label ? <ActivityIndicator size="small" color={c.blue} /> : <Ionicons name="add" size={16} color={c.blue} />}
                </PressableScale>
              ))}
            </View>
          ) : null}

          <Text style={styles.abschnitt}>Etwas anderes</Text>
          <View style={styles.eigen}>
            <TextInput
              value={emoji}
              onChangeText={setEmoji}
              placeholder="🙂"
              placeholderTextColor={c.textLight}
              maxLength={4}
              style={[styles.feld, styles.emojiFeld]}
              accessibilityLabel="Symbol (Emoji, optional)"
            />
            <TextInput
              value={label}
              onChangeText={setLabel}
              placeholder="z. B. Pfeffi"
              placeholderTextColor={c.textLight}
              maxLength={24}
              style={[styles.feld, { flex: 1 }]}
              returnKeyType="done"
              onSubmitEditing={() => hinzufuegen({ label, emoji })}
              accessibilityLabel="Name"
            />
          </View>
          <Button
            label="Hinzufügen"
            icon="add"
            variant="blue"
            disabled={!label.trim() || !!busy}
            loading={busy === label.trim() && !!label.trim()}
            onPress={() => hinzufuegen({ label, emoji })}
          />
        </>
      )}
    </Sheet>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    hinweis: { ...TYPE.body, fontSize: 14, lineHeight: 20, color: c.textMid },
    karte: { paddingVertical: 2, paddingHorizontal: 14 },
    zeile: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52 },
    trenner: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
    zeileText: { flex: 1, fontFamily: FONT.w600, fontSize: 16, color: c.textDark },
    weg: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
    leer: { ...TYPE.caption, fontSize: 13, color: c.textMuted },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: { flexDirection: "row", alignItems: "center", gap: 6, height: 38, paddingHorizontal: 12, borderRadius: RADIUS.pill },
    chipText: { fontFamily: FONT.w600, fontSize: 14, color: c.textDark },
    abschnitt: { ...TYPE.label, color: c.textMuted, marginTop: 4 },
    eigen: { flexDirection: "row", gap: 8 },
    feld: { height: 48, borderRadius: RADIUS.md, backgroundColor: c.cardAlt, paddingHorizontal: 14, fontFamily: FONT.w500, fontSize: 16, color: c.textDark },
    emojiFeld: { width: 56, textAlign: "center", paddingHorizontal: 0 },
  });
