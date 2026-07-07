import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { ActivityLogEntry, MemberProfile } from "../types";
import { loadActivityFeed, loadMembers } from "../utils/storage";
import { renderActivity } from "../utils/activityFeed";
import { COLORS, SHADOWS } from "../constants/design";
import { HamburgerButton } from "../components/HamburgerButton";

function formatZeit(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  const time = date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 0) return `Heute, ${time}`;
  if (diffDays === 1) return `Gestern, ${time}`;
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }) + `, ${time}`;
}

function FeedRow({
  entry,
  membersById,
}: {
  entry: ActivityLogEntry;
  membersById: Map<string, MemberProfile>;
}) {
  const rendered = renderActivity(entry, membersById);
  const subject = entry.subjectMemberId ? membersById.get(entry.subjectMemberId) : undefined;

  return (
    <View style={styles.row}>
      {subject?.photoUri ? (
        <Image source={{ uri: subject.photoUri }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, { backgroundColor: subject?.avatarColor ?? COLORS.border, alignItems: "center", justifyContent: "center" }]}>
          <Text style={{ fontSize: 16 }}>{rendered.emoji}</Text>
        </View>
      )}
      <View style={styles.rowBody}>
        <Text style={styles.rowText}>{rendered.text}</Text>
        <Text style={styles.rowMeta}>
          {formatZeit(entry.createdAt)}
          {rendered.actorText ? ` · ${rendered.actorText}` : ""}
        </Text>
      </View>
    </View>
  );
}

export default function FeedScreen() {
  const [entries, setEntries] = useState<ActivityLogEntry[]>([]);
  const [members, setMembers] = useState<MemberProfile[]>([]);

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const [feed, ms] = await Promise.all([loadActivityFeed(200), loadMembers()]);
        setEntries(feed);
        setMembers(ms);
      }
      load();
    }, [])
  );

  const membersById = new Map(members.map((m) => [m.id, m]));

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
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
          <View style={styles.card}>
            {entries.map((entry) => (
              <FeedRow key={entry.id} entry={entry} membersById={membersById} />
            ))}
          </View>
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

  card: {
    backgroundColor: COLORS.card, borderRadius: 18,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.light,
    paddingHorizontal: 14,
  },
  row: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  avatar: { width: 36, height: 36, borderRadius: 18, marginTop: 1 },
  rowBody: { flex: 1 },
  rowText: { fontSize: 14, fontWeight: "600", color: COLORS.textDark, lineHeight: 19 },
  rowMeta: { fontSize: 11, color: COLORS.textLight, marginTop: 3 },

  emptyState: { alignItems: "center", paddingVertical: 60, gap: 8 },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 17, fontWeight: "800", color: COLORS.textDark },
  emptySub: { fontSize: 13, color: COLORS.textMuted, textAlign: "center", paddingHorizontal: 30 },
});
