import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Spiel, StammtischVerordnung } from "../types";
import { loadSpiele, loadVerordnung } from "../utils/storage";
import { COLORS, SHADOWS } from "../constants/design";
import { HamburgerButton } from "../components/HamburgerButton";
import LoadingSpinner from "../components/LoadingSpinner";

export default function SpieleScreen() {
  const [spiele, setSpiele] = useState<Spiel[]>([]);
  const [verordnung, setVerordnung] = useState<StammtischVerordnung | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const [s, v] = await Promise.all([loadSpiele(), loadVerordnung()]);
        setSpiele(s);
        setVerordnung(v);
        setLoading(false);
      }
      load();
    }, [])
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {loading ? <LoadingSpinner /> : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          <View style={styles.header}>
            <HamburgerButton />
            <View style={styles.headerTexts}>
              <Text style={styles.headerTitle}>Spiele</Text>
              <Text style={styles.headerSub}>Eigene Stammtisch-Spiele verwalten</Text>
            </View>
          </View>

          {spiele.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🎲</Text>
              <Text style={styles.emptyTitle}>Noch keine Spiele</Text>
              <Text style={styles.emptySub}>
                Lege in den Einstellungen eine Vorlage an oder erstelle hier ein eigenes Spiel.
              </Text>
            </View>
          ) : (
            spiele.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={styles.spielCard}
                onPress={() => router.push(`/spiel/${s.id}`)}
                activeOpacity={0.85}
              >
                <Text style={styles.spielEmoji}>{s.emoji ?? "🎮"}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.spielName}>{s.name}</Text>
                  {verordnung?.aktivesSpielId === s.id && (
                    <Text style={styles.spielAktivBadge}>Aktiv</Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
              </TouchableOpacity>
            ))
          )}

          <TouchableOpacity style={styles.addBtn} onPress={() => router.push("/spiel/new")} activeOpacity={0.85}>
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.addBtnText}>Neues Spiel</Text>
          </TouchableOpacity>

        </ScrollView>
      )}
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

  spielCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: COLORS.card, borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.light,
  },
  spielEmoji: { fontSize: 26 },
  spielName: { fontSize: 15, fontWeight: "700", color: COLORS.textDark },
  spielAktivBadge: { fontSize: 11, fontWeight: "700", color: COLORS.success, marginTop: 2 },

  addBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: COLORS.blue, borderRadius: 16, paddingVertical: 16, marginTop: 8,
  },
  addBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },

  emptyState: { alignItems: "center", paddingVertical: 40, gap: 8 },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 17, fontWeight: "800", color: COLORS.textDark },
  emptySub: { fontSize: 13, color: COLORS.textMuted, textAlign: "center", paddingHorizontal: 20 },
});
