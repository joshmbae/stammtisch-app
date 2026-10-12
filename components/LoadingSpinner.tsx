import { ActivityIndicator, View } from "react-native";
import { useColors } from "../contexts/ThemeContext";

/** Lädt … – mit Mindesthöhe, damit der Spinner auch in einer ScrollView mittig sitzt. */
export default function LoadingSpinner() {
  const c = useColors();
  return (
    <View style={{ flex: 1, minHeight: 320, alignItems: "center", justifyContent: "center" }} accessibilityLabel="Lädt" accessibilityRole="progressbar">
      <ActivityIndicator color={c.textMuted} size="large" />
    </View>
  );
}
