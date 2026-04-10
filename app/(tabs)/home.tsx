import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BabyProfile, PregnancyProfile } from "../../types";
import { loadProfiles, loadPregnancyProfiles, createSession, loadMilestoneProgress } from "../../utils/storage";
import { getCurrentPhase, getAgeWeeks, getPhaseBadgeNumber } from "../../utils/developmentPhases";
import { MILESTONES, getActiveMilestones } from "../../utils/milestoneData";
import { getPregnancyBlock } from "../../utils/pregnancyDevelopmentContent";
import MiaLogo from "../../components/MiaLogo";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcSSW(dueDateISO: string): number {
  const daysUntilDue = Math.floor((new Date(dueDateISO).getTime() - Date.now()) / 86400000);
  return Math.max(0, Math.min(42, Math.floor((280 - daysUntilDue) / 7)));
}

function berechneAlter(birthDateISO: string): string {
  const d = Math.floor((Date.now() - new Date(birthDateISO).getTime()) / 86400000);
  if (d < 14) return `${d} ${d === 1 ? "Tag" : "Tage"} alt`;
  const w = Math.floor(d / 7), wd = d % 7;
  if (d < 112) return wd > 0 ? `${w} Wo. ${wd} T. alt` : `${w} Wochen alt`;
  const mo = Math.floor(d / 30.44), mw = Math.floor((d % 30.44) / 7);
  if (d < 730) return mw > 0 ? `${mo} Mo. ${mw} Wo. alt` : `${mo} Monate alt`;
  const y = Math.floor(d / 365), m = Math.floor((d % 365) / 30);
  return m > 0 ? `${y} J. ${m} Mo.` : `${y} Jahre alt`;
}

function getGreeting(): { line1: string; line2: string } {
  const h = new Date().getHours();
  if (h < 6)  return { line1: "Noch wach?", line2: "Ich bin für dich da 🌙" };
  if (h < 12) return { line1: "Guten Morgen!", line2: "Schön, dass du da bist ☀️" };
  if (h < 17) return { line1: "Hallo!", line2: "Wie läuft der Tag so? 🌿" };
  if (h < 21) return { line1: "Guten Abend!", line2: "Ich hoffe, es war ein schöner Tag 🍂" };
  return { line1: "Gute Nacht bald!", line2: "Noch eine letzte Frage? 🌙" };
}

function getMiaPrompt(profiles: BabyProfile[], pregnancies: PregnancyProfile[]): string {
  const h = new Date().getHours();
  if (profiles.length === 1) {
    const name = profiles[0].name;
    if (h < 12) return `Wie war die Nacht mit ${name}?`;
    if (h < 17) return `Wie geht es ${name} heute?`;
    return `Wie war der Tag mit ${name}?`;
  }
  if (profiles.length > 1) return "Was beschäftigt dich gerade?";
  if (pregnancies.length > 0) return "Wie geht es dir heute?";
  return "Stell mir deine erste Frage";
}

// ─── Baby Card ────────────────────────────────────────────────────────────────

