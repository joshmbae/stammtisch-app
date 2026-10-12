import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Protokoll, StammtischTermin } from "../types";
import { loadProtokolle, loadTermine } from "../utils/storage";
import { SHADOWS, ThemeColors, FONT } from "../constants/design";
import { useColors, useThemedStyles } from "../contexts/ThemeContext";
import { HamburgerButton } from "../components/HamburgerButton";
import { BackButton } from "../components/BackButton";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorState from "../components/ErrorState";
import OfflineBanner from "../components/OfflineBanner";
import { useScreenLoad } from "../utils/useScreenLoad";

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
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const [items, setItems] = useState<ProtokollMitTermin[]>([]);

  async function load() {
    const [protokolle, termine] = await Promise.all([loadProtokolle(), loadTermine()]);
    const terminMap = Object.fromEntries(termine.map((t) => [t.id, t]));
    const merged: ProtokollMitTermin[] = protokolle
      .map((p) => ({ ...p, termin: terminMap[p.terminId] ?? null }))
      .sort((a, b) => {
        // Chronologisch nach Termin-Datum (neuester zuerst), nicht nach letzter
        // Bearbeitung — ein alt bearbeitetes Protokoll soll nicht nach oben springen.
        const da = a.termin?.datum;
        const db = b.termin?.datum;
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return db.localeCompare(da);
      });
    setItems(merged);
  }

  const { loading, refreshing, error, onRefresh, retry } = useScreenLoad(load, []);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {loading ? <LoadingSpinner /> : error ? <ErrorState message={error} onRetry={retry} /> : (
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.blue} />}
      >
        <OfflineBanner />

        <View style={styles.header}>
          <BackButton />
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
                    { backgroundColor: isStammtisch ? c.blue + "18" : c.purple + "18" }
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
                    <Ionicons name="chevron-forward" size={16} color={c.textLight} />
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
      )}
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background },
  content: { padding: 20, paddingBottom: 48 },

  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: c.cardAlt, borderRadius: 20,
    padding: 16, marginBottom: 16, ...SHADOWS.card,
    borderWidth: 1, borderColor: c.border,
  },
  headerTexts: { flex: 1 },
  headerTitle: { fontSize: 18, fontFamily: FONT.w800, color: c.textDark },
  headerSub: { fontFamily: FONT.w400, fontSize: 12, color: c.textMuted, marginTop: 2 },

  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyIcon: { fontFamily: FONT.w400, fontSize: 48 },
  emptyText: { fontFamily: FONT.w400, fontSize: 15, color: c.textMuted, textAlign: "center", lineHeight: 22 },

  card: {
    backgroundColor: c.card, borderRadius: 18, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: c.border, ...SHADOWS.light,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  typIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  typEmoji: { fontFamily: FONT.w400, fontSize: 20 },
  cardMeta: { flex: 1 },
  cardTitel: { fontSize: 15, fontFamily: FONT.w800, color: c.textDark },
  cardDatum: { fontSize: 12, color: c.blue, fontFamily: FONT.w600, marginTop: 2 },
  cardRight: { alignItems: "flex-end", gap: 4 },
  cardDate: { fontFamily: FONT.w400, fontSize: 12, color: c.textLight },
  cardExcerpt: { fontFamily: FONT.w400, fontSize: 13, color: c.textMuted, lineHeight: 19 },
});
