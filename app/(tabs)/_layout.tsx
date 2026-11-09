import { Redirect, Tabs } from "expo-router";
import { useColors } from "../../contexts/ThemeContext";
import { useStammtisch } from "../../contexts/StammtischContext";
import { BottomNav } from "../../components/BottomNav";

export default function TabsLayout() {
  const c = useColors();
  const { stammtischId, stammtischLoaded } = useStammtisch();
  // Ohne gewählten Stammtisch gibt es hier nichts zu zeigen – etwa wenn ein
  // Link oder eine Push-Nachricht direkt auf einen Tab führt. Dann zur
  // Auswahl statt in eine Fehlermeldung ohne Ausweg. (Ohne Profil bleibt man
  // dagegen hier: „Nur umschauen“ ist gewollt.)
  if (stammtischLoaded && !stammtischId) return <Redirect href="/stammtisch-waehlen" />;
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
