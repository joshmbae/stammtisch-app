import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { showAlert } from "../utils/alert";
import { MemberProfile } from "../types";
import { loadMembers, deleteMember } from "../utils/storage";
import { COLORS, SHADOWS } from "../constants/design";
import { HamburgerButton } from "../components/HamburgerButton";
import { getInitial } from "../utils/format";
import PinPrompt from "../components/PinPrompt";
import { verifyPin } from "../utils/pin";

export default function MitgliederScreen() {
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [pinTarget, setPinTarget] = useState<MemberProfile | null>(null);
  const [pinError, setPinError] = useState<string | undefined>(undefined);

  useFocusEffect(
    useCallback(() => {
      loadMembers().then(setMembers);
    }, [])
  );

  function confirmAndDelete(m: MemberProfile) {
    showAlert(
      `${m.name} entfernen?`,
      "Alle Daten dieses Mitglieds werden gelöscht. Das kann nicht rückgängig gemacht werden.",
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Entfernen",
          style: "destructive",
          onPress: async () => {
            await deleteMember(m.id);
            setMembers((prev) => prev.filter((x) => x.id !== m.id));
          },
        },
      ]
    );
  }

  function handleDelete(m: MemberProfile) {
    if (m.pinHash) {
      setPinError(undefined);
      setPinTarget(m);
      return;
    }
    confirmAndDelete(m);
  }

  async function handlePinVerify(pin: string) {
    if (!pinTarget?.pinHash) return;
    const ok = await verifyPin(pinTarget.id, pin, pinTarget.pinHash);
    if (!ok) {
      setPinError("Falscher PIN.");
      return;
    }
    const target = pinTarget;
    setPinTarget(null);
    confirmAndDelete(target);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <HamburgerButton />
          <View style={styles.headerTexts}>
            <Text style={styles.headerTitle}>Die Runde</Text>
            <Text style={styles.headerSub}>Alle Stammtisch-Mitglieder</Text>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => router.push("/member/new")}
          >
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {members.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🧔</Text>
            <Text style={styles.emptyText}>Noch keine Mitglieder.{"\n"}Die Hellen warten auf euch!</Text>
            <TouchableOpacity style={styles.emptyAddBtn} onPress={() => router.push("/member/new")}>
              <Text style={styles.emptyAddBtnText}>Erstes Mitglied anlegen</Text>
            </TouchableOpacity>
          </View>
        )}

        {members.map((m) => (
          <View key={m.id} style={styles.memberCard}>
            <TouchableOpacity
              style={styles.memberCardInner}
              onPress={() => router.push(`/member/${m.id}`)}
              activeOpacity={0.85}
            >
              <View style={[styles.avatar, { backgroundColor: m.avatarColor }]}>
                {m.photoUri ? (
                  <Image source={{ uri: m.photoUri }} style={styles.avatarImg} />
                ) : (
                  <Text style={styles.avatarLetter}>{getInitial(m.name)}</Text>
                )}
              </View>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{m.name}{m.spitzname ? ` „${m.spitzname}"` : ""}</Text>
                <Text style={styles.memberSub}>{m.rolle}{m.lieblingsgetraenk ? ` · ${m.lieblingsgetraenk}` : ""}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => handleDelete(m)}
            >
              <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
            </TouchableOpacity>
          </View>
        ))}

        {members.length > 0 && (
          <TouchableOpacity style={styles.addLink} onPress={() => router.push("/member/new")}>
            <Ionicons name="add-circle-outline" size={16} color={COLORS.blue} />
            <Text style={styles.addLinkText}>Weiteres Mitglied hinzufügen</Text>
          </TouchableOpacity>
        )}

      </ScrollView>

      <PinPrompt
        visible={!!pinTarget}
        mode="verify"
        memberName={pinTarget?.name}
        error={pinError}
        onCancel={() => setPinTarget(null)}
        onSubmit={handlePinVerify}
      />
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
  addBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: COLORS.blue, alignItems: "center", justifyContent: "center",
  },

  empty: { alignItems: "center", paddingTop: 48, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 15, color: COLORS.textMuted, textAlign: "center", lineHeight: 22 },
  emptyAddBtn: {
    backgroundColor: COLORS.blue, borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 24, marginTop: 8,
  },
  emptyAddBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },

  memberCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: COLORS.card, borderRadius: 16, marginBottom: 10,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.light, overflow: "hidden",
  },
  memberCardInner: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarImg: { width: 48, height: 48, borderRadius: 24 },
  avatarLetter: { fontSize: 20, fontWeight: "700", color: "#FFFFFF" },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 15, fontWeight: "700", color: COLORS.textDark },
  memberSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  deleteBtn: { padding: 16 },

  addLink: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingVertical: 8, paddingHorizontal: 4, marginTop: 4, alignSelf: "flex-start",
  },
  addLinkText: { fontSize: 14, fontWeight: "600", color: COLORS.blue },
});
