import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Protokoll, StammtischTermin } from "../types";
import { loadProtokolle, loadTermine } from "../utils/storage";
import { FONT, TYPE, ThemeColors } from "../constants/design";
import { useColors, useThemedStyles } from "../contexts/ThemeContext";
import { formatWochentagDatum } from "../utils/date";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorState from "../components/ErrorState";
import OfflineBanner from "../components/OfflineBanner";
import { useScreenLoad } from "../utils/useScreenLoad";
import { Card, IconSquircle, Screen, ScreenHeader, Ton } from "../components/ui";
import { protokollAuszug } from "../components/protokoll/ProtokollText";
import { SYMBOL } from "../constants/symbole";

type ProtokollMitTermin = Protokoll & {
  termin: StammtischTermin | null;
};

function terminLabel(t: StammtischTermin | null): string {
  if (!t) return "Unbekannter Termin";
  return t.titel ?? (t.art === "stammtisch" ? "Stammtisch" : t.art === "geburtstag" ? "Geburtstag" : "Veranstaltung");
}

function tonFuerArt(t: StammtischTermin | null): Ton {
  if (t?.art === "geburtstag") return "coral";
  if (t?.art === "veranstaltung") return "mustard";
  return "blue";
}

/** Gruppiert die (nach Termin-Datum absteigend sortierten) Protokolle nach Jahr. */
function nachJahren(items: ProtokollMitTermin[]): { jahr: string; items: ProtokollMitTermin[] }[] {
  const gruppen: { jahr: string; items: ProtokollMitTermin[] }[] = [];
  for (const it of items) {
    const jahr = it.termin?.datum.slice(0, 4) ?? "Ohne Termin";
    const letzte = gruppen[gruppen.length - 1];
    if (letzte && letzte.jahr === jahr) letzte.items.push(it);
    else gruppen.push({ jahr, items: [it] });
  }
  return gruppen;
}

export default function ProtokollListeScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const [items, setItems] = useState<ProtokollMitTermin[]>([]);

  async function load() {
    const [protokolle, termine] = await Promise.all([loadProtokolle(), loadTermine()]);
    const terminMap = Object.fromEntries(termine.map((t) => [t.id, t]));
    const merged: ProtokollMitTermin[] = protokolle
      .map((p) => ({ ...p, termin: terminMap[p.terminId] ?? null }))
      .sort((a, b) => {
        // Chronologisch nach Termin-Datum (neuester zuerst), nicht nach letzter
        // Bearbeitung — ein alt bearbeitetes Protokoll soll nicht nach oben springen.
        const da = a.termin?.datum;
        const db = b.termin?.datum;
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return db.localeCompare(da);
      });
    setItems(merged);
  }

  const { loading, refreshing, error, onRefresh, retry } = useScreenLoad(load, []);

  let index = 0;
  return (
    <Screen
      refreshing={refreshing}
      onRefresh={onRefresh}
      header={
        <>
          <OfflineBanner />
          <ScreenHeader
            back
            title="Protokolle"
            subtitle={!loading && items.length > 0 ? `${items.length} ${items.length === 1 ? "Protokoll" : "Protokolle"}` : "Aufzeichnungen aller Termine"}
          />
        </>
      }
    >
      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : items.length === 0 ? (
        <Card enterIndex={0} style={styles.leer}>
          <IconSquircle emoji={SYMBOL.protokoll} ton="blue" size={48} />
          <Text style={styles.leerTitel}>Noch kein Protokoll</Text>
          <Text style={styles.leerText}>Öffne einen vergangenen Termin und schreib dort das Protokoll.</Text>
        </Card>
      ) : (
        nachJahren(items).map((gruppe) => (
          <View key={gruppe.jahr} style={styles.gruppe}>
            <Text style={styles.jahr} accessibilityRole="header">{gruppe.jahr}</Text>
            {gruppe.items.map((item) => {
              const titel = item.titel || terminLabel(item.termin);
              const datum = item.termin ? formatWochentagDatum(new Date(item.termin.datum + "T00:00:00")) : null;
              const anwesend = item.termin?.anwesenheit?.length ?? 0;
              const meta = [datum, item.titel && item.termin ? terminLabel(item.termin) : null, anwesend > 0 ? `${anwesend} da` : null]
                .filter(Boolean)
                .join(" · ");
              const auszug = protokollAuszug(item.inhalt);
              const i = index++;
              return (
                <Card
                  key={item.id}
                  enterIndex={i < 8 ? i : undefined}
                  onPress={() => router.push(`/protokoll/${item.terminId}`)}
                  accessibilityLabel={`${titel}${meta ? `, ${meta}` : ""}. Protokoll öffnen`}
                  style={styles.karte}
                >
                  <View style={styles.kopf}>
                    <IconSquircle emoji={SYMBOL.protokoll} ton={tonFuerArt(item.termin)} size={40} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.titel} numberOfLines={2}>{titel}</Text>
                      {meta ? <Text style={styles.meta} numberOfLines={1}>{meta}</Text> : null}
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
                  </View>
                  {auszug ? <Text style={styles.auszug} numberOfLines={3}>{auszug}</Text> : null}
                </Card>
              );
            })}
          </View>
        ))
      )}
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  gruppe: { gap: 8 },
  jahr: { ...TYPE.label, color: c.textMuted, marginTop: 4, marginLeft: 4 },
  karte: { padding: 14, gap: 10 },
  kopf: { flexDirection: "row", alignItems: "center", gap: 12 },
  titel: { fontFamily: FONT.w800, fontSize: 16, lineHeight: 21, color: c.textDark },
  meta: { ...TYPE.caption, fontSize: 13, color: c.textMuted, marginTop: 2 },
  auszug: { fontFamily: FONT.w500, fontSize: 14, lineHeight: 20, color: c.textMid },
  leer: { alignItems: "center", gap: 8, paddingVertical: 32 },
  leerTitel: { ...TYPE.heading, color: c.textDark, marginTop: 4 },
  leerText: { ...TYPE.body, fontSize: 14, color: c.textMuted, textAlign: "center", paddingHorizontal: 12 },
});
