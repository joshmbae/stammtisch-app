import React, { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { FONT, RADIUS, TYPE, ThemeColors } from "../constants/design";
import { useColors, useThemedStyles } from "../contexts/ThemeContext";
import { Button, IconSquircle } from "./ui";
import { SYMBOL } from "../constants/symbole";

interface PinPromptProps {
  visible: boolean;
  mode: "set" | "verify";
  memberName?: string;
  error?: string;
  onCancel: () => void;
  onSubmit: (pin: string) => void;
}

/** Vier Kästchen über einem unsichtbaren Zahlenfeld – Tippen öffnet die Tastatur. */
function PinFeld({ wert, onChange, label, autoFocus }: { wert: string; onChange: (v: string) => void; label: string; autoFocus?: boolean }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const ref = useRef<TextInput>(null);
  return (
    <Pressable onPress={() => ref.current?.focus()} accessibilityLabel={label} style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.kaesten}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[styles.kasten, i === wert.length && { borderColor: c.blue, borderWidth: 2 }]}>
            <Text style={styles.punkt}>{wert[i] ? "•" : ""}</Text>
          </View>
        ))}
      </View>
      <TextInput
        ref={ref}
        value={wert}
        onChangeText={(t) => onChange(t.replace(/\D/g, "").slice(0, 4))}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={4}
        autoFocus={autoFocus}
        style={styles.versteckt}
        accessibilityLabel={label}
      />
    </Pressable>
  );
}

/** PIN festlegen oder abfragen (Profil bearbeiten/löschen). */
export default function PinPrompt({ visible, mode, memberName, error, onCancel, onSubmit }: PinPromptProps) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [mismatchError, setMismatchError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (visible) {
      setPin("");
      setPinConfirm("");
      setMismatchError(undefined);
    }
  }, [visible]);

  const canSubmit = mode === "verify" ? pin.length === 4 : pin.length === 4 && pinConfirm.length === 4;

  function handleSubmit() {
    if (!canSubmit) return;
    if (mode === "set" && pin !== pinConfirm) {
      setMismatchError("Die PINs stimmen nicht überein.");
      setPin("");
      setPinConfirm("");
      return;
    }
    setMismatchError(undefined);
    onSubmit(pin);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.card} accessibilityViewIsModal>
          <IconSquircle emoji={SYMBOL.pin} ton="blue" size={44} />
          <Text style={styles.title} accessibilityRole="header">{mode === "set" ? "PIN festlegen" : "PIN eingeben"}</Text>
          <Text style={styles.subtitle}>
            {mode === "set"
              ? `Lege einen 4-stelligen PIN für ${memberName ?? "dieses Profil"} fest. Ab jetzt braucht es diesen PIN, um das Profil zu bearbeiten oder zu löschen.`
              : `Gib den PIN für ${memberName ?? "dieses Profil"} ein, um fortzufahren.`}
          </Text>
          <PinFeld wert={pin} onChange={setPin} label="PIN" autoFocus />
          {mode === "set" ? <PinFeld wert={pinConfirm} onChange={setPinConfirm} label="PIN bestätigen" /> : null}
          {error || mismatchError ? <Text style={[styles.error, { color: c.dangerText }]} accessibilityLiveRegion="polite">{error ?? mismatchError}</Text> : null}
          <View style={styles.actions}>
            <Button label="Abbrechen" variant="secondary" onPress={onCancel} style={{ flex: 1 }} />
            <Button label={mode === "set" ? "Speichern" : "Bestätigen"} variant="blue" onPress={handleSubmit} disabled={!canSubmit} style={{ flex: 1 }} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    overlay: { flex: 1, backgroundColor: c.overlay, alignItems: "center", justifyContent: "center", padding: 24 },
    card: {
      width: "100%", maxWidth: 360, backgroundColor: c.background, borderRadius: RADIUS.hero, padding: 20, gap: 12,
      borderWidth: StyleSheet.hairlineWidth, borderColor: c.hairline,
    },
    title: { ...TYPE.title, color: c.textDark },
    subtitle: { ...TYPE.body, fontSize: 14, color: c.textMuted, lineHeight: 20 },
    label: { ...TYPE.label, color: c.textMuted },
    kaesten: { flexDirection: "row", gap: 10 },
    kasten: {
      flex: 1, height: 56, borderRadius: RADIUS.md, backgroundColor: c.card, alignItems: "center", justifyContent: "center",
      borderWidth: StyleSheet.hairlineWidth, borderColor: c.hairline,
    },
    punkt: { fontFamily: FONT.w900, fontSize: 28, color: c.textDark },
    versteckt: { position: "absolute", opacity: 0, width: 1, height: 1 },
    error: { fontFamily: FONT.w700, fontSize: 13 },
    actions: { flexDirection: "row", gap: 10, marginTop: 4 },
  });
