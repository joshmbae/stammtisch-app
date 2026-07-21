import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Swipeable from "react-native-gesture-handler/Swipeable";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { showAlert } from "../utils/alert";
import { KassenEintrag, KassenEintragTyp, MemberProfile } from "../types";
import {
  loadKasse,
  addKassenEintrag,
  updateKassenEintrag,
  deleteKassenEintrag,
  loadMembers,
  logActivity,
} from "../utils/storage";
import { COLORS, SHADOWS } from "../constants/design";
import { HamburgerButton } from "../components/HamburgerButton";
import LoadingSpinner from "../components/LoadingSpinner";
import { useSession } from "../contexts/SessionContext";
import { formatEuro, getInitial } from "../utils/format";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDatum(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

/** Schuldner einer Abendkosten-Rechnung: alle Teilnehmer außer dem Zahler. */
function schuldnerVon(e: KassenEintrag): string[] {
  return (e.teilnehmerIds ?? []).filter((id) => id !== e.bezahltVon);
}

/** Ob eine Abendkosten-Rechnung komplett beglichen ist — für Altbestand ohne
 *  teilnehmerIds bleibt der einfache beglichen-Schalter maßgeblich. */
function isEintragBeglichen(e: KassenEintrag): boolean {
  if (e.teilnehmerIds && e.teilnehmerIds.length > 0) {
    const schuldner = schuldnerVon(e);
    if (schuldner.length === 0) return true;
    return schuldner.every((id) => (e.beglichenIds ?? []).includes(id));
  }
  return !!e.beglichen;
}

const TYP_META: Record<KassenEintragTyp, { label: string; emoji: string; color: string; bg: string }> = {
  einnahme:     { label: "Einnahme",    emoji: "➕", color: COLORS.success,  bg: "#EDF7F2" },
  ausgabe:      { label: "Ausgabe",     emoji: "➖", color: COLORS.danger,   bg: "#FDF0EF" },
  abendkosten:  { label: "Stammtischrechnung", emoji: "🍺", color: COLORS.gold,    bg: COLORS.goldBg },
};

// ─── Eintrag Row ──────────────────────────────────────────────────────────────

function EintragRow({
  eintrag,
  members,
  onDelete,
}: {
  eintrag: KassenEintrag;
  members: MemberProfile[];
  onDelete: () => void;
}) {
  const meta = TYP_META[eintrag.typ];
  const zahler = eintrag.bezahltVon ? members.find((m) => m.id === eintrag.bezahltVon) : null;
  const isPositive = eintrag.typ === "einnahme";

  function renderRight() {
    return (
      <TouchableOpacity style={styles.deleteAction} onPress={onDelete} activeOpacity={0.8}>
        <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
      </TouchableOpacity>
    );
  }

  return (
    <Swipeable renderRightActions={renderRight} overshootRight={false}>
      <View style={[styles.eintragRow, { borderLeftColor: meta.color }]}>
        <View style={[styles.eintragIcon, { backgroundColor: meta.bg }]}>
          <Text style={{ fontSize: 18 }}>{meta.emoji}</Text>
        </View>
        <View style={styles.eintragMeta}>
          <Text style={styles.eintragTypLabel}>{meta.label}</Text>
          {eintrag.beschreibung ? (
            <Text style={styles.eintragDesc} numberOfLines={1}>{eintrag.beschreibung}</Text>
          ) : null}
          {zahler ? (
            <Text style={styles.eintragZahler}>Gezahlt von: {zahler.name}</Text>
          ) : null}
          <Text style={styles.eintragDatum}>{formatDatum(eintrag.datum)}</Text>
        </View>
        <Text style={[styles.eintragBetrag, { color: isPositive ? COLORS.success : COLORS.danger }]}>
          {isPositive ? "+" : "−"}{formatEuro(eintrag.betrag)} €
        </Text>
      </View>
    </Swipeable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

type FormTyp = KassenEintragTyp | null;

export default function KasseScreen() {
  const { activeMemberId } = useSession();
  const [eintraege, setEintraege] = useState<KassenEintrag[]>([]);
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [activeForm, setActiveForm] = useState<FormTyp>(null);
  const [showBeglichen, setShowBeglichen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form state
  const [betrag, setBetrag] = useState("");
  const [beschreibung, setBeschreibung] = useState("");
  const [bezahltVon, setBezahltVon] = useState<string | null>(null);
  const [teilnehmerIds, setTeilnehmerIds] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const [k, ms] = await Promise.all([loadKasse(), loadMembers()]);
        setEintraege(k);
        setMembers(ms);
        setLoading(false);
      }
      load();
    }, [])
  );

  const kassenEintraege = eintraege.filter((e) => e.typ !== "abendkosten");
  const abendkostenEintraege = eintraege.filter((e) => e.typ === "abendkosten");

  const saldo = kassenEintraege.reduce((sum, e) => {
    return e.typ === "einnahme" ? sum + e.betrag : sum - e.betrag;
  }, 0);

  function openForm(typ: KassenEintragTyp) {
    setBetrag("");
    setBeschreibung("");
    setBezahltVon(null);
    setTeilnehmerIds([]);
    setActiveForm(typ);
  }

  function toggleTeilnehmer(memberId: string) {
    setTeilnehmerIds((prev) => prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]);
  }

  function closeForm() {
    setActiveForm(null);
  }

  async function handleSubmit() {
    const parsed = parseFloat(betrag.replace(",", "."));
    if (isNaN(parsed) || parsed <= 0) {
      showAlert("Ungültiger Betrag", "Bitte einen positiven Betrag eingeben.");
      return;
    }
    if (activeForm === "abendkosten" && !bezahltVon) {
      showAlert("Wer hat gezahlt?", "Bitte ein Mitglied auswählen.");
      return;
    }
    if (activeForm === "abendkosten" && teilnehmerIds.length === 0) {
      showAlert("Wer war dabei?", "Bitte auswählen, wer an der Rechnung beteiligt war.");
      return;
    }
    // Zahler hat immer auch selbst teilgenommen, auch wenn man vergisst, ihn extra anzutippen.
    const finalTeilnehmer = bezahltVon && !teilnehmerIds.includes(bezahltVon)
      ? [...teilnehmerIds, bezahltVon]
      : teilnehmerIds;
    const eintrag = await addKassenEintrag({
      typ: activeForm!,
      betrag: parsed,
      beschreibung: beschreibung.trim() || undefined,
      bezahltVon: activeForm === "abendkosten" ? bezahltVon ?? undefined : undefined,
      terminId: undefined,
      datum: new Date().toISOString(),
      teilnehmerIds: activeForm === "abendkosten" ? finalTeilnehmer : undefined,
      beglichenIds: activeForm === "abendkosten" ? [] : undefined,
    });
    setEintraege((prev) => [eintrag, ...prev]);
    await logActivity({
      actorMemberId: activeMemberId ?? undefined,
      subjectMemberId: eintrag.bezahltVon,
      actionType:
        eintrag.typ === "abendkosten" ? "abendkosten_created" :
        eintrag.typ === "einnahme" ? "kasse_einnahme_created" : "kasse_ausgabe_created",
      refId: eintrag.id,
      meta: { betrag: eintrag.betrag, beschreibung: eintrag.beschreibung },
    });
    closeForm();
  }

  async function handleDelete(id: string) {
    await deleteKassenEintrag(id);
    setEintraege((prev) => prev.filter((e) => e.id !== id));
  }

  async function handleToggleBeglichen(id: string, current: boolean) {
    await updateKassenEintrag(id, { beglichen: !current });
    setEintraege((prev) => prev.map((e) => e.id === id ? { ...e, beglichen: !current } : e));
    if (!current) {
      const e = eintraege.find((x) => x.id === id);
      await logActivity({
        actorMemberId: activeMemberId ?? undefined,
        subjectMemberId: e?.bezahltVon,
        actionType: "kasse_beglichen",
        refId: id,
        meta: { betrag: e?.betrag ?? 0 },
      });
    }
  }

  async function handleToggleTeilnehmerBeglichen(entryId: string, memberId: string) {
    const e = eintraege.find((x) => x.id === entryId);
    if (!e) return;
    const current = e.beglichenIds ?? [];
    const wirdBeglichen = !current.includes(memberId);
    const next = wirdBeglichen ? [...current, memberId] : current.filter((id) => id !== memberId);
    await updateKassenEintrag(entryId, { beglichenIds: next });
    setEintraege((prev) => prev.map((x) => x.id === entryId ? { ...x, beglichenIds: next } : x));
    if (wirdBeglichen) {
      const anteil = e.teilnehmerIds && e.teilnehmerIds.length > 0 ? e.betrag / e.teilnehmerIds.length : e.betrag;
      await logActivity({
        actorMemberId: activeMemberId ?? undefined,
        subjectMemberId: memberId,
        actionType: "kasse_beglichen",
        refId: entryId,
        meta: { betrag: anteil },
      });
    }
  }

  const saldoPositiv = saldo >= 0;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={0}>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        {loading ? <LoadingSpinner /> : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Header */}
          <View style={styles.header}>
            <HamburgerButton />
            <View style={styles.headerTexts}>
              <Text style={styles.headerTitle}>Stammtischkasse</Text>
              <Text style={styles.headerSub}>Einnahmen, Ausgaben & Stammtischrechnung</Text>
            </View>
          </View>

          {/* Saldo Card */}
          <View style={[styles.saldoCard, { borderColor: saldoPositiv ? COLORS.success + "44" : COLORS.danger + "44" }]}>
            <Text style={styles.saldoLabel}>Kassenstand</Text>
            <Text style={[styles.saldoValue, { color: saldoPositiv ? COLORS.success : COLORS.danger }]}>
              {saldoPositiv ? "+" : "−"}{formatEuro(Math.abs(saldo))} €
            </Text>
            {kassenEintraege.length > 0 && (
              <View style={styles.saldoStats}>
                <View style={styles.saldoStatItem}>
                  <Text style={[styles.saldoStatValue, { color: COLORS.success }]}>
                    +{formatEuro(kassenEintraege.filter(e => e.typ === "einnahme").reduce((s, e) => s + e.betrag, 0))} €
                  </Text>
                  <Text style={styles.saldoStatLabel}>Einnahmen</Text>
                </View>
                <View style={styles.saldoStatDivider} />
                <View style={styles.saldoStatItem}>
                  <Text style={[styles.saldoStatValue, { color: COLORS.danger }]}>
                    −{formatEuro(kassenEintraege.filter(e => e.typ === "ausgabe").reduce((s, e) => s + e.betrag, 0))} €
                  </Text>
                  <Text style={styles.saldoStatLabel}>Ausgaben</Text>
                </View>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, activeForm === "einnahme" && styles.actionBtnActive, { borderColor: COLORS.success }]}
              onPress={() => activeForm === "einnahme" ? closeForm() : openForm("einnahme")}
              activeOpacity={0.8}
            >
              <Text style={styles.actionBtnEmoji}>➕</Text>
              <Text style={[styles.actionBtnText, { color: COLORS.success }]}>Einnahme</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, activeForm === "ausgabe" && styles.actionBtnActive, { borderColor: COLORS.danger }]}
              onPress={() => activeForm === "ausgabe" ? closeForm() : openForm("ausgabe")}
              activeOpacity={0.8}
            >
              <Text style={styles.actionBtnEmoji}>➖</Text>
              <Text style={[styles.actionBtnText, { color: COLORS.danger }]}>Ausgabe</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, activeForm === "abendkosten" && styles.actionBtnActive, { borderColor: COLORS.gold }]}
              onPress={() => activeForm === "abendkosten" ? closeForm() : openForm("abendkosten")}
              activeOpacity={0.8}
            >
              <Text style={styles.actionBtnEmoji}>🍺</Text>
              <Text style={[styles.actionBtnText, { color: COLORS.gold }]}>Rechnung</Text>
            </TouchableOpacity>
          </View>

          {/* Inline Form */}
          {activeForm && (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>
                {TYP_META[activeForm].emoji} {TYP_META[activeForm].label} eintragen
              </Text>
              <View style={styles.formRow}>
                <Text style={styles.formLabel}>Betrag (€)</Text>
                <TextInput
                  style={styles.formInput}
                  value={betrag}
                  onChangeText={setBetrag}
                  placeholder="0,00"
                  placeholderTextColor={COLORS.textLight}
                  keyboardType="decimal-pad"
                />
              </View>

              {activeForm !== "abendkosten" && (
                <View style={styles.formRow}>
                  <Text style={styles.formLabel}>Beschreibung (optional)</Text>
                  <TextInput
                    style={styles.formInput}
                    value={beschreibung}
                    onChangeText={setBeschreibung}
                    placeholder={
                      activeForm === "einnahme" ? "z. B. Strafen, Mitgliedsbeitrag …" :
                      "z. B. Dekoration, Snacks …"
                    }
                    placeholderTextColor={COLORS.textLight}
                  />
                </View>
              )}

              {activeForm === "abendkosten" && (
                <View style={styles.formRow}>
                  <Text style={styles.formLabel}>Wer hat gezahlt?</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.memberChipsScroll}>
                    {members.map((m) => (
                      <TouchableOpacity
                        key={m.id}
                        style={[styles.memberChip, bezahltVon === m.id && { backgroundColor: m.avatarColor, borderColor: m.avatarColor }]}
                        onPress={() => setBezahltVon(bezahltVon === m.id ? null : m.id)}
                        activeOpacity={0.8}
                      >
                        {m.photoUri ? (
                          <Image source={{ uri: m.photoUri }} style={styles.chipAvatar} />
                        ) : (
                          <View style={[styles.chipAvatarFallback, { backgroundColor: bezahltVon === m.id ? "rgba(255,255,255,0.3)" : m.avatarColor + "33" }]}>
                            <Text style={{ fontSize: 11, fontWeight: "700", color: bezahltVon === m.id ? "#FFF" : m.avatarColor }}>
                              {getInitial(m.name)}
                            </Text>
                          </View>
                        )}
                        <Text style={[styles.chipName, bezahltVon === m.id && { color: "#FFFFFF" }]}>
                          {m.name.split(" ")[0]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {activeForm === "abendkosten" && (
                <View style={styles.formRow}>
                  <Text style={styles.formLabel}>Wer war dabei?</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.memberChipsScroll}>
                    {members.map((m) => {
                      const selected = teilnehmerIds.includes(m.id);
                      return (
                        <TouchableOpacity
                          key={m.id}
                          style={[styles.memberChip, selected && { backgroundColor: m.avatarColor, borderColor: m.avatarColor }]}
                          onPress={() => toggleTeilnehmer(m.id)}
                          activeOpacity={0.8}
                        >
                          {m.photoUri ? (
                            <Image source={{ uri: m.photoUri }} style={styles.chipAvatar} />
                          ) : (
                            <View style={[styles.chipAvatarFallback, { backgroundColor: selected ? "rgba(255,255,255,0.3)" : m.avatarColor + "33" }]}>
                              <Text style={{ fontSize: 11, fontWeight: "700", color: selected ? "#FFF" : m.avatarColor }}>
                                {getInitial(m.name)}
                              </Text>
                            </View>
                          )}
                          <Text style={[styles.chipName, selected && { color: "#FFFFFF" }]}>
                            {m.name.split(" ")[0]}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                  {teilnehmerIds.length > 0 && (
                    <Text style={styles.teilnehmerHint}>
                      Anteil pro Person: {formatEuro(parseFloat(betrag.replace(",", ".") || "0") / (bezahltVon && !teilnehmerIds.includes(bezahltVon) ? teilnehmerIds.length + 1 : teilnehmerIds.length))} €
                    </Text>
                  )}
                </View>
              )}

              <View style={styles.formBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={closeForm} activeOpacity={0.8}>
                  <Text style={styles.cancelBtnText}>Abbrechen</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitBtn, { backgroundColor: TYP_META[activeForm].color }]}
                  onPress={handleSubmit}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  <Text style={styles.submitBtnText}>Eintragen</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Abendkosten */}
          {abendkostenEintraege.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>🍺 Stammtischrechnung</Text>
                {abendkostenEintraege.some(isEintragBeglichen) && (
                  <TouchableOpacity onPress={() => setShowBeglichen((v) => !v)}>
                    <Text style={styles.sectionToggle}>
                      {showBeglichen ? "Bezahlte ausblenden" : `+ ${abendkostenEintraege.filter(isEintragBeglichen).length} bezahlt`}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              {abendkostenEintraege.filter((e) => !isEintragBeglichen(e) || showBeglichen).map((e) => {
                const zahler = members.find((m) => m.id === e.bezahltVon);
                const meta = TYP_META.abendkosten;
                const beglichen = isEintragBeglichen(e);
                const hatTeilnehmer = !!e.teilnehmerIds && e.teilnehmerIds.length > 0;
                const schuldner = schuldnerVon(e);
                const anteil = hatTeilnehmer ? e.betrag / e.teilnehmerIds!.length : e.betrag;
                return (
                  <Swipeable
                    key={e.id}
                    renderRightActions={() => (
                      <TouchableOpacity style={styles.deleteAction} onPress={() => handleDelete(e.id)} activeOpacity={0.8}>
                        <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
                      </TouchableOpacity>
                    )}
                    overshootRight={false}
                  >
                    <View style={[
                      styles.abendkostenCard,
                      { borderLeftColor: beglichen ? COLORS.success : meta.color },
                      beglichen && { backgroundColor: "#F8FDF9" },
                    ]}>
                      <View style={styles.eintragRowInner}>
                        <View style={[styles.eintragIcon, { backgroundColor: beglichen ? COLORS.success + "15" : meta.bg }]}>
                          <Text style={{ fontSize: 18 }}>{beglichen ? "✅" : meta.emoji}</Text>
                        </View>
                        <View style={styles.eintragMeta}>
                          <Text style={styles.eintragTypLabel}>{meta.label}</Text>
                          {zahler ? <Text style={styles.eintragZahler}>vorgestreckt: {zahler.name}</Text> : null}
                          {hatTeilnehmer && (
                            <Text style={styles.eintragDatum}>{e.teilnehmerIds!.length} Personen · {formatEuro(anteil)} €/Person</Text>
                          )}
                          <Text style={styles.eintragDatum}>{formatDatum(e.datum)}</Text>
                        </View>
                        <Text style={[
                          styles.eintragBetrag,
                          { color: beglichen ? COLORS.textLight : COLORS.gold },
                          beglichen && { textDecorationLine: "line-through" },
                        ]}>
                          {formatEuro(e.betrag)} €
                        </Text>
                        {!hatTeilnehmer && (
                          <TouchableOpacity
                            onPress={() => handleToggleBeglichen(e.id, !!e.beglichen)}
                            activeOpacity={0.8}
                            style={{ paddingLeft: 8 }}
                          >
                            <Ionicons
                              name={e.beglichen ? "checkmark-circle" : "ellipse-outline"}
                              size={22}
                              color={e.beglichen ? COLORS.success : COLORS.border}
                            />
                          </TouchableOpacity>
                        )}
                      </View>

                      {hatTeilnehmer && schuldner.length > 0 && (
                        <View style={styles.schuldnerList}>
                          {schuldner.map((id) => {
                            const m = members.find((mm) => mm.id === id);
                            const bezahlt = (e.beglichenIds ?? []).includes(id);
                            return (
                              <TouchableOpacity
                                key={id}
                                style={styles.schuldnerRow}
                                onPress={() => handleToggleTeilnehmerBeglichen(e.id, id)}
                                activeOpacity={0.75}
                              >
                                <Text style={[styles.schuldnerName, bezahlt && styles.schuldnerNameBeglichen]}>
                                  {m?.name ?? "Unbekannt"}
                                </Text>
                                <Text style={[styles.schuldnerBetrag, bezahlt && { color: COLORS.textLight }]}>
                                  {formatEuro(anteil)} €
                                </Text>
                                <Ionicons
                                  name={bezahlt ? "checkmark-circle" : "ellipse-outline"}
                                  size={18}
                                  color={bezahlt ? COLORS.success : COLORS.border}
                                />
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  </Swipeable>
                );
              })}
            </View>
          )}

          {/* Kasse-Verlauf */}
          {kassenEintraege.length > 0 ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { marginBottom: 10 }]}>📋 Verlauf</Text>
              {kassenEintraege.map((e) => (
                <EintragRow
                  key={e.id}
                  eintrag={e}
                  members={members}
                  onDelete={() => handleDelete(e.id)}
                />
              ))}
            </View>
          ) : abendkostenEintraege.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>💰</Text>
              <Text style={styles.emptyTitle}>Kasse ist leer</Text>
              <Text style={styles.emptySub}>Trag Einnahmen, Ausgaben oder die Stammtischrechnung ein.</Text>
            </View>
          ) : null}

        </ScrollView>
        )}
      </SafeAreaView>
      </KeyboardAvoidingView>
    </GestureHandlerRootView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, paddingBottom: 60 },

  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: COLORS.cardAlt, borderRadius: 20,
    padding: 16, marginBottom: 16, ...SHADOWS.card,
    borderWidth: 1, borderColor: COLORS.border,
  },
  headerTexts: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: COLORS.textDark },
  headerSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

  saldoCard: {
    backgroundColor: COLORS.card, borderRadius: 20, padding: 20,
    marginBottom: 16, borderWidth: 1.5, ...SHADOWS.card,
    alignItems: "center",
  },
  saldoLabel: { fontSize: 13, fontWeight: "700", color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  saldoValue: { fontSize: 40, fontWeight: "900", letterSpacing: -1 },
  saldoStats: { flexDirection: "row", alignItems: "center", marginTop: 14, gap: 0 },
  saldoStatItem: { flex: 1, alignItems: "center", gap: 2 },
  saldoStatValue: { fontSize: 15, fontWeight: "800" },
  saldoStatLabel: { fontSize: 11, color: COLORS.textMuted },
  saldoStatDivider: { width: 1, height: 30, backgroundColor: COLORS.border },

  actionRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  actionBtn: {
    flex: 1, alignItems: "center", gap: 4,
    paddingVertical: 12, borderRadius: 14,
    backgroundColor: COLORS.card, borderWidth: 1.5, ...SHADOWS.light,
  },
  actionBtnActive: { backgroundColor: COLORS.cardAlt },
  actionBtnEmoji: { fontSize: 20 },
  actionBtnText: { fontSize: 11, fontWeight: "700" },

  formCard: {
    backgroundColor: COLORS.card, borderRadius: 18, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.card,
  },
  formTitle: { fontSize: 16, fontWeight: "800", color: COLORS.textDark, marginBottom: 12 },
  terminHint: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: COLORS.blue + "11", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 12,
  },
  terminHintText: { fontSize: 12, color: COLORS.blue, fontWeight: "600" },
  formRow: { marginBottom: 12 },
  formLabel: { fontSize: 12, fontWeight: "700", color: COLORS.textMid, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.3 },
  formInput: {
    backgroundColor: COLORS.background, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 15, color: COLORS.textDark, borderWidth: 1, borderColor: COLORS.border,
  },

  memberChipsScroll: { marginTop: 2 },
  memberChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: COLORS.background, borderWidth: 1.5, borderColor: COLORS.border, marginRight: 8,
  },
  chipAvatar: { width: 22, height: 22, borderRadius: 11 },
  chipAvatarFallback: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  chipName: { fontSize: 13, fontWeight: "600", color: COLORS.textMid },
  teilnehmerHint: { fontSize: 12, color: COLORS.textMuted, marginTop: 8 },

  formBtns: { flexDirection: "row", gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingVertical: 12, borderRadius: 12,
    backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border,
  },
  cancelBtnText: { fontSize: 14, fontWeight: "600", color: COLORS.textMuted },
  submitBtn: {
    flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 12, borderRadius: 12,
  },
  submitBtnText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },

  section: { marginBottom: 8 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  sectionTitle: { fontSize: 13, fontWeight: "800", color: COLORS.textMid, letterSpacing: 0.2 },
  sectionToggle: { fontSize: 12, fontWeight: "600", color: COLORS.blue },

  eintragRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: COLORS.card, borderRadius: 14, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: COLORS.border, borderLeftWidth: 3, ...SHADOWS.light,
  },
  eintragIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  eintragMeta: { flex: 1 },
  eintragTypLabel: { fontSize: 13, fontWeight: "700", color: COLORS.textDark },
  eintragDesc: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  eintragZahler: { fontSize: 12, color: COLORS.blue, marginTop: 1, fontWeight: "600" },
  eintragDatum: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
  eintragBetrag: { fontSize: 16, fontWeight: "800", minWidth: 80, textAlign: "right" },

  abendkostenCard: {
    backgroundColor: COLORS.card, borderRadius: 14, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: COLORS.border, borderLeftWidth: 3, ...SHADOWS.light,
  },
  eintragRowInner: { flexDirection: "row", alignItems: "center", gap: 12 },
  schuldnerList: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border, gap: 6 },
  schuldnerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  schuldnerName: { flex: 1, fontSize: 13, fontWeight: "600", color: COLORS.textDark },
  schuldnerNameBeglichen: { textDecorationLine: "line-through", color: COLORS.textLight },
  schuldnerBetrag: { fontSize: 13, fontWeight: "700", color: COLORS.gold },

  deleteAction: {
    backgroundColor: COLORS.danger, borderRadius: 14, marginBottom: 8,
    justifyContent: "center", alignItems: "center", width: 64,
  },


  emptyState: { alignItems: "center", paddingVertical: 40, gap: 8 },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 17, fontWeight: "800", color: COLORS.textDark },
  emptySub: { fontSize: 13, color: COLORS.textMuted, textAlign: "center" },
});
