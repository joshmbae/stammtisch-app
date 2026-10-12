import React, { useState, useRef } from "react";
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { showAlert } from "../../utils/alert";
import { StammtischTermin, Protokoll, MemberProfile } from "../../types";
import { loadTermine, loadProtokoll, saveProtokoll, deleteProtokoll, logActivity, loadMembers } from "../../utils/storage";
import { useSession } from "../../contexts/SessionContext";
import { FONT, TYPE, ThemeColors } from "../../constants/design";
import { useColors, useThemedStyles } from "../../contexts/ThemeContext";
import { useScreenLoad } from "../../utils/useScreenLoad";
import { formatWochentagDatum } from "../../utils/date";
import { displayName } from "../../utils/format";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorState from "../../components/ErrorState";
import OfflineBanner from "../../components/OfflineBanner";
import { AvatarStack, Button, Card, Field, IconSquircle, PressableScale, Screen, ScreenHeader, SegmentedTabs } from "../../components/ui";
import { ProtokollText, zerlegeProtokoll } from "../../components/protokoll/ProtokollText";

type Modus = "lesen" | "bearbeiten";

function formatGespeichert(iso: string): string {
  return new Date(iso).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function terminLabel(t: StammtischTermin): string {
  return t.titel ?? (t.art === "stammtisch" ? "Stammtisch" : t.art === "geburtstag" ? "Geburtstag" : "Veranstaltung");
}

/** Bausteine fürs schnelle Strukturieren; sie hängen nur Text an, den die Lesefassung erkennt. */
const BAUSTEINE: { label: string; icon: React.ComponentProps<typeof Ionicons>["name"]; text: string }[] = [
  { label: "Überschrift", icon: "text-outline", text: "\n\n## " },
  { label: "Liste", icon: "list-outline", text: "\n- " },
  { label: "Beschluss", icon: "checkmark", text: "\nBeschluss: " },
];

export default function ProtokollScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const { activeMemberId } = useSession();
  const { terminId } = useLocalSearchParams<{ terminId: string }>();
  const [termin, setTermin] = useState<StammtischTermin | null>(null);
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [protokoll, setProtokoll] = useState<Protokoll | null>(null);
  const [titel, setTitel] = useState("");
  const [inhalt, setInhalt] = useState("");
  // dirty = noch nicht in der Datenbank; geaendert = seit dem letzten „Speichern"
  // bearbeitet. Die Auto-Speicherung setzt nur dirty zurück, damit „Speichern"
  // danach weiter möglich ist und den Chronik-Eintrag schreibt.
  const [dirty, setDirty] = useState(false);
  const [geaendert, setGeaendert] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modus, setModus] = useState<Modus>("lesen");
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const screen = useScreenLoad(async () => {
    const [termine, existing, ms] = await Promise.all([loadTermine(), loadProtokoll(terminId), loadMembers()]);
    setTermin(termine.find((x) => x.id === terminId) ?? null);
    setMembers(ms);
    setProtokoll(existing);
    setTitel(existing?.titel ?? "");
    setInhalt(existing?.inhalt ?? "");
    setModus(existing ? "lesen" : "bearbeiten");
    setDirty(false);
    setGeaendert(false);
  }, [terminId]);

  function handleChange(field: "titel" | "inhalt", value: string) {
    if (field === "titel") setTitel(value);
    else setInhalt(value);
    setDirty(true);
    setGeaendert(true);

    // Debounced auto-save
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => autoSave(
      field === "titel" ? value : titel,
      field === "inhalt" ? value : inhalt,
    ), 2000);
  }

  async function autoSave(t: string, i: string) {
    if (!i.trim()) return;
    try {
      const saved = await saveProtokoll(terminId, i, t.trim() || undefined);
      setProtokoll(saved);
      setDirty(false);
    } catch {
      // Offline o.ä. — bleibt als „ungespeichert" stehen, „Speichern" versucht es erneut.
    }
  }

  async function handleSave(): Promise<boolean> {
    if (!inhalt.trim()) {
      showAlert("Leer", "Bitte mindestens den Inhalt eintragen.");
      return false;
    }
    setSaving(true);
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    let saved: Protokoll;
    try {
      saved = await saveProtokoll(terminId, inhalt, titel.trim() || undefined);
    } catch {
      setSaving(false);
      showAlert("Nicht gespeichert", "Das Protokoll konnte nicht gespeichert werden. Prüf deine Verbindung und versuch's nochmal.");
      return false;
    }
    setProtokoll(saved);
    setDirty(false);
    setGeaendert(false);
    setSaving(false);
    setModus("lesen");
    try {
      await logActivity({
        actorMemberId: activeMemberId ?? undefined,
        actionType: "protokoll_updated",
        terminId,
        refId: saved.id,
        meta: termin ? { terminDatum: termin.datum, terminTitel: termin.titel, terminArt: termin.art } : {},
      });
    } catch {
      // Gespeichert ist gespeichert; ein fehlender Chronik-Eintrag ist kein Grund für einen Fehler.
    }
    return true;
  }

  function moduswechsel(neu: Modus) {
    if (neu === modus) return;
    // Zurück zum Lesen = fertig bearbeitet: Änderungen speichern wie mit „Speichern".
    if (neu === "lesen" && geaendert) {
      handleSave();
      return;
    }
    setModus(neu);
  }

  function handleDelete() {
    showAlert(
      "Protokoll löschen?",
      "Das Protokoll wird unwiderruflich gelöscht.",
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Löschen",
          style: "destructive",
          onPress: async () => {
            // Sonst legt eine noch ausstehende Auto-Speicherung das Protokoll gleich wieder an.
            if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
            try {
              await deleteProtokoll(terminId);
              // Direkt geöffnet (z. B. aus einer Push) gibt es kein „zurück".
              if (router.canGoBack()) router.back();
              else router.replace("/protokolle");
            } catch {
              showAlert("Nicht gelöscht", "Das Protokoll konnte nicht gelöscht werden. Versuch's nochmal.");
            }
          },
        },
      ]
    );
  }

  function bausteinEinfuegen(text: string) {
    const basis = inhalt.replace(/\s+$/, "");
    handleChange("inhalt", basis ? basis + text : text.trimStart());
  }

  const membersById = new Map(members.map((m) => [m.id, m]));
  const anwesend = (termin?.anwesenheit ?? []).map((id) => membersById.get(id)).filter((m): m is MemberProfile => !!m);
  const abgesagt = (termin?.absagen ?? []).map((id) => membersById.get(id)).filter((m): m is MemberProfile => !!m);
  const terminName = termin ? terminLabel(termin) : "Protokoll";
  // Jahr nur, wenn es nicht das laufende ist — sonst wird der Kopf neben dem Umschalter zu eng.
  const datum = termin ? formatWochentagDatum(new Date(termin.datum + "T00:00:00"), termin.datum.slice(0, 4) !== String(new Date().getFullYear())) : undefined;
  const beginntMitKopf = zerlegeProtokoll(inhalt)[0]?.art === "kopf";

  const status = saving
    ? { text: "Wird gespeichert …", farbe: c.mustard }
    : dirty
      ? { text: "Ungespeicherte Änderungen · speichert automatisch", farbe: c.mustard }
      : protokoll
        ? { text: `Gespeichert · ${formatGespeichert(protokoll.updatedAt)}`, farbe: c.success }
        : { text: "Noch nicht gespeichert", farbe: c.textLight };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen
        scroll={false}
        header={
          <>
            <OfflineBanner />
            <ScreenHeader
              back
              title="Protokoll"
              subtitle={datum}
              right={!screen.loading && !screen.error ? (
                <View style={styles.umschalter}>
                  <SegmentedTabs<Modus>
                    variant="blue"
                    value={modus}
                    onChange={moduswechsel}
                    items={[{ key: "lesen", label: "Lesen" }, { key: "bearbeiten", label: "Bearbeiten" }]}
                  />
                </View>
              ) : undefined}
            />
          </>
        }
      >
        {screen.loading ? (
          <LoadingSpinner />
        ) : screen.error ? (
          <ErrorState message={screen.error} onRetry={screen.retry} />
        ) : (
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {modus === "lesen" ? (
              protokoll ? (
                <Card enterIndex={0} style={styles.blatt}>
                  <Text style={styles.titel} accessibilityRole="header">{titel || terminName}</Text>
                  <View style={styles.metaZeile}>
                    <Ionicons name="checkmark-circle" size={16} color={c.success} />
                    <Text style={styles.meta}>{`Gespeichert ${formatGespeichert(protokoll.updatedAt)}`}</Text>
                  </View>

                  {anwesend.length > 0 || abgesagt.length > 0 ? (
                    <View style={styles.abschnitt}>
                      <Text style={styles.kopf} accessibilityRole="header">ANWESEND</Text>
                      {anwesend.length > 0 ? (
                        <>
                          <View style={styles.stackZeile}>
                            <AvatarStack
                              size={28}
                              max={8}
                              members={anwesend.map((m) => ({ id: m.id, name: displayName(m), color: m.avatarColor, photoUri: m.photoUri }))}
                            />
                            <Text style={styles.anzahl}>{`${anwesend.length} da`}</Text>
                          </View>
                          <Text style={styles.namen}>{anwesend.map(displayName).join(", ")}</Text>
                        </>
                      ) : null}
                      {abgesagt.length > 0 ? (
                        <Text style={styles.abgesagt}>{`Abgesagt: ${abgesagt.map(displayName).join(", ")}`}</Text>
                      ) : null}
                    </View>
                  ) : null}

                  <View style={styles.abschnitt}>
                    {(anwesend.length > 0 || abgesagt.length > 0) && !beginntMitKopf ? (
                      <Text style={styles.kopf} accessibilityRole="header">PROTOKOLL</Text>
                    ) : null}
                    <ProtokollText inhalt={inhalt} />
                  </View>
                </Card>
              ) : (
                <Card enterIndex={0} style={styles.leer}>
                  <IconSquircle icon="document-text-outline" ton="blue" size={48} />
                  <Text style={styles.leerTitel}>Noch kein Protokoll</Text>
                  <Text style={styles.leerText}>{`Für ${terminName}${datum ? ` am ${datum}` : ""} hat noch niemand etwas aufgeschrieben.`}</Text>
                  <Button label="Protokoll schreiben" icon="create-outline" variant="blue" size="sm" onPress={() => setModus("bearbeiten")} style={{ marginTop: 6 }} />
                </Card>
              )
            ) : (
              <>
                <Field
                  label="Titel"
                  value={titel}
                  onChangeText={(v) => handleChange("titel", v)}
                  placeholder={`${terminName}${datum ? ` · ${datum}` : ""}`}
                  returnKeyType="next"
                  style={styles.titelInput}
                />

                <View style={styles.statusZeile}>
                  <View style={styles.statusLinks} accessibilityLiveRegion="polite">
                    <View style={[styles.statusPunkt, { backgroundColor: status.farbe }]} />
                    <Text style={styles.statusText} numberOfLines={2}>{status.text}</Text>
                  </View>
                  <Button
                    label="Speichern"
                    icon="checkmark"
                    variant="blue"
                    size="sm"
                    loading={saving}
                    disabled={!geaendert}
                    onPress={handleSave}
                  />
                </View>

                <View style={styles.bausteine} accessibilityRole="toolbar" accessibilityLabel="Format">
                  {BAUSTEINE.map((b) => (
                    <PressableScale key={b.label} onPress={() => bausteinEinfuegen(b.text)} style={styles.baustein} accessibilityLabel={`${b.label} einfügen`}>
                      <Ionicons name={b.icon} size={15} color={b.label === "Beschluss" ? c.success : c.blue} />
                      <Text style={styles.bausteinText}>{b.label}</Text>
                    </PressableScale>
                  ))}
                </View>

                <Field
                  label="Protokolltext"
                  value={inhalt}
                  onChangeText={(v) => handleChange("inhalt", v)}
                  placeholder={"## Themen & Beschlüsse\n1. Thema: worum es ging\nBeschluss: was entschieden wurde\n\n## Sonstiges\n- …"}
                  multiline
                  autoCorrect
                  style={styles.inhaltInput}
                />
                <Text style={styles.hilfe}>
                  „## " macht eine Überschrift, „1. Thema: …" einen Punkt, „Beschluss: …" einen Beschluss und „- " eine Aufzählung.
                </Text>

                {protokoll ? (
                  <Button label="Protokoll löschen" icon="trash-outline" variant="ghost" colors={{ bg: "transparent", fg: c.dangerText }} onPress={handleDelete} style={{ alignSelf: "center" }} />
                ) : null}
              </>
            )}
          </ScrollView>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  umschalter: { width: 184 },
  content: { paddingHorizontal: 16, paddingBottom: 40, gap: 12 },

  blatt: { padding: 18, borderRadius: 26 },
  titel: { ...TYPE.title, lineHeight: 27, color: c.textDark },
  metaZeile: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  meta: { ...TYPE.caption, fontSize: 13, color: c.textMuted },
  abschnitt: { marginTop: 18 },
  kopf: { ...TYPE.label, color: c.textMuted, marginBottom: 8 },
  stackZeile: { flexDirection: "row", alignItems: "center", gap: 10 },
  anzahl: { fontFamily: FONT.w800, fontSize: 13, color: c.greenText },
  namen: { fontFamily: FONT.w600, fontSize: 14, lineHeight: 20, color: c.textDark, marginTop: 8 },
  abgesagt: { fontFamily: FONT.w600, fontSize: 14, lineHeight: 20, color: c.textMuted, marginTop: 4 },

  leer: { alignItems: "center", gap: 8, paddingVertical: 28 },
  leerTitel: { ...TYPE.heading, color: c.textDark, marginTop: 4 },
  leerText: { ...TYPE.body, fontSize: 14, color: c.textMuted, textAlign: "center", paddingHorizontal: 8 },

  titelInput: { fontFamily: FONT.w800, fontSize: 17 },
  statusZeile: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  statusLinks: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  statusPunkt: { width: 8, height: 8, borderRadius: 4 },
  statusText: { ...TYPE.caption, fontSize: 13, color: c.textMuted, flex: 1 },
  bausteine: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  baustein: {
    minHeight: 44, paddingHorizontal: 14, borderRadius: 999, backgroundColor: c.card,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.hairline,
    flexDirection: "row", alignItems: "center", gap: 6,
  },
  bausteinText: { fontFamily: FONT.w700, fontSize: 14, color: c.textDark },
  inhaltInput: { minHeight: 340, fontFamily: FONT.w500, fontSize: 15, lineHeight: 22, borderRadius: 20, padding: 16, paddingTop: 16 },
  hilfe: { ...TYPE.caption, fontSize: 12, lineHeight: 17, color: c.textMuted, marginTop: -4, paddingHorizontal: 4 },
});
