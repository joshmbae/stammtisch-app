import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarStyle: { display: "none" } }}>
      <Tabs.Screen name="home" />
      <Tabs.Screen name="chat" />
      <Tabs.Screen name="kalender" />
      <Tabs.Screen name="memories" />
      <Tabs.Screen name="guide" />
    </Tabs>
  );
}
