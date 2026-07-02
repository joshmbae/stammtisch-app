import AsyncStorage from "@react-native-async-storage/async-storage";
import { MemberProfile, ChatMessage, ChatSession, BierLog, VerspätungLog, SchockLog, Wette, Erinnerung, StammtischVerordnung, StammtischTermin, Protokoll, KassenEintrag, StrafLog, StrafKategorie } from "../types";

const MEMBERS_KEY = "st_members";
const VERORDNUNG_KEY = "st_verordnung";
const TERMINE_KEY = "st_termine";
const AKTIVER_TERMIN_KEY = "st_aktiver_termin";
const PROTOKOLLE_KEY = "st_protokolle";
const KASSE_KEY = "st_kasse";

// ─── Member Profiles ──────────────────────────────────────────────────────────

export async function saveMembers(members: MemberProfile[]): Promise<void> {
  await AsyncStorage.setItem(MEMBERS_KEY, JSON.stringify(members));
}

export async function loadMembers(): Promise<MemberProfile[]> {
  const data = await AsyncStorage.getItem(MEMBERS_KEY);
  if (!data) return [];
  return JSON.parse(data) as MemberProfile[];
}

export async function deleteMember(id: string): Promise<void> {
  const members = await loadMembers();
  await saveMembers(members.filter((m) => m.id !== id));
  const sessions = await loadSessions(id);
  await Promise.all(sessions.map((s) => AsyncStorage.removeItem(`st_messages_${s.id}`)));
  await AsyncStorage.removeItem(`st_sessions_${id}`);
  await AsyncStorage.removeItem(`st_erinnerungen_${id}`);
  await AsyncStorage.removeItem(`st_bier_logs_${id}`);
  await AsyncStorage.removeItem(`st_verspaetung_logs_${id}`);
}

// ─── Stammtischverordnung ─────────────────────────────────────────────────────

export async function loadVerordnung(): Promise<StammtischVerordnung> {
  const data = await AsyncStorage.getItem(VERORDNUNG_KEY);
  if (!data) return { name: "Die Hellen", regeln: [] };
  return JSON.parse(data) as StammtischVerordnung;
}

export async function saveVerordnung(v: StammtischVerordnung): Promise<void> {
  await AsyncStorage.setItem(VERORDNUNG_KEY, JSON.stringify(v));
}

// ─── Chat Sessions ────────────────────────────────────────────────────────────

export async function loadSessions(memberId: string): Promise<ChatSession[]> {
  const data = await AsyncStorage.getItem(`st_sessions_${memberId}`);
  if (!data) return [];
  return JSON.parse(data) as ChatSession[];
}

export async function saveSessions(memberId: string, sessions: ChatSession[]): Promise<void> {
  await AsyncStorage.setItem(`st_sessions_${memberId}`, JSON.stringify(sessions));
}

export async function createSession(memberId: string): Promise<ChatSession> {
  const session: ChatSession = {
    id: Date.now().toString(),
    memberId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    preview: "Neues Gespräch",
  };
  const existing = await loadSessions(memberId);
  await saveSessions(memberId, [session, ...existing]);
  return session;
}

export async function updateSessionPreview(
  memberId: string,
  sessionId: string,
  preview: string
): Promise<void> {
  const sessions = await loadSessions(memberId);
  const updated = sessions.map((s) =>
    s.id === sessionId ? { ...s, preview, updatedAt: new Date().toISOString() } : s
  );
  await saveSessions(memberId, updated);
}

export async function deleteSession(memberId: string, sessionId: string): Promise<void> {
  const sessions = await loadSessions(memberId);
  await saveSessions(memberId, sessions.filter((s) => s.id !== sessionId));
  await AsyncStorage.removeItem(`st_messages_${sessionId}`);
}

// ─── General Chat Sessions (shared, not per-member) ──────────────────────────

const GENERAL_SESSIONS_KEY = "st_sessions_general";

export async function loadGeneralSessions(): Promise<ChatSession[]> {
  const data = await AsyncStorage.getItem(GENERAL_SESSIONS_KEY);
  if (!data) return [];
  return JSON.parse(data) as ChatSession[];
}

export async function saveGeneralSessions(sessions: ChatSession[]): Promise<void> {
  await AsyncStorage.setItem(GENERAL_SESSIONS_KEY, JSON.stringify(sessions));
}

export async function createGeneralSession(): Promise<ChatSession> {
  const session: ChatSession = {
    id: `general_${Date.now()}`,
    memberId: "general",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    preview: "Neues Gespräch",
  };
  const existing = await loadGeneralSessions();
  await saveGeneralSessions([session, ...existing]);
  return session;
}

export async function updateGeneralSessionPreview(sessionId: string, preview: string): Promise<void> {
  const sessions = await loadGeneralSessions();
  const updated = sessions.map((s) =>
    s.id === sessionId ? { ...s, preview, updatedAt: new Date().toISOString() } : s
  );
  await saveGeneralSessions(updated);
}

