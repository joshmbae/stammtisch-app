import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FONT, RADIUS, TYPE, ThemeColors } from "../../constants/design";
import { useColors, useThemedStyles } from "../../contexts/ThemeContext";
import { Button, Field, PressableScale, Sheet } from "../ui";

interface Props {
  visible: boolean;
  regeln: string[];
  sonstiges?: string;
  onClose: () => void;
  /** true = gespeichert, Sheet schließt; false = Fehler, Eingaben bleiben stehen. */
  onSave: (regeln: string[], sonstiges: string | undefined) => Promise<boolean>;
}

/** Regeln und Anmerkungen der Satzung bearbeiten (aus Einstellungen und Satzung). */
export function SatzungSheet({ visible, regeln, sonstiges, onClose, onSave }: Props) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const [liste, setListe] = useState<string[]>([]);
  const [neu, setNeu] = useState("");
  const [anmerkungen, setAnmerkungen] = useState("");
  const [busy, setBusy] = useState(false);

  // Beim Öffnen immer vom gespeicherten Stand ausgehen.
  useEffect(() => {
    if (!visible) return;
    setListe(regeln);
    setNeu("");
    setAnmerkungen(sonstiges ?? "");
  }, [visible]);

  function hinzufuegen() {
    const r = neu.trim();
    if (!r) return;
    setListe((l) => [...l, r]);
    setNeu("");
  }

  async function speichern() {
    setBusy(true);
    // Eine angefangene, noch nicht übernommene Regel nicht verlieren.
    const offen = neu.trim();
    const fertig = [...liste, ...(offen ? [offen] : [])].map((r) => r.trim()).filter(Boolean);
    const ok = await onSave(fertig, anmerkungen.trim() || undefined);
    setBusy(false);
    if (ok) onClose();
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Satzung bearbeiten"
      gross
      footer={<Button label="Speichern" icon="checkmark" variant="blue" loading={busy} onPress={speichern} />}
    >
      <Text style={styles.hinweis}>
        Für alle sichtbar unter „Satzung". Rein informativ, z. B. wer eine Runde ausgibt. Strafen legt ihr im Strafenkatalog an.
      </Text>

      <Text style={styles.label}>Regeln</Text>
      {liste.length === 0 ? <Text style={styles.leer}>Noch keine Regeln.</Text> : null}
      {liste.map((regel, i) => (
        <View key={i} style={styles.regel}>
          <View style={styles.nr}>
            <Text style={styles.nrText}>{i + 1}</Text>
          </View>
          <TextInput
            style={styles.regelInput}
            value={regel}
            onChangeText={(t) => setListe((l) => l.map((x, j) => (j === i ? t : x)))}
            multiline
            accessibilityLabel={`Regel ${i + 1}`}
            placeholderTextColor={c.textLight}
          />
          <PressableScale onPress={() => setListe((l) => l.filter((_, j) => j !== i))} style={styles.weg} accessibilityLabel={`Regel ${i + 1} entfernen`}>
            <Ionicons name="close" size={18} color={c.textMid} />
          </PressableScale>
        </View>
      ))}

      <View style={styles.neuReihe}>
        <Field
          label="Neue Regel"
          value={neu}
          onChangeText={setNeu}
          placeholder="Wer zu spät kommt …"
          onSubmitEditing={hinzufuegen}
          containerStyle={{ flex: 1 }}
        />
        <PressableScale onPress={hinzufuegen} disabled={!neu.trim()} style={styles.plus} accessibilityLabel="Regel hinzufügen">
          <Ionicons name="add" size={22} color={c.onHeroBlue} />
        </PressableScale>
      </View>

      <Field
        label="Anmerkungen"
        value={anmerkungen}
        onChangeText={setAnmerkungen}
        placeholder="Weitere Hinweise für den Stammtisch …"
        multiline
      />
    </Sheet>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    hinweis: { ...TYPE.body, fontSize: 14, color: c.textMuted, lineHeight: 20 },
    label: { ...TYPE.label, color: c.textMuted, marginTop: 4 },
    leer: { ...TYPE.body, fontSize: 14, color: c.textMuted },
    regel: {
      flexDirection: "row", alignItems: "center", gap: 10, paddingLeft: 12, paddingRight: 4, minHeight: 56,
      backgroundColor: c.card, borderRadius: RADIUS.md, borderWidth: StyleSheet.hairlineWidth, borderColor: c.hairline,
    },
    nr: { width: 26, height: 26, borderRadius: 13, backgroundColor: c.blueBg, alignItems: "center", justifyContent: "center" },
    nrText: { fontFamily: FONT.w700, fontSize: 13, color: c.blue },
    regelInput: { flex: 1, fontFamily: FONT.w600, fontSize: 15, color: c.textDark, paddingVertical: 12, lineHeight: 20 },
    weg: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
    neuReihe: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
    plus: { width: 50, height: 50, borderRadius: 25, backgroundColor: c.heroBlue, alignItems: "center", justifyContent: "center" },
  });
