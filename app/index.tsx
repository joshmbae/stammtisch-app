import { View, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import { useSession } from "../contexts/SessionContext";
import { COLORS } from "../constants/design";

export default function Index() {
  const { activeMemberId, sessionLoaded } = useSession();

  if (!sessionLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={COLORS.blue} />
      </View>
    );
  }

  if (!activeMemberId) return <Redirect href="/mitglied-waehlen" />;
  return <Redirect href="/(tabs)/home" />;
}
