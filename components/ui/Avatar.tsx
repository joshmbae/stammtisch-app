import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { FONT, ThemeColors } from "../../constants/design";
import { useColors, useThemedStyles } from "../../contexts/ThemeContext";
import { FuehrenderTitel } from "../../utils/stats";
import { tonFarben, tonFuerRangliste } from "./ton";

interface Props {
  name: string;
  color: string;
  photoUri?: string | null;
  size?: number;
  /** Wertungen, die diese Person gerade anführt → Badge unten rechts. */
  fuehrt?: FuehrenderTitel[];
  /** Fehlt / abgesagt: gestrichelter Rand statt Füllung. */
  absent?: boolean;
  /** Farbe des Rings um Badge/Stapel = Fläche dahinter. Standard: Kartenfarbe. */
  ringColor?: string;
  /** Hervorhebung, z. B. „Du" in Listen. */
  highlight?: boolean;
}

export function initial(name: string) {
  return (name.trim()[0] ?? "?").toUpperCase();
}

/**
 * Profilbild oder Initiale auf der Mitgliedsfarbe. Ab 28 px trägt es das
 * Führungs-Badge: ein Emoji der Wertung auf ihrer Tönung, bei mehreren
 * Führungen zusätzlich „+N".
 */
export function Avatar({ name, color, photoUri, size = 40, fuehrt, absent, ringColor, highlight }: Props) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const ring = ringColor ?? c.card;
  const badge = size >= 28 && fuehrt && fuehrt.length > 0 ? fuehrt : null;
  const badgeSize = Math.min(30, Math.max(20, Math.round(size * 0.5)));
  const kreis = { width: size, height: size, borderRadius: size / 2 };

  return (
    <View
      style={[{ width: size, height: size }, highlight && { borderRadius: size / 2, borderWidth: 2, borderColor: c.blue, padding: 0 }]}
      accessibilityRole="image"
      accessibilityLabel={badge ? `${name}, führt: ${badge.map((t) => t.titel).join(", ")}` : name}
    >
      {photoUri && !absent ? (
        <Image source={{ uri: photoUri }} style={kreis} />
      ) : (
        <View
          style={[
            kreis,
            styles.center,
            absent
              ? { backgroundColor: "transparent", borderWidth: 1.5, borderStyle: "dashed", borderColor: c.borderDark }
              : { backgroundColor: color },
          ]}
        >
          <Text style={[styles.letter, { fontSize: Math.round(size * 0.4), color: absent ? c.textMuted : c.onAvatar }]} maxFontSizeMultiplier={1}>
            {initial(name)}
          </Text>
        </View>
      )}
      {badge ? (
        <View style={[styles.badgeRow, { right: -Math.round(badgeSize * 0.42), bottom: -Math.round(badgeSize * 0.2) }]} pointerEvents="none">
          <View
            style={[
              styles.center,
              {
                width: badgeSize, height: badgeSize, borderRadius: badgeSize / 2,
                borderWidth: 2, borderColor: ring,
                backgroundColor: tonFarben(tonFuerRangliste(badge[0].key), c).bg,
              },
            ]}
          >
            <Text style={{ fontSize: Math.round(badgeSize * 0.56) }} maxFontSizeMultiplier={1}>{badge[0].emoji}</Text>
          </View>
          {badge.length > 1 ? (
            <View style={[styles.mehr, { height: badgeSize * 0.8, borderRadius: badgeSize, borderColor: ring }]}>
              <Text style={styles.mehrText} maxFontSizeMultiplier={1}>{`+${badge.length - 1}`}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

interface StackMember {
  id: string;
  name: string;
  color: string;
  photoUri?: string | null;
  absent?: boolean;
}

/** Überlappende Avatare, z. B. „wer ist dabei". */
export function AvatarStack({ members, size = 28, max = 7, ringColor }: { members: StackMember[]; size?: number; max?: number; ringColor?: string }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const ring = ringColor ?? c.card;
  const sichtbar = members.slice(0, max);
  const rest = members.length - sichtbar.length;
  return (
    <View style={styles.stack} accessibilityLabel={members.map((m) => m.name).join(", ")}>
      {sichtbar.map((m, i) => (
        <View key={m.id} style={{ marginLeft: i === 0 ? 0 : -Math.round(size * 0.28), borderRadius: size, borderWidth: 2, borderColor: ring }}>
          <Avatar name={m.name} color={m.color} photoUri={m.photoUri} size={size} absent={m.absent} />
        </View>
      ))}
      {rest > 0 ? (
        <View style={[styles.center, { marginLeft: -Math.round(size * 0.28), width: size + 4, height: size + 4, borderRadius: size, backgroundColor: c.cardAlt, borderWidth: 2, borderColor: ring }]}>
          <Text style={styles.restText}>{`+${rest}`}</Text>
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    center: { alignItems: "center", justifyContent: "center" },
    letter: { fontFamily: FONT.w800 },
    badgeRow: { position: "absolute", flexDirection: "row", alignItems: "center" },
    mehr: {
      marginLeft: -4, paddingHorizontal: 4, minWidth: 18, borderWidth: 2,
      backgroundColor: c.textDark, alignItems: "center", justifyContent: "center",
    },
    mehrText: { fontFamily: FONT.w800, fontSize: 9, color: c.background },
    stack: { flexDirection: "row", alignItems: "center" },
    restText: { fontFamily: FONT.w800, fontSize: 11, color: c.textMid },
  });
