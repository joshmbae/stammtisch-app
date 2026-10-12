import { StyleSheet, Text, View } from "react-native";
import { TYPE, ThemeColors } from "../constants/design";
import { useThemedStyles } from "../contexts/ThemeContext";
import { Button, IconSquircle } from "./ui";
import { SYMBOL } from "../constants/symbole";

/**
 * Sichtbarer Fehlerzustand mit Wiederholen-Knopf — Ersatz für den früheren
 * Dauerspinner, wenn ein Ladevorgang scheitert und auch kein Cache-Stand da ist.
 */
export default function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.wrap} accessibilityRole="alert">
      <IconSquircle emoji={SYMBOL.offline} ton="coral" size={56} />
      <Text style={styles.title}>Daten konnten nicht geladen werden</Text>
      <Text style={styles.message}>{message}</Text>
      <Button label="Erneut versuchen" icon="refresh" variant="blue" onPress={onRetry} style={{ marginTop: 8, alignSelf: "center" }} />
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    wrap: { flex: 1, minHeight: 320, alignItems: "center", justifyContent: "center", padding: 32, gap: 10 },
    title: { ...TYPE.heading, color: c.textDark, textAlign: "center" },
    message: { ...TYPE.body, fontSize: 14, color: c.textMuted, textAlign: "center", lineHeight: 20 },
  });
