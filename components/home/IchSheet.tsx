import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { MemberProfile } from "../../types";
import { FONT, TYPE, ThemeColors } from "../../constants/design";
import { ERSCHEINUNGSBILD_OPTIONEN, useTheme, useThemedStyles } from "../../contexts/ThemeContext";
import { useStammtisch } from "../../contexts/StammtischContext";
import { displayName } from "../../utils/format";
import { Avatar, Button, PressableScale, SegmentedTabs, Sheet } from "../ui";

/**
 * Alles, was nur dich betrifft, hinter deinem Profilbild auf Home: eigenes
 * Profil, Erscheinungsbild, Profil oder Stammtisch wechseln. Die Runde zeigt
 * damit nur noch den Stammtisch selbst.
 */
export function IchSheet({ visible, onClose, member, stammtischName }: {
  visible: boolean;
  onClose: () => void;
  member: MemberProfile;
  stammtischName: string;
}) {
  const { colors: c, preference, setPreference } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { stammtischVerlassen } = useStammtisch();

  function gehe(route: string) {
    onClose();
    router.push(route as never);
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Du">
      <PressableScale onPress={() => gehe(`/member/${member.id}`)} style={styles.profil} scaleTo={0.98} accessibilityLabel={`Mein Profil, ${displayName(member)}`}>
        <Avatar name={displayName(member)} color={member.avatarColor} photoUri={member.photoUri} size={48} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.name} numberOfLines={1}>{displayName(member)}</Text>
          <Text style={styles.muted}>Mein Profil</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
      </PressableScale>

      <View style={{ gap: 8 }}>
        <Text style={styles.label}>Erscheinungsbild</Text>
        <SegmentedTabs variant="light" items={ERSCHEINUNGSBILD_OPTIONEN} value={preference} onChange={setPreference} />
      </View>

      <View style={{ gap: 8 }}>
        <Button label="Profil wechseln" icon="swap-horizontal" variant="secondary" onPress={() => gehe("/mitglied-waehlen")} />
        {/* Kein Abmelden im eigentlichen Sinn: der Stammtisch bleibt gemerkt und ist mit einem Tipp wieder offen. */}
        <Button
          label="Stammtisch wechseln"
          icon="exit-outline"
          variant="ghost"
          onPress={async () => { onClose(); await stammtischVerlassen(stammtischName); router.replace("/stammtisch-waehlen"); }}
          accessibilityLabel="Stammtisch wechseln. Dieser bleibt gemerkt"
        />
      </View>
    </Sheet>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    profil: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 16, backgroundColor: c.card },
    name: { ...TYPE.heading, color: c.textDark },
    muted: { ...TYPE.caption, fontSize: 13, color: c.textMuted, marginTop: 1 },
    label: { ...TYPE.label, color: c.textMuted, fontFamily: FONT.w700 },
  });
