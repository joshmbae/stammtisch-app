import { View, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import { useSession } from "../contexts/SessionContext";
import { useStammtisch } from "../contexts/StammtischContext";
import { COLORS } from "../constants/design";
import StammtischLogo from "../components/StammtischLogo";

export default function Index() {
  const { stammtischId, stammtischLoaded } = useStammtisch();
  const { activeMemberId, sessionLoaded } = useSession();

  if (!stammtischLoaded || (!!stammtischId && !sessionLoaded)) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: "center", justifyContent: "center", gap: 20 }}>
        <StammtischLogo size={52} />
        <ActivityIndicator color={COLORS.blue} />
      </View>
    );
  }

  if (!stammtischId) return <Redirect href="/stammtisch-waehlen" />;
  if (!activeMemberId) return <Redirect href="/mitglied-waehlen" />;
  return <Redirect href="/(tabs)/home" />;
}
