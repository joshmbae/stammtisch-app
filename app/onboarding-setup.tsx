import React from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { Button } from "../components/ui";
import { EinstiegHero, EinstiegScreen, Vorteil } from "../components/einstieg/Einstieg";
import { useStammtisch } from "../contexts/StammtischContext";
import { rundeEinladen } from "../utils/einladen";
import { SYMBOL } from "../constants/symbole";

const SCHRITTE: Vorteil[] = [
  { emoji: SYMBOL.zusage, ton: "blue", titel: "Leg dich selbst an", text: "Als erstes Mitglied – am besten gleich als Admin" },
  { emoji: SYMBOL.erinnern, ton: "mustard", titel: "Lad deine Runde ein", text: "Name und Passwort per WhatsApp schicken" },
  { emoji: SYMBOL.treffpunkt, ton: "green", titel: "Trag die Grunddaten ein", text: "Treffpunkt, Stammtischtag, eure Regeln" },
];

/**
 * Direkt nach dem Anlegen: was als Nächstes kommt. Einladen geht hier schon,
 * Grunddaten auch später – Home zeigt dafür eine Checkliste „Erste Schritte“.
 */
export default function OnboardingSetupScreen() {
  const { stammtischName } = useStammtisch();
  return (
    <EinstiegScreen>
      <EinstiegHero
        titel="Angelegt!"
        text={`„${stammtischName ?? "Euer Stammtisch"}“ steht. So geht's weiter – auf Home findest du die Schritte als Checkliste wieder.`}
        vorteile={SCHRITTE}
      />
      <View style={{ flex: 1, minHeight: 24 }} />
      <Button label="Weiter – mich anlegen" icon="person-add-outline" variant="blue" onPress={() => router.replace("/mitglied-waehlen")} />
      <Button label="Runde schon jetzt einladen" icon="share-outline" variant="ghost" onPress={() => rundeEinladen(stammtischName ?? "")} />
    </EinstiegScreen>
  );
}
