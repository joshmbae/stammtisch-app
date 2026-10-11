import { Tabs } from "expo-router";
import { useColors } from "../../contexts/ThemeContext";

export default function TabsLayout() {
  const c = useColors();
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarStyle: { display: "none" }, sceneStyle: { backgroundColor: c.background } }}>
      <Tabs.Screen name="home" />
      <Tabs.Screen name="kalender" />
      <Tabs.Screen name="guide" />
    </Tabs>
  );
}
