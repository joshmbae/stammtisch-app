import React from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { Button } from "../components/ui";
import { EinstiegHero, EinstiegScreen, Vorteil } from "../components/einstieg/Einstieg";

const EINRICHTEN: Vorteil[] = [
  { icon: "location-outline", ton: "blue", titel: "Treffpunkt", text: "Wo ihr euch trefft" },
  { icon: "time-outline", ton: "mustard", titel: "Stammtischtag & -zeit", text: "Wann es losgeht" },
  { icon: "document-text-outline", ton: "green", titel: "Eure Regeln", text: "Was bei euch gilt" },
];

export default function OnboardingSetupScreen() {
  return (
    <EinstiegScreen>
      <EinstiegHero
        titel="Fast geschafft!"
        text="Euer Stammtisch ist angelegt. Hinterlegt in Ruhe eure Stammtisch-Daten – das geht unter „Einstellungen“ und lässt sich jederzeit ändern."
        vorteile={EINRICHTEN}
      />
      <View style={{ flex: 1, minHeight: 24 }} />
      <Button label="Jetzt einrichten" icon="settings-outline" variant="blue" onPress={() => router.push("/einstellungen")} />
      <Button label="Später – erstmal Mitglied anlegen" variant="ghost" onPress={() => router.replace("/mitglied-waehlen")} />
    </EinstiegScreen>
  );
}
