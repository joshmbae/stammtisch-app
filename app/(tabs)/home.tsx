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
import {
  MemberProfile,
  StammtischVerordnung,
  StammtischTermin,
  VerspätungLog,
  SchockLog,
  StrafLog,
  KassenEintrag,
} from "../../types";
import {
  loadMembers,
  loadVerordnung,
  loadTermine,
  loadVerspätungLogs,
  loadSchockLogs,
  loadStrafLogs,
  loadKasse,
} from "../../utils/storage";
import { useSession } from "../../contexts/SessionContext";
import { COLORS, SHADOWS } from "../../constants/design";
import { HamburgerButton } from "../../components/HamburgerButton";
import StammtischLogo from "../../components/StammtischLogo";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting(name?: string): string {
  const h = new Date().getHours();
  const n = name ? name.split(" ")[0] : "";
  if (h < 10) return `Guten Morgen${n ? `, ${n}` : ""}!`;
  if (h < 17) return `Servus${n ? `, ${n}` : ""}!`;
  if (h < 20) return `Aba Hallo${n ? `, ${n}` : ""}!`;
  return `Prost${n ? `, ${n}` : ""}!`;
}

function formatDatumKurz(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("de-DE", {
    weekday: "short", day: "2-digit", month: "short",
  });
}

