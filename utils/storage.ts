import AsyncStorage from "@react-native-async-storage/async-storage";
import { BabyProfile, ParentProfile, PregnancyProfile, ChatMessage, ChatSession, Memory, WeightLog, FeedingLog, SleepLog, MilestoneProgress } from "../types";

const PROFILES_KEY = "mia_profiles";
const PARENT_PROFILES_KEY = "mia_parent_profiles";

// ─── Baby Profiles ────────────────────────────────────────────────────────────

export async function saveProfiles(profiles: BabyProfile[]): Promise<void> {
  await AsyncStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

export async function loadProfiles(): Promise<BabyProfile[]> {
  const data = await AsyncStorage.getItem(PROFILES_KEY);
  if (!data) return [];
  return JSON.parse(data) as BabyProfile[];
}

// ─── Parent Profiles ──────────────────────────────────────────────────────────

export async function saveParentProfiles(profiles: ParentProfile[]): Promise<void> {
  await AsyncStorage.setItem(PARENT_PROFILES_KEY, JSON.stringify(profiles));
}

export async function loadParentProfiles(): Promise<ParentProfile[]> {
  const data = await AsyncStorage.getItem(PARENT_PROFILES_KEY);
  if (!data) return [];
  return JSON.parse(data) as ParentProfile[];
}

// ─── Pregnancy Profiles ───────────────────────────────────────────────────────

const PREGNANCY_PROFILES_KEY = "mia_pregnancy_profiles";

export async function savePregnancyProfiles(profiles: PregnancyProfile[]): Promise<void> {
  await AsyncStorage.setItem(PREGNANCY_PROFILES_KEY, JSON.stringify(profiles));
}

export async function loadPregnancyProfiles(): Promise<PregnancyProfile[]> {
  const data = await AsyncStorage.getItem(PREGNANCY_PROFILES_KEY);
  if (!data) return [];
  return JSON.parse(data) as PregnancyProfile[];
}

export async function migratePregnancyToBaby(
  pregnancyId: string,
  babyData: Omit<BabyProfile, "id" | "createdAt">
): Promise<BabyProfile> {
  const newBaby: BabyProfile = {
    ...babyData,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
  };

  // Save new baby profile
  const babies = await loadProfiles();
  await saveProfiles([...babies, newBaby]);

  // Migrate sessions: move to new baby ID, update babyId field
  const sessions = await loadSessions(pregnancyId);
  const updatedSessions = sessions.map((s) => ({ ...s, babyId: newBaby.id }));
  await saveSessions(newBaby.id, updatedSessions);
  await AsyncStorage.removeItem(`mia_sessions_${pregnancyId}`);

  // Migrate memories: move to new baby ID, update babyId field
  const memories = await loadMemories(pregnancyId);
  const updatedMemories = memories.map((m) => ({ ...m, babyId: newBaby.id }));
  await saveMemories(newBaby.id, updatedMemories);
  await AsyncStorage.removeItem(`mia_memories_${pregnancyId}`);

  // Remove pregnancy profile (sessions/memories already moved, don't delete them)
  const pregnancies = await loadPregnancyProfiles();
  await savePregnancyProfiles(pregnancies.filter((p) => p.id !== pregnancyId));

  return newBaby;
}

export async function deletePregnancyProfile(id: string): Promise<void> {
  const profiles = await loadPregnancyProfiles();
  await savePregnancyProfiles(profiles.filter((p) => p.id !== id));
  const sessions = await loadSessions(id);
  await Promise.all(sessions.map((s) => AsyncStorage.removeItem(`mia_messages_${s.id}`)));
  await AsyncStorage.removeItem(`mia_sessions_${id}`);
  await AsyncStorage.removeItem(`mia_memories_${id}`);
}

// ─── Chat Sessions ────────────────────────────────────────────────────────────

export async function loadSessions(babyId: string): Promise<ChatSession[]> {
  const data = await AsyncStorage.getItem(`mia_sessions_${babyId}`);
  if (!data) return [];
  return JSON.parse(data) as ChatSession[];
}

export async function saveSessions(babyId: string, sessions: ChatSession[]): Promise<void> {
  await AsyncStorage.setItem(`mia_sessions_${babyId}`, JSON.stringify(sessions));
}

export async function createSession(babyId: string): Promise<ChatSession> {
  const session: ChatSession = {
    id: Date.now().toString(),
    babyId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    preview: "Neues Gespräch",
  };
  const existing = await loadSessions(babyId);
  await saveSessions(babyId, [session, ...existing]);
  return session;
}

export async function updateSessionPreview(
  babyId: string,
  sessionId: string,
  preview: string
): Promise<void> {
  const sessions = await loadSessions(babyId);
  const updated = sessions.map((s) =>
    s.id === sessionId ? { ...s, preview, updatedAt: new Date().toISOString() } : s
  );
  await saveSessions(babyId, updated);
}

export async function deleteSession(babyId: string, sessionId: string): Promise<void> {
  const sessions = await loadSessions(babyId);
  await saveSessions(babyId, sessions.filter((s) => s.id !== sessionId));
  await AsyncStorage.removeItem(`mia_messages_${sessionId}`);
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export async function saveMessages(sessionId: string, messages: ChatMessage[]): Promise<void> {
  await AsyncStorage.setItem(`mia_messages_${sessionId}`, JSON.stringify(messages));
}

export async function loadMessages(sessionId: string): Promise<ChatMessage[]> {
  const data = await AsyncStorage.getItem(`mia_messages_${sessionId}`);
  if (!data) return [];
  return JSON.parse(data) as ChatMessage[];
}

export async function deleteProfile(id: string): Promise<void> {
  // Remove profile
  const profiles = await loadProfiles();
  await saveProfiles(profiles.filter((p) => p.id !== id));
  // Remove all sessions + their messages
  const sessions = await loadSessions(id);
  await Promise.all(sessions.map((s) => AsyncStorage.removeItem(`mia_messages_${s.id}`)));
  await AsyncStorage.removeItem(`mia_sessions_${id}`);
  // Remove memories, weight logs
  await AsyncStorage.removeItem(`mia_memories_${id}`);
  await AsyncStorage.removeItem(`mia_weight_logs_${id}`);
  await AsyncStorage.removeItem(`mia_feeding_logs_${id}`);
  await AsyncStorage.removeItem(`mia_sleep_logs_${id}`);
  await AsyncStorage.removeItem(`mia_active_timer_${id}`);
  await AsyncStorage.removeItem(`mia_milestones_${id}`);
}

export async function deleteParentProfile(id: string): Promise<void> {
  const profiles = await loadParentProfiles();
  await saveParentProfiles(profiles.filter((p) => p.id !== id));
  await AsyncStorage.removeItem(`mia_memories_${id}`);
}

// ─── Memories ─────────────────────────────────────────────────────────────────

export async function saveMemories(babyId: string, memories: Memory[]): Promise<void> {
  await AsyncStorage.setItem(`mia_memories_${babyId}`, JSON.stringify(memories));
}

export async function loadMemories(babyId: string): Promise<Memory[]> {
  const data = await AsyncStorage.getItem(`mia_memories_${babyId}`);
  if (!data) return [];
  return JSON.parse(data) as Memory[];
}

// ─── Weight Logs ──────────────────────────────────────────────────────────────

export async function loadWeightLogs(babyId: string): Promise<WeightLog[]> {
  const data = await AsyncStorage.getItem(`mia_weight_logs_${babyId}`);
  if (!data) return [];
  return JSON.parse(data) as WeightLog[];
}

export async function saveWeightLogs(babyId: string, logs: WeightLog[]): Promise<void> {
  await AsyncStorage.setItem(`mia_weight_logs_${babyId}`, JSON.stringify(logs));
}

export async function addWeightLog(
  babyId: string,
  weightGrams: number,
  measuredAt: string,
  note?: string
): Promise<WeightLog> {
  const log: WeightLog = { id: Date.now().toString(), babyId, weightGrams, measuredAt, note };
  const existing = await loadWeightLogs(babyId);
  const updated = [...existing, log].sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));
  await saveWeightLogs(babyId, updated);
  return log;
}

