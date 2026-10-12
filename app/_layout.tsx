import { useEffect } from "react";
import {
  useFonts,
  Figtree_400Regular,
  Figtree_400Regular_Italic,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
  Figtree_800ExtraBold,
  Figtree_900Black,
} from "@expo-google-fonts/figtree";
import { Stack, router } from "expo-router";
import * as Notifications from "expo-notifications";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from "@react-navigation/native";
import { ThemeProvider, useTheme } from "../contexts/ThemeContext";
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
      const data = response.notification.request.content.data ?? {};
      // Neue Pushes tragen das Ziel als url (activityRoute), ältere nur terminId.
      if (typeof data.url === "string") router.push(data.url as any);
      else if (data.terminId) router.push(`/termin/${data.terminId}`);
    });
    return () => sub.remove();
  }, []);

  // Ohne geladene Schrift nichts zeigen: sonst springt der Text beim Start
  // vom Systemfont auf Figtree. Schlägt das Laden fehl, geht es mit dem
  // Systemfont weiter statt mit einem leeren Bildschirm.
  const [fontsLoaded, fontError] = useFonts({
    Figtree_400Regular,
    Figtree_400Regular_Italic,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
    Figtree_800ExtraBold,
    Figtree_900Black,
  });
  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemedApp />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

/** Alles unterhalb des ThemeProviders, damit Navigation & Statusleiste dem Farbschema folgen. */
function ThemedApp() {
  const { colors, scheme } = useTheme();
  // Nativer Hintergrund hinter allen Screens — verhindert weiße Blitzer bei Übergängen und Modals.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background).catch(() => {});
  }, [colors.background]);
  const base = scheme === "dark" ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...base,
    colors: {
      ...base.colors,
      background: colors.background,
      card: colors.card,
      text: colors.textDark,
      border: colors.border,
      primary: colors.blue,
    },
  };

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <StammtischProvider>
        <SessionProvider>
          <MenuProvider>
            <MenuDrawer />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
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
              <Stack.Screen name="strafen-kategorien" />
              <Stack.Screen name="ranglisten" />
              <Stack.Screen name="spiele" />
              <Stack.Screen name="spiel/new" />
              <Stack.Screen name="spiel/[id]" />
            </Stack>
          </MenuProvider>
        </SessionProvider>
      </StammtischProvider>
    </NavigationThemeProvider>
  );
}
