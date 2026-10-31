import * as Crypto from "expo-crypto";
import { supabase } from "./supabase";

export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

/** Hasht einen 4-stelligen PIN gebunden an die Mitglieds-Id (dient als Salt). */
export async function hashPin(memberId: string, pin: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${memberId}:${pin}`);
}

export type PinErgebnis = "ok" | "falsch" | "zu_viele";

/** Fehlversuche sind serverseitig begrenzt (supabase/migrations/2026-10-31-versuche-begrenzen.sql). */
export const ZU_VIELE_VERSUCHE = "Zu viele Versuche. Bitte in 15 Minuten noch einmal.";

export function istZuVieleVersuche(error: { message?: string } | null | undefined): boolean {
  return !!error?.message?.includes("zu_viele_versuche");
}

/** Text unter dem PIN-Feld, wenn es nicht geklappt hat. */
export function pinFehlertext(r: Exclude<PinErgebnis, "ok">): string {
  return r === "zu_viele" ? ZU_VIELE_VERSUCHE : "Falscher PIN.";
}

/** Vergleicht serverseitig (RPC) — der gespeicherte PIN-Hash verlässt die Datenbank nie. */
export async function verifyPin(memberId: string, pin: string): Promise<PinErgebnis> {
  const pinHash = await hashPin(memberId, pin);
  const { data, error } = await supabase.rpc("rpc_verify_member_pin", {
    p_member_id: memberId,
    p_pin_hash: pinHash,
  });
  if (istZuVieleVersuche(error)) return "zu_viele";
  return !error && data === true ? "ok" : "falsch";
}

/**
 * Hasht das Stammtisch-Passwort gebunden an den (klein geschriebenen)
 * Stammtisch-Namen als Salt. Name statt Id, da der Hash beim Anlegen
 * berechnet werden muss, bevor die Id von der DB vergeben wird.
 */
export async function hashStammtischPassword(name: string, password: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${name.trim().toLowerCase()}:${password}`);
}
