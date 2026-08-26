import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { supabase } from "./supabase";
import { renderActivity } from "./activityFeed";
import { ActivityLogEntry } from "../types";

function nextId(): string {
  return Date.now().toString() + Math.random().toString(36).slice(2, 8);
}

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

    const { error } = await supabase.from("push_tokens").upsert(
      {
        id: nextId(),
        member_id: memberId,
        token,
        platform: Platform.OS,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "member_id" }
    );
    if (error) console.warn("Push-Token konnte nicht gespeichert werden:", error.message);
  } catch (e) {
    console.warn("Push-Registrierung fehlgeschlagen:", e);
  }
}

/**
 * Schickt allen anderen Mitgliedern des Stammtischs (nicht dem Verursacher)
 * eine Push-Benachrichtigung für einen neuen Aktivitätsprotokoll-Eintrag —
 * direkt vom Client an Expos Push-Dienst, keine Server-Funktion nötig.
 * Text/Emoji kommen aus derselben renderActivity()-Logik wie der Feed.
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

    const { data: tokenRows, error: tokensError } = await supabase
      .from("push_tokens")
      .select("token")
      .in("member_id", recipients.map((m: any) => m.id));
    if (tokensError || !tokenRows || tokenRows.length === 0) return;

    const membersById = new Map(members.map((m: any) => [m.id, m]));
    const rendered = renderActivity(activity, membersById);

    const messages = tokenRows.map((t: any) => ({
      to: t.token,
      title: "DeinStammtisch",
      body: `${rendered.emoji} ${rendered.text}`,
      sound: "default",
      data: { terminId: activity.terminId ?? null, actionType: activity.actionType },
    }));

    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(messages),
    });
  } catch (e) {
    console.warn("Push-Versand fehlgeschlagen:", e);
  }
}
