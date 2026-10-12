import React, { useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { showAlert } from "../utils/alert";
import { MemberProfile } from "../types";
import { loadMembers, deleteMember } from "../utils/storage";
import { TYPE, FONT, ThemeColors } from "../constants/design";
import { useColors, useThemedStyles } from "../contexts/ThemeContext";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorState from "../components/ErrorState";
import OfflineBanner from "../components/OfflineBanner";
import { useScreenLoad } from "../utils/useScreenLoad";
import { useFuehrende } from "../utils/useFuehrende";
import { displayName } from "../utils/format";
import PinPrompt from "../components/PinPrompt";
import { verifyPin } from "../utils/pin";
import {
  Avatar,
  Button,
  Card,
  HeaderIconButton,
  ListGroup,
  ListRow,
  PressableScale,
  Screen,
  ScreenHeader,
  Sheet,
} from "../components/ui";
import { SYMBOL } from "../constants/symbole";

type Aktion = "bearbeiten" | "entfernen";

// iOS zeigt kein zweites Modal/Alert, solange das Sheet noch zugleitet.
const NACH_SHEET_MS = Platform.OS === "ios" ? 400 : 0;

export default function MitgliederScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const fuehrende = useFuehrende();
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [auswahl, setAuswahl] = useState<MemberProfile | null>(null);
  const [pinTarget, setPinTarget] = useState<{ member: MemberProfile; aktion: Aktion } | null>(null);
  const [pinError, setPinError] = useState<string | undefined>(undefined);

  const { loading, refreshing, error, onRefresh, retry } = useScreenLoad(async () => {
    const ms = await loadMembers();
    setMembers([...ms].sort((a, b) => displayName(a).localeCompare(displayName(b), "de")));
  }, []);

  function confirmAndDelete(m: MemberProfile) {
    showAlert(
      `${m.name} entfernen?`,
      "Alle Daten dieses Mitglieds werden gelöscht. Das kann nicht rückgängig gemacht werden.",
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Entfernen",
          style: "destructive",
          onPress: async () => {
            await deleteMember(m.id);
            setMembers((prev) => prev.filter((x) => x.id !== m.id));
          },
        },
      ]
    );
  }

  function ausfuehren(m: MemberProfile, aktion: Aktion) {
    if (aktion === "bearbeiten") router.push(`/member/edit/${m.id}`);
    else confirmAndDelete(m);
  }

  function handleAktion(aktion: Aktion) {
    const m = auswahl;
    if (!m) return;
    setAuswahl(null);
    setTimeout(() => {
      if (m.pinHash) {
        setPinError(undefined);
        setPinTarget({ member: m, aktion });
        return;
      }
      ausfuehren(m, aktion);
    }, NACH_SHEET_MS);
  }

  async function handlePinVerify(pin: string) {
    if (!pinTarget?.member.pinHash) return;
    const ok = await verifyPin(pinTarget.member.id, pin);
    if (!ok) {
      setPinError("Falscher PIN.");
      return;
    }
    const target = pinTarget;
    setPinTarget(null);
    setTimeout(() => ausfuehren(target.member, target.aktion), NACH_SHEET_MS);
  }

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={retry} />;

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={onRefresh}
      header={
        <>
          <OfflineBanner />
          <ScreenHeader
            back
            title="Mitglieder"
            subtitle={`${members.length} ${members.length === 1 ? "Mitglied" : "Mitglieder"}`}
            right={<HeaderIconButton icon="person-add-outline" label="Mitglied hinzufügen" onPress={() => router.push("/member/new")} />}
          />
        </>
      }
    >
      {members.length === 0 ? (
        <Card enterIndex={0} style={{ gap: 12 }}>
          <Text style={styles.leerTitel}>Noch keine Mitglieder</Text>
          <Text style={styles.muted}>Euer Stammtisch wartet auf euch. Leg die Runde an, dann kann jeder sein Profil wählen.</Text>
          <Button label="Erstes Mitglied anlegen" icon="person-add-outline" variant="blue" onPress={() => router.push("/member/new")} />
        </Card>
      ) : (
        <Card enterIndex={0} style={styles.liste}>
          {members.map((m, i) => (
            <View key={m.id} style={[styles.zeile, i > 0 && styles.linie]}>
              <PressableScale
                onPress={() => router.push(`/member/${m.id}`)}
                scaleTo={0.98}
                style={styles.person}
                accessibilityLabel={`${displayName(m)}, ${m.rollen.join(", ")}${m.pinHash ? ", mit PIN geschützt" : ""}`}
              >
                {/* Breiter als der Avatar: das Führungs-Badge mit „+N" ragt nach rechts. */}
                <View style={styles.avatarPlatz}>
                  <Avatar name={displayName(m)} color={m.avatarColor} photoUri={m.photoUri} size={40} fuehrt={fuehrende.get(m.id)} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={styles.nameZeile}>
                    <Text style={styles.name} numberOfLines={1}>{displayName(m)}</Text>
                    {m.pinHash ? <Ionicons name="lock-closed" size={13} color={c.textMuted} /> : null}
                  </View>
                  <Text style={styles.muted} numberOfLines={1}>
                    {m.rollen.join(", ")}{m.lieblingsgetraenk ? ` · ${m.lieblingsgetraenk}` : ""}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
              </PressableScale>
              <PressableScale onPress={() => setAuswahl(m)} style={styles.mehr} accessibilityLabel={`Aktionen für ${displayName(m)}`}>
                <Ionicons name="ellipsis-horizontal" size={20} color={c.textMid} />
              </PressableScale>
            </View>
          ))}
        </Card>
      )}

      {members.length > 0 ? (
        <Button label="Mitglied hinzufügen" icon="person-add-outline" variant="secondary" onPress={() => router.push("/member/new")} />
      ) : null}

      <Sheet visible={!!auswahl} onClose={() => setAuswahl(null)} title={auswahl ? displayName(auswahl) : ""}>
        <ListGroup>
          <ListRow
            title="Bearbeiten"
            subtitle={auswahl?.pinHash ? "PIN erforderlich" : undefined}
            emoji={SYMBOL.bearbeiten}
            ton="blue"
            onPress={() => handleAktion("bearbeiten")}
          />
          <ListRow
            title="Aus der Runde entfernen"
            subtitle={auswahl?.pinHash ? "PIN erforderlich" : undefined}
            emoji={SYMBOL.loeschen}
            destructive
            onPress={() => handleAktion("entfernen")}
          />
        </ListGroup>
      </Sheet>

      <PinPrompt
        visible={!!pinTarget}
        mode="verify"
        memberName={pinTarget?.member.name}
        error={pinError}
        onCancel={() => setPinTarget(null)}
        onSubmit={handlePinVerify}
      />
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    liste: { paddingVertical: 4, paddingLeft: 14, paddingRight: 4 },
    zeile: { flexDirection: "row", alignItems: "center" },
    linie: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
    person: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, minHeight: 68, paddingVertical: 8 },
    avatarPlatz: { width: 70 },
    nameZeile: { flexDirection: "row", alignItems: "center", gap: 6 },
    name: { ...TYPE.bodyStrong, fontFamily: FONT.w700, fontSize: 16, color: c.textDark, flexShrink: 1 },
    muted: { ...TYPE.caption, fontSize: 13, color: c.textMuted, marginTop: 1 },
    mehr: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
    leerTitel: { ...TYPE.heading, color: c.textDark },
  });