export async function deleteWeightLog(babyId: string, logId: string): Promise<void> {
  const logs = await loadWeightLogs(babyId);
  await saveWeightLogs(babyId, logs.filter((l) => l.id !== logId));
}

// ─── Feeding Logs ─────────────────────────────────────────────────────────────

export async function loadFeedingLogs(babyId: string): Promise<FeedingLog[]> {
  const data = await AsyncStorage.getItem(`mia_feeding_logs_${babyId}`);
  if (!data) return [];
  return JSON.parse(data) as FeedingLog[];
}

export async function saveFeedingLogs(babyId: string, logs: FeedingLog[]): Promise<void> {
  await AsyncStorage.setItem(`mia_feeding_logs_${babyId}`, JSON.stringify(logs));
}

export async function addFeedingLog(babyId: string, entry: Omit<FeedingLog, "id" | "babyId">): Promise<FeedingLog> {
  const log: FeedingLog = { ...entry, id: Date.now().toString(), babyId };
  const existing = await loadFeedingLogs(babyId);
  await saveFeedingLogs(babyId, [log, ...existing]);
  return log;
}

export async function deleteFeedingLog(babyId: string, logId: string): Promise<void> {
  const logs = await loadFeedingLogs(babyId);
  await saveFeedingLogs(babyId, logs.filter((l) => l.id !== logId));
}

