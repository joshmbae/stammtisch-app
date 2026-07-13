import React, { useCallback } from "react";
import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { HamburgerButton } from "../components/HamburgerButton";
import { StammtischVerordnung } from "../types";
import { loadVerordnung } from "../utils/storage";
import { COLORS, SHADOWS } from "../constants/design";
import { gruendungsDauer, formatDauer, formatGruendungMonat } from "../utils/format";

export default function SatzungScreen() {
  const [verordnung, setVerordnung] = useState<StammtischVerordnung>({ name: "Die Hellen", regeln: [] });

  useFocusEffect(
    useCallback(() => {
      loadVerordnung().then(setVerordnung);
    }, [])
  );

  const gruendungsjahr = verordnung.gruendungsjahr ?? null;
  const dauer = gruendungsjahr ? gruendungsDauer(gruendungsjahr) : null;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <HamburgerButton />
          <View style={styles.headerTexts}>
            <Text style={styles.headerTitle}>Satzung</Text>
            <Text style={styles.headerSub}>Stammtischverordnung</Text>
          </View>
        </View>

        {/* ── Titel-Banner ── */}
        <View style={styles.banner}>
          <Text style={styles.bannerEmoji}>📜</Text>
          <Text style={styles.bannerTitle}>{verordnung.name}</Text>
          <Text style={styles.bannerSub}>Stammtischverordnung</Text>
          {gruendungsjahr && dauer && (
            <View style={styles.bannerBadge}>
              <Text style={styles.bannerBadgeText}>
                Gegründet {formatGruendungMonat(gruendungsjahr)} · {formatDauer(dauer)}
              </Text>
            </View>
          )}
        </View>

        {/* ── Eckdaten ── */}
        {(verordnung.treffpunkt || verordnung.stammtischTag || verordnung.stammtischzeit) && (
          <View style={styles.eckdatenCard}>
            {verordnung.treffpunkt && (
              <View style={styles.eckdatenRow}>
                <View style={styles.eckdatenIcon}>
                  <Text style={styles.eckdatenEmoji}>📍</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.eckdatenLabel}>Treffpunkt</Text>
                  <Text style={styles.eckdatenValue}>{verordnung.treffpunkt}</Text>
                </View>
              </View>
            )}
            {(verordnung.stammtischTag || verordnung.stammtischzeit) && (
              <View style={[styles.eckdatenRow, verordnung.treffpunkt && styles.eckdatenRowBorder]}>
                <View style={styles.eckdatenIcon}>
                  <Text style={styles.eckdatenEmoji}>🗓</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.eckdatenLabel}>Stammtischtag</Text>
                  <Text style={styles.eckdatenValue}>
                    {verordnung.stammtischTag ?? ""}
                    {verordnung.stammtischTag && verordnung.stammtischzeit ? " · " : ""}
                    {verordnung.stammtischzeit ? `${verordnung.stammtischzeit} Uhr` : ""}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ── Regeln ── */}
        {verordnung.regeln.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionLine} />
              <Text style={styles.sectionLabel}>Regeln</Text>
              <View style={styles.sectionLine} />
            </View>
            {verordnung.regeln.map((regel, i) => (
              <View key={i} style={styles.regelCard}>
                <View style={styles.regelNrWrap}>
                  <Text style={styles.regelNr}>{i + 1}</Text>
                </View>
                <Text style={styles.regelText}>{regel}</Text>
              </View>
            ))}
          </>
        )}

        {/* ── Sonstiges ── */}
        {verordnung.sonstiges ? (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionLine} />
              <Text style={styles.sectionLabel}>Anmerkungen</Text>
              <View style={styles.sectionLine} />
            </View>
            <View style={styles.sonstigesCard}>
              <Text style={styles.sonstigesText}>{verordnung.sonstiges}</Text>
            </View>
          </>
        ) : null}

        {verordnung.regeln.length === 0 && !verordnung.sonstiges && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              Noch keine Regeln hinterlegt.{"\n"}In den Einstellungen kannst du die Verordnung ausfüllen.
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.push("/(tabs)/guide")}
              activeOpacity={0.85}
            >
              <Ionicons name="settings-outline" size={15} color={COLORS.blue} />
              <Text style={styles.emptyBtnText}>Zu den Einstellungen</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, paddingBottom: 60 },

  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: COLORS.cardAlt, borderRadius: 20,
    padding: 16, marginBottom: 16, ...SHADOWS.card,
    borderWidth: 1, borderColor: COLORS.border,
  },
  headerTexts: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: COLORS.textDark },
  headerSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

  // ── Banner ────────────────────────────────────────────────────────────────
  banner: {
    backgroundColor: COLORS.blueDark, borderRadius: 24, padding: 28,
    alignItems: "center", marginBottom: 16, ...SHADOWS.card,
  },
  bannerEmoji: { fontSize: 40, marginBottom: 10 },
  bannerTitle: {
    fontSize: 30, fontWeight: "900", color: "#FFFFFF",
    letterSpacing: -0.5, textAlign: "center", marginBottom: 4,
  },
  bannerSub: {
    fontSize: 13, fontWeight: "600",
    color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: 1.2,
  },
  bannerBadge: {
    marginTop: 14, paddingHorizontal: 14, paddingVertical: 6,
    backgroundColor: COLORS.gold + "33", borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.gold + "55",
  },
  bannerBadgeText: { fontSize: 12, fontWeight: "700", color: COLORS.gold },

  // ── Eckdaten ──────────────────────────────────────────────────────────────
  eckdatenCard: {
    backgroundColor: COLORS.card, borderRadius: 20, padding: 4,
    marginBottom: 20, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.light,
  },
  eckdatenRow: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingVertical: 14, paddingHorizontal: 16,
  },
  eckdatenRowBorder: { borderTopWidth: 1, borderTopColor: COLORS.border },
  eckdatenIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.background, alignItems: "center", justifyContent: "center",
  },
  eckdatenEmoji: { fontSize: 20 },
  eckdatenLabel: { fontSize: 11, fontWeight: "700", color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 2 },
  eckdatenValue: { fontSize: 15, fontWeight: "600", color: COLORS.textDark },

  // ── Section Divider ───────────────────────────────────────────────────────
  sectionHeader: {
    flexDirection: "row", alignItems: "center", gap: 10,
    marginBottom: 14, marginTop: 4,
  },
  sectionLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  sectionLabel: { fontSize: 11, fontWeight: "800", color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.8 },

  // ── Regeln ────────────────────────────────────────────────────────────────
  regelCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 14,
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 8,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.light,
  },
  regelNrWrap: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.blueDark, alignItems: "center", justifyContent: "center",
    flexShrink: 0, marginTop: 1,
  },
  regelNr: { fontSize: 14, fontWeight: "900", color: COLORS.gold },
  regelText: { flex: 1, fontSize: 15, color: COLORS.textDark, lineHeight: 22, fontWeight: "500" },

  // ── Sonstiges ─────────────────────────────────────────────────────────────
  sonstigesCard: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.light,
  },
  sonstigesText: { fontSize: 14, color: COLORS.textMid, lineHeight: 22 },

  // ── Empty ─────────────────────────────────────────────────────────────────
  emptyCard: {
    backgroundColor: COLORS.card, borderRadius: 20, padding: 24,
    alignItems: "center", borderWidth: 1, borderColor: COLORS.border,
    borderStyle: "dashed", gap: 16,
  },
  emptyText: { fontSize: 14, color: COLORS.textMuted, textAlign: "center", lineHeight: 21 },
  emptyBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
    backgroundColor: COLORS.blue + "12", borderWidth: 1, borderColor: COLORS.blue + "33",
  },
  emptyBtnText: { fontSize: 14, fontWeight: "700", color: COLORS.blue },
});
