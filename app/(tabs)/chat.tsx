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
import { MemberProfile, ChatSession } from "../../types";
import { loadMembers, loadSessions, createSession, loadGeneralSessions, createGeneralSession, deleteGeneralSession } from "../../utils/storage";
import { useSession } from "../../contexts/SessionContext";
import { COLORS, SHADOWS } from "../../constants/design";
import { HamburgerButton } from "../../components/HamburgerButton";

type SessionWithMember = ChatSession & {
  memberId: string;
  memberName: string;
  memberColor: string;
};

function formatDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays === 0) return date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Gestern";
  if (diffDays < 7) return date.toLocaleDateString("de-DE", { weekday: "short" });
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}

export default function ChatTab() {
  const { activeMemberId } = useSession();
  const [sessions, setSessions] = useState<SessionWithMember[]>([]);
  const [generalSessions, setGeneralSessions] = useState<ChatSession[]>([]);
  const [members, setMembers] = useState<MemberProfile[]>([]);

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const ms = await loadMembers();
        setMembers(ms);

        // Allgemeine Sessions laden (für alle sichtbar)
        const gs = await loadGeneralSessions();
        setGeneralSessions(gs);

        // Nur Sessions des aktiven Mitglieds laden (persönliche Chats bleiben privat)
        const targetId = activeMemberId;
        if (!targetId) { setSessions([]); return; }

        const s = await loadSessions(targetId);
        const member = ms.find((m) => m.id === targetId);
        if (!member) { setSessions([]); return; }

        const mapped: SessionWithMember[] = s.map((sess) => ({
          ...sess, memberId: targetId,
          memberName: member.name, memberColor: member.avatarColor,
        }));
        mapped.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        setSessions(mapped);
      }
      load();
    }, [activeMemberId])
  );

  async function startNewChat() {
    if (!activeMemberId) return;
    const session = await createSession(activeMemberId);
    router.push(`/chat/${session.id}?memberId=${activeMemberId}`);
  }

  async function startNewGeneralChat() {
    const session = await createGeneralSession();
    router.push(`/chat/${session.id}`);
  }

  async function handleDeleteGeneralSession(sessionId: string) {
    await deleteGeneralSession(sessionId);
    setGeneralSessions((prev) => prev.filter((s) => s.id !== sessionId));
  }

  const activeMemberObj = activeMemberId ? members.find((m) => m.id === activeMemberId) : null;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <HamburgerButton />
          <View style={styles.headerTexts}>
            <Text style={styles.headerTitle}>Der Sepp</Text>
            <Text style={styles.headerSub}>Persönlicher KI-Stammtisch-Assistent</Text>
          </View>
          {activeMemberId && (
            <TouchableOpacity style={styles.newBtn} onPress={startNewChat}>
              <Ionicons name="add" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Mein persönlicher Sepp */}
        {activeMemberObj && (
          <TouchableOpacity
            style={[styles.personalCard, { borderColor: activeMemberObj.avatarColor + "66" }]}
            onPress={startNewChat}
            activeOpacity={0.85}
          >
            <View style={[styles.personalIcon, { backgroundColor: activeMemberObj.avatarColor }]}>
              <Text style={styles.personalLetter}>
                {activeMemberObj.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardName}>Mein Sepp</Text>
              <Text style={styles.cardSub}>Privates Gespräch · nur auf deinem Gerät</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
          </TouchableOpacity>
        )}

        {/* Allgemeine Sepp-Chats */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionLabel}>Stammtisch-Gespräche</Text>
          <TouchableOpacity style={styles.sectionAddBtn} onPress={startNewGeneralChat}>
            <Ionicons name="add" size={18} color={COLORS.blue} />
          </TouchableOpacity>
        </View>

        {generalSessions.length === 0 && (
          <TouchableOpacity style={styles.generalCard} onPress={startNewGeneralChat} activeOpacity={0.85}>
            <View style={styles.generalIcon}>
              <Text style={{ fontSize: 26 }}>🧔</Text>
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardName}>Neues Gespräch mit Sepp</Text>
              <Text style={styles.cardSub}>Stammtisch-Weisheiten für alle</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
          </TouchableOpacity>
        )}

        {generalSessions.map((sess) => (
          <View key={sess.id} style={styles.generalSessionRow}>
            <TouchableOpacity
              style={[styles.sessionCard, { flex: 1, marginBottom: 0 }]}
              onPress={() => router.push(`/chat/${sess.id}`)}
              activeOpacity={0.85}
            >
              <View style={styles.generalIcon}>
                <Text style={{ fontSize: 22 }}>🧔</Text>
              </View>
              <View style={styles.sessionBody}>
                <View style={styles.sessionTopRow}>
                  <Text style={styles.sessionName}>Sepp</Text>
                  <Text style={styles.sessionDate}>{formatDate(sess.updatedAt)}</Text>
                </View>
                <Text style={styles.sessionPreview} numberOfLines={1}>{sess.preview}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteSessionBtn}
              onPress={() => handleDeleteGeneralSession(sess.id)}
            >
              <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
            </TouchableOpacity>
          </View>
        ))}

        {/* Meine Chat-Verläufe */}
        {sessions.length > 0 && (
          <Text style={[styles.sectionLabel, { marginTop: 16, marginBottom: 10 }]}>Meine Gespräche</Text>
        )}

        {sessions.map((sess) => (
          <TouchableOpacity
            key={sess.id}
            style={styles.sessionCard}
            onPress={() => router.push(`/chat/${sess.id}?memberId=${sess.memberId}`)}
            activeOpacity={0.85}
          >
            <View style={[styles.sessionAvatar, { backgroundColor: sess.memberColor }]}>
              <Text style={styles.sessionAvatarText}>
                {sess.memberName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.sessionBody}>
              <View style={styles.sessionTopRow}>
                <Text style={styles.sessionName}>{sess.memberName}</Text>
                <Text style={styles.sessionDate}>{formatDate(sess.updatedAt)}</Text>
              </View>
              <Text style={styles.sessionPreview} numberOfLines={1}>{sess.preview}</Text>
            </View>
          </TouchableOpacity>
        ))}

        {members.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🧔</Text>
            <Text style={styles.emptyText}>Noch kein Mitglied angelegt.{"\n"}Sepp wartet schon auf euch!</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => router.push("/member/new")}>
              <Text style={styles.addBtnText}>Mitglied hinzufügen</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeMemberId && sessions.length === 0 && (
          <View style={styles.noSessions}>
            <Text style={styles.noSessionsText}>
              Noch keine Gespräche.{"\n"}Tippe auf{" "}
              <Text style={styles.noSessionsPlus}>+</Text> oder auf „Mein Sepp".
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
  newBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: COLORS.blue, alignItems: "center", justifyContent: "center",
  },
  newBtnActive: { backgroundColor: COLORS.textMuted },

  pickerCard: {
    backgroundColor: COLORS.goldBg, borderRadius: 16, padding: 16, marginBottom: 16,
    borderWidth: 1.5, borderColor: COLORS.gold + "55",
  },
  pickerTitle: {
    fontSize: 13, fontWeight: "700", color: COLORS.textMuted,
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12,
  },
  pickerRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  pickerAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  pickerAvatarText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
  pickerName: { fontSize: 15, fontWeight: "600", color: COLORS.textDark },
  pickerSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },

  personalCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: COLORS.card, borderRadius: 16,
    padding: 16, marginBottom: 10, gap: 14,
    borderWidth: 1.5, ...SHADOWS.light,
  },
  personalIcon: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: "center", justifyContent: "center",
  },
  personalLetter: { fontSize: 20, fontWeight: "700", color: "#FFFFFF" },

  generalCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: COLORS.card, borderRadius: 16,
    padding: 16, marginBottom: 16, gap: 14,
    borderWidth: 1.5, borderColor: COLORS.blue + "44", ...SHADOWS.light,
  },
  generalIcon: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: COLORS.goldBg, alignItems: "center", justifyContent: "center",
  },
  cardText: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: "700", color: COLORS.textDark },
  cardSub: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },

  sectionRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginBottom: 10, marginTop: 4,
  },
  sectionAddBtn: { padding: 4 },
  sectionLabel: {
    fontSize: 12, fontWeight: "700", color: COLORS.textMuted,
    letterSpacing: 0.8, textTransform: "uppercase",
  },
  generalSessionRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  deleteSessionBtn: { padding: 12 },

  sessionCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: COLORS.card, borderRadius: 14,
    padding: 12, marginBottom: 8, gap: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  sessionAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  sessionAvatarText: { fontSize: 18, fontWeight: "700", color: "#FFFFFF" },
  sessionBody: { flex: 1, gap: 4 },
  sessionTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  profileTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  profileTagText: { fontSize: 12, fontWeight: "700" },
  sessionName: { fontSize: 13, fontWeight: "700", color: COLORS.textDark, flex: 1 },
  sessionDate: { fontSize: 12, color: COLORS.textLight },
  sessionPreview: { fontSize: 14, color: COLORS.textMuted },

  empty: { alignItems: "center", paddingTop: 48, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 15, color: COLORS.textMuted, textAlign: "center", lineHeight: 22 },
  addBtn: {
    backgroundColor: COLORS.blue, borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 24, marginTop: 4,
  },
  addBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },

  noSessions: { alignItems: "center", paddingTop: 32 },
  noSessionsText: { fontSize: 14, color: COLORS.textLight, textAlign: "center", lineHeight: 21 },
  noSessionsPlus: { fontWeight: "800", color: COLORS.blue },
});
