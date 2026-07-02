import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Protokoll, StammtischTermin } from "../types";
import { loadProtokolle, loadTermine } from "../utils/storage";
import { COLORS, SHADOWS } from "../constants/design";
import { HamburgerButton } from "../components/HamburgerButton";

type ProtokollMitTermin = Protokoll & {
  termin: StammtischTermin | null;
};

function formatDatum(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatUpdated(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

export default function ProtokollListeScreen() {
  const [items, setItems] = useState<ProtokollMitTermin[]>([]);

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const [protokolle, termine] = await Promise.all([loadProtokolle(), loadTermine()]);
        const terminMap = Object.fromEntries(termine.map((t) => [t.id, t]));
        const merged: ProtokollMitTermin[] = protokolle
          .map((p) => ({ ...p, termin: terminMap[p.terminId] ?? null }))
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        setItems(merged);
      }
      load();
    }, [])
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <HamburgerButton />
          <View style={styles.headerTexts}>
            <Text style={styles.headerTitle}>Protokolle</Text>
            <Text style={styles.headerSub}>Aufzeichnungen aller Stammtische</Text>
          </View>
        </View>

        {items.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyText}>
              Noch kein Protokoll geschrieben.{"\n"}
              Öffne einen Termin und starte das Protokoll.
            </Text>
          </View>
        ) : (
          items.map((item) => {
            const isStammtisch = item.termin?.art === "stammtisch";
            const terminName = item.termin
              ? (item.termin.titel ?? (isStammtisch ? "Stammtisch" : "Veranstaltung"))
              : "Unbekannter Termin";
            const terminDatum = item.termin ? formatDatum(item.termin.datum) : "";

            return (
              <TouchableOpacity
                key={item.id}
                style={styles.card}
                onPress={() => router.push(`/protokoll/${item.terminId}`)}
                activeOpacity={0.88}
              >
                <View style={styles.cardHeader}>
                  <View style={[
                    styles.typIcon,
                    { backgroundColor: isStammtisch ? COLORS.blue + "18" : "#6B3A8A18" }
                  ]}>
                    <Text style={styles.typEmoji}>{isStammtisch ? "🍺" : "🎉"}</Text>
                  </View>
                  <View style={styles.cardMeta}>
                    <Text style={styles.cardTitel}>
                      {item.titel || terminName}
                    </Text>
                    <Text style={styles.cardDatum}>{terminDatum}</Text>
                  </View>
                  <View style={styles.cardRight}>
                    <Text style={styles.cardDate}>
                      {formatUpdated(item.updatedAt)}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color={COLORS.textLight} />
                  </View>
                </View>
                <Text style={styles.cardExcerpt} numberOfLines={3}>
                  {item.inhalt}
                </Text>
              </TouchableOpacity>
            );
          })
        )}
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

  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 15, color: COLORS.textMuted, textAlign: "center", lineHeight: 22 },

  card: {
    backgroundColor: COLORS.card, borderRadius: 18, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.light,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  typIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  typEmoji: { fontSize: 20 },
  cardMeta: { flex: 1 },
  cardTitel: { fontSize: 15, fontWeight: "800", color: COLORS.textDark },
  cardDatum: { fontSize: 12, color: COLORS.blue, fontWeight: "600", marginTop: 2 },
  cardRight: { alignItems: "flex-end", gap: 4 },
  cardDate: { fontSize: 12, color: COLORS.textLight },
  cardExcerpt: { fontSize: 13, color: COLORS.textMuted, lineHeight: 19 },
});
