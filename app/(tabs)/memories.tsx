import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BabyProfile, PregnancyProfile, Memory } from "../../types";
import {
  loadProfiles,
  loadPregnancyProfiles,
  loadMemories,
} from "../../utils/storage";

type MemoryWithProfile = Memory & {
  profileName: string;
  profileColor: string;
};

const CATEGORY_LABELS: Record<Memory["category"], string> = {
  sleep: "Schlaf",
  feeding: "Ernährung",
  health: "Gesundheit",
  development: "Entwicklung",
  general: "Allgemein",
  mood: "Stimmung",
};

const CATEGORY_COLORS: Record<Memory["category"], string> = {
  sleep: "#7B9EC8",
  feeding: "#D4856A",
  health: "#C8A96E",
  development: "#4A7C6F",
  general: "#9B7BB8",
  mood: "#D4856A",
};

function formatDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0)
    return date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Gestern";
  if (diffDays < 7) return date.toLocaleDateString("de-DE", { weekday: "short" });
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

export default function MemoriesTab() {
  const [memories, setMemories] = useState<MemoryWithProfile[]>([]);
  const [hasProfiles, setHasProfiles] = useState(false);

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const [babyProfiles, pregProfiles] = await Promise.all([
          loadProfiles(),
          loadPregnancyProfiles(),
        ]);

        setHasProfiles(babyProfiles.length > 0 || pregProfiles.length > 0);

        const all: MemoryWithProfile[] = [];

        for (const b of babyProfiles) {
          const mems = await loadMemories(b.id);
          for (const m of mems) {
            all.push({ ...m, profileName: b.name, profileColor: b.avatarColor });
          }
        }

        for (const p of pregProfiles) {
          const mems = await loadMemories(p.id);
          for (const m of mems) {
            all.push({ ...m, profileName: p.nickname, profileColor: p.avatarColor });
          }
        }

        all.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setMemories(all);
      }
      load();
    }, [])
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <Text style={styles.title}>Gedächtnis</Text>
        <Text style={styles.subtitle}>Was Mia über deine Familie weiß</Text>

        {memories.map((mem) => {
          const catColor = CATEGORY_COLORS[mem.category] ?? "#9B7BB8";
          return (
            <TouchableOpacity
              key={mem.id}
              style={styles.memoryCard}
              onPress={() => router.push(`/memory/${mem.babyId}`)}
              activeOpacity={0.85}
            >
              {/* Profile tag row */}
              <View style={styles.memoryHeader}>
                <View style={[styles.profileDot, { backgroundColor: mem.profileColor }]} />
                <Text style={[styles.profileName, { color: mem.profileColor }]}>
                  {mem.profileName}
                </Text>
                <View style={styles.headerRight}>
                  <View style={[styles.categoryBadge, { backgroundColor: catColor + "22" }]}>
                    <Text style={[styles.categoryText, { color: catColor }]}>
                      {CATEGORY_LABELS[mem.category]}
                    </Text>
                  </View>
                  <Text style={styles.memoryDate}>{formatDate(mem.createdAt)}</Text>
                </View>
              </View>

              {/* Content */}
              <Text style={styles.memoryContent} numberOfLines={3}>
                {mem.content}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* Empty state */}
        {!hasProfiles && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🧠</Text>
            <Text style={styles.emptyText}>
              Noch kein Kind angelegt.{"\n"}Mia speichert beim Chatten automatisch wichtige Infos.
            </Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => router.push("/profile/new")}>
              <Text style={styles.addBtnText}>Kind hinzufügen</Text>
            </TouchableOpacity>
          </View>
        )}

        {hasProfiles && memories.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🧠</Text>
            <Text style={styles.emptyText}>
              Noch keine Erinnerungen.{"\n"}Mia speichert beim Chatten automatisch wichtige Infos.
            </Text>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FDFAF6" },
  content: { padding: 20, paddingBottom: 40 },

  title: { fontSize: 28, fontWeight: "800", color: "#2D2A26", marginBottom: 4, paddingTop: 8 },
  subtitle: { fontSize: 14, color: "#7A7269", marginBottom: 24 },

  memoryCard: {
    backgroundColor: "#F0EBE3",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 8,
  },
  memoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  profileDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  profileName: {
    fontSize: 13,
    fontWeight: "700",
    flex: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: "700",
  },
  memoryDate: {
    fontSize: 11,
    color: "#B0A89A",
  },
  memoryContent: {
    fontSize: 14,
    color: "#2D2A26",
    lineHeight: 20,
  },

  empty: { alignItems: "center", paddingTop: 48, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 15, color: "#7A7269", textAlign: "center", lineHeight: 22 },
  addBtn: {
    backgroundColor: "#4A7C6F",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 4,
  },
  addBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
});
