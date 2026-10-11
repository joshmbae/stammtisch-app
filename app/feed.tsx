import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, Image, RefreshControl, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ActivityLogEntry, MemberProfile, StrafKategorieDef } from "../types";
import { loadActivityFeed, loadActivityFeedBefore, loadMembers, loadStrafKategorien } from "../utils/storage";
import { activityRoute, renderActivity } from "../utils/activityFeed";
import { formatTagUeberschrift, formatUhrzeit, tagesSchluessel } from "../utils/date";
import { SHADOWS, ThemeColors } from "../constants/design";
import { useColors, useThemedStyles } from "../contexts/ThemeContext";
import { HamburgerButton } from "../components/HamburgerButton";
import { BackButton } from "../components/BackButton";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorState from "../components/ErrorState";
import OfflineBanner from "../components/OfflineBanner";
import { useScreenLoad } from "../utils/useScreenLoad";
import { supabase } from "../utils/supabase";
import { subscribeToActivityFeed } from "../utils/realtime";
import { useStammtisch } from "../contexts/StammtischContext";

const PAGE_SIZE = 50;

function FeedRow({
  entry,
  membersById,
  strafKategorien,
  last,
}: {
  entry: ActivityLogEntry;
  membersById: Map<string, MemberProfile>;
  strafKategorien: StrafKategorieDef[];
  last: boolean;
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const rendered = renderActivity(entry, membersById, strafKategorien);
  const subjectId = entry.subjectMemberId ?? entry.actorMemberId;
  const subject = subjectId ? membersById.get(subjectId) : undefined;
  const route = activityRoute(entry);

  const avatar = subject?.photoUri ? (
    <Image source={{ uri: subject.photoUri }} style={styles.avatar} />
  ) : (
    <View style={[styles.avatar, { backgroundColor: subject?.avatarColor ?? c.border, alignItems: "center", justifyContent: "center" }]}>
      <Text style={{ fontSize: 16 }}>{rendered.emoji}</Text>
    </View>
  );

  return (
    <TouchableOpacity
      style={[styles.row, last && { borderBottomWidth: 0 }]}
      onPress={route ? () => router.push(route as any) : undefined}
      disabled={!route}
      activeOpacity={0.7}
    >
      {subject ? (
        <TouchableOpacity onPress={() => router.push(`/member/${subject.id}`)} activeOpacity={0.7} hitSlop={6}>
          {avatar}
        </TouchableOpacity>
      ) : avatar}
      <View style={styles.rowBody}>
        <Text style={styles.rowText}>
          {subject?.photoUri ? `${rendered.emoji} ` : ""}{rendered.text}
        </Text>
        {rendered.detail ? <Text style={styles.rowDetail}>{rendered.detail}</Text> : null}
        <Text style={styles.rowMeta}>
          {formatUhrzeit(entry.createdAt)}
          {rendered.actorText ? ` · ${rendered.actorText}` : ""}
        </Text>
      </View>
      {route ? <Ionicons name="chevron-forward" size={16} color={c.textLight} style={{ marginTop: 10 }} /> : null}
    </TouchableOpacity>
  );
}

/** Gruppiert die (absteigend sortierten) Einträge nach Kalendertag. */
function nachTagen(entries: ActivityLogEntry[]): { key: string; label: string; entries: ActivityLogEntry[] }[] {
  const gruppen: { key: string; label: string; entries: ActivityLogEntry[] }[] = [];
  for (const e of entries) {
    const key = tagesSchluessel(e.createdAt);
    const letzte = gruppen[gruppen.length - 1];
    if (letzte && letzte.key === key) letzte.entries.push(e);
    else gruppen.push({ key, label: formatTagUeberschrift(e.createdAt), entries: [e] });
  }
  return gruppen;
}

export default function FeedScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const [entries, setEntries] = useState<ActivityLogEntry[]>([]);
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [strafKategorien, setStrafKategorien] = useState<StrafKategorieDef[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const { stammtischId } = useStammtisch();

  async function load() {
    const [feed, ms, kats] = await Promise.all([loadActivityFeed(PAGE_SIZE), loadMembers(), loadStrafKategorien()]);
    setEntries(feed);
    setMembers(ms);
    setStrafKategorien(kats);
    setHasMore(feed.length >= PAGE_SIZE);
  }

  async function loadMore() {
    const oldest = entries[entries.length - 1];
    if (!oldest || loadingMore) return;
    setLoadingMore(true);
    try {
      const older = await loadActivityFeedBefore(oldest.createdAt, PAGE_SIZE);
      setEntries((prev) => [...prev, ...older.filter((o) => !prev.some((p) => p.id === o.id))]);
      setHasMore(older.length >= PAGE_SIZE);
    } catch {
      // Offline o.ä. — Button bleibt stehen, nächster Tipp versucht's erneut.
    } finally {
      setLoadingMore(false);
    }
  }

  const { loading, refreshing, error, onRefresh, retry } = useScreenLoad(load, []);

  useFocusEffect(
    useCallback(() => {
      if (!stammtischId) return;
      const channel = subscribeToActivityFeed(stammtischId, (entry) => {
        setEntries((prev) => (prev.some((e) => e.id === entry.id) ? prev : [entry, ...prev]));
      });
      return () => { supabase.removeChannel(channel); };
    }, [stammtischId])
  );

  const membersById = new Map(members.map((m) => [m.id, m]));

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
            <Text style={styles.headerTitle}>Aktivität</Text>
            <Text style={styles.headerSub}>Was in der Runde passiert ist</Text>
          </View>
        </View>

        {entries.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyTitle}>Noch nichts los</Text>
            <Text style={styles.emptySub}>Strafen, Bezahlungen und Schock-Ergebnisse tauchen hier auf.</Text>
          </View>
        ) : (
          <>
            {nachTagen(entries).map((gruppe) => (
              <View key={gruppe.key} style={styles.dayGroup}>
                <Text style={styles.dayLabel}>{gruppe.label}</Text>
                <View style={styles.card}>
                  {gruppe.entries.map((entry, i) => (
                    <FeedRow
                      key={entry.id}
                      entry={entry}
                      membersById={membersById}
                      strafKategorien={strafKategorien}
                      last={i === gruppe.entries.length - 1}
                    />
                  ))}
                </View>
              </View>
            ))}
            {hasMore && (
              <TouchableOpacity style={styles.moreBtn} onPress={loadMore} disabled={loadingMore} activeOpacity={0.8}>
                {loadingMore
                  ? <ActivityIndicator size="small" color={c.blue} />
                  : <Text style={styles.moreBtnText}>Ältere Einträge laden</Text>}
              </TouchableOpacity>
            )}
          </>
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
  headerTitle: { fontSize: 18, fontWeight: "800", color: c.textDark },
  headerSub: { fontSize: 12, color: c.textMuted, marginTop: 2 },

  card: {
    backgroundColor: c.card, borderRadius: 18,
    borderWidth: 1, borderColor: c.border, ...SHADOWS.light,
    paddingHorizontal: 14,
  },
  row: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.border,
  },
  avatar: { width: 36, height: 36, borderRadius: 18, marginTop: 1 },
  rowBody: { flex: 1 },
  rowText: { fontSize: 14, fontWeight: "600", color: c.textDark, lineHeight: 19 },
  rowDetail: { fontSize: 13, color: c.textMuted, fontStyle: "italic", marginTop: 3, lineHeight: 18 },
  rowMeta: { fontSize: 11, color: c.textLight, marginTop: 3 },

  dayGroup: { marginBottom: 14 },
  dayLabel: {
    fontSize: 12, fontWeight: "800", color: c.textMuted,
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, marginLeft: 4,
  },
  moreBtn: {
    alignItems: "center", justifyContent: "center", paddingVertical: 14, marginTop: 4,
    borderRadius: 14, borderWidth: 1, borderColor: c.border, backgroundColor: c.card,
  },
  moreBtnText: { fontSize: 14, fontWeight: "700", color: c.blue },

  emptyState: { alignItems: "center", paddingVertical: 60, gap: 8 },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 17, fontWeight: "800", color: c.textDark },
  emptySub: { fontSize: 13, color: c.textMuted, textAlign: "center", paddingHorizontal: 30 },
});
