import * as Crypto from "expo-crypto";
import { supabase } from "./supabase";

export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

/** Hasht einen 4-stelligen PIN gebunden an die Mitglieds-Id (dient als Salt). */
export async function hashPin(memberId: string, pin: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${memberId}:${pin}`);
}

/** Vergleicht serverseitig (RPC) — der gespeicherte PIN-Hash verlässt die Datenbank nie. */
export async function verifyPin(memberId: string, pin: string): Promise<boolean> {
  const pinHash = await hashPin(memberId, pin);
  const { data, error } = await supabase.rpc("rpc_verify_member_pin", {
    p_member_id: memberId,
    p_pin_hash: pinHash,
  });
  if (error) return false;
  return data === true;
}

/**
 * Hasht das Stammtisch-Passwort gebunden an den (klein geschriebenen)
 * Stammtisch-Namen als Salt. Name statt Id, da der Hash beim Anlegen
 * berechnet werden muss, bevor die Id von der DB vergeben wird.
 */
export async function hashStammtischPassword(name: string, password: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${name.trim().toLowerCase()}:${password}`);
}
