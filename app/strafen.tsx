import { Redirect, useLocalSearchParams } from "expo-router";

/**
 * Strafen leben jetzt in der Kasse (Tab „Strafen"). Diese Route bleibt für
 * alte Links und Pushes (/strafen?memberId=…) und leitet nur weiter.
 */
export default function StrafenWeiterleitung() {
  const { memberId } = useLocalSearchParams<{ memberId?: string }>();
  return <Redirect href={{ pathname: "/kasse", params: memberId ? { tab: "strafen", memberId } : { tab: "strafen" } }} />;
}
