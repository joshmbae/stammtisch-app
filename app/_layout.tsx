import "../global.css";
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="chat/[id]" />
      <Stack.Screen name="memory/[id]" />
      <Stack.Screen name="hebamme" />
      <Stack.Screen name="profile/new" />
      <Stack.Screen name="profile/parent-new" />
      <Stack.Screen name="profile/pregnancy-new" />
      <Stack.Screen name="profile/[id]" />
      <Stack.Screen name="profile/edit/[id]" />
      <Stack.Screen name="profile/parent/[id]" />
      <Stack.Screen name="profile/pregnancy/[id]" />
      <Stack.Screen name="profile/pregnancy-development/[id]" />
      <Stack.Screen name="profile/pregnancy-convert/[id]" />
      <Stack.Screen name="profile/tracker/[id]" />
      <Stack.Screen name="profile/weight/[id]" />
      <Stack.Screen name="profile/development/[id]" />
      <Stack.Screen name="familie" />
    </Stack>
  );
}
