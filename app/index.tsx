import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Redirect } from "expo-router";
import { useSession } from "../contexts/SessionContext";
import { useStammtisch } from "../contexts/StammtischContext";
import { useColors, useThemedStyles } from "../contexts/ThemeContext";
import { ThemeColors } from "../constants/design";
import StammtischLogo from "../components/StammtischLogo";

export default function Index() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const { stammtischId, stammtischLoaded } = useStammtisch();
  const { activeMemberId, sessionLoaded } = useSession();

  if (!stammtischLoaded || (!!stammtischId && !sessionLoaded)) {
    return (
      <View style={styles.root} accessibilityLabel="Wird geladen">
        <StammtischLogo size={112} />
        <ActivityIndicator color={c.textMuted} />
      </View>
    );
  }

  if (!stammtischId) return <Redirect href="/stammtisch-waehlen" />;
  if (!activeMemberId) return <Redirect href="/mitglied-waehlen" />;
  return <Redirect href="/(tabs)/home" />;
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background, alignItems: "center", justifyContent: "center", gap: 24 },
  });