function formatEuro(n: number): string {
  return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function daysUntil(iso: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(iso + "T00:00:00");
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

function hoursUntil(iso: string, startZeit?: string): number {
  const now = new Date();
  const target = new Date(iso + "T00:00:00");
  if (startZeit) {
    const [h, m] = startZeit.split(":").map(Number);
    target.setHours(h, m, 0, 0);
  } else {
    target.setHours(19, 0, 0, 0);
  }
  return Math.max(0, Math.round((target.getTime() - now.getTime()) / 3600000));
}

function getNextBirthday(members: MemberProfile[]): {
  member: MemberProfile; daysUntil: number; dateLabel: string;
} | null {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let closest: { member: MemberProfile; daysUntil: number; dateLabel: string } | null = null;
  for (const m of members) {
    if (!m.geburtsdatum) continue;
    const [, mo, da] = m.geburtsdatum.split("-");
    let next = new Date(`${today.getFullYear()}-${mo}-${da}T00:00:00`);
    if (next < today) next = new Date(`${today.getFullYear() + 1}-${mo}-${da}T00:00:00`);
    const diff = Math.round((next.getTime() - today.getTime()) / 86400000);
    const dateLabel = next.toLocaleDateString("de-DE", { day: "2-digit", month: "long" });
    if (!closest || diff < closest.daysUntil) closest = { member: m, daysUntil: diff, dateLabel };
  }
  return closest;
}

// ─── Mitglieder Avatar (horizontal) ──────────────────────────────────────────

function MemberBubble({ member, isActive }: { member: MemberProfile; isActive: boolean }) {
  const firstName = member.spitzname ?? member.name.split(" ")[0];
  return (
    <TouchableOpacity
      style={styles.bubbleWrap}
      onPress={() => router.push(`/member/${member.id}`)}
      activeOpacity={0.8}
    >
      <View style={[styles.bubble, { backgroundColor: member.avatarColor }, isActive && styles.bubbleActive]}>
        {member.photoUri ? (
          <Image source={{ uri: member.photoUri }} style={styles.bubbleImg} />
        ) : (
          <Text style={styles.bubbleLetter}>{member.name.charAt(0).toUpperCase()}</Text>
        )}
        {isActive && <View style={styles.bubbleActiveDot} />}
      </View>
      <Text style={[styles.bubbleName, isActive && { color: COLORS.blue, fontWeight: "700" }]} numberOfLines={1}>
        {firstName}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Ranglisten-Row ───────────────────────────────────────────────────────────

function RangRow({ rank, member, value, valueLabel, sub }: {
  rank: number; member: MemberProfile; value: string; valueLabel: string; sub?: string;
}) {
  const medals = ["🥇", "🥈", "🥉"];
  return (
    <TouchableOpacity
      style={styles.rangRow}
      onPress={() => router.push(`/member/${member.id}`)}
      activeOpacity={0.85}
    >
      <Text style={styles.rangMedal}>{medals[rank] ?? `${rank + 1}.`}</Text>
      {member.photoUri ? (
        <Image source={{ uri: member.photoUri }} style={styles.rangAvatar} />
      ) : (
        <View style={[styles.rangAvatar, { backgroundColor: member.avatarColor, alignItems: "center", justifyContent: "center" }]}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: "#FFF" }}>{member.name.charAt(0).toUpperCase()}</Text>
        </View>
      )}
      <View style={styles.rangInfo}>
        <Text style={styles.rangName}>{member.name}{member.spitzname ? ` „${member.spitzname}"` : ""}</Text>
        {sub ? <Text style={styles.rangSub}>{sub}</Text> : null}
      </View>
      <View style={styles.rangValueWrap}>
        <Text style={styles.rangValue}>{value}</Text>
        <Text style={styles.rangValueLabel}>{valueLabel}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

interface MemberStats {
  member: MemberProfile;
  anwesenheitCount: number;
  anwesenheitPct: number;
  verspätungMin: number;
  niederlagen: number;
  schockAus: number;
  strafGesamt: number;
  strafOffen: number;
}

export default function HomeScreen() {
  const { activeMemberId, activeMember } = useSession();

  const [verordnung, setVerordnung]           = useState<StammtischVerordnung | null>(null);
  const [naechsterTermin, setNaechsterTermin] = useState<StammtischTermin | null>(null);
  const [letzterTermin, setLetzterTermin]     = useState<StammtischTermin | null>(null);
  const [members, setMembers]                 = useState<MemberProfile[]>([]);
  const [memberStats, setMemberStats]         = useState<MemberStats[]>([]);
  const [kasse, setKasse]                     = useState<KassenEintrag[]>([]);
  const [terminCount, setTerminCount]         = useState(0);

  useFocusEffect(useCallback(() => { load(); }, []));

  async function load() {
    const [ms, v, alle, kasseData] = await Promise.all([
      loadMembers(), loadVerordnung(), loadTermine(), loadKasse(),
    ]);

    setVerordnung(v);
    setKasse(kasseData);
    setMembers(ms);

    const today = new Date().toISOString().slice(0, 10);
    const upcoming = alle.filter((t) => t.datum >= today).sort((a, b) => a.datum.localeCompare(b.datum));
    const past = alle.filter((t) => t.datum < today).sort((a, b) => b.datum.localeCompare(a.datum));
    setNaechsterTermin(upcoming[0] ?? null);
    setLetzterTermin(past[0] ?? null);
    setTerminCount(alle.length);

    if (ms.length === 0) { setMemberStats([]); return; }

    const stats = await Promise.all(ms.map(async (m) => {
      const [vLogs, sLogs, stLogs]: [VerspätungLog[], SchockLog[], StrafLog[]] = await Promise.all([
        loadVerspätungLogs(m.id), loadSchockLogs(m.id), loadStrafLogs(m.id),
      ]);
      const anwesenheitCount = alle.filter((t) => (t.anwesenheit ?? []).includes(m.id)).length;
      const anwesenheitPct = alle.length > 0 ? Math.round((anwesenheitCount / alle.length) * 100) : 0;
      return {
        member: m, anwesenheitCount, anwesenheitPct,
        verspätungMin: vLogs.reduce((s, l) => s + l.minutenVerspätet, 0),
        niederlagen: sLogs.filter((l) => l.typ === "niederlage").length,
        schockAus: sLogs.filter((l) => l.typ === "schock_aus").length,
        strafGesamt: stLogs.reduce((s, l) => s + l.betrag, 0),
        strafOffen: stLogs.filter((l) => !l.beglichen).reduce((s, l) => s + l.betrag, 0),
      };
    }));
    setMemberStats(stats);
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const greeting = getGreeting(activeMember?.name);
  const saldo = kasse.reduce((s, e) => e.typ === "einnahme" ? s + e.betrag : e.typ === "ausgabe" ? s - e.betrag : s, 0);
  const saldoPositiv = saldo >= 0;

  const myStats = activeMemberId ? memberStats.find((s) => s.member.id === activeMemberId) : null;
  const nextBirthday = getNextBirthday(members);

  const gruendungsjahr = verordnung?.gruendungsjahr ? parseInt(verordnung.gruendungsjahr) : null;
  const jahre = gruendungsjahr ? new Date().getFullYear() - gruendungsjahr : null;

  const schockRang = [...memberStats].filter(s => s.niederlagen + s.schockAus > 0).sort((a, b) => (b.niederlagen + b.schockAus) - (a.niederlagen + a.schockAus));

  const naechsterInStunden = naechsterTermin ? hoursUntil(naechsterTermin.datum, naechsterTermin.startZeit) : null;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <HamburgerButton />
          <StammtischLogo size={40} />
          <View style={styles.headerCenter}>
            <Text style={styles.headerStammtisch}>{verordnung?.name ?? "Die Hellen"}</Text>
            <Text style={styles.headerGreeting}>{greeting}</Text>
          </View>
          {activeMember ? (
            <TouchableOpacity
              style={[styles.myAvatarBtn, { backgroundColor: activeMember.avatarColor }]}
              onPress={() => router.push(`/member/${activeMember.id}`)}
            >
              {activeMember.photoUri ? (
                <Image source={{ uri: activeMember.photoUri }} style={styles.myAvatarImg} />
              ) : (
                <Text style={styles.myAvatarLetter}>{activeMember.name.charAt(0).toUpperCase()}</Text>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.myAvatarPlaceholder}>
              <Text style={{ fontSize: 22 }}>🍺</Text>
            </View>
          )}
        </View>

        {/* ── Termin-Zeile: Letzter (1/3) + Nächster (2/3) ── */}
        {(naechsterTermin || letzterTermin) && (
          <View style={styles.terminRow}>
            {letzterTermin && (
              <TouchableOpacity
                style={styles.letzterCard}
                onPress={() => router.push(`/termin/${letzterTermin.id}`)}
                activeOpacity={0.88}
              >
                <Text style={styles.letzterLabel}>Letzter</Text>
                <Text style={styles.letzterEmoji}>🍺</Text>
                <Text style={styles.letzterDate}>{formatDatumKurz(letzterTermin.datum)}</Text>
                <Ionicons name="chevron-forward" size={13} color="rgba(255,255,255,0.35)" style={{ marginTop: 6 }} />
              </TouchableOpacity>
            )}

            {naechsterTermin && naechsterInStunden !== null && (
              <TouchableOpacity
                style={styles.countdownCard}
                onPress={() => router.push(`/termin/${naechsterTermin.id}`)}
                activeOpacity={0.88}
              >
                <Text style={styles.countdownLabel}>Nächster Stammtisch</Text>
                <Text style={styles.countdownTitle} numberOfLines={1}>
                  {naechsterTermin.titel ?? "Stammtisch"}
                </Text>
                <Text style={styles.countdownDate}>
                  {formatDatumKurz(naechsterTermin.datum)}
                  {naechsterTermin.startZeit ? ` · ${naechsterTermin.startZeit}` : ""}
                </Text>
                <View style={styles.countdownNumRow}>
                  <Text style={styles.countdownNum}>
                    {naechsterInStunden < 24 ? naechsterInStunden : Math.ceil(naechsterInStunden / 24)}
                  </Text>
                  <Text style={styles.countdownUnit}>
                    {naechsterInStunden === 0 ? "Jetzt!" : naechsterInStunden < 24 ? "Std." : naechsterInStunden < 48 ? "Tag" : "Tage"}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── Meine Bilanz ── */}
        {myStats && (
          <TouchableOpacity
            style={[styles.myStatsCard, { borderColor: activeMember!.avatarColor + "55" }]}
            onPress={() => router.push(`/member/${activeMember!.id}`)}
            activeOpacity={0.88}
          >
            <Text style={styles.myStatsTitle}>Meine Bilanz</Text>
            <View style={styles.myStatsRow}>
              <View style={styles.myStatBox}>
                <Text style={styles.myStatEmoji}>✅</Text>
                <Text style={[styles.myStatValue, { color: COLORS.success }]}>{myStats.anwesenheitPct} %</Text>
                <Text style={styles.myStatLabel}>Anwesenheit</Text>
              </View>
              <View style={styles.myStatDivider} />
              <View style={styles.myStatBox}>
                <Text style={styles.myStatEmoji}>⏱️</Text>
                <Text style={[styles.myStatValue, myStats.verspätungMin > 0 ? { color: COLORS.danger } : {}]}>
                  {myStats.verspätungMin} Min.
                </Text>
                <Text style={styles.myStatLabel}>Verspätung</Text>
              </View>
              <View style={styles.myStatDivider} />
              <View style={styles.myStatBox}>
                <Text style={styles.myStatEmoji}>💰</Text>
                <Text style={[styles.myStatValue, myStats.strafOffen > 0 ? { color: COLORS.danger } : { color: COLORS.success }]}>
                  {myStats.strafOffen > 0 ? `${formatEuro(myStats.strafOffen)} €` : "✓"}
                </Text>
                <Text style={styles.myStatLabel}>{myStats.strafOffen > 0 ? "Offen" : "Beglichen"}</Text>
              </View>
              <View style={styles.myStatDivider} />
              <View style={styles.myStatBox}>
                <Text style={styles.myStatEmoji}>🎲</Text>
                <Text style={styles.myStatValue}>{myStats.niederlagen + myStats.schockAus}</Text>
                <Text style={styles.myStatLabel}>Schock-Nl.</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* ── Kassenstand + Nächster Geburtstag ── */}
        <View style={styles.quickRow}>
          <TouchableOpacity style={styles.quickCard} onPress={() => router.push("/kasse")} activeOpacity={0.85}>
            <Text style={[styles.quickValue, { color: saldoPositiv ? COLORS.success : COLORS.danger }]}>
              {saldoPositiv ? "+" : "−"}{formatEuro(Math.abs(saldo))} €
            </Text>
            <Text style={styles.quickLabel}>💰 Kassenstand</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => nextBirthday ? router.push(`/member/${nextBirthday.member.id}`) : router.push("/(tabs)/kalender")}
            activeOpacity={0.85}
          >
            {nextBirthday ? (
              <>
                <Text style={[styles.quickValue, { fontSize: 22 }]}>🎂</Text>
                <Text style={[styles.quickLabel, { textAlign: "center" }]}>
                  {nextBirthday.member.spitzname ?? nextBirthday.member.name.split(" ")[0]}
                  {"\n"}
                  {nextBirthday.daysUntil === 0 ? "Heute! 🎉" : nextBirthday.daysUntil === 1 ? "Morgen" : `in ${nextBirthday.daysUntil} Tagen`}
                </Text>
              </>
            ) : (
              <>
                <Text style={[styles.quickValue, { fontSize: 22 }]}>🎂</Text>
                <Text style={styles.quickLabel}>Geburtstage</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Frag den Sepp ── */}
        <TouchableOpacity
          style={styles.seppCard}
          onPress={() => router.push("/(tabs)/chat")}
          activeOpacity={0.88}
        >
          <View style={styles.seppIcon}><Text style={{ fontSize: 26 }}>🧔</Text></View>
          <View style={styles.seppTexts}>
            <Text style={styles.seppTitle}>Frag den Sepp</Text>
            <Text style={styles.seppSub}>
              {activeMember ? `Dein persönlicher Stammtisch-Experte` : "Regeln, Bier, Traditionen — er weiß alles"}
            </Text>
          </View>
          <View style={styles.seppArrow}>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        {/* ── Die Runde ── */}
        {members.length > 0 && (
          <View style={styles.mitgliederCard}>
            <View style={styles.mitgliederHeader}>
              <Text style={styles.mitgliederTitle}>👥 Die Runde</Text>
              <TouchableOpacity onPress={() => router.push("/mitglieder")}>
                <Text style={styles.mitgliederLink}>Alle →</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bubbleRow}>
              {members.map((m) => (
                <MemberBubble key={m.id} member={m} isActive={m.id === activeMemberId} />
              ))}
              <TouchableOpacity style={styles.bubbleWrap} onPress={() => router.push("/member/new")} activeOpacity={0.8}>
                <View style={styles.bubbleAdd}>
                  <Ionicons name="add" size={22} color={COLORS.textMuted} />
                </View>
                <Text style={styles.bubbleName}>Neu</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}

        {/* ── Stammtisch-Infos ── */}
        {(gruendungsjahr || members.length > 0 || terminCount > 0) && (
          <View style={styles.faktenCard}>
            <Text style={styles.faktenTitle}>🍺 Stammtisch-Infos</Text>
            <View style={styles.faktenGrid}>
              {gruendungsjahr && (
                <View style={styles.faktBox}>
                  <Text style={styles.faktEmoji}>🎉</Text>
                  <Text style={styles.faktValue}>{jahre} {jahre === 1 ? "Jahr" : "Jahre"}</Text>
                  <Text style={styles.faktLabel}>seit {gruendungsjahr}</Text>
                </View>
              )}
              {members.length > 0 && (
                <View style={styles.faktBox}>
                  <Text style={styles.faktEmoji}>👥</Text>
                  <Text style={styles.faktValue}>{members.length}</Text>
                  <Text style={styles.faktLabel}>Mitglieder</Text>
                </View>
              )}
              {terminCount > 0 && (
                <View style={styles.faktBox}>
                  <Text style={styles.faktEmoji}>📅</Text>
                  <Text style={styles.faktValue}>{terminCount}</Text>
                  <Text style={styles.faktLabel}>Stammtische</Text>
                </View>
              )}
              {verordnung?.treffpunkt && (
                <View style={styles.faktBox}>
                  <Text style={styles.faktEmoji}>📍</Text>
                  <Text style={styles.faktValue} numberOfLines={1}>{verordnung.treffpunkt.split(",")[0]}</Text>
                  <Text style={styles.faktLabel}>Treffpunkt</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ── Schock-Aus Rangliste ── */}
        {schockRang.length > 0 && (
          <View style={styles.rangCard}>
            <View style={styles.rangCardHeader}>
              <Text style={styles.rangCardTitle}>🎲 Schock-Aus Rangliste</Text>
              <TouchableOpacity onPress={() => router.push("/ranglisten")}>
                <Text style={styles.rangCardLink}>Alle →</Text>
              </TouchableOpacity>
            </View>
            {schockRang.slice(0, 3).map((s, i) => (
              <RangRow key={s.member.id} rank={i} member={s.member}
                value={`${s.schockAus}`} valueLabel="Schock-Aus"
                sub={s.niederlagen > 0 ? `+ ${s.niederlagen} Niederlagen` : undefined} />
            ))}
          </View>
        )}

        {memberStats.length > 0 && schockRang.length === 0 && (
          <TouchableOpacity style={styles.rangLinkCard} onPress={() => router.push("/ranglisten")}>
            <Text style={styles.rangLinkText}>🏆 Alle Ranglisten ansehen</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.blue} />
          </TouchableOpacity>
        )}

        {/* ── Leer-Zustand ── */}
        {memberStats.length === 0 && (
          <View style={styles.onboardingCard}>
            <Text style={styles.onboardingTitle}>Willkommen bei „Die Hellen" 🍺</Text>
            <Text style={styles.onboardingText}>
              Leg die Stammtischrunde an — trag alle Mitglieder ein und definier die Stammtischverordnung.
            </Text>
            <View style={styles.onboardingBtns}>
              <TouchableOpacity style={styles.onboardingBtn} onPress={() => router.push("/member/new")}>
                <Text style={styles.onboardingBtnEmoji}>🧔</Text>
                <Text style={styles.onboardingBtnText}>Mitglied anlegen</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.onboardingBtn, { borderColor: COLORS.gold }]} onPress={() => router.push("/(tabs)/guide")}>
                <Text style={styles.onboardingBtnEmoji}>📜</Text>
                <Text style={styles.onboardingBtnText}>Verordnung</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, paddingBottom: 48 },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: COLORS.cardAlt, borderRadius: 20,
    padding: 16, marginBottom: 16, ...SHADOWS.card,
    borderWidth: 1, borderColor: COLORS.border,
  },
  headerCenter: { flex: 1 },
  headerStammtisch: {
    fontSize: 20, fontWeight: "900", color: COLORS.textDark,
    letterSpacing: -0.5, lineHeight: 24,
  },
  headerGreeting: {
    fontSize: 12, color: COLORS.textMuted, fontWeight: "500", marginTop: 2,
  },
  myAvatarBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  myAvatarImg: { width: 44, height: 44, borderRadius: 22 },
  myAvatarLetter: { fontSize: 18, fontWeight: "700", color: "#FFFFFF" },
  myAvatarPlaceholder: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: "center", justifyContent: "center",
    backgroundColor: COLORS.goldBg, flexShrink: 0,
  },

  // ── Termin-Zeile ──────────────────────────────────────────────────────────
  terminRow: { flexDirection: "row", gap: 10, marginBottom: 12 },

  countdownCard: {
    flex: 2,
    backgroundColor: COLORS.blueDark, borderRadius: 20, padding: 16, ...SHADOWS.card,
  },
  countdownLabel: {
    fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.5)",
    textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4,
  },
  countdownTitle: { fontSize: 15, fontWeight: "800", color: "#FFFFFF", marginBottom: 2 },
  countdownDate: { fontSize: 12, color: "rgba(255,255,255,0.6)" },
  countdownNumRow: { flexDirection: "row", alignItems: "baseline", gap: 4, marginTop: 10 },
  countdownNum: { fontSize: 40, fontWeight: "900", color: COLORS.gold, lineHeight: 44 },
  countdownUnit: { fontSize: 14, fontWeight: "700", color: "rgba(255,255,255,0.7)" },

  letzterCard: {
    flex: 1,
    backgroundColor: COLORS.blueDark + "CC", borderRadius: 20, padding: 14,
    alignItems: "center", justifyContent: "center", ...SHADOWS.card,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  letzterLabel: {
    fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.45)",
    textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6,
  },
  letzterEmoji: { fontSize: 24 },
  letzterDate: { fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.65)", marginTop: 4, textAlign: "center" },

  // ── Meine Bilanz ──────────────────────────────────────────────────────────
  myStatsCard: {
    backgroundColor: COLORS.card, borderRadius: 18, padding: 14, marginBottom: 12,
    borderWidth: 1.5, ...SHADOWS.light,
  },
  myStatsTitle: { fontSize: 13, fontWeight: "800", color: COLORS.textDark, marginBottom: 12, letterSpacing: -0.1 },
  myStatsRow: { flexDirection: "row", alignItems: "center" },
  myStatBox: { flex: 1, alignItems: "center", gap: 3 },
  myStatDivider: { width: 1, height: 36, backgroundColor: COLORS.border },
  myStatEmoji: { fontSize: 18 },
  myStatValue: { fontSize: 14, fontWeight: "800", color: COLORS.textDark },
  myStatLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: "600" },

  // ── Quick: Kasse + Geburtstag ─────────────────────────────────────────────
  quickRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  quickCard: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 16, padding: 14,
    alignItems: "center", justifyContent: "center", gap: 4,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.light,
  },
  quickValue: { fontSize: 20, fontWeight: "900", color: COLORS.textDark },
  quickLabel: { fontSize: 12, color: COLORS.textMuted, fontWeight: "600" },

  // ── Sepp ─────────────────────────────────────────────────────────────────
  seppCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: COLORS.blue, borderRadius: 20,
    padding: 18, marginBottom: 12, gap: 14, ...SHADOWS.card,
  },
  seppIcon: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center",
  },
  seppTexts: { flex: 1 },
  seppTitle: { fontSize: 17, fontWeight: "800", color: "#FFFFFF", marginBottom: 3 },
  seppSub: { fontSize: 13, color: "rgba(255,255,255,0.8)", lineHeight: 18 },
  seppArrow: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center",
  },

  // ── Die Runde ─────────────────────────────────────────────────────────────
  mitgliederCard: {
    backgroundColor: COLORS.card, borderRadius: 20, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.light,
  },
  mitgliederHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  mitgliederTitle: { fontSize: 14, fontWeight: "800", color: COLORS.textDark },
  mitgliederLink: { fontSize: 13, color: COLORS.blue, fontWeight: "700" },
  bubbleRow: { gap: 12, paddingHorizontal: 2 },
  bubbleWrap: { alignItems: "center", gap: 5, width: 52 },
  bubble: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  bubbleActive: { borderWidth: 2.5, borderColor: COLORS.blue },
  bubbleImg: { width: 48, height: 48, borderRadius: 24 },
  bubbleLetter: { fontSize: 18, fontWeight: "700", color: "#FFFFFF" },
  bubbleActiveDot: {
    position: "absolute", bottom: 0, right: 0,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: COLORS.blue, borderWidth: 2, borderColor: COLORS.card,
  },
  bubbleName: { fontSize: 11, color: COLORS.textMuted, textAlign: "center", fontWeight: "500" },
  bubbleAdd: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: COLORS.background, alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: COLORS.border, borderStyle: "dashed",
  },

  // ── Stammtisch-Infos ──────────────────────────────────────────────────────
  faktenCard: {
    backgroundColor: COLORS.card, borderRadius: 20, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.light,
  },
  faktenTitle: { fontSize: 14, fontWeight: "800", color: COLORS.textDark, marginBottom: 12, letterSpacing: -0.2 },
  faktenGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  faktBox: {
    flex: 1, minWidth: 100, alignItems: "center", gap: 5,
    backgroundColor: COLORS.background, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 10,
  },
  faktEmoji: { fontSize: 20 },
  faktValue: { fontSize: 15, fontWeight: "800", color: COLORS.textDark, textAlign: "center" },
  faktLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: "600", textAlign: "center" },

  // ── Schock-Aus Rangliste ──────────────────────────────────────────────────
  rangCard: {
    backgroundColor: COLORS.card, borderRadius: 20, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.card,
  },
  rangCardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  rangCardTitle: { fontSize: 14, fontWeight: "800", color: COLORS.textDark, letterSpacing: -0.2 },
  rangCardLink: { fontSize: 13, fontWeight: "700", color: COLORS.blue },
  rangLinkCard: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  rangLinkText: { fontSize: 14, fontWeight: "700", color: COLORS.textDark },
  rangRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  rangMedal: { fontSize: 18, width: 28, textAlign: "center" },
  rangAvatar: { width: 36, height: 36, borderRadius: 18 },
  rangInfo: { flex: 1 },
  rangName: { fontSize: 14, fontWeight: "700", color: COLORS.textDark },
  rangSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  rangValueWrap: { alignItems: "flex-end" },
  rangValue: { fontSize: 16, fontWeight: "800", color: COLORS.blue },
  rangValueLabel: { fontSize: 10, color: COLORS.textMuted },

  // ── Onboarding ────────────────────────────────────────────────────────────
  onboardingCard: {
    backgroundColor: COLORS.cardAlt, borderRadius: 20, padding: 20, marginBottom: 16,
    borderWidth: 1, borderColor: COLORS.border,
  },
  onboardingTitle: { fontSize: 17, fontWeight: "800", color: COLORS.textDark, marginBottom: 8 },
  onboardingText: { fontSize: 14, color: COLORS.textMuted, lineHeight: 21, marginBottom: 18 },
  onboardingBtns: { flexDirection: "row", gap: 10 },
  onboardingBtn: {
    flex: 1, borderRadius: 14, paddingVertical: 14,
    alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: COLORS.blue + "55", ...SHADOWS.light,
  },
  onboardingBtnEmoji: { fontSize: 24 },
  onboardingBtnText: { fontSize: 13, fontWeight: "700", color: COLORS.textDark },
});
