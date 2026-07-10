import { Stack } from "expo-router";
import { MenuProvider } from "../contexts/MenuContext";
import { SessionProvider } from "../contexts/SessionContext";
import { MenuDrawer } from "../components/MenuDrawer";

export default function RootLayout() {
  return (
    <SessionProvider>
      <MenuProvider>
        <MenuDrawer />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="mitglied-waehlen" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="chat/[id]" />
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
        </Stack>
      </MenuProvider>
    </SessionProvider>
  );
}
