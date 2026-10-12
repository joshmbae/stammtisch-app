import React from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StrafKategorieDef } from "../../types";
import { useColors } from "../../contexts/ThemeContext";
import { tonFarben, tonFuer } from "./ton";

/** Symbol einer Strafen-Kategorie: eigenes Emoji, Line-Icons nur für Systemfälle. */
export function KategorieIcon({ kat, size = 36 }: { kat?: StrafKategorieDef; size?: number }) {
  const c = useColors();
  const ton = kat ? tonFuer(kat.id) : "neutral";
  const f = tonFarben(kat?.systemKey === "sonstiges" ? "neutral" : ton, c);
  const istSpaet = !!kat && /spät/i.test(kat.label);
  return (
    <View style={{ width: size, height: size, borderRadius: Math.round(size * 0.32), backgroundColor: f.bg, alignItems: "center", justifyContent: "center" }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {!kat || kat.systemKey === "sonstiges" ? (
        <Ionicons name="ellipsis-horizontal" size={Math.round(size * 0.5)} color={f.fg} />
      ) : istSpaet ? (
        <Ionicons name="time-outline" size={Math.round(size * 0.52)} color={f.fg} />
      ) : (
        <Text style={{ fontSize: Math.round(size * 0.5) }} maxFontSizeMultiplier={1}>{kat.emoji}</Text>
      )}
    </View>
  );
}

