import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSession } from "../contexts/SessionContext";
import { COLORS } from "../constants/design";

export default function Index() {
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const { activeMemberId, sessionLoaded } = useSession();

  useEffect(() => {
    AsyncStorage.getItem("st_onboarded").then((val) => setOnboarded(!!val));
  }, []);

  // Warten bis beides geladen
  if (onboarded === null || !sessionLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={COLORS.blue} />
      </View>
    );
  }

  if (!onboarded) return <Redirect href="/onboarding" />;
  if (!activeMemberId) return <Redirect href="/mitglied-waehlen" />;
  return <Redirect href="/(tabs)/home" />;
}
