import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Swipeable from "react-native-gesture-handler/Swipeable";
import { showAlert } from "../../utils/alert";
import { MemberProfile, StammtischVerordnung, StrafKategorieDef, VerspätungLog } from "../../types";
import { SHADOWS, ThemeColors, FONT } from "../../constants/design";
import { useColors, useThemedStyles } from "../../contexts/ThemeContext";
import { getInitial, displayName } from "../../utils/format";
import { useSingleFlight } from "../../utils/useSingleFlight";
import { TerminAbend } from "../../utils/useTerminAbend";
import { Button } from "../ui";

/*
 * Übergang bis Stufe 5: die bisherigen Live-Tabs (Anwesenheit, Strafen,
 * Spiel) unverändert, nur an useTerminAbend angebunden. Wird durch die neue
 * Live-Ansicht ersetzt.
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

// Feste Farbrotation für Spiel-Ereignistypen (max. 4 pro Spiel, siehe reihenfolge 1-4) —
// gibt Buttons und Verlaufszeilen desselben Ereignistyps dieselbe Farbe.
const ereignisFarbenFor = (c: ThemeColors) => [c.danger, c.gold, c.blue, c.success];
function ereignisFarbe(ereignisFarben: string[], ereignisTypen: { id: string }[], ereignisTypId: string): string {
  const index = ereignisTypen.findIndex((et) => et.id === ereignisTypId);
  return ereignisFarben[index >= 0 ? index % ereignisFarben.length : 0];
}

// ─── Member Row (RSVP + Anwesenheit + Verspätung) ────────────────────────────

function MemberRow({
  member,
  anwesend,
  verspätungen,
  verordnung,
  rsvpStatus,
  absageGrund,
  isActiveUser,
  onToggle,
  onRsvp,
  onAddVerspätung,
  onDeleteVerspätung,
}: {
  member: MemberProfile;
  anwesend: boolean;
  verspätungen: VerspätungLog[];
  verordnung: StammtischVerordnung | null;
  rsvpStatus: "ja" | "nein" | null;
  absageGrund?: string;
  isActiveUser: boolean;
  onToggle: () => void;
  onRsvp: (status: "ja" | "nein" | null, grund?: string) => void;
  onAddVerspätung: (minuten: number, grund?: string) => Promise<void>;
  onDeleteVerspätung: (logId: string) => void;
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const [showInput, setShowInput] = useState(false);
  const [minuten, setMinuten] = useState("");
  const [grund, setGrund] = useState("");
  const [showAbsageGrundInput, setShowAbsageGrundInput] = useState(false);
  const [absageGrundText, setAbsageGrundText] = useState(absageGrund ?? "");
  useEffect(() => { setAbsageGrundText(absageGrund ?? ""); }, [absageGrund]);
  const submitting = useRef(false);

  async function submit() {
    if (submitting.current) return;
    const m = parseInt(minuten, 10);
    if (isNaN(m) || m <= 0) {
      showAlert("Ungültig", "Bitte eine gültige Minutenzahl eingeben.");
      return;
    }
    submitting.current = true;
    try {
      await onAddVerspätung(m, grund.trim() || undefined);
      setMinuten("");
      setGrund("");
      setShowInput(false);
    } finally {
      submitting.current = false;
    }
  }

  const gesamtMinuten = verspätungen.reduce((s, l) => s + l.minutenVerspätet, 0);

  // ── Active user: full-size card with RSVP buttons ─────────────────────────
  if (isActiveUser) {
    return (
      <View style={[
        styles.memberRowSelf,
        rsvpStatus === "ja" && styles.memberRowSelfJa,
        rsvpStatus === "nein" && styles.memberRowSelfNein,
      ]}>
        <Text style={styles.memberRowSelfLabel}>Meine Zusage</Text>
        <View style={styles.memberRowHeader}>
          {member.photoUri ? (
            <Image source={{ uri: member.photoUri }} style={styles.memberAvatar} />
          ) : (
            <View style={[styles.memberAvatar, { backgroundColor: member.avatarColor, alignItems: "center", justifyContent: "center" }]}>
              <Text style={styles.memberAvatarLetter}>{getInitial(member.name)}</Text>
            </View>
          )}
          <View style={styles.memberInfo}>
            <Text style={styles.memberName}>{displayName(member)}</Text>
            {gesamtMinuten > 0 && (
              <Text style={styles.memberVerspätung}>⏱️ {gesamtMinuten} Min.</Text>
            )}
          </View>
          <TouchableOpacity
            style={[styles.verspätungBtn, showInput && styles.verspätungBtnActive]}
            onPress={() => setShowInput((v) => !v)}
          >
            <Ionicons name="timer-outline" size={18} color={showInput ? c.onAccent : c.danger} />
          </TouchableOpacity>
        </View>

        <View style={styles.selfRsvpRow}>
          <TouchableOpacity
            style={[styles.selfRsvpBtn, rsvpStatus === "ja" && styles.selfRsvpBtnJa]}
            onPress={() => onRsvp(rsvpStatus === "ja" ? null : "ja")}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-circle" size={18} color={rsvpStatus === "ja" ? c.onAccent : c.success} />
            <Text style={[styles.selfRsvpBtnText, rsvpStatus === "ja" && { color: c.onAccent }]}>Ich bin dabei</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.selfRsvpBtn, rsvpStatus === "nein" && styles.selfRsvpBtnNein]}
            onPress={() => onRsvp(rsvpStatus === "nein" ? null : "nein")}
            activeOpacity={0.8}
          >
            <Ionicons name="close-circle" size={18} color={rsvpStatus === "nein" ? c.onAccent : c.danger} />
            <Text style={[styles.selfRsvpBtnText, rsvpStatus === "nein" && { color: c.onAccent }]}>Ich kann nicht</Text>
          </TouchableOpacity>
        </View>

        {rsvpStatus === "nein" && (
          <View style={styles.absageGrundBox}>
            {showAbsageGrundInput ? (
              <>
                <TextInput
                  style={styles.grundInput}
                  placeholder="Grund für die Absage (optional)"
                  placeholderTextColor={c.textLight}
                  value={absageGrundText}
                  onChangeText={setAbsageGrundText}
                  autoFocus
                />
                <TouchableOpacity
                  style={styles.eintragenBtn}
                  onPress={() => { onRsvp("nein", absageGrundText); setShowAbsageGrundInput(false); }}
                >
                  <Text style={styles.eintragenBtnText}>Speichern</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity onPress={() => setShowAbsageGrundInput(true)} style={styles.absageGrundRow} activeOpacity={0.7}>
                <Ionicons name="create-outline" size={14} color={c.textMuted} />
                <Text style={styles.absageGrundText}>
                  {absageGrund ? `„${absageGrund}"` : "Grund hinzufügen (optional)"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {showInput && (
          <View style={styles.verspätungForm}>
            <View style={styles.verspätungInputRow}>
              <TextInput
                style={styles.minutenInput}
                placeholder="Min."
                placeholderTextColor={c.textLight}
                keyboardType="number-pad"
                value={minuten}
                onChangeText={setMinuten}
                autoFocus
              />
              <Text style={styles.minutenLabel}>Minuten zu spät</Text>
            </View>
            <TextInput
              style={styles.grundInput}
              placeholder="Grund (optional)"
              placeholderTextColor={c.textLight}
              value={grund}
              onChangeText={setGrund}
            />
            <TouchableOpacity style={styles.eintragenBtn} onPress={submit}>
              <Text style={styles.eintragenBtnText}>Eintragen</Text>
            </TouchableOpacity>
          </View>
        )}

        {verspätungen.length > 0 && (
          <View style={styles.verspätungLogs}>
            {verspätungen.map((log) => (
              <Swipeable
                key={log.id}
                renderRightActions={() => (
                  <TouchableOpacity style={styles.deleteSwipeSmall} onPress={() => onDeleteVerspätung(log.id)}>
                    <Ionicons name="trash-outline" size={16} color={c.onAccent} />
                  </TouchableOpacity>
                )}
              >
                <View style={styles.verspätungLogRow}>
                  <Text style={styles.verspätungLogMin}>{log.minutenVerspätet} Min.</Text>
                  {log.grund && <Text style={styles.verspätungLogGrund}>„{log.grund}"</Text>}
                </View>
              </Swipeable>
            ))}
          </View>
        )}
      </View>
    );
  }

  // ── Other members: compact read-only row ──────────────────────────────────
  const rsvpColor = rsvpStatus === "ja" ? c.success : rsvpStatus === "nein" ? c.danger : c.border;

  return (
    <View style={[
      styles.memberRowCompact,
      rsvpStatus === "ja" && styles.memberRowCompactJa,
      rsvpStatus === "nein" && styles.memberRowCompactNein,
    ]}>
      {/* Main row */}
      <View style={styles.memberRowCompactInner}>
        {/* Colored left bar indicates RSVP status */}
        <View style={[styles.memberRowCompactBar, { backgroundColor: rsvpColor }]} />

        <View style={[styles.memberAvatarSmall, { backgroundColor: member.avatarColor, alignItems: "center", justifyContent: "center" }]}>
          {member.photoUri
            ? <Image source={{ uri: member.photoUri }} style={styles.memberAvatarSmall} />
            : <Text style={styles.memberAvatarLetterSmall}>{getInitial(member.name)}</Text>
          }
        </View>

        <View style={styles.memberInfoCompact}>
          <Text style={styles.memberNameCompact} numberOfLines={1}>
            {displayName(member)}
          </Text>
          {gesamtMinuten > 0 && (
            <Text style={styles.memberVerspätungSmall}>⏱ {gesamtMinuten} Min.</Text>
          )}
          {rsvpStatus === "nein" && absageGrund && (
            <Text style={styles.absageGrundTextSmall}>„{absageGrund}"</Text>
          )}
        </View>

        {/* RSVP pill */}
        <View style={[
          styles.rsvpPill,
          rsvpStatus === "ja" && styles.rsvpPillJa,
          rsvpStatus === "nein" && styles.rsvpPillNein,
        ]}>
          <Text style={[
            styles.rsvpPillText,
            { color: rsvpStatus === "ja" ? c.success : rsvpStatus === "nein" ? c.danger : c.textLight },
          ]}>
            {rsvpStatus === "ja" ? "Zugesagt" : rsvpStatus === "nein" ? "Abgesagt" : "Offen"}
          </Text>
        </View>

        {/* Timer button for organizer */}
        <TouchableOpacity
          style={[styles.verspätungBtnSmall, showInput && styles.verspätungBtnActive]}
          onPress={() => setShowInput((v) => !v)}
        >
          <Ionicons name="timer-outline" size={15} color={showInput ? c.onAccent : c.danger} />
        </TouchableOpacity>
      </View>

      {showInput && (
        <View style={[styles.verspätungForm, { marginTop: 8 }]}>
          <View style={styles.verspätungInputRow}>
            <TextInput
              style={styles.minutenInput}
              placeholder="Min."
              placeholderTextColor={c.textLight}
              keyboardType="number-pad"
              value={minuten}
              onChangeText={setMinuten}
              autoFocus
            />
            <Text style={styles.minutenLabel}>Minuten zu spät</Text>
          </View>
          <TextInput
            style={styles.grundInput}
            placeholder="Grund (optional)"
            placeholderTextColor={c.textLight}
            value={grund}
            onChangeText={setGrund}
          />
          <TouchableOpacity style={styles.eintragenBtn} onPress={submit}>
            <Text style={styles.eintragenBtnText}>Eintragen</Text>
          </TouchableOpacity>
        </View>
      )}

      {verspätungen.length > 0 && (
        <View style={[styles.verspätungLogs, { marginTop: 6 }]}>
          {verspätungen.map((log) => (
            <Swipeable
              key={log.id}
              renderRightActions={() => (
                <TouchableOpacity style={styles.deleteSwipeSmall} onPress={() => onDeleteVerspätung(log.id)}>
                  <Ionicons name="trash-outline" size={16} color={c.onAccent} />
                </TouchableOpacity>
              )}
            >
              <View style={styles.verspätungLogRow}>
                <Text style={styles.verspätungLogMin}>{log.minutenVerspätet} Min.</Text>
                {log.grund && <Text style={styles.verspätungLogGrund}>„{log.grund}"</Text>}
              </View>
            </Swipeable>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Live (Übergang) ──────────────────────────────────────────────────────────

export function LiveAlt({ abend }: { abend: TerminAbend }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const EREIGNIS_FARBEN = useMemo(() => ereignisFarbenFor(c), [c]);
  const guard = useSingleFlight();
  const { termin, members, verordnung, verspätungMap, strafMap, spielLogMap, strafKategorien, aktivesSpiel, ereignisTypen } = abend;
  const activeMemberId = abend.activeMemberId;

  const [activeTab, setActiveTab] = useState<"anwesenheit" | "strafen" | "spiel">("anwesenheit");
  const [strafMemberId, setStrafMemberId] = useState<string | null>(null);
  const [showStrafForm, setShowStrafForm] = useState(false);
  const [strafBetragOverride, setStrafBetragOverride] = useState("");
  const [strafNotiz, setStrafNotiz] = useState("");
  const [strafKategorie, setStrafKategorie] = useState<StrafKategorieDef | null>(null);
  const [addStrafOpen, setAddStrafOpen] = useState(false);
  const [selectedSpielMemberId, setSelectedSpielMemberId] = useState<string | null>(null);
  useEffect(() => { setSelectedSpielMemberId((prev) => prev ?? members[0]?.id ?? null); }, [members]);

  function openAddStraf() {
    setStrafMemberId(null);
    setStrafKategorie(null);
    setStrafBetragOverride("");
    setStrafNotiz("");
    setShowStrafForm(false);
    setAddStrafOpen(true);
  }

  function closeAddStraf() {
    setAddStrafOpen(false);
    setStrafMemberId(null);
    setStrafKategorie(null);
    setStrafBetragOverride("");
    setStrafNotiz("");
    setShowStrafForm(false);
  }

  async function handleAddStraf() {
    if (!strafMemberId || !strafKategorie) return;
    const betrag = strafBetragOverride ? parseFloat(strafBetragOverride.replace(",", ".")) : strafKategorie.betrag;
    if (isNaN(betrag) || betrag < 0) return;
    await abend.strafeEintragen(strafMemberId, strafKategorie, betrag, strafNotiz.trim() || undefined);
    closeAddStraf();
  }

  function beenden() {
    showAlert("Abend beenden?", "Danach siehst du die Zusammenfassung. Einträge lassen sich weiter korrigieren.", [
      { text: "Abbrechen", style: "cancel" },
      { text: "Beenden", onPress: () => { abend.abendBeenden().catch(() => showAlert("Fehler", "Der Abend konnte nicht beendet werden.")); } },
    ]);
  }

  if (!termin) return null;

  const anwesenheit = termin.anwesenheit ?? [];
  const absagenIds = termin.absagen ?? [];
  const anwesendCount = anwesenheit.length;
  const offenIds = members.map((m) => m.id).filter((mid) => !anwesenheit.includes(mid) && !absagenIds.includes(mid));
  const membersForAnwesenheit = activeMemberId
    ? [...members].sort((a, b) => (a.id === activeMemberId ? -1 : b.id === activeMemberId ? 1 : 0))
    : members;
  const totalVerspätung = Object.values(verspätungMap).flat().reduce((s, l) => s + l.minutenVerspätet, 0);
  const allSpielLogs = Object.values(spielLogMap).flat();
  const selMember = members.find((m) => m.id === selectedSpielMemberId);
  const selSpielLogs = spielLogMap[selectedSpielMemberId ?? ""] ?? [];
  const spielFeed = Object.entries(spielLogMap)
    .flatMap(([memberId, logs]) => logs.map((l) => ({ ...l, memberId })))
    .sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime());
  const strafSelMember = members.find((m) => m.id === strafMemberId);
  const waehlbareStrafKategorien = strafKategorien.filter((kat) => !kat.spielEreignisTypId);
  const allStrafLogs = Object.entries(strafMap)
    .flatMap(([memberId, logs]) => logs.map((l) => ({ ...l, memberId })))
    .sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime());
  const totalStrafOffen = allStrafLogs.filter((l) => !l.beglichen).reduce((s, l) => s + l.betrag, 0);

  return (
    <View>
          {/* ── Tabs ── */}
          <View style={styles.tabBar}>
            {([
              { key: "anwesenheit", label: "Anwes.", emoji: "👥" },
              ...(verordnung.tabStrafenAktiv !== false ? [{ key: "strafen", label: "Strafen", emoji: "💰" }] : []),
              ...(aktivesSpiel ? [{ key: "spiel", label: aktivesSpiel.name, emoji: aktivesSpiel.emoji ?? "🎮" }] : []),
            ] as { key: typeof activeTab; label: string; emoji: string }[]).map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                  onPress={() => setActiveTab(tab.key)}
                >
                  <Text style={{ fontFamily: FONT.w400, fontSize: 15 }}>{tab.emoji}</Text>
                  <Text style={[styles.tabBtnText, isActive && styles.tabBtnTextActive]} numberOfLines={1}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Tab: Anwesenheit ── */}
          {activeTab === "anwesenheit" && (
            <>
              {/* Stats bar */}
              <View style={styles.anwesenheitStatsBar}>
                <View style={styles.anwesenheitStatBarItem}>
                  <Text style={[styles.anwesenheitStatBarNum, { color: c.success }]}>{anwesendCount}</Text>
                  <Text style={styles.anwesenheitStatBarLabel}>Zusagen</Text>
                </View>
                <View style={styles.anwesenheitStatDivider} />
                <View style={styles.anwesenheitStatBarItem}>
                  <Text style={[styles.anwesenheitStatBarNum, { color: c.danger }]}>{absagenIds.length}</Text>
                  <Text style={styles.anwesenheitStatBarLabel}>Absagen</Text>
                </View>
                <View style={styles.anwesenheitStatDivider} />
                <View style={styles.anwesenheitStatBarItem}>
                  <Text style={[styles.anwesenheitStatBarNum, { color: c.textMuted }]}>{offenIds.length}</Text>
                  <Text style={styles.anwesenheitStatBarLabel}>Offen</Text>
                </View>
                {totalVerspätung > 0 && (
                  <>
                    <View style={styles.anwesenheitStatDivider} />
                    <View style={styles.anwesenheitStatBarItem}>
                      <Text style={[styles.anwesenheitStatBarNum, { fontFamily: FONT.w400, color: c.danger, fontSize: 14 }]}>{totalVerspätung}</Text>
                      <Text style={styles.anwesenheitStatBarLabel}>Min. spät</Text>
                    </View>
                  </>
                )}
              </View>

              {/* Member rows with integrated RSVP — eigenes Profil immer zuoberst */}
              {membersForAnwesenheit.map((m) => {
                const mRsvp = anwesenheit.includes(m.id) ? "ja" : absagenIds.includes(m.id) ? "nein" : null;
                return (
                  <MemberRow
                    key={m.id}
                    member={m}
                    anwesend={anwesenheit.includes(m.id)}
                    verspätungen={verspätungMap[m.id] ?? []}
                    verordnung={verordnung}
                    rsvpStatus={mRsvp}
                    absageGrund={termin.absageGruende?.[m.id]}
                    isActiveUser={m.id === activeMemberId}
                    onToggle={() => abend.anwesenheitUmschalten(m.id)}
                    onRsvp={(status, grund) => abend.rsvp(status, grund)}
                    onAddVerspätung={(min, g) => abend.verspätungEintragen(m.id, min, g)}
                    onDeleteVerspätung={(lid) => abend.verspätungLöschen(m.id, lid)}
                  />
                );
              })}
            </>
          )}

          {/* ── Tab: Strafen ── */}
          {activeTab === "strafen" && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>💰 Strafen</Text>
                {totalStrafOffen > 0 && (
                  <Text style={[styles.sectionBadge, { color: c.danger, backgroundColor: c.danger + "12" }]}>
                    {totalStrafOffen.toLocaleString("de-DE", { minimumFractionDigits: 2 })} € offen
                  </Text>
                )}
              </View>

              <TouchableOpacity style={styles.addStrafRow} onPress={openAddStraf} activeOpacity={0.8}>
                <View style={styles.addStrafRowIcon}>
                  <Ionicons name="add" size={22} color={c.danger} />
                </View>
                <Text style={styles.addStrafRowText}>Strafe hinzufügen</Text>
              </TouchableOpacity>

              {allStrafLogs.length > 0 && (
                <>
                  <Text style={styles.subSectionLabel}>📋 Strafen dieses Abends</Text>
                  {allStrafLogs.map((log) => {
                    const m = members.find((x) => x.id === log.memberId);
                    const kat = strafKategorien.find((k) => k.id === log.kategorie);
                    return (
                      <Swipeable
                        key={log.id}
                        renderRightActions={() => (
                          <TouchableOpacity style={styles.deleteSwipeSmall} onPress={() => abend.strafeLöschen(log.memberId, log.id)}>
                            <Ionicons name="trash-outline" size={16} color={c.onAccent} />
                          </TouchableOpacity>
                        )}
                        overshootRight={false}
                      >
                        <View style={[styles.strafFeedRow, log.beglichen && styles.strafFeedRowBeglichen]}>
                          <Text style={styles.strafFeedEmoji}>{kat?.emoji ?? "💰"}</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.strafFeedMember}>{m?.name ?? "Unbekannt"}</Text>
                            <Text style={styles.strafFeedLabel}>{kat?.label ?? log.kategorie}{log.notiz ? ` · ${log.notiz}` : ""}</Text>
                          </View>
                          <View style={styles.strafFeedRight}>
                            <Text style={[styles.strafFeedBetrag, log.beglichen && { textDecorationLine: "line-through", color: c.textLight }]}>
                              {log.betrag.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
                            </Text>
                            <TouchableOpacity
                              onPress={() => guard(() => abend.strafeBeglichenUmschalten(log.memberId, log.id))}
                              style={styles.strafBegleichenBtn}
                              accessibilityRole="button"
                              accessibilityLabel={log.beglichen ? "Als offen markieren" : "Als bezahlt markieren"}
                            >
                              <Ionicons
                                name={log.beglichen ? "checkmark-circle" : "ellipse-outline"}
                                size={20}
                                color={log.beglichen ? c.success : c.border}
                              />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </Swipeable>
                    );
                  })}
                </>
              )}

              <Modal visible={addStrafOpen} transparent animationType="slide" onRequestClose={closeAddStraf}>
                <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
                  <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={closeAddStraf} />
                  <View style={styles.modalSheet}>
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>💰 Neue Strafe</Text>
                      <TouchableOpacity onPress={closeAddStraf} style={styles.modalCloseBtn}>
                        <Ionicons name="close" size={20} color={c.textMuted} />
                      </TouchableOpacity>
                    </View>

                    <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                      <View style={styles.chipsWrap}>
                        {members.map((m) => {
                          const isSelected = m.id === strafMemberId;
                          return (
                            <TouchableOpacity
                              key={m.id}
                              style={[styles.chip, isSelected && { backgroundColor: m.avatarColor, borderColor: m.avatarColor }]}
                              onPress={() => { setStrafMemberId(m.id); setShowStrafForm(false); setStrafKategorie(null); }}
                            >
                              {m.photoUri ? (
                                <Image source={{ uri: m.photoUri }} style={styles.chipAvatar} />
                              ) : (
                                <View style={[styles.chipAvatar, { backgroundColor: isSelected ? "rgba(255,255,255,0.35)" : m.avatarColor, alignItems: "center", justifyContent: "center" }]}>
                                  <Text style={{ fontSize: 11, fontFamily: FONT.w700, color: c.onAvatar }}>{getInitial(m.name)}</Text>
                                </View>
                              )}
                              <Text style={[styles.chipText, isSelected && { color: c.onAvatar }]}>{m.spitzname ?? m.name.split(" ")[0]}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      {strafMemberId && (
                        <>
                          {waehlbareStrafKategorien.length === 0 ? (
                            <Text style={styles.strafKeineKategorien}>Dieser Stammtisch hat keine Strafen.</Text>
                          ) : (
                          <View style={styles.strafGrid}>
                            {waehlbareStrafKategorien.map((kat) => {
                              const isSelected = strafKategorie?.id === kat.id;
                              return (
                                <TouchableOpacity
                                  key={kat.id}
                                  style={[styles.strafKatBtn, isSelected && styles.strafKatBtnActive]}
                                  onPress={() => {
                                    setStrafKategorie(isSelected ? null : kat);
                                    setStrafBetragOverride(kat.betrag > 0 ? String(kat.betrag).replace(".", ",") : "");
                                    setStrafNotiz("");
                                    setShowStrafForm(!isSelected);
                                  }}
                                  activeOpacity={0.8}
                                >
                                  <Text style={styles.strafKatEmoji}>{kat.emoji}</Text>
                                  <Text style={[styles.strafKatLabel, isSelected && { color: c.onAccent }]} numberOfLines={2}>{kat.label}</Text>
                                  {kat.betrag > 0 && (
                                    <Text style={[styles.strafKatBetrag, isSelected && { color: "rgba(255,255,255,0.85)" }]}>
                                      {kat.betrag.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
                                    </Text>
                                  )}
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                          )}

                          {showStrafForm && strafKategorie && (
                            <View style={styles.strafForm}>
                              <Text style={styles.strafFormTitle}>
                                {strafKategorie.emoji} {strafKategorie.label} — {strafSelMember?.name}
                              </Text>
                              {strafKategorie.beschreibung && (
                                <Text style={styles.strafFormHint}>{strafKategorie.beschreibung}</Text>
                              )}
                              <View style={styles.strafFormRow}>
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.strafFormLabel}>Betrag (€)</Text>
                                  <TextInput
                                    style={styles.strafFormInput}
                                    value={strafBetragOverride}
                                    onChangeText={setStrafBetragOverride}
                                    placeholder={strafKategorie.betrag > 0 ? String(strafKategorie.betrag) : "0,00"}
                                    placeholderTextColor={c.textLight}
                                    keyboardType="decimal-pad"
                                  />
                                </View>
                                <View style={{ flex: 2 }}>
                                  <Text style={styles.strafFormLabel}>Notiz (optional)</Text>
                                  <TextInput
                                    style={styles.strafFormInput}
                                    value={strafNotiz}
                                    onChangeText={setStrafNotiz}
                                    placeholder="z. B. 20 Min. zu spät, kein Grund"
                                    placeholderTextColor={c.textLight}
                                  />
                                </View>
                              </View>
                              <TouchableOpacity style={styles.strafSubmitBtn} onPress={() => guard(handleAddStraf)} activeOpacity={0.8}>
                                <Ionicons name="checkmark" size={16} color={c.onAccent} />
                                <Text style={styles.strafSubmitText}>Strafe eintragen</Text>
                              </TouchableOpacity>
                            </View>
                          )}
                        </>
                      )}
                    </ScrollView>
                  </View>
                </KeyboardAvoidingView>
              </Modal>
            </>
          )}

          {/* ── Tab: Spiel (generisch) ── */}
          {activeTab === "spiel" && aktivesSpiel && members.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{aktivesSpiel.emoji ?? "🎮"} {aktivesSpiel.name}</Text>
                {allSpielLogs.length > 0 && (
                  <Text style={styles.sectionBadge}>{allSpielLogs.length} Events</Text>
                )}
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScrollFixed}>
                <View style={styles.chipsGridTwoRows}>
                  {members.map((m) => {
                    const isSelected = m.id === selectedSpielMemberId;
                    return (
                      <TouchableOpacity
                        key={m.id}
                        style={[styles.chip, isSelected && { backgroundColor: m.avatarColor, borderColor: m.avatarColor }]}
                        onPress={() => setSelectedSpielMemberId(m.id)}
                      >
                        {m.photoUri ? (
                          <Image source={{ uri: m.photoUri }} style={styles.chipAvatar} />
                        ) : (
                          <View style={[styles.chipAvatar, {
                            backgroundColor: isSelected ? "rgba(255,255,255,0.35)" : m.avatarColor,
                            alignItems: "center", justifyContent: "center",
                          }]}>
                            <Text style={{ fontSize: 11, fontFamily: FONT.w700, color: c.onAvatar }}>
                              {getInitial(m.name)}
                            </Text>
                          </View>
                        )}
                        <Text style={[styles.chipText, isSelected && { color: c.onAccent }]}>
                          {m.spitzname ?? m.name.split(" ")[0]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              {selMember && (
                <View style={styles.spielCounterRow}>
                  {ereignisTypen.map((et, index) => {
                    const count = selSpielLogs.filter((l) => l.ereignisTypId === et.id).length;
                    const farbe = EREIGNIS_FARBEN[index % EREIGNIS_FARBEN.length];
                    return (
                      <TouchableOpacity
                        key={et.id}
                        style={[styles.spielCounterBtn, { backgroundColor: farbe }]}
                        onPress={() => guard(() => abend.spielEreignisEintragen(selectedSpielMemberId!, et.id))}
                        activeOpacity={0.7}
                      >
                        <View style={styles.spielCounterPlusBadge}>
                          <Text style={styles.spielCounterPlusText}>+1</Text>
                        </View>
                        <Text style={styles.schockActionEmoji}>{et.emoji ?? "🎯"}</Text>
                        <Text style={[styles.spielActionLabel, { color: c.onAccent }]} numberOfLines={1}>{et.label}</Text>
                        <View style={styles.spielCounterBadge}>
                          <Text style={[styles.spielCounterBadgeText, { color: farbe }]}>{count}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {spielFeed.length > 0 && (
                <>
                  <Text style={styles.subSectionLabel}>📋 {aktivesSpiel.name}-Verlauf dieses Abends</Text>
                  {spielFeed.map((log) => {
                    const m = members.find((x) => x.id === log.memberId);
                    const et = ereignisTypen.find((e) => e.id === log.ereignisTypId);
                    const farbe = ereignisFarbe(EREIGNIS_FARBEN, ereignisTypen, log.ereignisTypId);
                    return (
                      <Swipeable
                        key={log.id}
                        renderRightActions={() => (
                          <TouchableOpacity
                            style={styles.deleteSwipeSmall}
                            onPress={() => abend.spielEreignisLöschen(log.memberId, log.id)}
                          >
                            <Ionicons name="trash-outline" size={16} color={c.onAccent} />
                          </TouchableOpacity>
                        )}
                      >
                        <View style={[styles.schockFeedRow, { borderLeftColor: farbe }]}>
                          <Text style={styles.schockFeedEmoji}>{et?.emoji ?? "🎯"}</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.schockFeedMember}>{m?.name ?? "Unbekannt"}</Text>
                            <Text style={styles.schockFeedText}>{et?.label ?? "Ereignis"}</Text>
                          </View>
                          <Text style={styles.schockFeedTime}>{formatTime(log.loggedAt)}</Text>
                        </View>
                      </Swipeable>
                    );
                  })}
                </>
              )}
            </>
          )}

          <Button label="Abend beenden" icon="stop-circle-outline" variant="dark" onPress={beenden} style={{ marginTop: 16 }} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background },
  content: { padding: 20, paddingBottom: 60 },

  backBtn: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 16 },
  backText: { fontSize: 15, color: c.blue, fontFamily: FONT.w600 },

  headerCard: {
    backgroundColor: c.card, borderRadius: 20, padding: 16, marginBottom: 20,
    borderWidth: 1, borderColor: c.border, ...SHADOWS.card,
  },
  terminBildWrap: {
    marginTop: -16, marginHorizontal: -16, marginBottom: 12, height: 140, backgroundColor: c.cardAlt,
  },
  terminBild: { width: "100%", height: "100%" },
  terminBildRemoveBtn: {
    position: "absolute", top: 8, right: 8, width: 26, height: 26, borderRadius: 13,
    backgroundColor: "rgba(26,18,8,0.55)", alignItems: "center", justifyContent: "center",
  },
  terminBildUploadingOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(26,18,8,0.4)",
    alignItems: "center", justifyContent: "center",
  },
  terminBildUploadingText: { color: "#FFFFFF", fontFamily: FONT.w700, fontSize: 13 },
  terminBildAddRow: {
    flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12,
    paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12,
    borderWidth: 1.5, borderColor: c.border, borderStyle: "dashed",
  },
  terminBildAddText: { fontSize: 13, fontFamily: FONT.w600, color: c.textMuted },
  headerTop: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  typIcon: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  typLogo: { width: 36, height: 36 },
  terminTitel: { fontSize: 18, fontFamily: FONT.w800, color: c.textDark, marginBottom: 3 },
  terminDatum: { fontSize: 13, color: c.blue, fontFamily: FONT.w600, marginBottom: 4 },
  terminMeta: { fontFamily: FONT.w400, fontSize: 12, color: c.textMuted, marginTop: 2 },
  terminNotizen: { fontFamily: FONT.w400i, fontSize: 13, color: c.textMuted,
    marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.border,
  },
  tabBar: {
    flexDirection: "row", backgroundColor: c.card,
    borderRadius: 14, padding: 4, marginBottom: 16,
    borderWidth: 1, borderColor: c.border,
  },
  tabBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center", gap: 2,
  },
  tabBtnActive: { backgroundColor: c.blue },
  tabBtnText: { fontSize: 10, fontFamily: FONT.w600, color: c.textMuted },
  tabBtnTextActive: { color: c.onAccent, fontFamily: FONT.w700 },

  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  sectionHeaderRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { fontSize: 14, fontFamily: FONT.w800, color: c.textDark, letterSpacing: -0.2 },
  sectionBadge: {
    fontSize: 12, fontFamily: FONT.w700, color: c.blue,
    backgroundColor: c.blue + "12", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10,
  },
  alleBtn: {
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10,
    backgroundColor: c.success + "15", borderWidth: 1, borderColor: c.success + "44",
  },
  alleBtnText: { fontSize: 12, fontFamily: FONT.w700, color: c.success },
  subSectionLabel: {
    fontSize: 11, fontFamily: FONT.w800, color: c.textMuted, textTransform: "uppercase",
    letterSpacing: 0.5, marginTop: 12, marginBottom: 8,
  },

  anwesenheitStatDivider: { width: 1, height: 28, backgroundColor: c.border },

  // ── Active user row ──────────────────────────────────────────────────────
  memberRowSelf: {
    backgroundColor: c.card, borderRadius: 16, padding: 14, marginBottom: 10,
    borderWidth: 1.5, borderColor: c.blue + "44", ...SHADOWS.light,
  },
  memberRowSelfJa: { borderColor: c.success + "66", backgroundColor: c.successBg },
  memberRowSelfNein: { borderColor: c.danger + "44", backgroundColor: c.dangerBg },
  memberRowSelfLabel: {
    fontSize: 10, fontFamily: FONT.w800, color: c.textLight,
    textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8,
  },
  selfRsvpRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  selfRsvpBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 11, borderRadius: 12,
    backgroundColor: c.background, borderWidth: 1.5, borderColor: c.border,
  },
  selfRsvpBtnJa: { backgroundColor: c.success, borderColor: c.success },
  selfRsvpBtnNein: { backgroundColor: c.danger, borderColor: c.danger },
  selfRsvpBtnText: { fontSize: 14, fontFamily: FONT.w700, color: c.textDark },

  // ── Compact rows (other members) ─────────────────────────────────────────
  memberRowCompact: {
    backgroundColor: c.card, borderRadius: 12, marginBottom: 5,
    borderWidth: 1, borderColor: c.border,
    overflow: "hidden",
  },
  memberRowCompactJa: { borderColor: c.success + "44" },
  memberRowCompactNein: { borderColor: c.danger + "33" },
  memberRowCompactInner: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9, paddingRight: 10 },
  memberRowCompactBar: { width: 3, alignSelf: "stretch" },
  memberAvatarSmall: { width: 32, height: 32, borderRadius: 16 },
  memberAvatarLetterSmall: { fontSize: 13, fontFamily: FONT.w700, color: c.onAvatar },
  memberInfoCompact: { flex: 1 },
  memberNameCompact: { fontSize: 13, fontFamily: FONT.w600, color: c.textDark },
  memberVerspätungSmall: { fontSize: 11, color: c.danger, marginTop: 1, fontFamily: FONT.w600 },

  // RSVP pill for compact rows
  rsvpPill: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
    backgroundColor: c.background, borderWidth: 1, borderColor: c.border,
  },
  rsvpPillJa: { backgroundColor: c.success + "12", borderColor: c.success + "44" },
  rsvpPillNein: { backgroundColor: c.danger + "10", borderColor: c.danger + "33" },
  rsvpPillText: { fontSize: 11, fontFamily: FONT.w700 },

  // ── Shared member row parts ───────────────────────────────────────────────
  memberRowHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  memberAvatar: { width: 44, height: 44, borderRadius: 22 },
  memberAvatarLetter: { fontSize: 18, fontFamily: FONT.w700, color: c.onAvatar },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 15, fontFamily: FONT.w700, color: c.textDark },
  memberVerspätung: { fontSize: 12, color: c.danger, marginTop: 2, fontFamily: FONT.w600 },
  memberActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  verspätungBtn: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: c.dangerBg,
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: c.danger + "44",
  },
  verspätungBtnSmall: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: c.dangerBg,
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: c.danger + "33",
  },
  verspätungBtnActive: { backgroundColor: c.danger },
  verspätungForm: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.border },
  verspätungInputRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  minutenInput: {
    width: 70, backgroundColor: c.background, borderRadius: 10,
    borderWidth: 1, borderColor: c.border, paddingHorizontal: 12, paddingVertical: 8,
    fontSize: 16, fontFamily: FONT.w700, color: c.textDark, textAlign: "center",
  },
  minutenLabel: { fontFamily: FONT.w400, fontSize: 14, color: c.textMuted },
  grundInput: { fontFamily: FONT.w400, backgroundColor: c.background, borderRadius: 10, borderWidth: 1,
    borderColor: c.border, paddingHorizontal: 12, paddingVertical: 8,
    fontSize: 14, color: c.textDark, marginBottom: 8,
  },
  eintragenBtn: { backgroundColor: c.danger, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  eintragenBtnText: { color: c.onAccent, fontFamily: FONT.w700, fontSize: 14 },
  verspätungLogs: { marginTop: 10, gap: 4 },
  verspätungLogRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: c.dangerBg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7,
  },
  verspätungLogMin: { fontSize: 13, fontFamily: FONT.w700, color: c.danger, minWidth: 52 },
  verspätungLogGrund: { fontFamily: FONT.w400i, flex: 1, fontSize: 12, color: c.textMuted },

  absageGrundBox: { marginTop: 4 },
  absageGrundRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 2 },
  absageGrundText: { fontFamily: FONT.w400i, flex: 1, fontSize: 12, color: c.textMuted },
  absageGrundTextSmall: { fontFamily: FONT.w400i, fontSize: 11, color: c.textMuted, marginTop: 1 },

  chip: {
    flexDirection: "row", alignItems: "center", gap: 7,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: c.card, borderWidth: 1.5, borderColor: c.border,
  },
  chipAvatar: { width: 22, height: 22, borderRadius: 11 },
  chipText: { fontSize: 13, fontFamily: FONT.w600, color: c.textDark },

  spielCounterRow: { flexDirection: "row", gap: 10, marginBottom: 10, flexWrap: "wrap" },
  spielCounterBtn: {
    flex: 1, minWidth: 100, alignItems: "center", paddingVertical: 14, borderRadius: 14,
    gap: 6, position: "relative", ...SHADOWS.card,
  },
  spielCounterPlusBadge: {
    position: "absolute", top: -8, right: -8,
    minWidth: 26, height: 26, borderRadius: 13, paddingHorizontal: 4,
    backgroundColor: c.card, alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: c.background, ...SHADOWS.light,
  },
  spielCounterPlusText: { fontSize: 11, fontFamily: FONT.w800, color: c.textDark },
  spielActionLabel: { fontSize: 13, fontFamily: FONT.w700 },
  schockActionEmoji: { fontFamily: FONT.w400, fontSize: 26 },
  spielCounterBadge: {
    minWidth: 30, height: 30, borderRadius: 15, paddingHorizontal: 6,
    backgroundColor: c.card, alignItems: "center", justifyContent: "center",
  },
  spielCounterBadgeText: { fontSize: 15, fontFamily: FONT.w800 },

  schockFeedRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: c.card, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 6,
    borderWidth: 1, borderColor: c.border, borderLeftWidth: 3,
  },
  schockFeedEmoji: { fontFamily: FONT.w400, fontSize: 18 },
  schockFeedText: { fontFamily: FONT.w400, fontSize: 11, color: c.textMuted, marginTop: 1 },
  schockFeedMember: { fontSize: 13, fontFamily: FONT.w700, color: c.textDark },
  schockFeedTime: { fontFamily: FONT.w400, fontSize: 11, color: c.textLight },

  deleteSwipeSmall: {
    backgroundColor: c.danger, borderRadius: 12, width: 52,
    alignItems: "center", justifyContent: "center", marginBottom: 6,
  },

  protokollCard: {
    backgroundColor: c.card, borderRadius: 16, padding: 14, marginBottom: 20,
    borderWidth: 1, borderColor: c.border, ...SHADOWS.light,
  },
  protokollHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  protokollTitel: { flex: 1, fontSize: 15, fontFamily: FONT.w700, color: c.textDark },
  protokollExcerpt: { fontFamily: FONT.w400, fontSize: 13, color: c.textMuted, lineHeight: 19 },
  protokollOeffnenRow: {
    flexDirection: "row", alignItems: "center", gap: 4,
    marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: c.border,
    alignSelf: "flex-start",
  },
  protokollOeffnenText: { fontSize: 13, fontFamily: FONT.w700, color: c.blue },
  protokollLeer: { flexDirection: "row", alignItems: "center", gap: 12 },
  protokollLeerIcon: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: c.background, alignItems: "center", justifyContent: "center",
  },
  protokollLeerTitle: { fontSize: 14, fontFamily: FONT.w700, color: c.textMid },
  protokollLeerSub: { fontFamily: FONT.w400, fontSize: 12, color: c.textLight, marginTop: 2 },

  notFound: { flex: 1, alignItems: "center", justifyContent: "center" },
  notFoundText: { fontFamily: FONT.w400, fontSize: 16, color: c.textMuted },

  // Strafen
  strafGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 10 },
  strafKeineKategorien: { fontFamily: FONT.w400i, fontSize: 13, color: c.textMuted, marginBottom: 10 },
  strafKatBtn: {
    width: "48%", alignItems: "center", paddingVertical: 12, paddingHorizontal: 8,
    borderRadius: 14, backgroundColor: c.card, marginBottom: 8,
    borderWidth: 1.5, borderColor: c.border, gap: 3, ...SHADOWS.light,
  },
  strafKatBtnActive: { backgroundColor: c.danger, borderColor: c.danger },
  strafKatEmoji: { fontFamily: FONT.w400, fontSize: 20 },
  strafKatLabel: { fontSize: 11, fontFamily: FONT.w700, color: c.textDark, textAlign: "center" },
  strafKatBetrag: { fontSize: 12, fontFamily: FONT.w800, color: c.danger },
  strafForm: {
    backgroundColor: c.card, borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: c.danger + "44", ...SHADOWS.light,
  },
  strafFormTitle: { fontSize: 14, fontFamily: FONT.w800, color: c.textDark, marginBottom: 4 },
  strafFormHint: { fontFamily: FONT.w400i, fontSize: 12, color: c.textMuted, marginBottom: 12 },
  strafFormRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  strafFormLabel: { fontSize: 11, fontFamily: FONT.w700, color: c.textMuted, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 5 },
  strafFormInput: { fontFamily: FONT.w400, backgroundColor: c.background, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9,
    fontSize: 14, color: c.textDark, borderWidth: 1, borderColor: c.border,
  },
  strafSubmitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7,
    backgroundColor: c.danger, borderRadius: 12, paddingVertical: 11,
  },
  strafSubmitText: { color: c.onAccent, fontFamily: FONT.w700, fontSize: 14 },

  addStrafRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: c.card, borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1.5, borderColor: c.danger + "33", borderStyle: "dashed",
  },
  addStrafRowIcon: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: c.danger + "12",
    alignItems: "center", justifyContent: "center",
  },
  addStrafRowText: { fontSize: 14, fontFamily: FONT.w700, color: c.danger },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  chipsScrollFixed: { marginBottom: 12 },
  chipsGridTwoRows: {
    flexDirection: "column", flexWrap: "wrap", height: 88, gap: 8, alignContent: "flex-start",
  },
  modalOverlay: { flex: 1, backgroundColor: c.overlay, justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: c.background, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24, maxHeight: "85%", ...SHADOWS.card,
  },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14,
  },
  modalTitle: { fontSize: 17, fontFamily: FONT.w800, color: c.textDark },
  modalCloseBtn: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: c.cardAlt,
    alignItems: "center", justifyContent: "center",
  },
  strafFeedRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: c.card, borderRadius: 12, padding: 12, marginBottom: 6,
    borderWidth: 1, borderColor: c.border, borderLeftWidth: 3, borderLeftColor: c.danger,
  },
  strafFeedRowBeglichen: { borderLeftColor: c.success, backgroundColor: c.successBg },
  strafFeedEmoji: { fontFamily: FONT.w400, fontSize: 18 },
  strafFeedLabel: { fontFamily: FONT.w400, fontSize: 11, color: c.textMuted, marginTop: 1 },
  strafFeedMember: { fontSize: 13, fontFamily: FONT.w700, color: c.textDark },
  strafFeedRight: { alignItems: "flex-end", gap: 4 },
  strafFeedBetrag: { fontSize: 15, fontFamily: FONT.w800, color: c.danger },
  strafBegleichenBtn: { padding: 2 },

  // Edit form
  editBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: c.blue + "15", borderWidth: 1, borderColor: c.blue + "44",
    alignItems: "center", justifyContent: "center",
  },
  editBtnActive: { backgroundColor: c.textMuted, borderColor: c.textMuted },
  editFormCard: {
    backgroundColor: c.card, borderRadius: 18, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: c.blue + "33", ...SHADOWS.light,
  },
  editFormTitle: { fontSize: 15, fontFamily: FONT.w800, color: c.textDark, marginBottom: 14 },
  editLabel: { fontSize: 11, fontFamily: FONT.w700, color: c.textMuted, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 5 },
  editInput: { fontFamily: FONT.w400, backgroundColor: c.background, borderRadius: 10, borderWidth: 1, borderColor: c.border,
    paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: c.textDark, marginBottom: 12,
  },
  editDateBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: c.background, borderRadius: 10, borderWidth: 1, borderColor: c.border,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12,
  },
  editDateBtnText: { fontSize: 14, fontFamily: FONT.w600, color: c.textDark },
  editRow: { flexDirection: "row", gap: 10 },
  editSaveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7,
    backgroundColor: c.blue, borderRadius: 12, paddingVertical: 12, marginTop: 4,
  },
  editSaveBtnText: { color: c.onAccent, fontFamily: FONT.w700, fontSize: 14 },


  // Stats bar (Anwesenheit tab)
  anwesenheitStatsBar: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: c.card, borderRadius: 14, padding: 12, marginBottom: 12,
    borderWidth: 1, borderColor: c.border, ...SHADOWS.light,
  },
  anwesenheitStatBarItem: { flex: 1, alignItems: "center", gap: 2 },
  anwesenheitStatBarNum: { fontSize: 18, fontFamily: FONT.w800, color: c.textDark },
  anwesenheitStatBarLabel: { fontSize: 10, color: c.textMuted, fontFamily: FONT.w600 },

  // Agenda input (Protokoll tab)
  agendaInput: { fontFamily: FONT.w400, backgroundColor: c.background, borderRadius: 10,
    borderWidth: 1, borderColor: c.border,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: c.textDark, lineHeight: 21,
    minHeight: 100,
  },
});

