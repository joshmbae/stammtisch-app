import { supabase } from "./supabase";
import {
  MemberProfile,
  ChatMessage,
  ChatSession,
  BierLog,
  VerspätungLog,
  SchockLog,
  Wette,
  Erinnerung,
  StammtischVerordnung,
  StammtischTermin,
  Protokoll,
  KassenEintrag,
  StrafLog,
} from "../types";

function nextId(): string {
  return Date.now().toString() + Math.random().toString(36).slice(2, 8);
}

// ─── Stammtisch (Multi-Tenant-Vorbereitung, Phase 1: genau ein Stammtisch) ────

let cachedStammtischId: string | null = null;

export async function getStammtischId(): Promise<string> {
  if (cachedStammtischId) return cachedStammtischId;
  const { data, error } = await supabase.from("stammtische").select("id").limit(1).single();
  if (error || !data) throw new Error("Kein Stammtisch gefunden: " + error?.message);
  cachedStammtischId = data.id as string;
  return cachedStammtischId;
}

// ─── Member Profiles ──────────────────────────────────────────────────────────

function rowToMember(row: any): MemberProfile {
  return {
    id: row.id,
    name: row.name,
    spitzname: row.spitzname ?? undefined,
    mitgliedSeit: row.mitglied_seit,
    geburtsdatum: row.geburtsdatum ?? undefined,
    rolle: row.rolle,
    lieblingsgetraenk: row.lieblingsgetraenk ?? undefined,
    beruf: row.beruf ?? undefined,
    avatarColor: row.avatar_color,
    photoUri: row.photo_url ?? undefined,
    notizen: row.notizen ?? undefined,
    createdAt: row.created_at,
  };
}

function memberToRow(m: MemberProfile, stammtischId: string) {
  return {
    id: m.id,
    stammtisch_id: stammtischId,
    name: m.name,
    spitzname: m.spitzname ?? null,
    mitglied_seit: m.mitgliedSeit,
    geburtsdatum: m.geburtsdatum ?? null,
    rolle: m.rolle,
    lieblingsgetraenk: m.lieblingsgetraenk ?? null,
    beruf: m.beruf ?? null,
    avatar_color: m.avatarColor,
    photo_url: m.photoUri ?? null,
    notizen: m.notizen ?? null,
    created_at: m.createdAt,
  };
}

export async function loadMembers(): Promise<MemberProfile[]> {
  const stammtischId = await getStammtischId();
  const { data, error } = await supabase
    .from("members")
    .select("*")
    .eq("stammtisch_id", stammtischId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToMember);
}

/** Ersetzt den kompletten Mitgliederbestand (Upsert + Löschen fehlender Einträge). */
export async function saveMembers(members: MemberProfile[]): Promise<void> {
  const stammtischId = await getStammtischId();
  const rows = members.map((m) => memberToRow(m, stammtischId));
  if (rows.length > 0) {
    const { error } = await supabase.from("members").upsert(rows);
    if (error) throw error;
  }
  const keepIds = members.map((m) => m.id);
  let query = supabase.from("members").delete().eq("stammtisch_id", stammtischId);
  if (keepIds.length > 0) {
    query = query.not("id", "in", `(${keepIds.map((id) => `"${id}"`).join(",")})`);
  }
  const { error: delError } = await query;
  if (delError) throw delError;
}

export async function deleteMember(id: string): Promise<void> {
  const { error } = await supabase.from("members").delete().eq("id", id);
  if (error) throw error;
}

