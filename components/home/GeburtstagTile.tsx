import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FONT, MAX_FONT_SCALE, TYPE, ThemeColors } from "../../constants/design";
import { useThemedStyles } from "../../contexts/ThemeContext";
import { MemberProfile } from "../../types";
import { displayName } from "../../utils/format";
import { formatWochentagDatum } from "../../utils/date";
import { PressableScale, Scrim, initial } from "../ui";

interface Props {
  member: MemberProfile;
  tage: number;
  datum: Date;
  alter: number | null;
  onPress: () => void;
}

/** Nächster Geburtstag: das Profilbild füllt die Kachel, Text auf dunklem Verlauf (oben und unten). */
export function GeburtstagTile({ member, tage, datum, alter, onPress }: Props) {
  const styles = useThemedStyles(makeStyles);
  const name = displayName(member);
  const wann = tage === 0 ? "heute!" : tage === 1 ? "morgen" : `in ${tage} Tagen`;
  const titel = alter ? `${name} wird ${alter}` : `${name} hat Geburtstag`;
  return (
    <PressableScale onPress={onPress} style={[styles.tile, { backgroundColor: member.avatarColor }]} accessibilityLabel={`Geburtstag: ${titel}, ${wann}, ${formatWochentagDatum(datum)}`}>
      {member.photoUri ? (
        <Image source={{ uri: member.photoUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <View style={styles.initialWrap}>
          <Text style={styles.initial} maxFontSizeMultiplier={1}>{initial(name)}</Text>
        </View>
      )}
      <Scrim top={0.35} bottom={0.78} />
      <View style={styles.kopf}>
        <Text style={styles.label}>Geburtstag</Text>
        <Ionicons name="gift-outline" size={16} color="#FFFFFF" />
      </View>
      <View style={styles.text}>
        <Text style={styles.titel} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE}>{titel}</Text>
        <Text style={styles.sub} numberOfLines={1}>{`${wann} · ${formatWochentagDatum(datum)}`}</Text>
      </View>
    </PressableScale>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    tile: { flex: 1, minHeight: 132, borderRadius: 24, overflow: "hidden", justifyContent: "flex-end" },
    initialWrap: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", paddingTop: 28, paddingBottom: 46 },
    initial: { fontFamily: FONT.w800, fontSize: 52, color: "rgba(255,255,255,0.9)" },
    kopf: { position: "absolute", top: 14, left: 14, right: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    label: { ...TYPE.label, color: "#FFFFFF" },
    text: { padding: 12 },
    titel: { fontFamily: FONT.w800, fontSize: 16, color: "#FFFFFF" },
    sub: { fontFamily: FONT.w600, fontSize: 12, color: "rgba(255,255,255,0.88)" },
  });
