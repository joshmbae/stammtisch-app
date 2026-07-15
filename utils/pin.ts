import * as Crypto from "expo-crypto";

export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

/** Hasht einen 4-stelligen PIN gebunden an die Mitglieds-Id (dient als Salt). */
export async function hashPin(memberId: string, pin: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${memberId}:${pin}`);
}

export async function verifyPin(memberId: string, pin: string, pinHash: string): Promise<boolean> {
  const computed = await hashPin(memberId, pin);
  return computed === pinHash;
}
