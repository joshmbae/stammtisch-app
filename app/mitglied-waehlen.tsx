import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { MemberProfile, StammtischVerordnung } from "../types";
import { loadMembers, loadVerordnung } from "../utils/storage";
import { useSession } from "../contexts/SessionContext";
import { useStammtisch } from "../contexts/StammtischContext";
import { SHADOWS, ThemeColors, FONT } from "../constants/design";
import { useThemedStyles } from "../contexts/ThemeContext";
import StammtischLogo from "../components/StammtischLogo";
import LoadingSpinner from "../components/LoadingSpinner";
import { getInitial, displayName } from "../utils/format";
import PinPrompt from "../components/PinPrompt";
import { verifyPin } from "../utils/pin";
import { hasSeenAppIntro } from "../utils/onboarding";

export default function MitgliedWaehlenScreen() {
  const styles = useThemedStyles(makeStyles);
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [verordnung, setVerordnung] = useState<StammtischVerordnung | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingMember, setPendingMember] = useState<MemberProfile | null>(null);
  const [pinError, setPinError] = useState<string | undefined>(undefined);
  const { setActiveSession, clearSession } = useSession();
  const { stammtischName, clearStammtisch } = useStammtisch();

  async function handleStammtischWechseln() {
    await clearSession();
    await clearStammtisch();
    router.replace("/stammtisch-waehlen");
  }

  useEffect(() => {
    Promise.all([loadMembers(), loadVerordnung()]).then(([ms, v]) => {
      setMembers(ms);
      setVerordnung(v);
      setLoading(false);
    });
  }, []);

  async function goToApp(memberId: string) {
    const seen = await hasSeenAppIntro(memberId);
    router.replace(seen ? "/(tabs)/home" : "/onboarding-intro");
  }

  async function handleSelect(member: MemberProfile) {
    if (member.pinHash) {
      setPinError(undefined);
      setPendingMember(member);
      return;
    }
    await setActiveSession(member.id);
    await goToApp(member.id);
  }

  async function handlePinVerify(pin: string) {
    if (!pendingMember) return;
    const ok = await verifyPin(pendingMember.id, pin);
    if (!ok) {
      setPinError("Falscher PIN.");
      return;
    }
    await setActiveSession(pendingMember.id);
    setPendingMember(null);
    await goToApp(pendingMember.id);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      {loading ? <LoadingSpinner /> : (
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <StammtischLogo size={52} uri={verordnung?.logoUrl} />
          <Text style={styles.title}>Wer bist du?</Text>
          <Text style={styles.subtitle}>
            {stammtischName ? `Stammtisch „${stammtischName}" · Wähl dein Profil` : "Wähl dein Profil um loszulegen"}
          </Text>
        </View>

        {/* Mitglieder-Karten */}
        {members.length > 0 ? (
          <View style={styles.grid}>
            {members.map((m) => (
              <TouchableOpacity
                key={m.id}
                style={styles.card}
                onPress={() => handleSelect(m)}
                activeOpacity={0.82}
              >
                <View style={[styles.avatar, { backgroundColor: m.avatarColor }]}>
                  {m.photoUri ? (
                    <Image source={{ uri: m.photoUri }} style={styles.avatarImg} />
                  ) : (
                    <Text style={styles.avatarLetter}>{getInitial(m.name)}</Text>
                  )}
                </View>
                <Text style={styles.cardName} numberOfLines={1}>{displayName(m)}</Text>
                <View style={[styles.rolleBadge, { backgroundColor: m.avatarColor + "22" }]}>
                  <Text style={[styles.rolleText, { color: m.avatarColor }]} numberOfLines={1}>{m.rollen.join(", ")}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🧔</Text>
            <Text style={styles.emptyText}>
              Noch keine Mitglieder angelegt.{"\n"}
              Leg zuerst die Stammtischrunde an.
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.push("/member/new")}
            >
              <Text style={styles.emptyBtnText}>Mitglied anlegen</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Gast-Option */}
        <TouchableOpacity
          style={styles.gastBtn}
          onPress={() => router.replace("/(tabs)/home")}
          activeOpacity={0.75}
        >
          <Text style={styles.gastText}>Als Gast fortfahren</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.gastBtn}
          onPress={handleStammtischWechseln}
          activeOpacity={0.75}
        >
          <Text style={styles.gastText}>Stammtisch wechseln</Text>
        </TouchableOpacity>

      </ScrollView>
      )}

      <PinPrompt
        visible={!!pendingMember}
        mode="verify"
        memberName={pendingMember?.name}
        error={pinError}
        onCancel={() => setPendingMember(null)}
        onSubmit={handlePinVerify}
      />
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background },
  content: { padding: 24, paddingBottom: 40, alignItems: "center" },

  header: { alignItems: "center", marginBottom: 32, marginTop: 8, gap: 10 },
  title: { fontSize: 28, fontFamily: FONT.w800, color: c.textDark, marginTop: 8 },
  subtitle: { fontFamily: FONT.w400, fontSize: 15, color: c.textMuted },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center",
    width: "100%",
  },
  card: {
    width: 140,
    backgroundColor: c.card,
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: c.border,
    ...SHADOWS.card,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  avatarImg: { width: 60, height: 60, borderRadius: 30 },
  avatarLetter: { fontSize: 24, fontFamily: FONT.w700, color: c.onAvatar },
  cardName: { fontSize: 15, fontFamily: FONT.w700, color: c.textDark, textAlign: "center" },
  rolleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 2,
  },
  rolleText: { fontSize: 11, fontFamily: FONT.w700 },

  empty: { alignItems: "center", gap: 12, paddingVertical: 40 },
  emptyIcon: { fontFamily: FONT.w400, fontSize: 52 },
  emptyText: { fontFamily: FONT.w400, fontSize: 15, color: c.textMuted, textAlign: "center", lineHeight: 22 },
  emptyBtn: {
    backgroundColor: c.blue, borderRadius: 14,
    paddingVertical: 12, paddingHorizontal: 24,
  },
  emptyBtnText: { color: c.onAccent, fontFamily: FONT.w700, fontSize: 15 },

  gastBtn: { marginTop: 24 },
  gastText: { fontFamily: FONT.w400, fontSize: 14, color: c.textMuted, textDecorationLine: "underline" },
});