/** Lädt ein lokales Bild hoch und gibt die öffentliche URL zurück. */
export async function uploadAvatar(memberId: string, localUri: string): Promise<string> {
  const response = await fetch(localUri);
  const arrayBuffer = await response.arrayBuffer();
  const ext = localUri.split(".").pop()?.split("?")[0] || "jpg";
  const path = `${memberId}_${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("avatars").upload(path, arrayBuffer, {
    contentType: `image/${ext === "jpg" ? "jpeg" : ext}`,
    upsert: true,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}

// ─── Stammtischverordnung ─────────────────────────────────────────────────────

function rowToVerordnung(row: any): StammtischVerordnung {
  return {
    name: row.name,
    treffpunkt: row.treffpunkt ?? undefined,
    stammtischTag: row.stammtisch_tag ?? undefined,
    stammtischzeit: row.stammtischzeit ?? undefined,
    gruendungsjahr: row.gruendungsjahr ?? undefined,
    regeln: row.regeln ?? [],
    sonstiges: row.sonstiges ?? undefined,
  };
}

export async function loadVerordnung(): Promise<StammtischVerordnung> {
  const stammtischId = await getStammtischId();
  const { data, error } = await supabase
    .from("verordnung")
    .select("*")
    .eq("stammtisch_id", stammtischId)
    .single();
  if (error || !data) return { name: "Mein Stammtisch", regeln: [] };
  return rowToVerordnung(data);
}

export async function saveVerordnung(v: StammtischVerordnung): Promise<void> {
  const stammtischId = await getStammtischId();
  const { error } = await supabase.from("verordnung").upsert({
    stammtisch_id: stammtischId,
    name: v.name,
    treffpunkt: v.treffpunkt ?? null,
    stammtisch_tag: v.stammtischTag ?? null,
    stammtischzeit: v.stammtischzeit ?? null,
    gruendungsjahr: v.gruendungsjahr ?? null,
    regeln: v.regeln ?? [],
    sonstiges: v.sonstiges ?? null,
  });
  if (error) throw error;
}

// ─── Chat Sessions ────────────────────────────────────────────────────────────

function rowToSession(row: any): ChatSession {
  return {
    id: row.id,
    memberId: row.member_id ?? "general",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    preview: row.preview,
  };
}

export async function loadSessions(memberId: string): Promise<ChatSession[]> {
  const { data, error } = await supabase
    .from("chat_sessions")
    .select("*")
    .eq("member_id", memberId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToSession);
}

export async function createSession(memberId: string): Promise<ChatSession> {
  const stammtischId = await getStammtischId();
  const now = new Date().toISOString();
  const row = {
    id: nextId(),
    stammtisch_id: stammtischId,
    member_id: memberId,
    created_at: now,
    updated_at: now,
    preview: "Neues Gespräch",
  };
  const { error } = await supabase.from("chat_sessions").insert(row);
  if (error) throw error;
  return rowToSession(row);
}

export async function updateSessionPreview(
  memberId: string,
  sessionId: string,
  preview: string
): Promise<void> {
  const { error } = await supabase
    .from("chat_sessions")
    .update({ preview, updated_at: new Date().toISOString() })
    .eq("id", sessionId);
  if (error) throw error;
}

export async function deleteSession(memberId: string, sessionId: string): Promise<void> {
  const { error } = await supabase.from("chat_sessions").delete().eq("id", sessionId);
  if (error) throw error;
}

// ─── General Chat Sessions (shared, not per-member) ──────────────────────────

export async function loadGeneralSessions(): Promise<ChatSession[]> {
  const stammtischId = await getStammtischId();
  const { data, error } = await supabase
    .from("chat_sessions")
    .select("*")
    .eq("stammtisch_id", stammtischId)
    .is("member_id", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToSession);
}

export async function saveGeneralSessions(sessions: ChatSession[]): Promise<void> {
  const stammtischId = await getStammtischId();
  const rows = sessions.map((s) => ({
    id: s.id,
    stammtisch_id: stammtischId,
    member_id: null,
    created_at: s.createdAt,
    updated_at: s.updatedAt,
    preview: s.preview,
  }));
  if (rows.length === 0) return;
  const { error } = await supabase.from("chat_sessions").upsert(rows);
  if (error) throw error;
}

export async function createGeneralSession(): Promise<ChatSession> {
  const stammtischId = await getStammtischId();
  const now = new Date().toISOString();
  const row = {
    id: `general_${nextId()}`,
    stammtisch_id: stammtischId,
    member_id: null,
    created_at: now,
    updated_at: now,
    preview: "Neues Gespräch",
  };
  const { error } = await supabase.from("chat_sessions").insert(row);
  if (error) throw error;
  return rowToSession(row);
}

export async function updateGeneralSessionPreview(sessionId: string, preview: string): Promise<void> {
  const { error } = await supabase
    .from("chat_sessions")
    .update({ preview, updated_at: new Date().toISOString() })
    .eq("id", sessionId);
  if (error) throw error;
}

export async function deleteGeneralSession(sessionId: string): Promise<void> {
  const { error } = await supabase.from("chat_sessions").delete().eq("id", sessionId);
  if (error) throw error;
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export async function saveMessages(sessionId: string, messages: ChatMessage[]): Promise<void> {
  const { error: delError } = await supabase.from("chat_messages").delete().eq("session_id", sessionId);
  if (delError) throw delError;
  if (messages.length === 0) return;
  const rows = messages.map((m) => ({
    id: m.id,
    session_id: sessionId,
    role: m.role,
    content: m.content,
    timestamp: m.timestamp,
  }));
  const { error } = await supabase.from("chat_messages").insert(rows);
  if (error) throw error;
}

export async function loadMessages(sessionId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("timestamp", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    role: row.role,
    content: row.content,
    timestamp: row.timestamp,
  }));
}

// ─── Erinnerungen ─────────────────────────────────────────────────────────────

function rowToErinnerung(row: any): Erinnerung {
  return {
    id: row.id,
    memberId: row.member_id,
    content: row.content,
    category: row.category,
    createdAt: row.created_at,
  };
}

export async function saveErinnerungen(memberId: string, erinnerungen: Erinnerung[]): Promise<void> {
  const { error: delError } = await supabase.from("erinnerungen").delete().eq("member_id", memberId);
  if (delError) throw delError;
  if (erinnerungen.length === 0) return;
  const rows = erinnerungen.map((e) => ({
    id: e.id,
    member_id: memberId,
    content: e.content,
    category: e.category,
    created_at: e.createdAt,
  }));
  const { error } = await supabase.from("erinnerungen").insert(rows);
  if (error) throw error;
}

export async function loadErinnerungen(memberId: string): Promise<Erinnerung[]> {
  const { data, error } = await supabase
    .from("erinnerungen")
    .select("*")
    .eq("member_id", memberId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToErinnerung);
}

// ─── Bier-Logs ────────────────────────────────────────────────────────────────

function rowToBierLog(row: any): BierLog {
  return {
    id: row.id,
    memberId: row.member_id,
    terminId: row.termin_id ?? undefined,
    bierTyp: row.bier_typ,
    anzahl: row.anzahl,
    loggedAt: row.logged_at,
    note: row.note ?? undefined,
  };
}

export async function loadBierLogs(memberId: string): Promise<BierLog[]> {
  const { data, error } = await supabase
    .from("bier_logs")
    .select("*")
    .eq("member_id", memberId)
    .order("logged_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToBierLog);
}

export async function saveBierLogs(memberId: string, logs: BierLog[]): Promise<void> {
  const { error: delError } = await supabase.from("bier_logs").delete().eq("member_id", memberId);
  if (delError) throw delError;
  if (logs.length === 0) return;
  const rows = logs.map((l) => ({
    id: l.id,
    member_id: memberId,
    termin_id: l.terminId ?? null,
    bier_typ: l.bierTyp,
    anzahl: l.anzahl,
    logged_at: l.loggedAt,
    note: l.note ?? null,
  }));
  const { error } = await supabase.from("bier_logs").insert(rows);
  if (error) throw error;
}

export async function addBierLog(
  memberId: string,
  entry: Omit<BierLog, "id" | "memberId">
): Promise<BierLog> {
  const log: BierLog = { ...entry, id: nextId(), memberId };
  const { error } = await supabase.from("bier_logs").insert({
    id: log.id,
    member_id: memberId,
    termin_id: log.terminId ?? null,
    bier_typ: log.bierTyp,
    anzahl: log.anzahl,
    logged_at: log.loggedAt,
    note: log.note ?? null,
  });
  if (error) throw error;
  return log;
}

export async function deleteBierLog(memberId: string, logId: string): Promise<void> {
  const { error } = await supabase.from("bier_logs").delete().eq("id", logId);
  if (error) throw error;
}

// ─── Verspätungs-Logs ─────────────────────────────────────────────────────────

function rowToVerspätungLog(row: any): VerspätungLog {
  return {
    id: row.id,
    memberId: row.member_id,
    terminId: row.termin_id ?? undefined,
    datum: row.datum,
    minutenVerspätet: row.minuten_verspaetet,
    grund: row.grund ?? undefined,
  };
}

export async function loadVerspätungLogs(memberId: string): Promise<VerspätungLog[]> {
  const { data, error } = await supabase
    .from("verspaetung_logs")
    .select("*")
    .eq("member_id", memberId)
    .order("datum", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToVerspätungLog);
}

export async function saveVerspätungLogs(memberId: string, logs: VerspätungLog[]): Promise<void> {
  const { error: delError } = await supabase.from("verspaetung_logs").delete().eq("member_id", memberId);
  if (delError) throw delError;
  if (logs.length === 0) return;
  const rows = logs.map((l) => ({
    id: l.id,
    member_id: memberId,
    termin_id: l.terminId ?? null,
    datum: l.datum,
    minuten_verspaetet: l.minutenVerspätet,
    grund: l.grund ?? null,
  }));
  const { error } = await supabase.from("verspaetung_logs").insert(rows);
  if (error) throw error;
}

export async function addVerspätungLog(
  memberId: string,
  entry: Omit<VerspätungLog, "id" | "memberId">
): Promise<VerspätungLog> {
  const log: VerspätungLog = { ...entry, id: nextId(), memberId };
  const { error } = await supabase.from("verspaetung_logs").insert({
    id: log.id,
    member_id: memberId,
    termin_id: log.terminId ?? null,
    datum: log.datum,
    minuten_verspaetet: log.minutenVerspätet,
    grund: log.grund ?? null,
  });
  if (error) throw error;
  return log;
}

export async function deleteVerspätungLog(memberId: string, logId: string): Promise<void> {
  const { error } = await supabase.from("verspaetung_logs").delete().eq("id", logId);
  if (error) throw error;
}

// ─── Schock-Logs ──────────────────────────────────────────────────────────────

function rowToSchockLog(row: any): SchockLog {
  return {
    id: row.id,
    memberId: row.member_id,
    terminId: row.termin_id ?? undefined,
    typ: row.typ,
    loggedAt: row.logged_at,
  };
}

export async function loadSchockLogs(memberId: string): Promise<SchockLog[]> {
  const { data, error } = await supabase
    .from("schock_logs")
    .select("*")
    .eq("member_id", memberId)
    .order("logged_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToSchockLog);
}

export async function saveSchockLogs(memberId: string, logs: SchockLog[]): Promise<void> {
  const { error: delError } = await supabase.from("schock_logs").delete().eq("member_id", memberId);
  if (delError) throw delError;
  if (logs.length === 0) return;
  const rows = logs.map((l) => ({
    id: l.id,
    member_id: memberId,
    termin_id: l.terminId ?? null,
    typ: l.typ,
    logged_at: l.loggedAt,
  }));
  const { error } = await supabase.from("schock_logs").insert(rows);
  if (error) throw error;
}

export async function addSchockLog(
  memberId: string,
  entry: Omit<SchockLog, "id" | "memberId">
): Promise<SchockLog> {
  const log: SchockLog = { ...entry, id: nextId(), memberId };
  const { error } = await supabase.from("schock_logs").insert({
    id: log.id,
    member_id: memberId,
    termin_id: log.terminId ?? null,
    typ: log.typ,
    logged_at: log.loggedAt,
  });
  if (error) throw error;
  return log;
}

export async function deleteSchockLog(memberId: string, logId: string): Promise<void> {
  const { error } = await supabase.from("schock_logs").delete().eq("id", logId);
  if (error) throw error;
}

// ─── Wetten ───────────────────────────────────────────────────────────────────

function rowToWette(row: any): Wette {
  return {
    id: row.id,
    memberId: row.member_id,
    terminId: row.termin_id ?? undefined,
    gegenMemberId: row.gegen_member_id,
    betrag: Number(row.betrag),
    loggedAt: row.logged_at,
    gewonnen: row.gewonnen ?? undefined,
  };
}

export async function loadWetten(memberId: string): Promise<Wette[]> {
  const { data, error } = await supabase
    .from("wetten")
    .select("*")
    .eq("member_id", memberId)
    .order("logged_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToWette);
}

export async function saveWetten(memberId: string, wetten: Wette[]): Promise<void> {
  const { error: delError } = await supabase.from("wetten").delete().eq("member_id", memberId);
  if (delError) throw delError;
  if (wetten.length === 0) return;
  const rows = wetten.map((w) => ({
    id: w.id,
    member_id: memberId,
    termin_id: w.terminId ?? null,
    gegen_member_id: w.gegenMemberId,
    betrag: w.betrag,
    logged_at: w.loggedAt,
    gewonnen: w.gewonnen ?? null,
  }));
  const { error } = await supabase.from("wetten").insert(rows);
  if (error) throw error;
}

export async function addWette(
  memberId: string,
  entry: Omit<Wette, "id" | "memberId">
): Promise<Wette> {
  const wette: Wette = { ...entry, id: nextId(), memberId };
  const { error } = await supabase.from("wetten").insert({
    id: wette.id,
    member_id: memberId,
    termin_id: wette.terminId ?? null,
    gegen_member_id: wette.gegenMemberId,
    betrag: wette.betrag,
    logged_at: wette.loggedAt,
    gewonnen: wette.gewonnen ?? null,
  });
  if (error) throw error;
  return wette;
}

export async function updateWette(
  memberId: string,
  wetteId: string,
  partial: Partial<Wette>
): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (partial.betrag !== undefined) patch.betrag = partial.betrag;
  if (partial.gewonnen !== undefined) patch.gewonnen = partial.gewonnen;
  if (partial.gegenMemberId !== undefined) patch.gegen_member_id = partial.gegenMemberId;
  if (partial.terminId !== undefined) patch.termin_id = partial.terminId;
  if (partial.loggedAt !== undefined) patch.logged_at = partial.loggedAt;
  const { error } = await supabase.from("wetten").update(patch).eq("id", wetteId);
  if (error) throw error;
}

export async function deleteWette(memberId: string, wetteId: string): Promise<void> {
  const { error } = await supabase.from("wetten").delete().eq("id", wetteId);
  if (error) throw error;
}

// ─── Stammtisch-Termine ───────────────────────────────────────────────────────

function rowToTermin(row: any): StammtischTermin {
  return {
    id: row.id,
    art: row.art,
    titel: row.titel ?? undefined,
    datum: row.datum,
    datumBis: row.datum_bis ?? undefined,
    startZeit: row.start_zeit ?? undefined,
    endZeit: row.end_zeit ?? undefined,
    ort: row.ort ?? undefined,
    notizen: row.notizen ?? undefined,
    aktiv: row.aktiv,
    startedAt: row.started_at ?? undefined,
    endedAt: row.ended_at ?? undefined,
    createdAt: row.created_at,
    anwesenheit: row.anwesenheit ?? [],
    absagen: row.absagen ?? [],
  };
}

export async function loadTermine(): Promise<StammtischTermin[]> {
  const stammtischId = await getStammtischId();
  const { data, error } = await supabase
    .from("termine")
    .select("*")
    .eq("stammtisch_id", stammtischId)
    .order("datum", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToTermin);
}

export async function saveTermine(termine: StammtischTermin[]): Promise<void> {
  const stammtischId = await getStammtischId();
  const rows = termine.map((t) => ({
    id: t.id,
    stammtisch_id: stammtischId,
    art: t.art,
    titel: t.titel ?? null,
    datum: t.datum,
    datum_bis: t.datumBis ?? null,
    start_zeit: t.startZeit ?? null,
    end_zeit: t.endZeit ?? null,
    ort: t.ort ?? null,
    notizen: t.notizen ?? null,
    aktiv: t.aktiv,
    started_at: t.startedAt ?? null,
    ended_at: t.endedAt ?? null,
    created_at: t.createdAt,
    anwesenheit: t.anwesenheit ?? [],
    absagen: t.absagen ?? [],
  }));
  if (rows.length === 0) return;
  const { error } = await supabase.from("termine").upsert(rows);
  if (error) throw error;
}

export async function addTermin(entry: Omit<StammtischTermin, "id" | "createdAt" | "aktiv">): Promise<StammtischTermin> {
  const stammtischId = await getStammtischId();
  const termin: StammtischTermin = {
    ...entry,
    id: nextId(),
    aktiv: false,
    createdAt: new Date().toISOString(),
  };
  const { error } = await supabase.from("termine").insert({
    id: termin.id,
    stammtisch_id: stammtischId,
    art: termin.art,
    titel: termin.titel ?? null,
    datum: termin.datum,
    datum_bis: termin.datumBis ?? null,
    start_zeit: termin.startZeit ?? null,
    end_zeit: termin.endZeit ?? null,
    ort: termin.ort ?? null,
    notizen: termin.notizen ?? null,
    aktiv: false,
    created_at: termin.createdAt,
    anwesenheit: [],
    absagen: [],
  });
  if (error) throw error;
  return termin;
}

function terminPatchToRow(partial: Partial<StammtischTermin>): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (partial.art !== undefined) patch.art = partial.art;
  if (partial.titel !== undefined) patch.titel = partial.titel ?? null;
  if (partial.datum !== undefined) patch.datum = partial.datum;
  if (partial.datumBis !== undefined) patch.datum_bis = partial.datumBis ?? null;
  if (partial.startZeit !== undefined) patch.start_zeit = partial.startZeit ?? null;
  if (partial.endZeit !== undefined) patch.end_zeit = partial.endZeit ?? null;
  if (partial.ort !== undefined) patch.ort = partial.ort ?? null;
  if (partial.notizen !== undefined) patch.notizen = partial.notizen ?? null;
  if (partial.aktiv !== undefined) patch.aktiv = partial.aktiv;
  if (partial.startedAt !== undefined) patch.started_at = partial.startedAt ?? null;
  if (partial.endedAt !== undefined) patch.ended_at = partial.endedAt ?? null;
  if (partial.anwesenheit !== undefined) patch.anwesenheit = partial.anwesenheit;
  if (partial.absagen !== undefined) patch.absagen = partial.absagen;
  return patch;
}

export async function updateTermin(id: string, partial: Partial<StammtischTermin>): Promise<void> {
  const patch = terminPatchToRow(partial);
  const { error } = await supabase.from("termine").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteTermin(id: string): Promise<void> {
  const { error } = await supabase.from("termine").delete().eq("id", id);
  if (error) throw error;
}

export async function loadAktiverTermin(): Promise<StammtischTermin | null> {
  const stammtischId = await getStammtischId();
  const { data, error } = await supabase
    .from("termine")
    .select("*")
    .eq("stammtisch_id", stammtischId)
    .eq("aktiv", true)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToTermin(data) : null;
}

export async function starteTermin(id: string): Promise<StammtischTermin> {
  const stammtischId = await getStammtischId();
  const now = new Date().toISOString();
  const { error: stopError } = await supabase
    .from("termine")
    .update({ aktiv: false, ended_at: now })
    .eq("stammtisch_id", stammtischId)
    .eq("aktiv", true);
  if (stopError) throw stopError;

  const { data, error } = await supabase
    .from("termine")
    .update({ aktiv: true, started_at: now })
    .eq("id", id)
    .select()
    .single();
  if (error || !data) throw error ?? new Error("Termin nicht gefunden");
  return rowToTermin(data);
}

export async function beendeTermin(id: string): Promise<void> {
  const now = new Date().toISOString();
  await updateTermin(id, { aktiv: false, endedAt: now });
}

// ─── Protokolle ───────────────────────────────────────────────────────────────

function rowToProtokoll(row: any): Protokoll {
  return {
    id: row.id,
    terminId: row.termin_id,
    titel: row.titel ?? undefined,
    inhalt: row.inhalt,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function loadProtokolle(): Promise<Protokoll[]> {
  const stammtischId = await getStammtischId();
  const { data, error } = await supabase
    .from("protokolle")
    .select("*, termine!inner(stammtisch_id)")
    .eq("termine.stammtisch_id", stammtischId);
  if (error) throw error;
  return (data ?? []).map(rowToProtokoll);
}

export async function loadProtokoll(terminId: string): Promise<Protokoll | null> {
  const { data, error } = await supabase
    .from("protokolle")
    .select("*")
    .eq("termin_id", terminId)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToProtokoll(data) : null;
}

export async function saveProtokoll(
  terminId: string,
  inhalt: string,
  titel?: string
): Promise<Protokoll> {
  const now = new Date().toISOString();
  const existing = await loadProtokoll(terminId);
  if (existing) {
    const { data, error } = await supabase
      .from("protokolle")
      .update({ inhalt, titel: titel ?? null, updated_at: now })
      .eq("id", existing.id)
      .select()
      .single();
    if (error || !data) throw error;
    return rowToProtokoll(data);
  }
  const row = {
    id: nextId(),
    termin_id: terminId,
    titel: titel ?? null,
    inhalt,
    created_at: now,
    updated_at: now,
  };
  const { error } = await supabase.from("protokolle").insert(row);
  if (error) throw error;
  return rowToProtokoll(row);
}

export async function deleteProtokoll(terminId: string): Promise<void> {
  const { error } = await supabase.from("protokolle").delete().eq("termin_id", terminId);
  if (error) throw error;
}

// ─── Strafen ──────────────────────────────────────────────────────────────────

function rowToStrafLog(row: any): StrafLog {
  return {
    id: row.id,
    memberId: row.member_id,
    terminId: row.termin_id ?? undefined,
    kategorie: row.kategorie,
    betrag: Number(row.betrag),
    notiz: row.notiz ?? undefined,
    loggedAt: row.logged_at,
    beglichen: row.beglichen,
  };
}

export async function loadStrafLogs(memberId: string): Promise<StrafLog[]> {
  const { data, error } = await supabase
    .from("straf_logs")
    .select("*")
    .eq("member_id", memberId)
    .order("logged_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToStrafLog);
}

export async function saveStrafLogs(memberId: string, logs: StrafLog[]): Promise<void> {
  const { error: delError } = await supabase.from("straf_logs").delete().eq("member_id", memberId);
  if (delError) throw delError;
  if (logs.length === 0) return;
  const rows = logs.map((l) => ({
    id: l.id,
    member_id: memberId,
    termin_id: l.terminId ?? null,
    kategorie: l.kategorie,
    betrag: l.betrag,
    notiz: l.notiz ?? null,
    logged_at: l.loggedAt,
    beglichen: l.beglichen,
  }));
  const { error } = await supabase.from("straf_logs").insert(rows);
  if (error) throw error;
}

export async function addStrafLog(
  memberId: string,
  entry: Omit<StrafLog, "id" | "memberId">
): Promise<StrafLog> {
  const log: StrafLog = { ...entry, id: nextId(), memberId };
  const { error } = await supabase.from("straf_logs").insert({
    id: log.id,
    member_id: memberId,
    termin_id: log.terminId ?? null,
    kategorie: log.kategorie,
    betrag: log.betrag,
    notiz: log.notiz ?? null,
    logged_at: log.loggedAt,
    beglichen: log.beglichen,
  });
  if (error) throw error;
  return log;
}

export async function updateStrafLog(memberId: string, logId: string, partial: Partial<StrafLog>): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (partial.kategorie !== undefined) patch.kategorie = partial.kategorie;
  if (partial.betrag !== undefined) patch.betrag = partial.betrag;
  if (partial.notiz !== undefined) patch.notiz = partial.notiz ?? null;
  if (partial.loggedAt !== undefined) patch.logged_at = partial.loggedAt;
  if (partial.beglichen !== undefined) patch.beglichen = partial.beglichen;
  if (partial.terminId !== undefined) patch.termin_id = partial.terminId ?? null;
  const { error } = await supabase.from("straf_logs").update(patch).eq("id", logId);
  if (error) throw error;
}

export async function deleteStrafLog(memberId: string, logId: string): Promise<void> {
  const { error } = await supabase.from("straf_logs").delete().eq("id", logId);
  if (error) throw error;
}

export async function loadAllStrafLogs(memberIds: string[]): Promise<StrafLog[]> {
  if (memberIds.length === 0) return [];
  const { data, error } = await supabase
    .from("straf_logs")
    .select("*")
    .in("member_id", memberIds);
  if (error) throw error;
  return (data ?? []).map(rowToStrafLog);
}

// ─── Kasse ────────────────────────────────────────────────────────────────────

function rowToKassenEintrag(row: any): KassenEintrag {
  return {
    id: row.id,
    typ: row.typ,
    betrag: Number(row.betrag),
    beschreibung: row.beschreibung ?? undefined,
    terminId: row.termin_id ?? undefined,
    bezahltVon: row.bezahlt_von ?? undefined,
    datum: row.datum,
    beglichen: row.beglichen ?? undefined,
  };
}

export async function loadKasse(): Promise<KassenEintrag[]> {
  const stammtischId = await getStammtischId();
  const { data, error } = await supabase
    .from("kasse")
    .select("*")
    .eq("stammtisch_id", stammtischId)
    .order("datum", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToKassenEintrag);
}

export async function addKassenEintrag(
  entry: Omit<KassenEintrag, "id">
): Promise<KassenEintrag> {
  const stammtischId = await getStammtischId();
  const neu: KassenEintrag = { ...entry, id: nextId() };
  const { error } = await supabase.from("kasse").insert({
    id: neu.id,
    stammtisch_id: stammtischId,
    typ: neu.typ,
    betrag: neu.betrag,
    beschreibung: neu.beschreibung ?? null,
    termin_id: neu.terminId ?? null,
    bezahlt_von: neu.bezahltVon ?? null,
    datum: neu.datum,
    beglichen: neu.beglichen ?? null,
  });
  if (error) throw error;
  return neu;
}

export async function updateKassenEintrag(id: string, partial: Partial<KassenEintrag>): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (partial.typ !== undefined) patch.typ = partial.typ;
  if (partial.betrag !== undefined) patch.betrag = partial.betrag;
  if (partial.beschreibung !== undefined) patch.beschreibung = partial.beschreibung ?? null;
  if (partial.terminId !== undefined) patch.termin_id = partial.terminId ?? null;
  if (partial.bezahltVon !== undefined) patch.bezahlt_von = partial.bezahltVon ?? null;
  if (partial.datum !== undefined) patch.datum = partial.datum;
  if (partial.beglichen !== undefined) patch.beglichen = partial.beglichen ?? null;
  const { error } = await supabase.from("kasse").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteKassenEintrag(id: string): Promise<void> {
  const { error } = await supabase.from("kasse").delete().eq("id", id);
  if (error) throw error;
}

export async function toggleAnwesenheit(terminId: string, memberId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("termine")
    .select("anwesenheit")
    .eq("id", terminId)
    .single();
  if (error || !data) return [];
  const current: string[] = data.anwesenheit ?? [];
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
  const { data, error } = await supabase
    .from("termine")
    .select("agenda")
    .eq("id", terminId)
    .maybeSingle();
  if (error || !data) return "";
  return data.agenda ?? "";
}

export async function saveAgenda(terminId: string, text: string): Promise<void> {
  const { error } = await supabase.from("termine").update({ agenda: text }).eq("id", terminId);
  if (error) throw error;
}

export async function setRsvpStatus(
  terminId: string,
  memberId: string,
  status: "ja" | "nein" | null
): Promise<void> {
  const { data, error } = await supabase
    .from("termine")
    .select("anwesenheit, absagen")
    .eq("id", terminId)
    .single();
  if (error || !data) return;
  const anwesenheit: string[] = (data.anwesenheit ?? []).filter((id: string) => id !== memberId);
  const absagen: string[] = (data.absagen ?? []).filter((id: string) => id !== memberId);
  if (status === "ja") anwesenheit.push(memberId);
  if (status === "nein") absagen.push(memberId);
  await updateTermin(terminId, { anwesenheit, absagen });
}
