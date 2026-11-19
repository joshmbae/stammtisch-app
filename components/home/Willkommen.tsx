import React, { useCallback, useState } from "react";
import { Linking, Platform } from "react-native";
import { router, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { MemberProfile, StammtischTermin } from "../../types";
import { getStammtischId } from "../../utils/storage";
import { registerForPushNotifications } from "../../utils/push";
import { formatWochentagDatum, toLocalIsoDate } from "../../utils/date";
import { SYMBOL } from "../../constants/symbole";
import { ChecklistenKarte, Schritt } from "./ErsteSchritte";

/** So lange nach dem Anlegen des Profils erscheint die Liste – danach ist man angekommen. */
const TAGE = 21;

async function schluessel(memberId: string): Promise<string> {
  return `st_willkommen_${await getStammtischId()}_${memberId}`;
}

/**
 * Für alle, die einer Runde beitreten (nicht die Gründer, die haben „Erste
 * Schritte“): was man als Erstes tun kann. Profilbild, Geburtstag, beim
 * nächsten Termin antworten und – auf dem iPhone – Mitteilungen erlauben.
 * Hakt sich von selbst ab, lässt sich ausblenden und verschwindet nach drei
 * Wochen oder wenn alles erledigt ist.
 */
export function Willkommen({ ich, members, termine, stammtischName }: {
  ich: MemberProfile | null;
  members: MemberProfile[];
  termine: StammtischTermin[];
  stammtischName: string;
}) {
  const [aus, setAus] = useState<boolean | null>(null);
  const [mitteilungen, setMitteilungen] = useState<"an" | "aus" | "frag" | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!ich) return;
      let aktiv = true;
      schluessel(ich.id)
        .then((k) => AsyncStorage.getItem(k))
        .then((v) => { if (aktiv) setAus(v === "aus"); })
        .catch(() => { if (aktiv) setAus(false); });
      // Beim Zurückkommen (z. B. aus den iOS-Einstellungen) neu prüfen.
      if (Platform.OS === "ios") {
        Notifications.getPermissionsAsync()
          .then((p) => { if (aktiv) setMitteilungen(p.status === "granted" ? "an" : p.canAskAgain ? "frag" : "aus"); })
          .catch(() => {});
      }
      return () => { aktiv = false; };
    }, [ich?.id])
  );

  if (!ich || aus !== false) return null;
  // Gründer und Admins richten ein (Erste Schritte); ohne Admin ist das noch jede:r.
  if (ich.istAdmin || !members.some((m) => m.istAdmin)) return null;
  const alter = (Date.now() - new Date(ich.createdAt).getTime()) / 86_400_000;
  if (!(alter >= 0 && alter <= TAGE)) return null;

  const heute = toLocalIsoDate(new Date());
  const naechster = termine
    .filter((t) => t.art !== "geburtstag" && t.datum >= heute)
    .sort((a, b) => a.datum.localeCompare(b.datum))[0];

  async function mitteilungenErlauben() {
    if (mitteilungen === "aus") {
      // Einmal abgelehnt: iOS fragt nicht nochmal, also zu den Einstellungen der App.
      Linking.openSettings().catch(() => {});
      return;
    }
    const p = await Notifications.requestPermissionsAsync().catch(() => null);
    setMitteilungen(p?.status === "granted" ? "an" : "aus");
    if (p?.status === "granted" && ich) registerForPushNotifications(ich.id);
  }

  const schritte: Schritt[] = [
    {
      key: "foto", emoji: SYMBOL.profilbild, ton: "blue",
      titel: "Profilbild hinzufügen", text: "Damit dich alle auf einen Blick erkennen",
      erledigt: !!ich.photoUri,
      los: () => router.push(`/member/edit/${ich.id}`),
    },
    {
      key: "geburtstag", emoji: SYMBOL.geburtstag, ton: "coral",
      titel: "Geburtstag eintragen", text: "Dann gratuliert dir die Runde",
      erledigt: !!ich.geburtsdatum,
      los: () => router.push(`/member/edit/${ich.id}`),
    },
    ...(naechster ? [{
      key: "termin", emoji: SYMBOL.zusage, ton: "green" as const,
      titel: "Beim nächsten Termin antworten",
      text: `${naechster.titel ?? "Stammtisch"} am ${formatWochentagDatum(new Date(`${naechster.datum}T00:00:00`))}`,
      erledigt: !!(naechster.anwesenheit?.includes(ich.id) || naechster.absagen?.includes(ich.id)),
      los: () => router.push(`/termin/${naechster.id}`),
    }] : []),
    ...(Platform.OS === "ios" && mitteilungen !== null ? [{
      key: "mitteilungen", emoji: SYMBOL.erinnern, ton: "mustard" as const,
      titel: "Mitteilungen erlauben", text: mitteilungen === "aus" ? "In den iPhone-Einstellungen einschalten" : "Erinnerungen und was am Abend los ist",
      erledigt: mitteilungen === "an",
      los: mitteilungenErlauben,
    }] : []),
  ];
  if (schritte.every((s) => s.erledigt)) return null;

  return (
    <ChecklistenKarte
      titel="Willkommen in der Runde"
      schritte={schritte}
      onAus={() => {
        setAus(true);
        schluessel(ich.id).then((k) => AsyncStorage.setItem(k, "aus")).catch(() => {});
      }}
    />
  );
}