function BabyCard({ profile, achievedIds, onChat }: { profile: BabyProfile; achievedIds: Set<string>; onChat: () => void }) {
  const phase = getCurrentPhase(profile.birthDate);
  const ageWeeks = getAgeWeeks(profile.birthDate);

  // Aktive Meilensteine der aktuellen Phase
  const active = getActiveMilestones(ageWeeks);
  const achieved = active.filter((m) => achievedIds.has(m.id)).length;
  const total = active.length;
  const pct = total > 0 ? achieved / total : 0;

  const badgeNum = getPhaseBadgeNumber(profile.birthDate, achievedIds, MILESTONES);

  return (
    <TouchableOpacity
      style={styles.richCard}
      onPress={() => router.push(`/profile/${profile.id}`)}
      activeOpacity={0.88}
    >
      {/* Top row: Avatar + Name + Age + Chat button */}
      <View style={styles.richCardTop}>
        <View>
          {profile.photoUri ? (
            <Image source={{ uri: profile.photoUri }} style={styles.richAvatar} />
          ) : (
            <View style={[styles.richAvatarPlaceholder, { backgroundColor: profile.avatarColor }]}>
              <Text style={styles.richAvatarLetter}>{profile.name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          {badgeNum > 0 && (
            <View style={styles.medalBadge}>
              <Text style={styles.medalEmoji}>{badgeNum}</Text>
            </View>
          )}
        </View>
        <View style={styles.richCardMeta}>
          <Text style={styles.richCardName}>{profile.name}</Text>
          <Text style={styles.richCardSub}>{berechneAlter(profile.birthDate)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.chatPill, { backgroundColor: profile.avatarColor }]}
          onPress={onChat}
          activeOpacity={0.8}
        >
          <Ionicons name="chatbubble-ellipses" size={13} color="#FFFFFF" />
          <Text style={styles.chatPillText}>Mia fragen</Text>
        </TouchableOpacity>
      </View>

      {/* Phase strip + Fortschritt */}
      {phase && (
        <View style={styles.phaseStrip}>
          <View style={styles.phaseStripDot} />
          <Text style={styles.phaseStripText} numberOfLines={1}>{phase.emoji} {phase.title}</Text>
          {total > 0 && (
            <View style={styles.phaseProgressWrap}>
              <View style={styles.phaseProgressTrack}>
                <View style={[styles.phaseProgressFill, {
                  width: `${Math.round(pct * 100)}%` as `${number}%`,
                  backgroundColor: pct === 1 ? "#C8A96E" : "#4A7C6F",
                }]} />
              </View>
              <Text style={styles.phaseProgressLabel}>{achieved}/{total}</Text>
            </View>
          )}
        </View>
      )}

    </TouchableOpacity>
  );
}

// ─── Pregnancy Card ───────────────────────────────────────────────────────────

function PregnancyCard({ preg, onChat }: { preg: PregnancyProfile; onChat: () => void }) {
  const ssw = calcSSW(preg.dueDate);
  const block = getPregnancyBlock(ssw);

  return (
    <TouchableOpacity
      style={styles.richCard}
      onPress={() => router.push(`/profile/pregnancy/${preg.id}`)}
      activeOpacity={0.88}
    >
      {/* Top row */}
      <View style={styles.richCardTop}>
        <View style={[styles.richAvatarPlaceholder, { backgroundColor: preg.avatarColor }]}>
          <Text style={{ fontSize: 22 }}>🤰</Text>
        </View>
        <View style={styles.richCardMeta}>
          <Text style={styles.richCardName}>{preg.nickname}</Text>
          <Text style={styles.richCardSub}>
            SSW {ssw} · ET {new Date(preg.dueDate).toLocaleDateString("de-DE", { day: "2-digit", month: "long" })}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.chatPill, { backgroundColor: preg.avatarColor }]}
          onPress={onChat}
          activeOpacity={0.8}
        >
          <Ionicons name="chatbubble-ellipses" size={13} color="#FFFFFF" />
          <Text style={styles.chatPillText}>Mia fragen</Text>
        </TouchableOpacity>
      </View>

      {/* Phase strip */}
      {block && (
        <View style={styles.phaseStrip}>
          <View style={[styles.phaseStripDot, { backgroundColor: preg.avatarColor }]} />
          <Text style={styles.phaseStripText} numberOfLines={1}>
            {block.ageLabel} · Baby so groß wie {block.babySize}
          </Text>
          <Ionicons name="chevron-forward" size={12} color="#B0A89A" />
        </View>
      )}

      {/* Trimester badge */}
      {block && (
        <View style={[styles.trimesterRow, { backgroundColor: preg.avatarColor + "12", borderColor: preg.avatarColor + "33" }]}>
          <Text style={styles.trimesterEmoji}>
            {block.trimester === 1 ? "🌱" : block.trimester === 2 ? "🌿" : "🌸"}
          </Text>
          <Text style={[styles.trimesterText, { color: preg.avatarColor }]}>
            {block.trimester === 1 ? "1. Trimester" : block.trimester === 2 ? "2. Trimester" : "3. Trimester"}
            {" · "}{block.babyWeightApprox}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const [profiles, setProfiles] = useState<BabyProfile[]>([]);
  const [pregnancies, setPregnancies] = useState<PregnancyProfile[]>([]);
  const [milestoneMap, setMilestoneMap] = useState<Record<string, Set<string>>>({});

  useFocusEffect(
    useCallback(() => {
      loadProfiles().then(async (loaded) => {
        setProfiles(loaded);
        const map: Record<string, Set<string>> = {};
        await Promise.all(loaded.map(async (p) => {
          const progress = await loadMilestoneProgress(p.id);
          map[p.id] = new Set(progress.filter((x) => x.status === "achieved").map((x) => x.milestoneId));
        }));
        setMilestoneMap(map);
      });
      loadPregnancyProfiles().then(setPregnancies);
    }, [])
  );

  async function startChildChat(profileId: string) {
    const session = await createSession(profileId);
    router.push(`/chat/${session.id}?babyId=${profileId}`);
  }

  async function startPregnancyChat(pregId: string) {
    const session = await createSession(pregId);
    router.push(`/chat/${session.id}?babyId=${pregId}`);
  }

  const greeting = getGreeting();
  const hasAnything = profiles.length > 0 || pregnancies.length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <MiaLogo />
          <View style={styles.headerTexts}>
            <Text style={styles.headerLine1}>{greeting.line1}</Text>
            <Text style={styles.headerLine2}>{greeting.line2}</Text>
            <Text style={styles.headerMiaLabel}>Mia · deine Baby Begleitung</Text>
          </View>
          <TouchableOpacity style={styles.familieBtn} onPress={() => router.push("/familie")}>
            <Ionicons name="people-outline" size={22} color="#7A7269" />
          </TouchableOpacity>
        </View>

        {/* ── Frag Mia ── */}
        <TouchableOpacity
          style={styles.featuredCard}
          onPress={() => router.push("/chat/general")}
          activeOpacity={0.88}
        >
          <View style={styles.featuredIcon}>
            <Text style={{ fontSize: 24 }}>💬</Text>
          </View>
          <View style={styles.featuredTexts}>
            <Text style={styles.featuredTitle}>Frag Mia</Text>
            <Text style={styles.featuredSub}>{getMiaPrompt(profiles, pregnancies)}</Text>
          </View>
          <View style={styles.featuredArrow}>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        {/* ── Leerer Zustand ── */}
        {!hasAnything && (
          <View style={styles.onboardingCard}>
            <Text style={styles.onboardingTitle}>Willkommen bei Mia 👋</Text>
            <Text style={styles.onboardingText}>
              Leg ein Profil an — für dein Kind oder deine Schwangerschaft. Mia begleitet euch dann ganz persönlich.
            </Text>
            <View style={styles.onboardingBtns}>
              <TouchableOpacity style={styles.onboardingBtn} onPress={() => router.push("/profile/new")}>
                <Text style={styles.onboardingBtnEmoji}>👶</Text>
                <Text style={styles.onboardingBtnText}>Kind anlegen</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.onboardingBtn, { borderColor: "#C5ADE0" }]}
                onPress={() => router.push("/profile/pregnancy-new")}
              >
                <Text style={styles.onboardingBtnEmoji}>🤰</Text>
                <Text style={styles.onboardingBtnText}>Schwangerschaft</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Schwangerschaft ── */}
        {pregnancies.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🤰 Schwangerschaft</Text>
            {pregnancies.map((preg) => (
              <PregnancyCard
                key={preg.id}
                preg={preg}
                onChat={() => startPregnancyChat(preg.id)}
              />
            ))}
            <TouchableOpacity style={styles.addLink} onPress={() => router.push("/profile/pregnancy-new")}>
              <Ionicons name="add-circle-outline" size={14} color="#9B7BB8" />
              <Text style={[styles.addLinkText, { color: "#9B7BB8" }]}>Weitere Schwangerschaft</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Kinder ── */}
        {profiles.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👶 Deine Kinder</Text>
            {profiles.map((profile) => (
              <BabyCard
                key={profile.id}
                profile={profile}
                achievedIds={milestoneMap[profile.id] ?? new Set()}
                onChat={() => startChildChat(profile.id)}
              />
            ))}
            <TouchableOpacity style={styles.addLink} onPress={() => router.push("/profile/new")}>
              <Ionicons name="add-circle-outline" size={14} color="#4A7C6F" />
              <Text style={styles.addLinkText}>Kind hinzufügen</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const SHADOW = {
  shadowColor: "#2D2A26",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.07,
  shadowRadius: 10,
  elevation: 3,
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FDFAF6" },
  content: { padding: 20, paddingBottom: 48 },

  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#F5F0E8", borderRadius: 20,
    padding: 16, marginBottom: 16, ...SHADOW,
  },
  headerTexts: { flex: 1 },
  headerLine1: { fontSize: 18, fontWeight: "800", color: "#2D2A26", marginBottom: 2 },
  headerLine2: { fontSize: 13, color: "#7A7269" },
  headerMiaLabel: { fontSize: 11, color: "#4A7C6F", fontWeight: "700", marginTop: 5, letterSpacing: 0.3 },
  familieBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "#E5DDD5",
  },

  featuredCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#4A7C6F", borderRadius: 20,
    padding: 18, marginBottom: 24, gap: 14, ...SHADOW,
  },
  featuredIcon: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  featuredTexts: { flex: 1 },
  featuredTitle: { fontSize: 17, fontWeight: "800", color: "#FFFFFF", marginBottom: 3 },
  featuredSub: { fontSize: 13, color: "rgba(255,255,255,0.8)", lineHeight: 18 },
  featuredArrow: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },

  // Onboarding
  onboardingCard: {
    backgroundColor: "#F0EBE3", borderRadius: 20, padding: 20, marginBottom: 16,
  },
  onboardingTitle: { fontSize: 17, fontWeight: "800", color: "#2D2A26", marginBottom: 8 },
  onboardingText: { fontSize: 14, color: "#7A7269", lineHeight: 21, marginBottom: 18 },
  onboardingBtns: { flexDirection: "row", gap: 10 },
  onboardingBtn: {
    flex: 1, borderRadius: 14, paddingVertical: 14,
    alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: "#FFFFFF", borderWidth: 1.5, borderColor: "#C5DDD8", ...SHADOW,
  },
  onboardingBtnEmoji: { fontSize: 24 },
  onboardingBtnText: { fontSize: 13, fontWeight: "700", color: "#2D2A26" },

  section: { marginBottom: 8 },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: "#2D2A26", marginBottom: 12, letterSpacing: -0.2 },

  // Rich profile card
  richCard: {
    backgroundColor: "#FFFFFF", borderRadius: 20,
    padding: 14, marginBottom: 12, gap: 10, ...SHADOW,
  },
  richCardTop: {
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  richAvatar: { width: 52, height: 52, borderRadius: 26 },
  richAvatarPlaceholder: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: "center", justifyContent: "center",
  },
  richAvatarLetter: { fontSize: 21, fontWeight: "700", color: "#FFFFFF" },
  richCardMeta: { flex: 1 },
  richCardName: { fontSize: 16, fontWeight: "800", color: "#2D2A26" },
  richCardSub: { fontSize: 13, color: "#7A7269", marginTop: 2 },

  chatPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 11, paddingVertical: 7, borderRadius: 20,
  },
  chatPillText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },

  // Phase strip
  phaseStrip: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#F5F0E8", borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 7,
  },
  phaseStripDot: {
    width: 7, height: 7, borderRadius: 4, backgroundColor: "#4A7C6F",
  },
  phaseStripText: { flex: 1, fontSize: 13, fontWeight: "600", color: "#4A4440" },

  // Trimester row (Schwangerschaftskarte)
  trimesterRow: {
    flexDirection: "row", alignItems: "center", gap: 7,
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7,
    borderWidth: 1,
  },
  trimesterEmoji: { fontSize: 14 },
  trimesterText: { fontSize: 12, fontWeight: "700" },

  // Add link
  addLink: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingVertical: 6, paddingHorizontal: 2, marginBottom: 8,
    alignSelf: "flex-start",
  },
  addLinkText: { fontSize: 13, fontWeight: "600", color: "#4A7C6F" },

  medalBadge: {
    position: "absolute", bottom: -2, right: -2,
    backgroundColor: "#4A7C6F", borderRadius: 10,
    minWidth: 20, height: 20, paddingHorizontal: 4,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 2,
  },
  medalEmoji: { fontSize: 11, fontWeight: "800", color: "#FFFFFF", lineHeight: 14 },

  phaseProgressWrap: {
    flexDirection: "row", alignItems: "center", gap: 5,
  },
  phaseProgressTrack: {
    width: 48, height: 4, borderRadius: 2, backgroundColor: "#E5DDD5", overflow: "hidden",
  },
  phaseProgressFill: { height: 4, borderRadius: 2 },
  phaseProgressLabel: { fontSize: 11, color: "#7A7269", fontWeight: "600" },
});
