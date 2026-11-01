import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { MemberProfile } from "../types";
import { useSession } from "../contexts/SessionContext";
import { displayName } from "./format";
import { loadMembers } from "./storage";
import { showAlert } from "./alert";

export interface AdminStatus {
  /** Das gewählte Profil ist Admin. */
  istAdmin: boolean;
  /** Es gibt in diesem Stammtisch überhaupt Admins. */
  gibtAdmins: boolean;
  admins: MemberProfile[];
  /** Darf Admin-Sachen machen: selbst Admin, oder es gibt noch keinen Admin. */
  darf: boolean;
  /** Führt `aktion` aus, wenn erlaubt; sonst kurzer Hinweis, wer es darf. */
  nurAdmin: (aktion: () => void) => void;
  neuLaden: () => void;
}

/** Hinweistext für Nicht-Admins, z. B. „Das kann nur ein Admin: Franz, Sepp.“ */
export function nurAdminText(admins: MemberProfile[]): string {
  return `Das kann nur ein Admin${admins.length ? `: ${admins.map(displayName).join(", ")}` : ""}.`;
}

/**
 * Admin-Rechte pro Stammtisch (Stufe 1): nur in der App geprüft, weil das
 * Gerät noch nicht fest mit einem Profil verbunden ist. Admins sind mit PIN
 * geschützt, damit sich nicht jede:r als Admin auswählen kann. Ohne Admin
 * darf jede:r alles – so bleibt keine Runde ausgesperrt.
 */
export function useAdmin(): AdminStatus {
  const { activeMemberId } = useSession();
  const [members, setMembers] = useState<MemberProfile[]>([]);

  const neuLaden = useCallback(() => {
    loadMembers().then(setMembers).catch(() => {});
  }, []);
  useFocusEffect(useCallback(() => { neuLaden(); }, [neuLaden, activeMemberId]));

  const admins = members.filter((m) => m.istAdmin);
  const gibtAdmins = admins.length > 0;
  const istAdmin = !!activeMemberId && admins.some((m) => m.id === activeMemberId);
  const darf = istAdmin || !gibtAdmins;

  const nurAdmin = (aktion: () => void) => {
    if (darf) aktion();
    else showAlert("Nur für Admins", nurAdminText(admins));
  };

  return { istAdmin, gibtAdmins, admins, darf, nurAdmin, neuLaden };
}
