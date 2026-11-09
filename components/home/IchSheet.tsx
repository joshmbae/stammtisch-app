import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { MemberProfile } from "../../types";
import { FONT, RADIUS, TYPE, ThemeColors } from "../../constants/design";
import { ERSCHEINUNGSBILD_OPTIONEN, useTheme, useThemedStyles } from "../../contexts/ThemeContext";
import { displayName, formatBetrag } from "../../utils/format";
import { SYMBOL } from "../../constants/symbole";
import { Avatar, IconSquircle, PressableScale, SegmentedTabs, Sheet } from "../ui";

/**
 * Hinter dem eigenen Profilbild auf Home: das eigene Profil (mit dem, was
 * noch offen ist), das Erscheinungsbild zum schnellen Umschalten und der Weg
 * in die Einstellungen. Profil- und Stammtischwechsel sowie was oben auf
 * Home steht, liegen in den Einstellungen unter „Dieses Gerät“.
 */
export function IchSheet({ visible, onClose, member, offen }: {
  visible: boolean;
  onClose: () => void;
  member: MemberProfile;
  /** Offene Strafen in Euro (über alle Jahre). */
  offen: number;
}) {
  const { colors: c, preference, setPreference } = useTheme();
  const styles = useThemedStyles(makeStyles);

  function gehe(route: string) {
    onClose();
    router.push(route as never);
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Du">
      <View style={[styles.karte, { backgroundColor: c.card }]}>
        <PressableScale onPress={() => gehe(`/member/${member.id}`)} style={styles.profil} scaleTo={0.98} accessibilityLabel={`Mein Profil, ${displayName(member)}`}>
          <Avatar name={displayName(member)} color={member.avatarColor} photoUri={member.photoUri} size={52} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.name} numberOfLines={1}>{displayName(member)}</Text>
            <Text style={styles.muted}>Mein Profil ansehen</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
        </PressableScale>
        {/* Was noch zu zahlen ist, gleich hier – führt zu den eigenen Strafen mit dem Zahlen-Knopf. */}
        {offen > 0 ? (
          <PressableScale
            onPress={() => gehe(`/kasse?tab=strafen&memberId=${member.id}`)}
            scaleTo={0.98}
            style={[styles.offen, { backgroundColor: c.coralSoft }]}
            accessibilityLabel={`${formatBetrag(offen)} Strafen offen. Anzeigen und bezahlen`}
          >
            <Text style={[styles.offenText, { color: c.coralText }]}>{`${formatBetrag(offen)} offen`}</Text>
            <Text style={[styles.offenLink, { color: c.coralText }]}>Bezahlen</Text>
            <Ionicons name="chevron-forward" size={14} color={c.coralText} />
          </PressableScale>
        ) : null}
      </View>

      <View style={{ gap: 8 }}>
        <Text style={styles.label}>Erscheinungsbild</Text>
        <SegmentedTabs variant="light" items={ERSCHEINUNGSBILD_OPTIONEN} value={preference} onChange={setPreference} />
      </View>

      <View style={[styles.liste, { backgroundColor: c.card }]}>
        <PressableScale onPress={() => gehe("/einstellungen")} scaleTo={0.98} style={styles.zeile} accessibilityLabel="Einstellungen: Stammtisch, Strafen, dieses Gerät">
          <IconSquircle emoji={SYMBOL.einstellungen} ton="neutral" size={34} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.zeileTitel}>Einstellungen</Text>
            <Text style={styles.muted} numberOfLines={1}>Stammtisch, Strafen, Profil wechseln</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
        </PressableScale>
        <View style={[styles.trenner, { backgroundColor: c.border }]} />
        <PressableScale onPress={() => gehe("/neuigkeiten")} scaleTo={0.98} style={styles.zeile} accessibilityLabel="Was ist neu in der App">
          <IconSquircle emoji={SYMBOL.neu} ton="mustard" size={34} />
          <Text style={[styles.zeileTitel, { flex: 1 }]}>Was ist neu</Text>
          <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
        </PressableScale>
      </View>
    </Sheet>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    karte: { borderRadius: 16, overflow: "hidden" },
    profil: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12 },
    name: { ...TYPE.heading, color: c.textDark },
    muted: { ...TYPE.caption, fontSize: 13, color: c.textMuted, marginTop: 1 },
    offen: { flexDirection: "row", alignItems: "center", gap: 4, marginHorizontal: 12, marginBottom: 12, minHeight: 40, paddingHorizontal: 12, borderRadius: RADIUS.md },
    offenText: { flex: 1, fontFamily: FONT.w700, fontSize: 15 },
    offenLink: { fontFamily: FONT.w700, fontSize: 14 },
    label: { ...TYPE.label, color: c.textMuted, fontFamily: FONT.w700 },
    liste: { borderRadius: 16, paddingHorizontal: 12 },
    zeile: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56 },
    zeileTitel: { fontFamily: FONT.w600, fontSize: 15, color: c.textDark },
    trenner: { height: StyleSheet.hairlineWidth, marginLeft: 46 },
  });
