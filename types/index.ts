export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface BabyProfile {
  id: string;
  name: string;
  birthDate: string;
  dueDate?: string;         // Errechneter Geburtstermin (für Entwicklungssprünge)
  gender?: "male" | "female" | "other";
  feedingType: "breastfed" | "formula" | "mixed";
  avatarColor: string;
  createdAt: string;
  photoUri?: string;
  weightGrams?: number;
  premature?: boolean;
  siblings?: string;
  medicalNotes?: string;
  description?: string;
}

export type MilestoneStatus = "not_yet" | "trying" | "achieved";
export interface MilestoneProgress {
  milestoneId: string;
  status: MilestoneStatus;
  achievedAt?: string;  // ISO date
}

export interface ParentProfile {
  id: string;
  name: string;
  role: "Mutter" | "Vater" | "andere";
  createdAt: string;
  description?: string;
}

export interface PregnancyProfile {
  id: string;
  nickname: string;         // z. B. "Erdnuss", "Mein Baby"
  dueDate: string;          // ISO — Errechneter Geburtstermin
  avatarColor: string;
  createdAt: string;
  description?: string;
}

export interface ChatSession {
  id: string;
  babyId: string;         // "general" für allgemeinen Chat
  createdAt: string;
  updatedAt: string;
  preview: string;        // letzte Nutzer-Nachricht als Vorschau
}

// ─── Feeding & Sleep Logs ────────────────────────────────────────────────────

export type FeedingType = "breast" | "bottle";
export type BreastSide = "left" | "right" | "both";
export type SleepType = "nap" | "night";

export interface FeedingLog {
  id: string;
  babyId: string;
  type: FeedingType;
  startedAt: string;          // ISO datetime
  durationMinutes: number;
  side?: BreastSide;          // only for "breast"
  amountMl?: number;          // only for "bottle"
  note?: string;
}

export interface SleepLog {
  id: string;
  babyId: string;
  type: SleepType;
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
  note?: string;
}

export interface ActiveTimer {
  babyId: string;
  timerType: "feeding" | "sleep";
  feedingType?: FeedingType;
  side?: BreastSide;
  sleepType?: SleepType;
  startedAt: string;          // ISO datetime
}

// ─── Weight Logs ─────────────────────────────────────────────────────────────

export interface WeightLog {
  id: string;
  babyId: string;
  weightGrams: number;
  measuredAt: string;   // ISO date only: "2025-03-01"
  note?: string;
}

export interface Memory {
  id: string;
  babyId: string;
  content: string;
  category: "sleep" | "feeding" | "health" | "development" | "general" | "mood";
  createdAt: string;
}
