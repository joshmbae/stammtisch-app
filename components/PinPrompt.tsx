import React, { useState, useEffect } from "react";
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { COLORS, SHADOWS } from "../constants/design";

interface PinPromptProps {
  visible: boolean;
  mode: "set" | "verify";
  memberName?: string;
  error?: string;
  onCancel: () => void;
  onSubmit: (pin: string) => void;
}

export default function PinPrompt({ visible, mode, memberName, error, onCancel, onSubmit }: PinPromptProps) {
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
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.card}>
          <Text style={styles.title}>{mode === "set" ? "PIN festlegen" : "PIN eingeben"}</Text>
          <Text style={styles.subtitle}>
            {mode === "set"
              ? `Lege einen 4-stelligen PIN für ${memberName ?? "dieses Profil"} fest. Ab jetzt braucht es diesen PIN, um das Profil zu bearbeiten oder zu löschen.`
              : `Gib den PIN für ${memberName ?? "dieses Profil"} ein, um fortzufahren.`}
          </Text>

          <TextInput
            style={styles.input}
            value={pin}
            onChangeText={(t) => setPin(t.replace(/\D/g, "").slice(0, 4))}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={4}
            placeholder="PIN"
            placeholderTextColor={COLORS.textLight}
            autoFocus
          />

          {mode === "set" && (
            <TextInput
              style={styles.input}
              value={pinConfirm}
              onChangeText={(t) => setPinConfirm(t.replace(/\D/g, "").slice(0, 4))}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
              placeholder="PIN bestätigen"
              placeholderTextColor={COLORS.textLight}
            />
          )}

          {(error || mismatchError) && <Text style={styles.error}>{error ?? mismatchError}</Text>}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelText}>Abbrechen</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={!canSubmit}
            >
              <Text style={styles.submitText}>{mode === "set" ? "Speichern" : "Bestätigen"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(26,18,8,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    gap: 12,
    ...SHADOWS.card,
  },
  title: { fontSize: 17, fontWeight: "800", color: COLORS.textDark },
  subtitle: { fontSize: 13, color: COLORS.textMuted, lineHeight: 18 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 20,
    letterSpacing: 6,
    color: COLORS.textDark,
    backgroundColor: COLORS.cardAlt,
  },
  error: { fontSize: 12, color: COLORS.danger, fontWeight: "600" },
  actions: { flexDirection: "row", gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelText: { fontSize: 14, fontWeight: "700", color: COLORS.textMuted },
  submitBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: COLORS.blue,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
});
