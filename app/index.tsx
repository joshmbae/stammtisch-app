import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Index() {
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem("mia_onboarded").then((val) => setOnboarded(!!val));
  }, []);

  if (onboarded === null) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FDFAF6", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#4A7C6F" />
      </View>
    );
  }

  if (!onboarded) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)/home" />;
}
