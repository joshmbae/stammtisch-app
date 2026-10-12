import { Tabs } from "expo-router";
import { useColors } from "../../contexts/ThemeContext";
import { BottomNav } from "../../components/BottomNav";

export default function TabsLayout() {
  const c = useColors();
  return (
    <Tabs
      tabBar={(props) => <BottomNav {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.background } }}
    >
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen name="kalender" options={{ title: "Termine" }} />
      <Tabs.Screen name="kasse" options={{ title: "Kasse" }} />
      <Tabs.Screen name="ranglisten" options={{ title: "Tabelle" }} />
      <Tabs.Screen name="runde" options={{ title: "Runde" }} />
    </Tabs>
  );
}
