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
import { MemberProfile, Erinnerung, ErinnerungsKategorie } from "../../types";
import { loadMembers, loadErinnerungen } from "../../utils/storage";
import { COLORS, SHADOWS } from "../../constants/design";
import { HamburgerButton } from "../../components/HamburgerButton";

type ErinnerungWithMember = Erinnerung & {
  memberName: string;
  memberColor: string;
};

const KATEGORIE_LABELS: Record<ErinnerungsKategorie, string> = {
  bier: "Bier",
  verspätung: "Verspätung",
  anekdote: "Anekdote",
  strafe: "Strafe",
  allgemein: "Allgemein",
  stimmung: "Stimmung",
};

const KATEGORIE_COLORS: Record<ErinnerungsKategorie, string> = {
  bier:       COLORS.gold,
  verspätung: COLORS.danger,
  anekdote:   COLORS.blue,
  strafe:     "#8B4513",
  allgemein:  COLORS.textMuted,
  stimmung:   "#6B3A8A",
};

const KATEGORIE_EMOJIS: Record<ErinnerungsKategorie, string> = {
  bier:       "🍺",
  verspätung: "⏱️",
  anekdote:   "😄",
  strafe:     "💰",
  allgemein:  "📝",
  stimmung:   "😊",
};

function formatDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays === 0) return date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Gestern";
  if (diffDays < 7) return date.toLocaleDateString("de-DE", { weekday: "short" });
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

export default function ChronikTab() {
  const [erinnerungen, setErinnerungen] = useState<ErinnerungWithMember[]>([]);
  const [hasMembers, setHasMembers] = useState(false);

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const members = await loadMembers();
        setHasMembers(members.length > 0);

        const all: ErinnerungWithMember[] = [];
        for (const m of members) {
          const erins = await loadErinnerungen(m.id);
          for (const e of erins) {
            all.push({ ...e, memberName: m.name, memberColor: m.avatarColor });
          }
        }
        all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setErinnerungen(all);
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
            <Text style={styles.headerTitle}>Chronik</Text>
            <Text style={styles.headerSub}>Was Sepp über eure Runde weiß</Text>
          </View>
        </View>

        {erinnerungen.map((e) => {
          const catColor = KATEGORIE_COLORS[e.category] ?? COLORS.textMuted;
          const catEmoji = KATEGORIE_EMOJIS[e.category] ?? "📝";
          return (
            <View key={e.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.memberDot, { backgroundColor: e.memberColor }]} />
                <Text style={[styles.memberName, { color: e.memberColor }]}>{e.memberName}</Text>
                <View style={styles.headerRight}>
                  <View style={[styles.badge, { backgroundColor: catColor + "22" }]}>
                    <Text style={styles.badgeEmoji}>{catEmoji}</Text>
                    <Text style={[styles.badgeText, { color: catColor }]}>
                      {KATEGORIE_LABELS[e.category]}
                    </Text>
                  </View>
                  <Text style={styles.dateText}>{formatDate(e.createdAt)}</Text>
                </View>
              </View>
              <Text style={styles.cardContent} numberOfLines={4}>{e.content}</Text>
            </View>
          );
        })}

        {!hasMembers && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📖</Text>
            <Text style={styles.emptyText}>
              Noch kein Mitglied angelegt.{"\n"}Die Chronik füllt sich beim Chatten mit Sepp.
            </Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => router.push("/member/new")}>
              <Text style={styles.addBtnText}>Mitglied hinzufügen</Text>
            </TouchableOpacity>
          </View>
        )}

        {hasMembers && erinnerungen.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📖</Text>
            <Text style={styles.emptyText}>
              Noch keine Einträge.{"\n"}Sepp merkt sich beim Chatten wichtige Dinge.
            </Text>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, paddingBottom: 40 },

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
    backgroundColor: COLORS.card, borderRadius: 14,
    padding: 14, marginBottom: 10, gap: 8,
    borderWidth: 1, borderColor: COLORS.border,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  memberDot: { width: 8, height: 8, borderRadius: 4 },
  memberName: { fontSize: 13, fontWeight: "700", flex: 1 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeEmoji: { fontSize: 11 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  dateText: { fontSize: 11, color: COLORS.textLight },
  cardContent: { fontSize: 14, color: COLORS.textDark, lineHeight: 20 },

  empty: { alignItems: "center", paddingTop: 48, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 15, color: COLORS.textMuted, textAlign: "center", lineHeight: 22 },
  addBtn: { backgroundColor: COLORS.blue, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24, marginTop: 4 },
  addBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
});
