import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useFocusEffect } from "expo-router";
import { ActivityLogEntry, MemberProfile, StrafKategorieDef } from "../types";
import { loadActivityFeed, loadActivityFeedBefore, loadMembers, loadStrafKategorien } from "../utils/storage";
import { formatTagUeberschrift, tagesSchluessel } from "../utils/date";
import { TYPE, ThemeColors } from "../constants/design";
import { useThemedStyles } from "../contexts/ThemeContext";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorState from "../components/ErrorState";
import OfflineBanner from "../components/OfflineBanner";
import { useScreenLoad } from "../utils/useScreenLoad";
import { markFeedSeen } from "../utils/feedSeen";
import { supabase } from "../utils/supabase";
import { subscribeToActivityFeed } from "../utils/realtime";
import { useStammtisch } from "../contexts/StammtischContext";
import { Button, Card, Chip, IconSquircle, Screen, ScreenHeader } from "../components/ui";
import { CHRONIK_FILTER, ChronikBereich, ChronikEintrag, bereichVon } from "../components/chronik/ChronikEintrag";

const PAGE_SIZE = 50;

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
  const styles = useThemedStyles(makeStyles);
  const [entries, setEntries] = useState<ActivityLogEntry[]>([]);
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [strafKategorien, setStrafKategorien] = useState<StrafKategorieDef[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState<ChronikBereich>("alle");
  const { stammtischId } = useStammtisch();

  async function load() {
    const [feed, ms, kats] = await Promise.all([loadActivityFeed(PAGE_SIZE), loadMembers(), loadStrafKategorien()]);
    setEntries(feed);
    // Chronik geöffnet = alles bis zum neuesten Eintrag gesehen (Punkt an der Glocke verschwindet).
    markFeedSeen(feed[0]?.createdAt);
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
        markFeedSeen(entry.createdAt);
      });
      return () => { supabase.removeChannel(channel); };
    }, [stammtischId])
  );

  const membersById = new Map(members.map((m) => [m.id, m]));
  const sichtbar = filter === "alle" ? entries : entries.filter((e) => bereichVon(e.actionType) === filter);
  const gruppen = nachTagen(sichtbar);

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={onRefresh}
      header={
        <>
          <OfflineBanner />
          <ScreenHeader back title="Chronik" subtitle="Was in der Runde passiert ist" />
          {!loading && !error && entries.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipLeiste}>
              {CHRONIK_FILTER.map((f) => (
                <Chip key={f.key} label={f.label} selected={filter === f.key} onPress={() => setFilter(f.key)} accessibilityLabel={`Filter: ${f.label}`} />
              ))}
            </ScrollView>
          ) : null}
        </>
      }
    >
      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : entries.length === 0 ? (
        <Card enterIndex={0} style={styles.leer}>
          <IconSquircle icon="time-outline" ton="blue" size={48} />
          <Text style={styles.leerTitel}>Noch nichts los</Text>
          <Text style={styles.leerText}>Strafen, Bezahlungen, Zusagen und Spiel-Ergebnisse tauchen hier auf.</Text>
        </Card>
      ) : (
        <>
          {gruppen.length === 0 ? (
            <Text style={styles.leerFilter}>
              {hasMore ? "In den geladenen Einträgen ist hier nichts dabei." : "Keine Einträge in diesem Bereich."}
            </Text>
          ) : (
            gruppen.map((gruppe, gi) => (
              <View key={gruppe.key} style={styles.tag}>
                <Text style={styles.tagLabel} accessibilityRole="header">{gruppe.label}</Text>
                <Card enterIndex={gi < 6 ? gi : undefined} style={styles.karte}>
                  {gruppe.entries.map((entry, i) => (
                    <ChronikEintrag
                      key={entry.id}
                      entry={entry}
                      membersById={membersById}
                      strafKategorien={strafKategorien}
                      linie={i < gruppe.entries.length - 1}
                    />
                  ))}
                </Card>
              </View>
            ))
          )}
          {hasMore ? (
            <Button
              label="Ältere laden"
              icon="arrow-down"
              variant="secondary"
              size="sm"
              loading={loadingMore}
              onPress={loadMore}
              style={styles.mehr}
            />
          ) : null}
        </>
      )}
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  chipLeiste: { flexGrow: 0, flexShrink: 0 },
  chips: { gap: 6, paddingHorizontal: 16, paddingBottom: 8 },
  tag: { gap: 6 },
  tagLabel: { ...TYPE.label, color: c.textMuted, marginTop: 4, marginLeft: 4 },
  karte: { padding: 0, paddingVertical: 4 },
  mehr: { alignSelf: "center", marginTop: 4 },
  leer: { alignItems: "center", gap: 8, paddingVertical: 32 },
  leerTitel: { ...TYPE.heading, color: c.textDark, marginTop: 4 },
  leerText: { ...TYPE.body, fontSize: 14, color: c.textMuted, textAlign: "center", paddingHorizontal: 12 },
  leerFilter: { ...TYPE.body, fontSize: 14, color: c.textMuted, textAlign: "center", paddingVertical: 24 },
});
