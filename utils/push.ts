import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { supabase } from "./supabase";
import { activityRoute } from "./activityFeed";
import { renderPushText, PushContext } from "./pushText";
import { ActivityLogEntry } from "../types";

/**
 * Fragt Notification-Permission an und registriert den Expo-Push-Token
 * des Geräts für das aktive Mitglied. Vorerst nur iOS (siehe Plan) — auf
 * Android ein bewusstes No-op. Wirft nie, Push ist ein Nice-to-have und
 * darf den Login-Flow nie blockieren.
 */
export async function registerForPushNotifications(memberId: string): Promise<void> {
  if (Platform.OS !== "ios") return;
  if (!Device.isDevice) return; // Simulator kann keine Remote-Push-Tokens beziehen
  try {
    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== "granted") {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }
    if (status !== "granted") return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) return;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!token) return;

    // Tokens sind für die App nicht lesbar; gespeichert wird über eine
    // Server-Funktion, die auch den Zugriff auf das Mitglied prüft.
    const { error } = await supabase.rpc("rpc_register_push_token", {
      p_member_id: memberId,
      p_token: token,
      p_platform: Platform.OS,
    });
    if (error) console.warn("Push-Token konnte nicht gespeichert werden:", error.message);
  } catch (e) {
    console.warn("Push-Registrierung fehlgeschlagen:", e);
  }
}

/**
 * Gemeinsamer Versand: die Server-Funktion rpc_send_push sucht die Tokens
 * der Empfänger und schickt die Nachrichten an Expos Push-Dienst. Die App
 * sieht keine Tokens. Rückgabe: an wie viele Geräte gesendet wurde.
 */
async function sendePush(empfaenger: string[], nachricht: {
  title: string;
  body: string;
  subtitle?: string;
  data: Record<string, unknown>;
}): Promise<number> {
  if (empfaenger.length === 0) return 0;
  const { data, error } = await supabase.rpc("rpc_send_push", {
    p_empfaenger: empfaenger,
    p_title: nachricht.title,
    p_body: nachricht.body,
    p_subtitle: nachricht.subtitle ?? null,
    p_data: nachricht.data,
  });
  if (error) throw error;
  return typeof data === "number" ? data : 0;
}

/**
 * Schickt allen anderen Mitgliedern des Stammtischs (nicht dem Verursacher)
 * eine Push-Benachrichtigung für einen neuen Aktivitätsprotokoll-Eintrag.
 * Texte kommen aus renderPushText() (locker, wechselnde Formulierungen),
 * das Tipp-Ziel aus activityRoute() — dieselbe Logik wie im Feed.
 */
export async function sendActivityPush(stammtischId: string, activity: ActivityLogEntry): Promise<void> {
  try {
    const { data: members, error: membersError } = await supabase
      .from("members")
      .select("id, name, spitzname")
      .eq("stammtisch_id", stammtischId);
    if (membersError || !members) return;

    const recipients = members.filter((m: any) => m.id !== activity.actorMemberId);
    if (recipients.length === 0) return;

    const [{ data: strafKategorien }, stammtischName, zusagenAnzahl] = await Promise.all([
      supabase.from("straf_kategorien").select("id, label, emoji").eq("stammtisch_id", stammtischId),
      loadStammtischName(stammtischId),
      activity.actionType === "termin_zusage" && activity.terminId
        ? loadZusagenAnzahl(activity.terminId)
        : Promise.resolve(undefined),
    ]);

    const membersById = new Map(members.map((m: any) => [m.id, m]));
    const ctx: PushContext = { zusagenAnzahl };
    const { title, body } = renderPushText(activity, membersById, (strafKategorien ?? []) as any, ctx);

    await sendePush(recipients.map((m: any) => m.id), {
      title,
      body,
      subtitle: stammtischName,
      data: { url: activityRoute(activity), terminId: activity.terminId ?? null, actionType: activity.actionType },
    });
  } catch (e) {
    console.warn("Push-Versand fehlgeschlagen:", e);
  }
}

/** Name des Stammtischs für die Push-Unterzeile (iOS subtitle), aus der Verordnung. */
async function loadStammtischName(stammtischId: string): Promise<string | undefined> {
  const { data } = await supabase.from("verordnung").select("name").eq("stammtisch_id", stammtischId).maybeSingle();
  return data?.name || undefined;
}

async function loadZusagenAnzahl(terminId: string): Promise<number | undefined> {
  const { data } = await supabase.from("termine").select("anwesenheit").eq("id", terminId).maybeSingle();
  return Array.isArray(data?.anwesenheit) ? data!.anwesenheit.length : undefined;
}

/**
 * Persönliche Erinnerung an genau ein Mitglied (z. B. „Bist du dabei?“ aus
 * dem Termin). Geht nur an diese Person, nicht an alle, und landet nicht in
 * der Chronik. Gibt false zurück, wenn die Person kein Push-Gerät registriert
 * hat oder der Versand scheitert – der Aufrufer bietet dann Teilen an.
 */
export async function sendErinnerungPush(memberId: string, nachricht: {
  title: string;
  body: string;
  subtitle?: string;
  url: string;
  terminId?: string;
}): Promise<boolean> {
  try {
    const geraete = await sendePush([memberId], {
      title: nachricht.title,
      body: nachricht.body,
      subtitle: nachricht.subtitle,
      data: { url: nachricht.url, terminId: nachricht.terminId ?? null, actionType: "termin_erinnerung" },
    });
    return geraete > 0;
  } catch (e) {
    console.warn("Erinnerung konnte nicht gesendet werden:", e);
    return false;
  }
}
