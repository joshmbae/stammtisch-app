import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MemberProfile } from "../../types";
import { FONT, TYPE, ThemeColors } from "../../constants/design";
import { useColors, useThemedStyles } from "../../contexts/ThemeContext";
import { displayName } from "../../utils/format";
import { Avatar, PressableScale, Sheet } from "../ui";

const TASTEN = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "<"];

interface Props {
  member: MemberProfile | null;
  /** Meldung vom Prüfen, z. B. „Falscher PIN." */
  error?: string;
  onCancel: () => void;
  /** Wird mit vier Ziffern aufgerufen; bei Fehler setzt der Screen `error`. */
  onSubmit: (pin: string) => Promise<void> | void;
}

/** PIN-Eingabe mit Ziffernblock als Blatt von unten (Profil wählen). */
export function PinSheet({ member, error, onCancel, onSubmit }: Props) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const [pin, setPin] = useState("");
  const [prueft, setPrueft] = useState(false);

  useEffect(() => {
    if (member) setPin("");
  }, [member?.id]);

  async function tippe(t: string) {
    if (prueft) return;
    if (t === "<") {
      setPin((p) => p.slice(0, -1));
      return;
    }
    if (pin.length >= 4) return;
    const neu = pin + t;
    setPin(neu);
    if (neu.length === 4) {
      setPrueft(true);
      try {
        await onSubmit(neu);
      } finally {
        // Bei falschem PIN neu anfangen, ohne erst löschen zu müssen.
        setPrueft(false);
        setPin("");
      }
    }
  }

  const name = member ? displayName(member) : "";

  return (
    <Sheet visible={!!member} onClose={onCancel} title={`Hallo ${name}`}>
      {member ? (
        <View style={styles.inhalt}>
          <View style={styles.wer}>
            <Avatar name={name} color={member.avatarColor} photoUri={member.photoUri} size={44} ringColor={c.background} />
            <Text style={styles.sub}>Gib deine 4-stellige PIN ein</Text>
          </View>

          <View style={styles.punkte} accessibilityRole="text" accessibilityLabel={`${pin.length} von 4 Ziffern eingegeben`} accessibilityLiveRegion="polite">
            {prueft ? (
              <ActivityIndicator color={c.blue} />
            ) : (
              [0, 1, 2, 3].map((i) => <View key={i} style={i < pin.length ? styles.voll : styles.leer} />)
            )}
          </View>
          <Text style={[styles.fehler, !error && { opacity: 0 }]} accessibilityLiveRegion="assertive">{error ?? " "}</Text>

          <View style={styles.block}>
            {TASTEN.map((t, i) =>
              t === "" ? (
                <View key={i} style={[styles.taste, styles.tasteLeer]} />
              ) : t === "<" ? (
                <PressableScale key={i} onPress={() => tippe(t)} style={[styles.taste, styles.tasteLeer]} accessibilityLabel="Letzte Ziffer löschen" disabled={!pin.length}>
                  <Ionicons name="backspace-outline" size={24} color={c.textDark} />
                </PressableScale>
              ) : (
                <PressableScale key={i} onPress={() => tippe(t)} haptic="leicht" style={styles.taste} accessibilityLabel={t}>
                  <Text style={styles.ziffer}>{t}</Text>
                </PressableScale>
              )
            )}
          </View>
        </View>
      ) : null}
    </Sheet>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    inhalt: { alignItems: "center", paddingBottom: 8 },
    wer: { alignSelf: "stretch", flexDirection: "row", alignItems: "center", gap: 12 },
    sub: { ...TYPE.caption, fontSize: 14, color: c.textMuted, flex: 1 },
    punkte: { height: 56, flexDirection: "row", alignItems: "center", gap: 18, marginTop: 8 },
    voll: { width: 16, height: 16, borderRadius: 8, backgroundColor: c.blue },
    leer: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: c.textLight },
    fehler: { ...TYPE.caption, fontSize: 14, color: c.dangerText, minHeight: 20 },
    block: { alignSelf: "stretch", flexDirection: "row", flexWrap: "wrap", rowGap: 8, marginTop: 8, justifyContent: "space-between" },
    taste: { width: "31.5%", height: 56, borderRadius: 999, backgroundColor: c.cardAlt, alignItems: "center", justifyContent: "center" },
    tasteLeer: { backgroundColor: "transparent" },
    ziffer: { ...TYPE.num, fontFamily: FONT.w600, fontSize: 24, color: c.textDark },
  });
