import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { MemberProfile, StammtischVerordnung } from "../types";
import { loadMembers, loadVerordnung } from "../utils/storage";
import { useSession } from "../contexts/SessionContext";
import { useStammtisch } from "../contexts/StammtischContext";
import { FONT, TYPE, ThemeColors } from "../constants/design";
import { useColors, useThemedStyles } from "../contexts/ThemeContext";
import StammtischLogo from "../components/StammtischLogo";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorState from "../components/ErrorState";
import { useScreenLoad } from "../utils/useScreenLoad";
import { displayName } from "../utils/format";
import { verifyPin } from "../utils/pin";
import { hasSeenAppIntro } from "../utils/onboarding";
import { Avatar, Button, Card, PressableScale, Screen } from "../components/ui";
import { PinSheet } from "../components/einstieg/PinSheet";

export default function MitgliedWaehlenScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [verordnung, setVerordnung] = useState<StammtischVerordnung | null>(null);
  const [pendingMember, setPendingMember] = useState<MemberProfile | null>(null);
  const [pinError, setPinError] = useState<string | undefined>(undefined);
  const { setActiveSession, clearSession } = useSession();
  const { stammtischName, clearStammtisch } = useStammtisch();

  async function handleStammtischWechseln() {
    await clearSession();
    await clearStammtisch();
    router.replace("/stammtisch-waehlen");
  }

  // Über useScreenLoad statt eigenem Effekt: ohne Netz blieb sonst der Spinner für immer stehen.
  const { loading, error, retry } = useScreenLoad(async () => {
    const [ms, v] = await Promise.all([loadMembers(), loadVerordnung()]);
    setMembers(ms);
    setVerordnung(v);
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

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={retry} />;

  const name = verordnung?.name || stammtischName || "Euer Stammtisch";
  const info = [verordnung?.treffpunkt, `${members.length} ${members.length === 1 ? "Mitglied" : "Mitglieder"}`].filter(Boolean).join(" · ");

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.kopf}>
        <StammtischLogo size={44} uri={verordnung?.logoUrl} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.stammtisch} numberOfLines={1}>{name}</Text>
          <Text style={styles.muted} numberOfLines={1}>{info}</Text>
        </View>
      </View>

      <View style={styles.intro}>
        <Text style={styles.titel} accessibilityRole="header">Wer bist du?</Text>
        <Text style={styles.untertitel}>{members.length > 0 ? "Tipp auf deinen Namen." : "Hier ist noch niemand eingetragen."}</Text>
      </View>

      {members.length > 0 ? (
        <View style={styles.grid}>
          {members.map((m, i) => (
            <View key={m.id} style={styles.zelle}>
              <Card
                enterIndex={i}
                onPress={() => handleSelect(m)}
                style={styles.karte}
                accessibilityLabel={`${displayName(m)}, ${m.rollen[0]}${m.pinHash ? ", mit PIN geschützt" : ""}`}
              >
                <View>
                  <Avatar name={displayName(m)} color={m.avatarColor} photoUri={m.photoUri} size={52} />
                  {m.pinHash ? (
                    <View style={styles.schloss}>
                      <Ionicons name="lock-closed" size={11} color={c.onMustard} />
                    </View>
                  ) : null}
                </View>
                <Text style={styles.name} numberOfLines={1}>{displayName(m)}</Text>
                <Text style={styles.rolle} numberOfLines={1}>{m.rollen[0]}</Text>
              </Card>
            </View>
          ))}
        </View>
      ) : (
        <Card style={{ gap: 12 }}>
          <Text style={styles.muted}>Leg zuerst die Stammtischrunde an, dann kann jeder sein Profil wählen.</Text>
          <Button label="Mitglied anlegen" icon="person-add-outline" variant="blue" onPress={() => router.push("/member/new")} />
        </Card>
      )}

      <View style={{ flex: 1 }} />

      <View style={styles.unten}>
        <Button
          label="Als Gast fortfahren"
          variant="secondary"
          colors={{ bg: c.cardAlt, fg: c.textDark }}
          onPress={() => router.replace("/(tabs)/home")}
          style={{ alignSelf: "stretch" }}
        />
        <PressableScale onPress={handleStammtischWechseln} style={styles.wechseln} accessibilityLabel="Anderer Stammtisch">
          <Ionicons name="swap-horizontal" size={18} color={c.blue} />
          <Text style={styles.wechselnText}>Anderer Stammtisch</Text>
        </PressableScale>
      </View>

      <PinSheet member={pendingMember} error={pinError} onCancel={() => setPendingMember(null)} onSubmit={handlePinVerify} />
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    content: { flexGrow: 1, paddingBottom: 24 },
    kopf: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 4, paddingTop: 10 },
    stammtisch: { ...TYPE.heading, color: c.textDark },
    muted: { ...TYPE.caption, fontSize: 13, color: c.textMuted },
    intro: { paddingHorizontal: 4, marginTop: 10, marginBottom: 6 },
    titel: { fontFamily: FONT.w700, fontSize: 28, letterSpacing: -0.5, color: c.textDark },
    untertitel: { fontFamily: FONT.w600, fontSize: 15, color: c.textMuted, marginTop: 4 },
    grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 },
    zelle: { width: "33.333%", padding: 4 },
    karte: { minHeight: 124, alignItems: "center", justifyContent: "center", gap: 3, paddingHorizontal: 8, paddingVertical: 14, borderRadius: 26 },
    schloss: {
      position: "absolute", right: -4, bottom: -3, width: 22, height: 22, borderRadius: 11,
      backgroundColor: c.mustard, borderWidth: 2, borderColor: c.card, alignItems: "center", justifyContent: "center",
    },
    name: { fontFamily: FONT.w700, fontSize: 15, color: c.textDark, marginTop: 4, maxWidth: "100%" },
    rolle: { ...TYPE.caption, color: c.textMuted, maxWidth: "100%" },
    unten: { alignItems: "center", gap: 4, marginTop: 16 },
    wechseln: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44, paddingHorizontal: 12 },
    wechselnText: { fontFamily: FONT.w600, fontSize: 14, color: c.blue },
  });
