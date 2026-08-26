import { useEffect } from "react";
import { Stack, router } from "expo-router";
import * as Notifications from "expo-notifications";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { MenuProvider } from "../contexts/MenuContext";
import { SessionProvider } from "../contexts/SessionContext";
import { StammtischProvider } from "../contexts/StammtischContext";
import { MenuDrawer } from "../components/MenuDrawer";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const terminId = response.notification.request.content.data?.terminId;
      if (terminId) router.push(`/termin/${terminId}`);
    });
    return () => sub.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <StammtischProvider>
        <SessionProvider>
          <MenuProvider>
            <MenuDrawer />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="stammtisch-waehlen" />
              <Stack.Screen name="onboarding-setup" />
              <Stack.Screen name="onboarding-intro" />
              <Stack.Screen name="mitglied-waehlen" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="member/new" />
              <Stack.Screen name="member/[id]" />
              <Stack.Screen name="member/edit/[id]" />
              <Stack.Screen name="mitglieder" />
              <Stack.Screen name="termin/[id]" />
              <Stack.Screen name="protokolle" />
              <Stack.Screen name="protokoll/[terminId]" />
              <Stack.Screen name="kasse" />
              <Stack.Screen name="strafen" />
              <Stack.Screen name="ranglisten" />
              <Stack.Screen name="spiele" />
              <Stack.Screen name="spiel/new" />
              <Stack.Screen name="spiel/[id]" />
            </Stack>
          </MenuProvider>
        </SessionProvider>
      </StammtischProvider>
    </SafeAreaProvider>
  );
}
