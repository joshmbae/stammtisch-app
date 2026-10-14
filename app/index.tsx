import { useEffect } from "react";
import { View } from "react-native";
import { Redirect } from "expo-router";
import { useSession } from "../contexts/SessionContext";
import { useStammtisch } from "../contexts/StammtischContext";
import { useColors } from "../contexts/ThemeContext";
import { introBereit } from "../utils/intro";

/**
 * Startweiche. Während Stammtisch und Sitzung laden, liegt das Start-Intro
 * darüber – hier also nur die Hintergrundfarbe, kein zweites Logo.
 */
export default function Index() {
  const c = useColors();
  const { stammtischId, stammtischLoaded } = useStammtisch();
  const { activeMemberId, sessionLoaded } = useSession();
  const geladen = stammtischLoaded && (!stammtischId || sessionLoaded);
  const nachHome = geladen && !!stammtischId && !!activeMemberId;

  // Home meldet sich selbst, sobald es geladen ist; die anderen Ziele haben nichts zu laden.
  useEffect(() => {
    if (geladen && !nachHome) introBereit();
  }, [geladen, nachHome]);

  if (!geladen) return <View style={{ flex: 1, backgroundColor: c.background }} />;
  if (!stammtischId) return <Redirect href="/stammtisch-waehlen" />;
  if (!activeMemberId) return <Redirect href="/mitglied-waehlen" />;
  return <Redirect href="/(tabs)/home" />;
}
