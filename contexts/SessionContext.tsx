import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MemberProfile } from "../types";
import { loadMembers } from "../utils/storage";
import { useStammtisch } from "./StammtischContext";

const SESSION_KEY = "st_active_member";

interface SessionContextType {
  activeMemberId: string | null;
  activeMember: MemberProfile | null;
  sessionLoaded: boolean;
  setActiveSession: (memberId: string) => Promise<void>;
  clearSession: () => Promise<void>;
  /** Nach Profiländerungen neu laden */
  reloadSession: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType>({
  activeMemberId: null,
  activeMember: null,
  sessionLoaded: false,
  setActiveSession: async () => {},
  clearSession: async () => {},
  reloadSession: async () => {},
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null);
  const [activeMember, setActiveMember] = useState<MemberProfile | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const { stammtischId, stammtischLoaded } = useStammtisch();

  useEffect(() => {
    // Erst laden, wenn der Stammtisch aufgelöst ist — loadMembers() braucht
    // eine gültige getStammtischId(), sonst kein Ziel-Stammtisch bekannt
    // (z. B. frischer Install ohne Auswahl -> Chooser-Screen übernimmt).
    if (!stammtischLoaded) return;
    if (!stammtischId) {
      setActiveMemberId(null);
      setActiveMember(null);
      setSessionLoaded(true);
      return;
    }
    reloadSession();
  }, [stammtischLoaded, stammtischId]);

  async function reloadSession() {
    const id = await AsyncStorage.getItem(SESSION_KEY);
    if (id) {
      const members = await loadMembers();
      const member = members.find((m) => m.id === id) ?? null;
      if (member) {
        setActiveMemberId(id);
        setActiveMember(member);
      } else {
        // Mitglied wurde gelöscht — Session aufräumen
        await AsyncStorage.removeItem(SESSION_KEY);
        setActiveMemberId(null);
        setActiveMember(null);
      }
    } else {
      setActiveMemberId(null);
      setActiveMember(null);
    }
    setSessionLoaded(true);
  }

  async function setActiveSession(memberId: string) {
    await AsyncStorage.setItem(SESSION_KEY, memberId);
    setActiveMemberId(memberId);
    const members = await loadMembers();
    setActiveMember(members.find((m) => m.id === memberId) ?? null);
  }

  async function clearSession() {
    await AsyncStorage.removeItem(SESSION_KEY);
    setActiveMemberId(null);
    setActiveMember(null);
  }

  return (
    <SessionContext.Provider value={{
      activeMemberId, activeMember, sessionLoaded,
      setActiveSession, clearSession, reloadSession,
    }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
