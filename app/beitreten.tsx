import { Redirect, useLocalSearchParams } from "expo-router";

/**
 * Einladungslink: stammtisch-app://beitreten?code=K7MP-Q4RX öffnet die
 * Anmeldung mit vorausgefülltem Code.
 */
export default function Beitreten() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  return <Redirect href={{ pathname: "/stammtisch-waehlen", params: code ? { code } : {} }} />;
}