export async function deleteGeneralSession(sessionId: string): Promise<void> {
  const sessions = await loadGeneralSessions();
  await saveGeneralSessions(sessions.filter((s) => s.id !== sessionId));
  await AsyncStorage.removeItem(`st_messages_${sessionId}`);
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export async function saveMessages(sessionId: string, messages: ChatMessage[]): Promise<void> {
  await AsyncStorage.setItem(`st_messages_${sessionId}`, JSON.stringify(messages));
}

export async function loadMessages(sessionId: string): Promise<ChatMessage[]> {
  const data = await AsyncStorage.getItem(`st_messages_${sessionId}`);
  if (!data) return [];
  return JSON.parse(data) as ChatMessage[];
}

// ─── Erinnerungen ─────────────────────────────────────────────────────────────

export async function saveErinnerungen(memberId: string, erinnerungen: Erinnerung[]): Promise<void> {
  await AsyncStorage.setItem(`st_erinnerungen_${memberId}`, JSON.stringify(erinnerungen));
}

export async function loadErinnerungen(memberId: string): Promise<Erinnerung[]> {
  const data = await AsyncStorage.getItem(`st_erinnerungen_${memberId}`);
  if (!data) return [];
  return JSON.parse(data) as Erinnerung[];
}

// ─── Bier-Logs ────────────────────────────────────────────────────────────────

export async function loadBierLogs(memberId: string): Promise<BierLog[]> {
  const data = await AsyncStorage.getItem(`st_bier_logs_${memberId}`);
  if (!data) return [];
  return JSON.parse(data) as BierLog[];
}

export async function saveBierLogs(memberId: string, logs: BierLog[]): Promise<void> {
  await AsyncStorage.setItem(`st_bier_logs_${memberId}`, JSON.stringify(logs));
}

export async function addBierLog(
  memberId: string,
  entry: Omit<BierLog, "id" | "memberId">
): Promise<BierLog> {
  const log: BierLog = { ...entry, id: Date.now().toString(), memberId };
  const existing = await loadBierLogs(memberId);
  await saveBierLogs(memberId, [log, ...existing]);
  return log;
}

export async function deleteBierLog(memberId: string, logId: string): Promise<void> {
  const logs = await loadBierLogs(memberId);
  await saveBierLogs(memberId, logs.filter((l) => l.id !== logId));
}

// ─── Verspätungs-Logs ─────────────────────────────────────────────────────────

export async function loadVerspätungLogs(memberId: string): Promise<VerspätungLog[]> {
  const data = await AsyncStorage.getItem(`st_verspaetung_logs_${memberId}`);
  if (!data) return [];
  return JSON.parse(data) as VerspätungLog[];
}

export async function saveVerspätungLogs(memberId: string, logs: VerspätungLog[]): Promise<void> {
  await AsyncStorage.setItem(`st_verspaetung_logs_${memberId}`, JSON.stringify(logs));
}

export async function addVerspätungLog(
  memberId: string,
  entry: Omit<VerspätungLog, "id" | "memberId">
): Promise<VerspätungLog> {
  const log: VerspätungLog = { ...entry, id: Date.now().toString(), memberId };
  const existing = await loadVerspätungLogs(memberId);
  await saveVerspätungLogs(memberId, [log, ...existing]);
  return log;
}

export async function deleteVerspätungLog(memberId: string, logId: string): Promise<void> {
  const logs = await loadVerspätungLogs(memberId);
  await saveVerspätungLogs(memberId, logs.filter((l) => l.id !== logId));
}

// ─── Schock-Logs ──────────────────────────────────────────────────────────────

export async function loadSchockLogs(memberId: string): Promise<SchockLog[]> {
  const data = await AsyncStorage.getItem(`st_schock_logs_${memberId}`);
  if (!data) return [];
  return JSON.parse(data) as SchockLog[];
}

export async function saveSchockLogs(memberId: string, logs: SchockLog[]): Promise<void> {
  await AsyncStorage.setItem(`st_schock_logs_${memberId}`, JSON.stringify(logs));
}

export async function addSchockLog(
  memberId: string,
  entry: Omit<SchockLog, "id" | "memberId">
): Promise<SchockLog> {
  const log: SchockLog = { ...entry, id: Date.now().toString(), memberId };
  const existing = await loadSchockLogs(memberId);
  await saveSchockLogs(memberId, [log, ...existing]);
  return log;
}

export async function deleteSchockLog(memberId: string, logId: string): Promise<void> {
  const logs = await loadSchockLogs(memberId);
  await saveSchockLogs(memberId, logs.filter((l) => l.id !== logId));
}

// ─── Wetten ───────────────────────────────────────────────────────────────────

export async function loadWetten(memberId: string): Promise<Wette[]> {
  const data = await AsyncStorage.getItem(`st_wetten_${memberId}`);
  if (!data) return [];
  return JSON.parse(data) as Wette[];
}

export async function saveWetten(memberId: string, wetten: Wette[]): Promise<void> {
  await AsyncStorage.setItem(`st_wetten_${memberId}`, JSON.stringify(wetten));
}

export async function addWette(
  memberId: string,
  entry: Omit<Wette, "id" | "memberId">
): Promise<Wette> {
  const wette: Wette = { ...entry, id: Date.now().toString(), memberId };
  const existing = await loadWetten(memberId);
  await saveWetten(memberId, [wette, ...existing]);
  return wette;
}

export async function updateWette(
  memberId: string,
  wetteId: string,
  partial: Partial<Wette>
): Promise<void> {
  const wetten = await loadWetten(memberId);
  await saveWetten(memberId, wetten.map((w) => (w.id === wetteId ? { ...w, ...partial } : w)));
}

export async function deleteWette(memberId: string, wetteId: string): Promise<void> {
  const wetten = await loadWetten(memberId);
  await saveWetten(memberId, wetten.filter((w) => w.id !== wetteId));
}

// ─── Stammtisch-Termine ───────────────────────────────────────────────────────

export async function loadTermine(): Promise<StammtischTermin[]> {
  const data = await AsyncStorage.getItem(TERMINE_KEY);
  if (!data) return [];
  return JSON.parse(data) as StammtischTermin[];
}

export async function saveTermine(termine: StammtischTermin[]): Promise<void> {
  await AsyncStorage.setItem(TERMINE_KEY, JSON.stringify(termine));
}

export async function addTermin(entry: Omit<StammtischTermin, "id" | "createdAt" | "aktiv">): Promise<StammtischTermin> {
  const termin: StammtischTermin = {
    ...entry,
    id: Date.now().toString(),
    aktiv: false,
    createdAt: new Date().toISOString(),
  };
  const existing = await loadTermine();
  await saveTermine([...existing, termin].sort((a, b) => a.datum.localeCompare(b.datum)));
  return termin;
}

export async function updateTermin(id: string, partial: Partial<StammtischTermin>): Promise<void> {
  const termine = await loadTermine();
  await saveTermine(termine.map((t) => (t.id === id ? { ...t, ...partial } : t)));
}

export async function deleteTermin(id: string): Promise<void> {
  const termine = await loadTermine();
  await saveTermine(termine.filter((t) => t.id !== id));
}

export async function loadAktiverTermin(): Promise<StammtischTermin | null> {
  const data = await AsyncStorage.getItem(AKTIVER_TERMIN_KEY);
  if (!data) return null;
  return JSON.parse(data) as StammtischTermin;
}

export async function starteTermin(id: string): Promise<StammtischTermin> {
  // Anderen aktiven Termin beenden
  const alle = await loadTermine();
  const now = new Date().toISOString();
  const updated = alle.map((t) =>
    t.aktiv ? { ...t, aktiv: false, endedAt: now } : t
  );
  const termin = updated.find((t) => t.id === id);
  if (!termin) throw new Error("Termin nicht gefunden");
  const aktiver = { ...termin, aktiv: true, startedAt: now };
  const final = updated.map((t) => (t.id === id ? aktiver : t));
  await saveTermine(final);
  await AsyncStorage.setItem(AKTIVER_TERMIN_KEY, JSON.stringify(aktiver));
  return aktiver;
}

export async function beendeTermin(id: string): Promise<void> {
  const now = new Date().toISOString();
  await updateTermin(id, { aktiv: false, endedAt: now });
  await AsyncStorage.removeItem(AKTIVER_TERMIN_KEY);
}

// ─── Protokolle ───────────────────────────────────────────────────────────────

export async function loadProtokolle(): Promise<Protokoll[]> {
  const data = await AsyncStorage.getItem(PROTOKOLLE_KEY);
  if (!data) return [];
  return JSON.parse(data) as Protokoll[];
}

export async function loadProtokoll(terminId: string): Promise<Protokoll | null> {
  const all = await loadProtokolle();
  return all.find((p) => p.terminId === terminId) ?? null;
}

export async function saveProtokoll(
  terminId: string,
  inhalt: string,
  titel?: string
): Promise<Protokoll> {
  const all = await loadProtokolle();
  const existing = all.find((p) => p.terminId === terminId);
  const now = new Date().toISOString();
  if (existing) {
    const updated: Protokoll = { ...existing, inhalt, titel, updatedAt: now };
    await AsyncStorage.setItem(
      PROTOKOLLE_KEY,
      JSON.stringify(all.map((p) => (p.terminId === terminId ? updated : p)))
    );
    return updated;
  }
  const neu: Protokoll = {
    id: Date.now().toString(),
    terminId,
    titel,
    inhalt,
    createdAt: now,
    updatedAt: now,
  };
  await AsyncStorage.setItem(PROTOKOLLE_KEY, JSON.stringify([...all, neu]));
  return neu;
}

export async function deleteProtokoll(terminId: string): Promise<void> {
  const all = await loadProtokolle();
  await AsyncStorage.setItem(
    PROTOKOLLE_KEY,
    JSON.stringify(all.filter((p) => p.terminId !== terminId))
  );
}

// ─── Strafen ──────────────────────────────────────────────────────────────────

export async function loadStrafLogs(memberId: string): Promise<StrafLog[]> {
  const data = await AsyncStorage.getItem(`st_straf_logs_${memberId}`);
  if (!data) return [];
  return JSON.parse(data) as StrafLog[];
}

export async function saveStrafLogs(memberId: string, logs: StrafLog[]): Promise<void> {
  await AsyncStorage.setItem(`st_straf_logs_${memberId}`, JSON.stringify(logs));
}

export async function addStrafLog(
  memberId: string,
  entry: Omit<StrafLog, "id" | "memberId">
): Promise<StrafLog> {
  const log: StrafLog = { ...entry, id: Date.now().toString(), memberId };
  const existing = await loadStrafLogs(memberId);
  await saveStrafLogs(memberId, [log, ...existing]);
  return log;
}

export async function updateStrafLog(memberId: string, logId: string, partial: Partial<StrafLog>): Promise<void> {
  const logs = await loadStrafLogs(memberId);
  await saveStrafLogs(memberId, logs.map((l) => l.id === logId ? { ...l, ...partial } : l));
}

export async function deleteStrafLog(memberId: string, logId: string): Promise<void> {
  const logs = await loadStrafLogs(memberId);
  await saveStrafLogs(memberId, logs.filter((l) => l.id !== logId));
}

export async function loadAllStrafLogs(memberIds: string[]): Promise<StrafLog[]> {
  const results = await Promise.all(memberIds.map((id) => loadStrafLogs(id)));
  return results.flat();
}

// ─── Kasse ────────────────────────────────────────────────────────────────────

export async function loadKasse(): Promise<KassenEintrag[]> {
  const data = await AsyncStorage.getItem(KASSE_KEY);
  if (!data) return [];
  return JSON.parse(data) as KassenEintrag[];
}

export async function addKassenEintrag(
  entry: Omit<KassenEintrag, "id">
): Promise<KassenEintrag> {
  const neu: KassenEintrag = { ...entry, id: Date.now().toString() };
  const existing = await loadKasse();
  await AsyncStorage.setItem(KASSE_KEY, JSON.stringify([neu, ...existing]));
  return neu;
}

export async function updateKassenEintrag(id: string, partial: Partial<KassenEintrag>): Promise<void> {
  const all = await loadKasse();
  await AsyncStorage.setItem(KASSE_KEY, JSON.stringify(all.map((e) => e.id === id ? { ...e, ...partial } : e)));
}

export async function deleteKassenEintrag(id: string): Promise<void> {
  const all = await loadKasse();
  await AsyncStorage.setItem(KASSE_KEY, JSON.stringify(all.filter((e) => e.id !== id)));
}

export async function toggleAnwesenheit(terminId: string, memberId: string): Promise<string[]> {
  const termine = await loadTermine();
  const termin = termine.find((t) => t.id === terminId);
  if (!termin) return [];
  const current = termin.anwesenheit ?? [];
  const updated = current.includes(memberId)
    ? current.filter((id) => id !== memberId)
    : [...current, memberId];
  await updateTermin(terminId, { anwesenheit: updated });
  return updated;
}

export async function setAnwesenheitAll(terminId: string, memberIds: string[]): Promise<void> {
  await updateTermin(terminId, { anwesenheit: memberIds });
}

export async function loadAgenda(terminId: string): Promise<string> {
  const data = await AsyncStorage.getItem(`st_agenda_${terminId}`);
  return data ?? "";
}

export async function saveAgenda(terminId: string, text: string): Promise<void> {
  await AsyncStorage.setItem(`st_agenda_${terminId}`, text);
}

export async function setRsvpStatus(
  terminId: string,
  memberId: string,
  status: "ja" | "nein" | null
): Promise<void> {
  const termine = await loadTermine();
  const termin = termine.find((t) => t.id === terminId);
  if (!termin) return;
  const anwesenheit = (termin.anwesenheit ?? []).filter((id) => id !== memberId);
  const absagen = (termin.absagen ?? []).filter((id) => id !== memberId);
  if (status === "ja") anwesenheit.push(memberId);
  if (status === "nein") absagen.push(memberId);
  await updateTermin(terminId, { anwesenheit, absagen });
}
