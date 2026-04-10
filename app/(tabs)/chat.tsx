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
import { BabyProfile, PregnancyProfile, ChatSession } from "../../types";
import {
  loadProfiles,
  loadPregnancyProfiles,
  loadSessions,
  createSession,
} from "../../utils/storage";

type SessionWithProfile = ChatSession & {
  profileId: string;
  profileName: string;
  profileColor: string;
  isPregnancy: boolean;
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
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}

export default function ChatTab() {
  const [sessions, setSessions] = useState<SessionWithProfile[]>([]);
  const [babies, setBabies] = useState<BabyProfile[]>([]);
  const [pregnancies, setPregnancies] = useState<PregnancyProfile[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const [babyProfiles, pregProfiles] = await Promise.all([
          loadProfiles(),
          loadPregnancyProfiles(),
        ]);
        setBabies(babyProfiles);
        setPregnancies(pregProfiles);

        const all: SessionWithProfile[] = [];

        for (const b of babyProfiles) {
          const s = await loadSessions(b.id);
          for (const sess of s) {
            all.push({
              ...sess,
              profileId: b.id,
              profileName: b.name,
              profileColor: b.avatarColor,
              isPregnancy: false,
            });
          }
        }

        for (const p of pregProfiles) {
          const s = await loadSessions(p.id);
          for (const sess of s) {
            all.push({
              ...sess,
              profileId: p.id,
              profileName: p.nickname,
              profileColor: p.avatarColor,
              isPregnancy: true,
            });
          }
        }

        all.sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        setSessions(all);
      }
      load();
    }, [])
  );

  async function startNewChat(profileId: string, profileName: string, isPregnancy: boolean) {
    const session = await createSession(profileId);
    setShowPicker(false);
    const param = isPregnancy ? `pregnancyId=${profileId}` : `babyId=${profileId}`;
    router.push(`/chat/${session.id}?${param}`);
  }

  function openSession(sess: SessionWithProfile) {
    const param = sess.isPregnancy
      ? `pregnancyId=${sess.profileId}`
      : `babyId=${sess.profileId}`;
    router.push(`/chat/${sess.id}?${param}`);
  }

  const hasProfiles = babies.length > 0 || pregnancies.length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Chats</Text>
          {hasProfiles && (
            <TouchableOpacity
              style={[styles.newBtn, showPicker && styles.newBtnActive]}
              onPress={() => setShowPicker((v) => !v)}
            >
              <Ionicons name={showPicker ? "close" : "add"} size={22} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>

        {/* New chat picker */}
        {showPicker && (
          <View style={styles.pickerCard}>
            <Text style={styles.pickerTitle}>Neues Gespräch</Text>
            {babies.map((b) => (
              <TouchableOpacity
                key={b.id}
                style={styles.pickerRow}
                onPress={() => startNewChat(b.id, b.name, false)}
              >
                <View style={[styles.pickerAvatar, { backgroundColor: b.avatarColor }]}>
                  <Text style={styles.pickerAvatarText}>{b.name.charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={styles.pickerName}>{b.name}</Text>
                <Ionicons name="chevron-forward" size={16} color="#B0A89A" />
              </TouchableOpacity>
            ))}
            {pregnancies.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={styles.pickerRow}
                onPress={() => startNewChat(p.id, p.nickname, true)}
              >
                <View style={[styles.pickerAvatar, { backgroundColor: p.avatarColor }]}>
                  <Text style={styles.pickerAvatarText}>{p.nickname.charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={styles.pickerName}>{p.nickname}</Text>
                <Text style={styles.pickerBadge}>Schwangerschaft</Text>
                <Ionicons name="chevron-forward" size={16} color="#B0A89A" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Allgemeiner Chat */}
        <TouchableOpacity
          style={styles.generalCard}
          onPress={() => router.push("/chat/general")}
          activeOpacity={0.85}
        >
          <View style={styles.generalIcon}>
            <Ionicons name="chatbubble-ellipses" size={24} color="#4A7C6F" />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardName}>Allgemeiner Chat</Text>
            <Text style={styles.cardSub}>Fragen ohne Kindprofil</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#B0A89A" />
        </TouchableOpacity>

        {/* Chronological sessions */}
        {sessions.length > 0 && (
          <Text style={styles.sectionLabel}>Verlauf</Text>
        )}

        {sessions.map((sess) => (
          <TouchableOpacity
            key={sess.id}
            style={styles.sessionCard}
            onPress={() => openSession(sess)}
            activeOpacity={0.85}
          >
            <View style={[styles.sessionAvatar, { backgroundColor: sess.profileColor }]}>
              <Text style={styles.sessionAvatarText}>
                {sess.profileName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.sessionBody}>
              <View style={styles.sessionTopRow}>
                <View style={[styles.profileTag, { backgroundColor: sess.profileColor + "28" }]}>
                  <Text style={[styles.profileTagText, { color: sess.profileColor }]}>
                    {sess.profileName}
                  </Text>
                </View>
                <Text style={styles.sessionDate}>{formatDate(sess.updatedAt)}</Text>
              </View>
              <Text style={styles.sessionPreview} numberOfLines={1}>
                {sess.preview}
              </Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* Empty state */}
        {!hasProfiles && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>👶</Text>
            <Text style={styles.emptyText}>Noch kein Kind angelegt.</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => router.push("/profile/new")}>
              <Text style={styles.addBtnText}>Kind hinzufügen</Text>
            </TouchableOpacity>
          </View>
        )}

        {hasProfiles && sessions.length === 0 && !showPicker && (
          <View style={styles.noSessions}>
            <Text style={styles.noSessionsText}>
              Noch keine Gespräche. Tippe auf{" "}
              <Text style={styles.noSessionsPlus}>+</Text> um zu starten.
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

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingTop: 8,
  },
  title: { fontSize: 28, fontWeight: "800", color: "#2D2A26" },
  newBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#4A7C6F",
    alignItems: "center",
    justifyContent: "center",
  },
  newBtnActive: { backgroundColor: "#7A7269" },

  pickerCard: {
    backgroundColor: "#EAF2EF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: "#C5DDD8",
  },
  pickerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#7A7269",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#C5DDD8",
  },
  pickerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  pickerAvatarText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
  pickerName: { flex: 1, fontSize: 15, fontWeight: "600", color: "#2D2A26" },
  pickerBadge: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9B7BB8",
    backgroundColor: "#F0E8FA",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },

  generalCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EAF2EF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    gap: 14,
    borderWidth: 1.5,
    borderColor: "#C5DDD8",
  },
  generalIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  cardText: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: "700", color: "#2D2A26" },
  cardSub: { fontSize: 13, color: "#7A7269", marginTop: 2 },

  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#7A7269",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 10,
    marginTop: 4,
  },

  sessionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0EBE3",
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  sessionAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  sessionAvatarText: { fontSize: 18, fontWeight: "700", color: "#FFFFFF" },
  sessionBody: { flex: 1, gap: 4 },
  sessionTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  profileTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  profileTagText: { fontSize: 12, fontWeight: "700" },
  sessionDate: { fontSize: 12, color: "#B0A89A" },
  sessionPreview: { fontSize: 14, color: "#7A7269" },

  empty: { alignItems: "center", paddingTop: 48, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 15, color: "#7A7269" },
  addBtn: {
    backgroundColor: "#4A7C6F",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 4,
  },
  addBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },

  noSessions: { alignItems: "center", paddingTop: 32 },
  noSessionsText: { fontSize: 14, color: "#B0A89A", textAlign: "center" },
  noSessionsPlus: { fontWeight: "800", color: "#4A7C6F" },
});