// ─── Sleep Logs ───────────────────────────────────────────────────────────────

export async function loadSleepLogs(babyId: string): Promise<SleepLog[]> {
  const data = await AsyncStorage.getItem(`mia_sleep_logs_${babyId}`);
  if (!data) return [];
  return JSON.parse(data) as SleepLog[];
}

export async function saveSleepLogs(babyId: string, logs: SleepLog[]): Promise<void> {
  await AsyncStorage.setItem(`mia_sleep_logs_${babyId}`, JSON.stringify(logs));
}

export async function addSleepLog(babyId: string, entry: Omit<SleepLog, "id" | "babyId">): Promise<SleepLog> {
  const log: SleepLog = { ...entry, id: Date.now().toString(), babyId };
  const existing = await loadSleepLogs(babyId);
  await saveSleepLogs(babyId, [log, ...existing]);
  return log;
}

export async function deleteSleepLog(babyId: string, logId: string): Promise<void> {
  const logs = await loadSleepLogs(babyId);
  await saveSleepLogs(babyId, logs.filter((l) => l.id !== logId));
}

// ─── Milestone Progress ───────────────────────────────────────────────────────

export async function loadMilestoneProgress(babyId: string): Promise<MilestoneProgress[]> {
  const raw = await AsyncStorage.getItem(`mia_milestones_${babyId}`);
  return raw ? JSON.parse(raw) : [];
}

export async function saveMilestoneProgress(babyId: string, progress: MilestoneProgress[]): Promise<void> {
  await AsyncStorage.setItem(`mia_milestones_${babyId}`, JSON.stringify(progress));
}

export async function setMilestoneStatus(
  babyId: string,
  milestoneId: string,
  status: MilestoneProgress["status"]
): Promise<MilestoneProgress[]> {
  const existing = await loadMilestoneProgress(babyId);
  const filtered = existing.filter((p) => p.milestoneId !== milestoneId);
  const updated: MilestoneProgress[] = [
    ...filtered,
    {
      milestoneId,
      status,
      achievedAt: status === "achieved" ? new Date().toISOString() : undefined,
    },
  ];
  await saveMilestoneProgress(babyId, updated);
  return updated;
}
