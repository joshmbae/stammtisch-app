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
import { MemberProfile } from "../types";
import { loadMembers } from "../utils/storage";
import { useSession } from "../contexts/SessionContext";
import { COLORS, SHADOWS } from "../constants/design";
import StammtischLogo from "../components/StammtischLogo";
import { getInitial } from "../utils/format";

export default function MitgliedWaehlenScreen() {
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const { setActiveSession } = useSession();

  useEffect(() => {
    loadMembers().then(setMembers);
  }, []);

  async function handleSelect(member: MemberProfile) {
    await setActiveSession(member.id);
    router.replace("/(tabs)/home");
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <StammtischLogo size={52} />
          <Text style={styles.title}>Wer bist du?</Text>
          <Text style={styles.subtitle}>Wähl dein Profil um loszulegen</Text>
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
                <Text style={styles.cardName} numberOfLines={1}>{m.name}</Text>
                {m.spitzname ? (
                  <Text style={styles.cardSpitz} numberOfLines={1}>„{m.spitzname}"</Text>
                ) : null}
                <View style={[styles.rolleBadge, { backgroundColor: m.avatarColor + "22" }]}>
                  <Text style={[styles.rolleText, { color: m.avatarColor }]}>{m.rolle}</Text>
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

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 24, paddingBottom: 40, alignItems: "center" },

  header: { alignItems: "center", marginBottom: 32, marginTop: 8, gap: 10 },
  title: { fontSize: 28, fontWeight: "800", color: COLORS.textDark, marginTop: 8 },
  subtitle: { fontSize: 15, color: COLORS.textMuted },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center",
    width: "100%",
  },
  card: {
    width: 140,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
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
  avatarLetter: { fontSize: 24, fontWeight: "700", color: "#FFFFFF" },
  cardName: { fontSize: 15, fontWeight: "700", color: COLORS.textDark, textAlign: "center" },
  cardSpitz: { fontSize: 12, color: COLORS.textMuted, fontStyle: "italic", textAlign: "center" },
  rolleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 2,
  },
  rolleText: { fontSize: 11, fontWeight: "700" },

  empty: { alignItems: "center", gap: 12, paddingVertical: 40 },
  emptyIcon: { fontSize: 52 },
  emptyText: { fontSize: 15, color: COLORS.textMuted, textAlign: "center", lineHeight: 22 },
  emptyBtn: {
    backgroundColor: COLORS.blue, borderRadius: 14,
    paddingVertical: 12, paddingHorizontal: 24,
  },
  emptyBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },

  gastBtn: { marginTop: 24 },
  gastText: { fontSize: 14, color: COLORS.textMuted, textDecorationLine: "underline" },
});
