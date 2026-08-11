import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase, supabaseSchema } from "./supabase";
import {
  rowToSpielLog,
  rowToStrafLog,
  rowToVerspätungLog,
  rowToWette,
  rowToTermin,
  rowToActivity,
} from "./storage";
import { SpielLog, StrafLog, VerspätungLog, Wette, StammtischTermin, ActivityLogEntry } from "../types";

// ─── Merge-Helfer ───────────────────────────────────────────────────────────
// Rein mechanisch, kennen keine Business-Logik — die bleibt beim aufrufenden Screen.

export function dedupeInsert<T extends { id: string }>(
  map: Record<string, T[]>,
  item: T,
  bucketKey: string
): Record<string, T[]> {
  const bucket = map[bucketKey] ?? [];
  if (bucket.some((x) => x.id === item.id)) return map;
  return { ...map, [bucketKey]: [item, ...bucket] };
}

export function patchById<T extends { id: string }>(
  map: Record<string, T[]>,
  item: T,
  bucketKey: string
): Record<string, T[]> {
  const bucket = map[bucketKey] ?? [];
  return { ...map, [bucketKey]: bucket.map((x) => (x.id === item.id ? item : x)) };
}

/** Entfernt die id aus allen Buckets, nicht nur einem — robust auch ohne verlässliche member_id im Payload. */
export function removeByIdEverywhere<T extends { id: string }>(
  map: Record<string, T[]>,
  id: string
): Record<string, T[]> {
  const next: Record<string, T[]> = {};
  for (const key of Object.keys(map)) {
    next[key] = map[key].filter((x) => x.id !== id);
  }
  return next;
}

// ─── Termin-Screen ──────────────────────────────────────────────────────────

export interface TerminChangeHandlers {
  onSpielLogInsert: (log: SpielLog) => void;
  onSpielLogDelete: (id: string) => void;
  onStrafLogInsert: (log: StrafLog) => void;
  onStrafLogUpdate: (log: StrafLog) => void;
  onStrafLogDelete: (id: string) => void;
  onVerspätungInsert: (log: VerspätungLog) => void;
  onVerspätungDelete: (id: string) => void;
  onWetteInsert: (w: Wette) => void;
  onWetteUpdate: (w: Wette) => void;
  onWetteDelete: (id: string) => void;
  onTerminUpdate: (t: StammtischTermin) => void;
}

export function subscribeToTerminChanges(
  terminId: string,
  handlers: TerminChangeHandlers,
  onStatusChange?: (status: string) => void
): RealtimeChannel {
  const terminFilter = `termin_id=eq.${terminId}`;

  const channel = supabase
    .channel(`termin-${terminId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: supabaseSchema, table: "spiel_logs", filter: terminFilter },
      (payload) => handlers.onSpielLogInsert(rowToSpielLog(payload.new))
    )
    .on(
      "postgres_changes",
      { event: "DELETE", schema: supabaseSchema, table: "spiel_logs", filter: terminFilter },
      (payload) => handlers.onSpielLogDelete(payload.old.id)
    )
    .on(
      "postgres_changes",
      { event: "INSERT", schema: supabaseSchema, table: "straf_logs", filter: terminFilter },
      (payload) => handlers.onStrafLogInsert(rowToStrafLog(payload.new))
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: supabaseSchema, table: "straf_logs", filter: terminFilter },
      (payload) => handlers.onStrafLogUpdate(rowToStrafLog(payload.new))
    )
    .on(
      "postgres_changes",
      { event: "DELETE", schema: supabaseSchema, table: "straf_logs", filter: terminFilter },
      (payload) => handlers.onStrafLogDelete(payload.old.id)
    )
    .on(
      "postgres_changes",
      { event: "INSERT", schema: supabaseSchema, table: "verspaetung_logs", filter: terminFilter },
      (payload) => handlers.onVerspätungInsert(rowToVerspätungLog(payload.new))
    )
    .on(
      "postgres_changes",
      { event: "DELETE", schema: supabaseSchema, table: "verspaetung_logs", filter: terminFilter },
      (payload) => handlers.onVerspätungDelete(payload.old.id)
    )
    .on(
      "postgres_changes",
      { event: "INSERT", schema: supabaseSchema, table: "wetten", filter: terminFilter },
      (payload) => handlers.onWetteInsert(rowToWette(payload.new))
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: supabaseSchema, table: "wetten", filter: terminFilter },
      (payload) => handlers.onWetteUpdate(rowToWette(payload.new))
    )
    .on(
      "postgres_changes",
      { event: "DELETE", schema: supabaseSchema, table: "wetten", filter: terminFilter },
      (payload) => handlers.onWetteDelete(payload.old.id)
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: supabaseSchema, table: "termine", filter: `id=eq.${terminId}` },
      (payload) => handlers.onTerminUpdate(rowToTermin(payload.new))
    )
    .subscribe((status) => onStatusChange?.(status));

  return channel;
}

// ─── Aktivitäts-Feed ────────────────────────────────────────────────────────

export function subscribeToActivityFeed(
  stammtischId: string,
  onInsert: (entry: ActivityLogEntry) => void
): RealtimeChannel {
  return supabase
    .channel(`activity-${stammtischId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: supabaseSchema, table: "activity_log", filter: `stammtisch_id=eq.${stammtischId}` },
      (payload) => onInsert(rowToActivity(payload.new))
    )
    .subscribe();
}
