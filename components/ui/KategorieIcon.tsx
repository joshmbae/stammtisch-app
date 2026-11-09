import React from "react";
import { StrafKategorieDef } from "../../types";
import { SYMBOL } from "../../constants/symbole";
import { IconSquircle } from "./IconSquircle";
import { Ton, tonFuer } from "./ton";

/**
 * Symbol einer Strafen-Kategorie: ihr eigenes Emoji im getönten Kästchen.
 * „Sonstiges“ und Verspätung bekommen feste Emojis, falls keins gesetzt ist.
 */
export function KategorieIcon({ kat, size = 36 }: { kat?: StrafKategorieDef; size?: number }) {
  const { emoji, ton } = kategorieSymbol(kat);
  return <IconSquircle emoji={emoji} ton={ton} size={size} />;
}

/** Emoji und Tönung einer Kategorie, z. B. für Kacheln oder den Verlauf. */
export function kategorieSymbol(kat?: StrafKategorieDef): { emoji: string; ton: Ton } {
  const sonstiges = !kat || kat.systemKey === "sonstiges";
  const emoji = sonstiges ? SYMBOL.sonstiges : kat.emoji || (/spät/i.test(kat.label) ? SYMBOL.zuSpaet : SYMBOL.strafe);
  return { emoji, ton: sonstiges ? "neutral" : tonFuer(kat.id) };
}
