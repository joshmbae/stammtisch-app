import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Swipeable from "react-native-gesture-handler/Swipeable";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import InlineDateTimePicker from "../../components/InlineDateTimePicker";
import { showAlert } from "../../utils/alert";
import {
  MemberProfile,
  StammtischTermin,
  VerspätungLog,
  Spiel,
  SpielEreignisTyp,
  SpielLog,
  Wette,
  StammtischVerordnung,
  Protokoll,
  StrafLog,
  STRAF_KATEGORIEN,
} from "../../types";
import {
  loadTermine,
  loadMembers,
  loadVerspätungLogs,
  addVerspätungLog,
  deleteVerspätungLog,
  loadSpiele,
  loadEreignisTypen,
  loadSpielLogs,
  addSpielLog,
  deleteSpielLog,
  loadWetten,
  addWette,
  updateWette,
  deleteWette,
  loadStrafLogs,
  addStrafLog,
  deleteStrafLog,
  updateStrafLog,
  loadVerordnung,
  loadProtokoll,
  toggleAnwesenheit,
  setAnwesenheitAll,
  setRsvpStatus,
  loadAgenda,
  saveAgenda,
  updateTermin,
  deleteTermin,
  logActivity,
  addKassenEintrag,
} from "../../utils/storage";
import { supabase } from "../../utils/supabase";
import { subscribeToTerminChanges, dedupeInsert, patchById, removeByIdEverywhere } from "../../utils/realtime";
import { COLORS, SHADOWS } from "../../constants/design";
import { useSession } from "../../contexts/SessionContext";
import { getInitial, displayName } from "../../utils/format";
import { toTimeString, parseTimeString } from "../../utils/date";
import LoadingSpinner from "../../components/LoadingSpinner";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDatum(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("de-DE", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

function duration(start: string, end?: string): string {
  const ms = new Date(end ?? new Date()).getTime() - new Date(start).getTime();
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h === 0) return `${m} Min.`;
  return `${h} Std. ${m} Min.`;
}

function formatBetrag(n: number): string {
  return n.toLocaleString("de-DE", { minimumFractionDigits: 2 }) + " €";
}

// ─── Member Row (RSVP + Anwesenheit + Verspätung) ────────────────────────────

function MemberRow({
  member,
  anwesend,
  verspätungen,
  verordnung,
  rsvpStatus,
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
  isActiveUser: boolean;
  onToggle: () => void;
  onRsvp: (status: "ja" | "nein" | null) => void;
  onAddVerspätung: (minuten: number, grund?: string) => void;
  onDeleteVerspätung: (logId: string) => void;
}) {
  const [showInput, setShowInput] = useState(false);
  const [minuten, setMinuten] = useState("");
  const [grund, setGrund] = useState("");

  function submit() {
    const m = parseInt(minuten, 10);
    if (isNaN(m) || m <= 0) {
      showAlert("Ungültig", "Bitte eine gültige Minutenzahl eingeben.");
      return;
    }
    onAddVerspätung(m, grund.trim() || undefined);
    setMinuten("");
    setGrund("");
    setShowInput(false);
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
            <Ionicons name="timer-outline" size={18} color={showInput ? "#FFFFFF" : COLORS.danger} />
          </TouchableOpacity>
        </View>

        <View style={styles.selfRsvpRow}>
          <TouchableOpacity
            style={[styles.selfRsvpBtn, rsvpStatus === "ja" && styles.selfRsvpBtnJa]}
            onPress={() => onRsvp(rsvpStatus === "ja" ? null : "ja")}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-circle" size={18} color={rsvpStatus === "ja" ? "#FFF" : COLORS.success} />
            <Text style={[styles.selfRsvpBtnText, rsvpStatus === "ja" && { color: "#FFF" }]}>Ich bin dabei</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.selfRsvpBtn, rsvpStatus === "nein" && styles.selfRsvpBtnNein]}
            onPress={() => onRsvp(rsvpStatus === "nein" ? null : "nein")}
            activeOpacity={0.8}
          >
            <Ionicons name="close-circle" size={18} color={rsvpStatus === "nein" ? "#FFF" : COLORS.danger} />
            <Text style={[styles.selfRsvpBtnText, rsvpStatus === "nein" && { color: "#FFF" }]}>Ich kann nicht</Text>
          </TouchableOpacity>
        </View>

        {showInput && (
          <View style={styles.verspätungForm}>
            <View style={styles.verspätungInputRow}>
              <TextInput
                style={styles.minutenInput}
                placeholder="Min."
                placeholderTextColor={COLORS.textLight}
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
              placeholderTextColor={COLORS.textLight}
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
                    <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                )}
              >
                <View style={styles.verspätungLogRow}>
                  <Text style={styles.verspätungLogMin}>{log.minutenVerspätet} Min.</Text>
                  {log.grund && <Text style={styles.verspätungLogGrund}>„{log.grund}"</Text>}
                  <Text style={styles.verspätungLogTime}>{formatTime(log.datum)}</Text>
                </View>
              </Swipeable>
            ))}
          </View>
        )}
      </View>
    );
  }

  // ── Other members: compact read-only row ──────────────────────────────────
  const rsvpColor = rsvpStatus === "ja" ? COLORS.success : rsvpStatus === "nein" ? COLORS.danger : COLORS.border;

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
        </View>

        {/* RSVP pill */}
        <View style={[
          styles.rsvpPill,
          rsvpStatus === "ja" && styles.rsvpPillJa,
          rsvpStatus === "nein" && styles.rsvpPillNein,
        ]}>
          <Text style={[
            styles.rsvpPillText,
            { color: rsvpStatus === "ja" ? COLORS.success : rsvpStatus === "nein" ? COLORS.danger : COLORS.textLight },
          ]}>
            {rsvpStatus === "ja" ? "Zugesagt" : rsvpStatus === "nein" ? "Abgesagt" : "Offen"}
          </Text>
        </View>

        {/* Timer button for organizer */}
        <TouchableOpacity
          style={[styles.verspätungBtnSmall, showInput && styles.verspätungBtnActive]}
          onPress={() => setShowInput((v) => !v)}
        >
          <Ionicons name="timer-outline" size={15} color={showInput ? "#FFFFFF" : COLORS.danger} />
        </TouchableOpacity>
      </View>

      {showInput && (
        <View style={[styles.verspätungForm, { marginTop: 8 }]}>
          <View style={styles.verspätungInputRow}>
            <TextInput
              style={styles.minutenInput}
              placeholder="Min."
              placeholderTextColor={COLORS.textLight}
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
            placeholderTextColor={COLORS.textLight}
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
                  <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            >
              <View style={styles.verspätungLogRow}>
                <Text style={styles.verspätungLogMin}>{log.minutenVerspätet} Min.</Text>
                {log.grund && <Text style={styles.verspätungLogGrund}>„{log.grund}"</Text>}
                <Text style={styles.verspätungLogTime}>{formatTime(log.datum)}</Text>
              </View>
            </Swipeable>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Wette Card ───────────────────────────────────────────────────────────────

function WetteCard({
  wette,
  gegner,
  bettor,
  onGewonnen,
  onVerloren,
  onDelete,
}: {
  wette: Wette;
  gegner: MemberProfile | undefined;
  bettor?: MemberProfile;
  onGewonnen: () => void;
  onVerloren: () => void;
  onDelete: () => void;
}) {
  const isOffen = wette.gewonnen === undefined;
  const gewonnen = wette.gewonnen === true;
  const gegnerName = gegner ? displayName(gegner) : "Unbekannt";
  const bettorName = bettor ? (bettor.spitzname ?? bettor.name.split(" ")[0]) : undefined;

  return (
    <View style={[styles.wetteCard, gewonnen && styles.wetteCardGewonnen, !isOffen && !gewonnen && styles.wetteCardVerloren]}>
      <View style={styles.wetteCardHeader}>
        <View style={styles.wetteIconBox}>
          <Text style={{ fontSize: 18 }}>{isOffen ? "🤝" : gewonnen ? "✅" : "❌"}</Text>
        </View>
        <View style={styles.wetteInfo}>
          <Text style={styles.wetteTitel}>
            {bettorName ? `${bettorName} auf ${gegnerName}` : `Auf: ${gegnerName}`}
          </Text>
          <Text style={styles.wetteBetrag}>{formatBetrag(wette.betrag)}</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.wetteTime}>{formatTime(wette.loggedAt)}</Text>
          <TouchableOpacity onPress={onDelete} style={{ padding: 4, marginTop: 2 }}>
            <Ionicons name="trash-outline" size={14} color={COLORS.danger} />
          </TouchableOpacity>
        </View>
      </View>
      {isOffen && (
        <View style={styles.wetteActions}>
          <TouchableOpacity style={styles.wetteGewonnenBtn} onPress={onGewonnen}>
            <Ionicons name="checkmark" size={14} color={COLORS.success} />
            <Text style={styles.wetteGewonnenText}>Gewonnen</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.wetteVerlorenBtn} onPress={onVerloren}>
            <Ionicons name="close" size={14} color={COLORS.danger} />
            <Text style={styles.wetteVerlorenText}>Verloren</Text>
          </TouchableOpacity>
        </View>
      )}
      {!isOffen && (
        <TouchableOpacity onPress={onGewonnen} style={styles.wetteReopen}>
          <Text style={styles.wetteReopenText}>Ergebnis zurücksetzen</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function TerminDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activeMemberId } = useSession();

  const [termin, setTermin] = useState<StammtischTermin | null>(null);
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [verordnung, setVerordnung] = useState<StammtischVerordnung>({ name: "Mein Stammtisch", regeln: [] });
  const [protokoll, setProtokoll] = useState<Protokoll | null>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<"anwesenheit" | "strafen" | "spiel" | "wetten" | "agenda" | "protokoll">("anwesenheit");

  // Agenda
  const [agendaText, setAgendaText] = useState("");

  // Anwesenheit & Verspätung
  const [verspätungMap, setVerspätungMap] = useState<Record<string, VerspätungLog[]>>({});

  // Strafen
  const [strafMap, setStrafMap] = useState<Record<string, StrafLog[]>>({});
  const [strafMemberId, setStrafMemberId] = useState<string | null>(null);
  const [showStrafForm, setShowStrafForm] = useState(false);
  const [strafBetragOverride, setStrafBetragOverride] = useState("");
  const [strafNotiz, setStrafNotiz] = useState("");
  const [strafKategorie, setStrafKategorie] = useState<typeof STRAF_KATEGORIEN[number] | null>(null);

  // Edit form
  const [showEditForm, setShowEditForm] = useState(false);
  const [editTitel, setEditTitel] = useState("");
  const [editDatum, setEditDatum] = useState(new Date());
  const [editStartZeit, setEditStartZeit] = useState<Date | null>(null);
  const [editEndZeit, setEditEndZeit] = useState<Date | null>(null);
  const [editOrt, setEditOrt] = useState("");
  const [editNotizen, setEditNotizen] = useState("");
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [showEditStartZeit, setShowEditStartZeit] = useState(false);
  const [showEditEndZeit, setShowEditEndZeit] = useState(false);

  // Spiel (generisch)
  const [aktivesSpiel, setAktivesSpiel] = useState<Spiel | null>(null);
  const aktivesSpielRef = useRef<Spiel | null>(null);
  useEffect(() => { aktivesSpielRef.current = aktivesSpiel; }, [aktivesSpiel]);
  const [aktiveEreignisTypen, setAktiveEreignisTypen] = useState<SpielEreignisTyp[]>([]);
  const [spielLogMap, setSpielLogMap] = useState<Record<string, SpielLog[]>>({});
  const [selectedSpielMemberId, setSelectedSpielMemberId] = useState<string | null>(null);

  // Wetten
  const [wettenMap, setWettenMap] = useState<Record<string, Wette[]>>({});
  const [selectedWetteMemberId, setSelectedWetteMemberId] = useState<string | null>(null);
  const [showWetteForm, setShowWetteForm] = useState(false);
  const [wetteBetrag, setWetteBetrag] = useState("");
  const [wetteGegenId, setWetteGegenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      load();

      let hadDropped = false;
      const channel = subscribeToTerminChanges(
        id,
        {
          onSpielLogInsert: (log) => {
            if (aktivesSpielRef.current && log.spielId !== aktivesSpielRef.current.id) return;
            setSpielLogMap((prev) => dedupeInsert(prev, log, log.memberId));
          },
          onSpielLogDelete: (logId) => setSpielLogMap((prev) => removeByIdEverywhere(prev, logId)),
          onStrafLogInsert: (log) => setStrafMap((prev) => dedupeInsert(prev, log, log.memberId)),
          onStrafLogUpdate: (log) => setStrafMap((prev) => patchById(prev, log, log.memberId)),
          onStrafLogDelete: (logId) => setStrafMap((prev) => removeByIdEverywhere(prev, logId)),
          onVerspätungInsert: (log) => setVerspätungMap((prev) => dedupeInsert(prev, log, log.memberId)),
          onVerspätungDelete: (logId) => setVerspätungMap((prev) => removeByIdEverywhere(prev, logId)),
          onWetteInsert: (w) => setWettenMap((prev) => dedupeInsert(prev, w, w.memberId)),
          onWetteUpdate: (w) => setWettenMap((prev) => patchById(prev, w, w.memberId)),
          onWetteDelete: (wetteId) => setWettenMap((prev) => removeByIdEverywhere(prev, wetteId)),
          onTerminUpdate: (t) => setTermin((prev) => (prev ? { ...prev, ...t } : t)),
        },
        (status) => {
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            hadDropped = true;
          } else if (status === "SUBSCRIBED" && hadDropped) {
            hadDropped = false;
            load();
          }
        }
      );

      return () => { supabase.removeChannel(channel); };
    }, [id])
  );

  async function load() {
    const [termine, ms, v] = await Promise.all([loadTermine(), loadMembers(), loadVerordnung()]);
    const t = termine.find((x) => x.id === id) ?? null;
    setTermin(t);
    setMembers(ms);
    setVerordnung(v);
    if (!t || ms.length === 0) { setLoading(false); return; }

    const proto = await loadProtokoll(t.id);
    setProtokoll(proto);

    const agenda = await loadAgenda(t.id);
    setAgendaText(agenda);

    setSelectedSpielMemberId((prev) => prev ?? ms[0]?.id ?? null);
    setSelectedWetteMemberId((prev) => prev ?? ms[0]?.id ?? null);

    let spiel: Spiel | null = null;
    let ereignisTypen: SpielEreignisTyp[] = [];
    if (v.aktivesSpielId) {
      const alleSpiele = await loadSpiele();
      spiel = alleSpiele.find((s) => s.id === v.aktivesSpielId) ?? null;
      if (spiel) ereignisTypen = await loadEreignisTypen(spiel.id);
    }
    setAktivesSpiel(spiel);
    setAktiveEreignisTypen(ereignisTypen);

    const memberData = await Promise.all(ms.map(async (m) => ({
      memberId: m.id,
      verspätungen: (await loadVerspätungLogs(m.id)).filter((l) => l.terminId === t.id),
      spielLogs: (await loadSpielLogs(m.id)).filter((l) => l.terminId === t.id && (!spiel || l.spielId === spiel.id)),
      wetten: (await loadWetten(m.id)).filter((l) => l.terminId === t.id),
      strafLogs: (await loadStrafLogs(m.id)).filter((l) => l.terminId === t.id),
    })));

    const vMap: Record<string, VerspätungLog[]> = {};
    const spMap: Record<string, SpielLog[]> = {};
    const wMap: Record<string, Wette[]> = {};
    const stMap: Record<string, StrafLog[]> = {};
    memberData.forEach(({ memberId, verspätungen, spielLogs, wetten, strafLogs }) => {
      vMap[memberId] = verspätungen;
      spMap[memberId] = spielLogs;
      wMap[memberId] = wetten;
      stMap[memberId] = strafLogs;
    });
    setVerspätungMap(vMap);
    setSpielLogMap(spMap);
    setWettenMap(wMap);
    setStrafMap(stMap);
    setStrafMemberId((prev) => prev ?? ms[0]?.id ?? null);
    setLoading(false);
  }

  // ── Anwesenheit & Verspätung handlers ──────────────────────────────────────

  async function handleToggleAnwesenheit(memberId: string) {
    if (!termin) return;
    const updated = await toggleAnwesenheit(termin.id, memberId);
    setTermin((prev) => prev ? { ...prev, anwesenheit: updated } : prev);
  }

  async function handleAlleAnwesend() {
    if (!termin) return;
    const alleAnwesend = (termin.anwesenheit ?? []).length === members.length;
    const updated = alleAnwesend ? [] : members.map((m) => m.id);
    await setAnwesenheitAll(termin.id, updated);
    setTermin((prev) => prev ? { ...prev, anwesenheit: updated } : prev);
  }

  async function handleAddVerspätung(memberId: string, minuten: number, grund?: string) {
    if (!termin) return;
    const log = await addVerspätungLog(memberId, {
      datum: new Date().toISOString(),
      minutenVerspätet: minuten,
      grund,
      terminId: termin.id,
    });
    setVerspätungMap((prev) => ({ ...prev, [memberId]: [log, ...(prev[memberId] ?? [])] }));
  }

  async function handleDeleteVerspätung(memberId: string, logId: string) {
    await deleteVerspätungLog(memberId, logId);
    setVerspätungMap((prev) => ({
      ...prev,
      [memberId]: (prev[memberId] ?? []).filter((l) => l.id !== logId),
    }));
  }

  // ── Spiel handlers ──────────────────────────────────────────────────────────

  async function handleLogSpielEreignis(ereignisTypId: string) {
    if (!selectedSpielMemberId || !termin || !aktivesSpiel) return;
    const ereignisTyp = aktiveEreignisTypen.find((e) => e.id === ereignisTypId);
    if (!ereignisTyp) return;

    let strafLogId: string | undefined;
    if (ereignisTyp.strafKategorie) {
      const strafLog = await addStrafLog(selectedSpielMemberId, {
        kategorie: ereignisTyp.strafKategorie,
        betrag: ereignisTyp.strafBetrag ?? 0,
        terminId: termin.id,
        loggedAt: new Date().toISOString(),
        beglichen: false,
      });
      strafLogId = strafLog.id;
      setStrafMap((prev) => ({
        ...prev,
        [selectedSpielMemberId]: [strafLog, ...(prev[selectedSpielMemberId] ?? [])],
      }));
      await logActivity({
        actorMemberId: activeMemberId ?? undefined,
        subjectMemberId: selectedSpielMemberId,
        actionType: "straf_log_created",
        terminId: termin.id,
        refId: strafLog.id,
        meta: { kategorie: strafLog.kategorie, betrag: strafLog.betrag },
      });
    }

    const log = await addSpielLog(selectedSpielMemberId, {
      spielId: aktivesSpiel.id,
      ereignisTypId,
      terminId: termin.id,
      strafLogId,
      loggedAt: new Date().toISOString(),
    });
    setSpielLogMap((prev) => ({
      ...prev,
      [selectedSpielMemberId]: [log, ...(prev[selectedSpielMemberId] ?? [])],
    }));
    await logActivity({
      actorMemberId: activeMemberId ?? undefined,
      subjectMemberId: selectedSpielMemberId,
      actionType: "spiel_log_created",
      terminId: termin.id,
      refId: log.id,
      meta: {
        spielName: aktivesSpiel.name,
        spielEmoji: aktivesSpiel.emoji,
        ereignisLabel: ereignisTyp.label,
        ereignisEmoji: ereignisTyp.emoji,
      },
    });
  }

  async function handleDeleteSpielLog(memberId: string, logId: string) {
    const log = (spielLogMap[memberId] ?? []).find((l) => l.id === logId);
    const ereignisTyp = aktiveEreignisTypen.find((e) => e.id === log?.ereignisTypId);
    await deleteSpielLog(memberId, logId);
    setSpielLogMap((prev) => ({
      ...prev,
      [memberId]: (prev[memberId] ?? []).filter((l) => l.id !== logId),
    }));

    if (log?.strafLogId) {
      await deleteStrafLog(memberId, log.strafLogId);
      setStrafMap((prev) => ({
        ...prev,
        [memberId]: (prev[memberId] ?? []).filter((l) => l.id !== log.strafLogId),
      }));
      await logActivity({
        actorMemberId: activeMemberId ?? undefined,
        subjectMemberId: memberId,
        actionType: "straf_log_deleted",
        terminId: termin?.id,
        refId: log.strafLogId,
        meta: { kategorie: ereignisTyp?.strafKategorie, betrag: ereignisTyp?.strafBetrag ?? 0 },
      });
    }

    await logActivity({
      actorMemberId: activeMemberId ?? undefined,
      subjectMemberId: memberId,
      actionType: "spiel_log_deleted",
      terminId: termin?.id,
      refId: logId,
      meta: {
        spielName: aktivesSpiel?.name,
        spielEmoji: aktivesSpiel?.emoji,
        ereignisLabel: ereignisTyp?.label,
        ereignisEmoji: ereignisTyp?.emoji,
      },
    });
  }

  // ── Wetten handlers ─────────────────────────────────────────────────────────

  async function handleAddWette() {
    if (!selectedWetteMemberId || !wetteGegenId || !termin) {
      showAlert("Fehlt", "Bitte einen Gegner auswählen.");
      return;
    }
    const betrag = parseFloat(wetteBetrag.replace(",", "."));
    if (isNaN(betrag) || betrag <= 0) {
      showAlert("Ungültig", "Bitte einen gültigen Betrag eingeben.");
      return;
    }
    const w = await addWette(selectedWetteMemberId, {
      gegenMemberId: wetteGegenId,
      betrag,
      loggedAt: new Date().toISOString(),
      terminId: termin.id,
    });
    setWettenMap((prev) => ({
      ...prev,
      [selectedWetteMemberId]: [w, ...(prev[selectedWetteMemberId] ?? [])],
    }));
    await logActivity({
      actorMemberId: activeMemberId ?? undefined,
      subjectMemberId: selectedWetteMemberId,
      actionType: "wette_created",
      terminId: termin.id,
      refId: w.id,
      meta: { gegenMemberId: wetteGegenId, betrag: w.betrag },
    });
    setWetteBetrag("");
    setWetteGegenId(null);
    setShowWetteForm(false);
  }

  async function handleWetteErgebnis(memberId: string, wetteId: string, gewonnen: boolean | undefined) {
    await updateWette(memberId, wetteId, { gewonnen });
    setWettenMap((prev) => ({
      ...prev,
      [memberId]: (prev[memberId] ?? []).map((w) => w.id === wetteId ? { ...w, gewonnen } : w),
    }));
    if (gewonnen !== undefined) {
      const w = (wettenMap[memberId] ?? []).find((x) => x.id === wetteId);
      await logActivity({
        actorMemberId: activeMemberId ?? undefined,
        subjectMemberId: memberId,
        actionType: "wette_resolved",
        terminId: termin?.id,
        refId: wetteId,
        meta: { gewonnen, betrag: w?.betrag ?? 0 },
      });

      if (gewonnen === false && w) {
        const gegner = members.find((x) => x.id === w.gegenMemberId);
        const strafLog = await addStrafLog(memberId, {
          kategorie: "wette_verloren",
          betrag: w.betrag,
          notiz: gegner ? `gegen ${gegner.name}` : undefined,
          terminId: termin?.id,
          loggedAt: new Date().toISOString(),
          beglichen: false,
        });
        setStrafMap((prev) => ({
          ...prev,
          [memberId]: [strafLog, ...(prev[memberId] ?? [])],
        }));
        await logActivity({
          actorMemberId: activeMemberId ?? undefined,
          subjectMemberId: memberId,
          actionType: "straf_log_created",
          terminId: termin?.id,
          refId: strafLog.id,
          meta: { kategorie: strafLog.kategorie, betrag: strafLog.betrag, notiz: strafLog.notiz },
        });
      }
    }
  }

  async function handleDeleteWette(memberId: string, wetteId: string) {
    const w = (wettenMap[memberId] ?? []).find((x) => x.id === wetteId);
    await deleteWette(memberId, wetteId);
    setWettenMap((prev) => ({
      ...prev,
      [memberId]: (prev[memberId] ?? []).filter((x) => x.id !== wetteId),
    }));
    await logActivity({
      actorMemberId: activeMemberId ?? undefined,
      subjectMemberId: memberId,
      actionType: "wette_deleted",
      terminId: termin?.id,
      refId: wetteId,
      meta: { gegenMemberId: w?.gegenMemberId, betrag: w?.betrag ?? 0 },
    });
  }

  // ── Strafen handlers ────────────────────────────────────────────────────────

  function openStrafForm(memberId: string) {
    setStrafMemberId(memberId);
    setStrafKategorie(null);
    setStrafBetragOverride("");
    setStrafNotiz("");
    setShowStrafForm(true);
  }

  async function handleAddStraf() {
    if (!strafMemberId || !strafKategorie || !termin) return;
    const betrag = strafBetragOverride
      ? parseFloat(strafBetragOverride.replace(",", "."))
      : strafKategorie.betrag;
    if (isNaN(betrag) || betrag < 0) return;
    const log = await addStrafLog(strafMemberId, {
      kategorie: strafKategorie.key,
      betrag,
      notiz: strafNotiz.trim() || undefined,
      terminId: termin.id,
      loggedAt: new Date().toISOString(),
      beglichen: false,
    });
    setStrafMap((prev) => ({
      ...prev,
      [strafMemberId]: [log, ...(prev[strafMemberId] ?? [])],
    }));
    await logActivity({
      actorMemberId: activeMemberId ?? undefined,
      subjectMemberId: strafMemberId,
      actionType: "straf_log_created",
      terminId: termin.id,
      refId: log.id,
      meta: { kategorie: log.kategorie, betrag: log.betrag, notiz: log.notiz },
    });
    setStrafKategorie(null);
    setStrafBetragOverride("");
    setStrafNotiz("");
    setShowStrafForm(false);
  }

  async function handleToggleStrafBeglichen(memberId: string, logId: string, current: boolean) {
    await updateStrafLog(memberId, logId, { beglichen: !current });
    setStrafMap((prev) => ({
      ...prev,
      [memberId]: (prev[memberId] ?? []).map((l) => l.id === logId ? { ...l, beglichen: !current } : l),
    }));
    if (!current) {
      const log = (strafMap[memberId] ?? []).find((l) => l.id === logId);
      const member = members.find((m) => m.id === memberId);
      const kat = STRAF_KATEGORIEN.find((k) => k.key === log?.kategorie);
      await addKassenEintrag({
        typ: "einnahme",
        betrag: log?.betrag ?? 0,
        beschreibung: `Strafe beglichen: ${member?.name ?? "Unbekannt"} – ${kat?.label ?? log?.kategorie ?? ""}`,
        terminId: termin?.id,
        datum: new Date().toISOString(),
      });
      await logActivity({
        actorMemberId: activeMemberId ?? undefined,
        subjectMemberId: memberId,
        actionType: "straf_log_beglichen",
        terminId: termin?.id,
        refId: logId,
        meta: { betrag: log?.betrag ?? 0 },
      });
    }
  }

  async function handleDeleteStraf(memberId: string, logId: string) {
    const log = (strafMap[memberId] ?? []).find((l) => l.id === logId);
    await deleteStrafLog(memberId, logId);
    setStrafMap((prev) => ({
      ...prev,
      [memberId]: (prev[memberId] ?? []).filter((l) => l.id !== logId),
    }));
    await logActivity({
      actorMemberId: activeMemberId ?? undefined,
      subjectMemberId: memberId,
      actionType: "straf_log_deleted",
      terminId: termin?.id,
      refId: logId,
      meta: { kategorie: log?.kategorie, betrag: log?.betrag ?? 0 },
    });
  }

  // ── Termin handlers ─────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!termin) return;
    showAlert("Termin löschen?", "Dieser Termin wird unwiderruflich gelöscht.", [
      { text: "Abbrechen", style: "cancel" },
      {
        text: "Löschen", style: "destructive", onPress: async () => {
          await deleteTermin(termin.id);
          router.back();
        },
      },
    ]);
  }

  // ── Edit handler ────────────────────────────────────────────────────────────

  function openEditForm() {
    if (!termin) return;
    setEditTitel(termin.titel ?? "");
    setEditDatum(new Date((termin.datum) + "T00:00:00"));
    setEditStartZeit(termin.startZeit ? parseTimeString(termin.startZeit) : null);
    setEditEndZeit(termin.endZeit ? parseTimeString(termin.endZeit) : null);
    setEditOrt(termin.ort ?? "");
    setEditNotizen(termin.notizen ?? "");
    setShowEditForm(true);
  }

  function localIso(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  async function handleSaveEdit() {
    if (!termin) return;
    await updateTermin(termin.id, {
      titel: editTitel.trim() || undefined,
      datum: localIso(editDatum),
      startZeit: editStartZeit ? toTimeString(editStartZeit) : undefined,
      endZeit: editEndZeit ? toTimeString(editEndZeit) : undefined,
      ort: editOrt.trim() || undefined,
      notizen: editNotizen.trim() || undefined,
    });
    const updated = await loadTermine();
    const fresh = updated.find((t) => t.id === termin.id) ?? null;
    if (fresh) setTermin(fresh);
    setShowEditForm(false);
  }

  // ── RSVP handler ────────────────────────────────────────────────────────────

  async function handleRsvp(status: "ja" | "nein" | null) {
    if (!termin || !activeMemberId) return;
    await setRsvpStatus(termin.id, activeMemberId, status);
    const updated = await loadTermine();
    const fresh = updated.find((t) => t.id === termin.id) ?? null;
    if (fresh) setTermin(fresh);
    if (status === "ja" || status === "nein") {
      await logActivity({
        actorMemberId: activeMemberId,
        subjectMemberId: activeMemberId,
        actionType: status === "ja" ? "termin_zusage" : "termin_absage",
        terminId: termin.id,
        meta: { terminDatum: termin.datum, terminTitel: termin.titel, terminArt: termin.art },
      });
    }
  }

  // ── Loading / Not found ─────────────────────────────────────────────────────

  if (loading) return <LoadingSpinner />;

  if (!termin) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Termin nicht gefunden.</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ color: COLORS.blue, marginTop: 12, fontWeight: "600" }}>Zurück</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Derived values ──────────────────────────────────────────────────────────

  const isStammtisch = termin.art === "stammtisch";
  const anwesenheit = termin.anwesenheit ?? [];
  const absagenIds = termin.absagen ?? [];
  const anwesendCount = anwesenheit.length;
  const myRsvp = activeMemberId
    ? anwesenheit.includes(activeMemberId) ? "ja"
    : absagenIds.includes(activeMemberId) ? "nein"
    : null
    : null;
  const offenIds = members
    .map((m) => m.id)
    .filter((mid) => !anwesenheit.includes(mid) && !absagenIds.includes(mid));
  const membersForAnwesenheit = activeMemberId
    ? [...members].sort((a, b) => (a.id === activeMemberId ? -1 : b.id === activeMemberId ? 1 : 0))
    : members;

  const totalVerspätung = Object.values(verspätungMap).flat().reduce((s, l) => s + l.minutenVerspätet, 0);
  const allSpielLogs = Object.values(spielLogMap).flat();
  const selMember = members.find((m) => m.id === selectedSpielMemberId);
  const selSpielLogs = spielLogMap[selectedSpielMemberId ?? ""] ?? [];
  const selWetteMember = members.find((m) => m.id === selectedWetteMemberId);
  const selWetten = wettenMap[selectedWetteMemberId ?? ""] ?? [];
  const offeneWetten = selWetten.filter((w) => w.gewonnen === undefined);
  const otherMembers = members.filter((m) => m.id !== selectedWetteMemberId);

  const spielFeed = Object.entries(spielLogMap)
    .flatMap(([memberId, logs]) => logs.map((l) => ({ ...l, memberId })))
    .sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime());

  const wettenFeed = Object.entries(wettenMap)
    .flatMap(([memberId, wetten]) => wetten.map((w) => ({ ...w, memberId })))
    .sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime());

  const strafSelMember = members.find((m) => m.id === strafMemberId);
  const allStrafLogs = Object.entries(strafMap)
    .flatMap(([memberId, logs]) => logs.map((l) => ({ ...l, memberId })))
    .sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime());
  const totalStrafOffen = allStrafLogs.filter((l) => !l.beglichen).reduce((s, l) => s + l.betrag, 0);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Back */}
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color={COLORS.blue} />
            <Text style={styles.backText}>Kalender</Text>
          </TouchableOpacity>

          {/* ── Header card ── */}
          <View style={styles.headerCard}>
            <View style={styles.headerTop}>
              <View style={[styles.typIcon, { backgroundColor: isStammtisch ? COLORS.blue + "18" : "#6B3A8A18" }]}>
                {isStammtisch && verordnung.logoUrl ? (
                  <Image source={{ uri: verordnung.logoUrl }} style={styles.typLogo} resizeMode="contain" />
                ) : (
                  <Text style={{ fontSize: 28 }}>{isStammtisch ? "🍺" : "🎉"}</Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.terminTitel}>
                  {termin.titel ?? (isStammtisch ? "Stammtisch" : "Veranstaltung")}
                </Text>
                <Text style={styles.terminDatum}>{formatDatum(termin.datum)}</Text>
                {(termin.startZeit || termin.ort) && (
                  <Text style={styles.terminMeta}>
                    {termin.startZeit ? `⏰ ${termin.startZeit}${termin.endZeit ? ` – ${termin.endZeit}` : ""}` : ""}
                    {termin.startZeit && termin.ort ? "   " : ""}
                    {termin.ort ? `📍 ${termin.ort}` : ""}
                  </Text>
                )}
                {termin.startedAt && termin.endedAt && (
                  <Text style={styles.terminMeta}>Dauer: {duration(termin.startedAt, termin.endedAt)}</Text>
                )}
              </View>
              <View style={{ alignItems: "flex-end", gap: 8 }}>
                <TouchableOpacity onPress={handleDelete} style={{ padding: 4 }}>
                  <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => showEditForm ? setShowEditForm(false) : openEditForm()}
                  style={[styles.editBtn, showEditForm && styles.editBtnActive]}
                >
                  <Ionicons name={showEditForm ? "close" : "pencil-outline"} size={14} color={showEditForm ? "#FFF" : COLORS.blue} />
                </TouchableOpacity>
              </View>
            </View>
            {termin.notizen ? <Text style={styles.terminNotizen}>{termin.notizen}</Text> : null}
          </View>

          {/* ── Edit Form ── */}
          {showEditForm && (
            <View style={styles.editFormCard}>
              <Text style={styles.editFormTitle}>Termin bearbeiten</Text>

              {termin.art !== "stammtisch" && (
                <>
                  <Text style={styles.editLabel}>Titel</Text>
                  <TextInput
                    style={styles.editInput}
                    value={editTitel}
                    onChangeText={setEditTitel}
                    placeholder="Titel"
                    placeholderTextColor={COLORS.textLight}
                  />
                </>
              )}

              <Text style={styles.editLabel}>Datum</Text>
              <TouchableOpacity style={styles.editDateBtn} onPress={() => setShowEditDatePicker(true)}>
                <Ionicons name="calendar-outline" size={15} color={COLORS.blue} />
                <Text style={styles.editDateBtnText}>
                  {editDatum.toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}
                </Text>
              </TouchableOpacity>
              {showEditDatePicker && (
                <InlineDateTimePicker
                  value={editDatum}
                  mode="date"
                  onChange={setEditDatum}
                  onClose={() => setShowEditDatePicker(false)}
                />
              )}

              <View style={styles.editRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.editLabel}>Von</Text>
                  <TouchableOpacity style={styles.editDateBtn} onPress={() => setShowEditStartZeit(true)}>
                    <Ionicons name="time-outline" size={15} color={COLORS.blue} />
                    <Text style={[styles.editDateBtnText, { color: editStartZeit ? COLORS.textDark : COLORS.textLight }]}>
                      {editStartZeit ? toTimeString(editStartZeit) : "optional"}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.editLabel}>Bis</Text>
                  <TouchableOpacity style={styles.editDateBtn} onPress={() => setShowEditEndZeit(true)}>
                    <Ionicons name="time-outline" size={15} color={COLORS.blue} />
                    <Text style={[styles.editDateBtnText, { color: editEndZeit ? COLORS.textDark : COLORS.textLight }]}>
                      {editEndZeit ? toTimeString(editEndZeit) : "optional"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              {showEditStartZeit && (
                <InlineDateTimePicker
                  value={editStartZeit ?? parseTimeString("19:30")}
                  mode="time"
                  is24Hour
                  onChange={setEditStartZeit}
                  onClose={() => setShowEditStartZeit(false)}
                />
              )}
              {showEditEndZeit && (
                <InlineDateTimePicker
                  value={editEndZeit ?? parseTimeString("23:00")}
                  mode="time"
                  is24Hour
                  onChange={setEditEndZeit}
                  onClose={() => setShowEditEndZeit(false)}
                />
              )}

              <Text style={styles.editLabel}>Ort</Text>
              <TextInput
                style={styles.editInput}
                value={editOrt}
                onChangeText={setEditOrt}
                placeholder="z. B. Augustiner, hinten links"
                placeholderTextColor={COLORS.textLight}
              />

              <Text style={styles.editLabel}>Notizen</Text>
              <TextInput
                style={[styles.editInput, { minHeight: 64 }]}
                value={editNotizen}
                onChangeText={setEditNotizen}
                placeholder="Hinweise zum Abend…"
                placeholderTextColor={COLORS.textLight}
                multiline
                textAlignVertical="top"
              />

              <TouchableOpacity style={styles.editSaveBtn} onPress={handleSaveEdit} activeOpacity={0.85}>
                <Ionicons name="checkmark" size={16} color="#FFF" />
                <Text style={styles.editSaveBtnText}>Speichern</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Tabs ── */}
          <View style={styles.tabBar}>
            {([
              { key: "anwesenheit", label: "Anwes.", emoji: "👥" },
              { key: "strafen", label: "Strafen", emoji: "💰" },
              ...(aktivesSpiel ? [{ key: "spiel", label: aktivesSpiel.name, emoji: aktivesSpiel.emoji ?? "🎮" }] : []),
              { key: "wetten", label: "Wetten", emoji: "🤝" },
              { key: "agenda", label: "Agenda", emoji: "📋" },
              { key: "protokoll", label: "Protokoll", emoji: "📝" },
            ] as { key: typeof activeTab; label: string; emoji: string }[]).map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                  onPress={() => setActiveTab(tab.key)}
                >
                  <Text style={{ fontSize: 15 }}>{tab.emoji}</Text>
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
                  <Text style={[styles.anwesenheitStatBarNum, { color: COLORS.success }]}>{anwesendCount}</Text>
                  <Text style={styles.anwesenheitStatBarLabel}>Zusagen</Text>
                </View>
                <View style={styles.anwesenheitStatDivider} />
                <View style={styles.anwesenheitStatBarItem}>
                  <Text style={[styles.anwesenheitStatBarNum, { color: COLORS.danger }]}>{absagenIds.length}</Text>
                  <Text style={styles.anwesenheitStatBarLabel}>Absagen</Text>
                </View>
                <View style={styles.anwesenheitStatDivider} />
                <View style={styles.anwesenheitStatBarItem}>
                  <Text style={[styles.anwesenheitStatBarNum, { color: COLORS.textMuted }]}>{offenIds.length}</Text>
                  <Text style={styles.anwesenheitStatBarLabel}>Offen</Text>
                </View>
                {totalVerspätung > 0 && (
                  <>
                    <View style={styles.anwesenheitStatDivider} />
                    <View style={styles.anwesenheitStatBarItem}>
                      <Text style={[styles.anwesenheitStatBarNum, { color: COLORS.danger, fontSize: 14 }]}>{totalVerspätung}</Text>
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
                    isActiveUser={m.id === activeMemberId}
                    onToggle={() => handleToggleAnwesenheit(m.id)}
                    onRsvp={(status) => handleRsvp(status)}
                    onAddVerspätung={(min, g) => handleAddVerspätung(m.id, min, g)}
                    onDeleteVerspätung={(lid) => handleDeleteVerspätung(m.id, lid)}
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
                  <Text style={[styles.sectionBadge, { color: COLORS.danger, backgroundColor: COLORS.danger + "12" }]}>
                    {totalStrafOffen.toLocaleString("de-DE", { minimumFractionDigits: 2 })} € offen
                  </Text>
                )}
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={styles.chipsContent}>
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
                          <Text style={{ fontSize: 11, fontWeight: "700", color: "#FFF" }}>{getInitial(m.name)}</Text>
                        </View>
                      )}
                      <Text style={[styles.chipText, isSelected && { color: "#FFFFFF" }]}>{m.spitzname ?? m.name.split(" ")[0]}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {strafMemberId && (
                <>
                  <View style={styles.strafGrid}>
                    {STRAF_KATEGORIEN.map((kat) => {
                      const isSelected = strafKategorie?.key === kat.key;
                      return (
                        <TouchableOpacity
                          key={kat.key}
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
                          <Text style={[styles.strafKatLabel, isSelected && { color: "#FFFFFF" }]} numberOfLines={2}>{kat.label}</Text>
                          {kat.betrag > 0 && (
                            <Text style={[styles.strafKatBetrag, isSelected && { color: "rgba(255,255,255,0.85)" }]}>
                              {kat.betrag.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
                            </Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>

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
                            placeholderTextColor={COLORS.textLight}
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
                            placeholderTextColor={COLORS.textLight}
                          />
                        </View>
                      </View>
                      <TouchableOpacity style={styles.strafSubmitBtn} onPress={handleAddStraf} activeOpacity={0.8}>
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                        <Text style={styles.strafSubmitText}>Strafe eintragen</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}

              {allStrafLogs.length > 0 && (
                <>
                  <Text style={styles.subSectionLabel}>📋 Strafen dieses Abends</Text>
                  {allStrafLogs.map((log) => {
                    const m = members.find((x) => x.id === log.memberId);
                    const kat = STRAF_KATEGORIEN.find((k) => k.key === log.kategorie);
                    return (
                      <Swipeable
                        key={log.id}
                        renderRightActions={() => (
                          <TouchableOpacity style={styles.deleteSwipeSmall} onPress={() => handleDeleteStraf(log.memberId, log.id)}>
                            <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
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
                            <Text style={[styles.strafFeedBetrag, log.beglichen && { textDecorationLine: "line-through", color: COLORS.textLight }]}>
                              {log.betrag.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
                            </Text>
                            <TouchableOpacity
                              onPress={() => handleToggleStrafBeglichen(log.memberId, log.id, log.beglichen)}
                              style={styles.strafBegleichenBtn}
                            >
                              <Ionicons
                                name={log.beglichen ? "checkmark-circle" : "ellipse-outline"}
                                size={20}
                                color={log.beglichen ? COLORS.success : COLORS.border}
                              />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </Swipeable>
                    );
                  })}
                </>
              )}
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

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipsScroll}
                contentContainerStyle={styles.chipsContent}
              >
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
                          <Text style={{ fontSize: 11, fontWeight: "700", color: "#FFF" }}>
                            {getInitial(m.name)}
                          </Text>
                        </View>
                      )}
                      <Text style={[styles.chipText, isSelected && { color: "#FFFFFF" }]}>
                        {m.spitzname ?? m.name.split(" ")[0]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {selMember && (
                <>
                  <View style={styles.spielStatsRow}>
                    {aktiveEreignisTypen.map((et) => (
                      <View key={et.id} style={styles.spielStatBox}>
                        <Text style={styles.spielStatEmoji}>{et.emoji ?? "🎯"}</Text>
                        <Text style={styles.spielStatValue}>
                          {selSpielLogs.filter((l) => l.ereignisTypId === et.id).length}
                        </Text>
                        <Text style={styles.spielStatLabel} numberOfLines={1}>{et.label}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.spielActionRow}>
                    {aktiveEreignisTypen.map((et) => (
                      <TouchableOpacity key={et.id} style={styles.spielActionBtn} onPress={() => handleLogSpielEreignis(et.id)}>
                        <Text style={styles.schockActionEmoji}>{et.emoji ?? "🎯"}</Text>
                        <Text style={styles.spielActionLabel} numberOfLines={1}>{et.label}</Text>
                        <View style={styles.plusBadge}><Text style={styles.plusText}>+1</Text></View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {spielFeed.length > 0 && (
                <>
                  <Text style={styles.subSectionLabel}>📋 {aktivesSpiel.name}-Verlauf dieses Abends</Text>
                  {spielFeed.map((log) => {
                    const m = members.find((x) => x.id === log.memberId);
                    const et = aktiveEreignisTypen.find((e) => e.id === log.ereignisTypId);
                    return (
                      <Swipeable
                        key={log.id}
                        renderRightActions={() => (
                          <TouchableOpacity
                            style={styles.deleteSwipeSmall}
                            onPress={() => handleDeleteSpielLog(log.memberId, log.id)}
                          >
                            <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
                          </TouchableOpacity>
                        )}
                      >
                        <View style={styles.schockFeedRow}>
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

          {/* ── Tab: Wetten ── */}
          {activeTab === "wetten" && members.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>🤝 Wetten</Text>
                {offeneWetten.length > 0 && (
                  <Text style={styles.sectionBadge}>{offeneWetten.length} offen</Text>
                )}
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipsScroll}
                contentContainerStyle={styles.chipsContent}
              >
                {members.map((m) => {
                  const isSelected = m.id === selectedWetteMemberId;
                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.chip, isSelected && { backgroundColor: m.avatarColor, borderColor: m.avatarColor }]}
                      onPress={() => { setSelectedWetteMemberId(m.id); setShowWetteForm(false); }}
                    >
                      {m.photoUri ? (
                        <Image source={{ uri: m.photoUri }} style={styles.chipAvatar} />
                      ) : (
                        <View style={[styles.chipAvatar, {
                          backgroundColor: isSelected ? "rgba(255,255,255,0.35)" : m.avatarColor,
                          alignItems: "center", justifyContent: "center",
                        }]}>
                          <Text style={{ fontSize: 11, fontWeight: "700", color: "#FFF" }}>
                            {getInitial(m.name)}
                          </Text>
                        </View>
                      )}
                      <Text style={[styles.chipText, isSelected && { color: "#FFFFFF" }]}>
                        {m.spitzname ?? m.name.split(" ")[0]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {selWetteMember && (
                <TouchableOpacity
                  style={[styles.wetteToggleBtn, showWetteForm && { backgroundColor: COLORS.blue }]}
                  onPress={() => setShowWetteForm((v) => !v)}
                >
                  <Ionicons name={showWetteForm ? "close" : "add"} size={16} color={showWetteForm ? "#FFFFFF" : COLORS.gold} />
                  <Text style={[styles.wetteToggleText, showWetteForm && { color: "#FFFFFF" }]}>
                    {showWetteForm ? "Abbrechen" : "Wette einloggen"}
                  </Text>
                </TouchableOpacity>
              )}

              {showWetteForm && selWetteMember && (
                <View style={styles.wetteForm}>
                  <Text style={styles.wetteFormTitle}>🤝 Neue Wette — {selWetteMember.name}</Text>
                  <View style={styles.betragRow}>
                    <TextInput
                      style={styles.betragInput}
                      value={wetteBetrag}
                      onChangeText={setWetteBetrag}
                      placeholder="5,00"
                      placeholderTextColor={COLORS.textLight}
                      keyboardType="decimal-pad"
                      autoFocus
                    />
                    <Text style={styles.betragLabel}>€</Text>
                  </View>
                  <Text style={styles.wetteFormSubtitle}>Wettet auf:</Text>
                  <View style={styles.gegnerGrid}>
                    {otherMembers.map((m) => (
                      <TouchableOpacity
                        key={m.id}
                        style={[styles.gegnerChip, wetteGegenId === m.id && { backgroundColor: m.avatarColor, borderColor: m.avatarColor }]}
                        onPress={() => setWetteGegenId(m.id)}
                      >
                        <View style={[styles.gegnerDot, { backgroundColor: wetteGegenId === m.id ? "rgba(255,255,255,0.5)" : m.avatarColor }]} />
                        <Text style={[styles.gegnerText, wetteGegenId === m.id && { color: "#FFFFFF" }]}>
                          {m.spitzname ?? m.name.split(" ")[0]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity style={styles.wetteSubmitBtn} onPress={handleAddWette}>
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    <Text style={styles.wetteSubmitText}>Wette aufnehmen</Text>
                  </TouchableOpacity>
                </View>
              )}

              {wettenFeed.length > 0 && (
                <>
                  <Text style={styles.subSectionLabel}>📋 Wetten-Verlauf dieses Abends</Text>
                  {wettenFeed.map((w) => (
                    <WetteCard
                      key={w.id}
                      wette={w}
                      gegner={members.find((m) => m.id === w.gegenMemberId)}
                      bettor={members.find((m) => m.id === w.memberId)}
                      onGewonnen={() => handleWetteErgebnis(w.memberId, w.id, w.gewonnen === undefined ? true : undefined)}
                      onVerloren={() => handleWetteErgebnis(w.memberId, w.id, w.gewonnen === undefined ? false : undefined)}
                      onDelete={() => handleDeleteWette(w.memberId, w.id)}
                    />
                  ))}
                </>
              )}
            </>
          )}

          {/* ── Tab: Agenda ── */}
          {activeTab === "agenda" && (
            <View style={styles.protokollCard}>
              <View style={styles.protokollHeader}>
                <Ionicons name="list-outline" size={18} color={COLORS.gold} />
                <Text style={[styles.protokollTitel, { color: COLORS.gold }]}>Agenda</Text>
              </View>
              <TextInput
                style={styles.agendaInput}
                value={agendaText}
                onChangeText={(t) => { setAgendaText(t); saveAgenda(id, t); }}
                placeholder={"Punkte für heute Abend...\n- Thema 1\n- Thema 2"}
                placeholderTextColor={COLORS.textLight}
                multiline
                textAlignVertical="top"
              />
            </View>
          )}

          {/* ── Tab: Protokoll ── */}
          {activeTab === "protokoll" && (
              <TouchableOpacity
                style={styles.protokollCard}
                onPress={() => router.push(`/protokoll/${id}`)}
                activeOpacity={0.88}
              >
                {protokoll ? (
                  <>
                    <View style={styles.protokollHeader}>
                      <Ionicons name="document-text" size={18} color={COLORS.blue} />
                      <Text style={styles.protokollTitel} numberOfLines={1}>
                        {protokoll.titel || "Protokoll"}
                      </Text>
                      <Ionicons name="pencil-outline" size={15} color={COLORS.textMuted} />
                    </View>
                    <Text style={styles.protokollExcerpt} numberOfLines={8}>{protokoll.inhalt}</Text>
                  </>
                ) : (
                  <View style={styles.protokollLeer}>
                    <View style={styles.protokollLeerIcon}>
                      <Ionicons name="document-text-outline" size={28} color={COLORS.textLight} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.protokollLeerTitle}>Protokoll schreiben</Text>
                      <Text style={styles.protokollLeerSub}>Notizen, Beschlüsse, Ereignisse</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
                  </View>
                )}
              </TouchableOpacity>
          )}

        </ScrollView>
      </SafeAreaView>
      </KeyboardAvoidingView>
    </GestureHandlerRootView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, paddingBottom: 60 },

  backBtn: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 16 },
  backText: { fontSize: 15, color: COLORS.blue, fontWeight: "600" },

  headerCard: {
    backgroundColor: COLORS.card, borderRadius: 20, padding: 16, marginBottom: 20,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.card,
  },
  headerTop: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  typIcon: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  typLogo: { width: 36, height: 36 },
  terminTitel: { fontSize: 18, fontWeight: "800", color: COLORS.textDark, marginBottom: 3 },
  terminDatum: { fontSize: 13, color: COLORS.blue, fontWeight: "600", marginBottom: 4 },
  terminMeta: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  terminNotizen: {
    fontSize: 13, color: COLORS.textMuted, fontStyle: "italic",
    marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  tabBar: {
    flexDirection: "row", backgroundColor: COLORS.card,
    borderRadius: 14, padding: 4, marginBottom: 16,
    borderWidth: 1, borderColor: COLORS.border,
  },
  tabBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center", gap: 2,
  },
  tabBtnActive: { backgroundColor: COLORS.blue },
  tabBtnText: { fontSize: 10, fontWeight: "600", color: COLORS.textMuted },
  tabBtnTextActive: { color: "#FFFFFF", fontWeight: "700" },

  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  sectionHeaderRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: COLORS.textDark, letterSpacing: -0.2 },
  sectionBadge: {
    fontSize: 12, fontWeight: "700", color: COLORS.blue,
    backgroundColor: COLORS.blue + "12", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10,
  },
  alleBtn: {
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10,
    backgroundColor: COLORS.success + "15", borderWidth: 1, borderColor: COLORS.success + "44",
  },
  alleBtnText: { fontSize: 12, fontWeight: "700", color: COLORS.success },
  subSectionLabel: {
    fontSize: 11, fontWeight: "800", color: COLORS.textMuted, textTransform: "uppercase",
    letterSpacing: 0.5, marginTop: 12, marginBottom: 8,
  },

  anwesenheitStatDivider: { width: 1, height: 28, backgroundColor: COLORS.border },

  // ── Active user row ──────────────────────────────────────────────────────
  memberRowSelf: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 14, marginBottom: 10,
    borderWidth: 1.5, borderColor: COLORS.blue + "44", ...SHADOWS.light,
  },
  memberRowSelfJa: { borderColor: COLORS.success + "66", backgroundColor: "#F4FBF6" },
  memberRowSelfNein: { borderColor: COLORS.danger + "44", backgroundColor: "#FEF6F6" },
  memberRowSelfLabel: {
    fontSize: 10, fontWeight: "800", color: COLORS.textLight,
    textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8,
  },
  selfRsvpRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  selfRsvpBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 11, borderRadius: 12,
    backgroundColor: COLORS.background, borderWidth: 1.5, borderColor: COLORS.border,
  },
  selfRsvpBtnJa: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  selfRsvpBtnNein: { backgroundColor: COLORS.danger, borderColor: COLORS.danger },
  selfRsvpBtnText: { fontSize: 14, fontWeight: "700", color: COLORS.textDark },

  // ── Compact rows (other members) ─────────────────────────────────────────
  memberRowCompact: {
    backgroundColor: COLORS.card, borderRadius: 12, marginBottom: 5,
    borderWidth: 1, borderColor: COLORS.border,
    overflow: "hidden",
  },
  memberRowCompactJa: { borderColor: COLORS.success + "44" },
  memberRowCompactNein: { borderColor: COLORS.danger + "33" },
  memberRowCompactInner: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9, paddingRight: 10 },
  memberRowCompactBar: { width: 3, alignSelf: "stretch" },
  memberAvatarSmall: { width: 32, height: 32, borderRadius: 16 },
  memberAvatarLetterSmall: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },
  memberInfoCompact: { flex: 1 },
  memberNameCompact: { fontSize: 13, fontWeight: "600", color: COLORS.textDark },
  memberVerspätungSmall: { fontSize: 11, color: COLORS.danger, marginTop: 1, fontWeight: "600" },

  // RSVP pill for compact rows
  rsvpPill: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
    backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border,
  },
  rsvpPillJa: { backgroundColor: COLORS.success + "12", borderColor: COLORS.success + "44" },
  rsvpPillNein: { backgroundColor: COLORS.danger + "10", borderColor: COLORS.danger + "33" },
  rsvpPillText: { fontSize: 11, fontWeight: "700" },

  // ── Shared member row parts ───────────────────────────────────────────────
  memberRowHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  memberAvatar: { width: 44, height: 44, borderRadius: 22 },
  memberAvatarLetter: { fontSize: 18, fontWeight: "700", color: "#FFFFFF" },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 15, fontWeight: "700", color: COLORS.textDark },
  memberVerspätung: { fontSize: 12, color: COLORS.danger, marginTop: 2, fontWeight: "600" },
  memberActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  verspätungBtn: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: "#FFF0F0",
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: COLORS.danger + "44",
  },
  verspätungBtnSmall: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: "#FFF0F0",
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: COLORS.danger + "33",
  },
  verspätungBtnActive: { backgroundColor: COLORS.danger },
  verspätungForm: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  verspätungInputRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  minutenInput: {
    width: 70, backgroundColor: COLORS.background, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 8,
    fontSize: 16, fontWeight: "700", color: COLORS.textDark, textAlign: "center",
  },
  minutenLabel: { fontSize: 14, color: COLORS.textMuted },
  grundInput: {
    backgroundColor: COLORS.background, borderRadius: 10, borderWidth: 1,
    borderColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 8,
    fontSize: 14, color: COLORS.textDark, marginBottom: 8,
  },
  eintragenBtn: { backgroundColor: COLORS.danger, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  eintragenBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  verspätungLogs: { marginTop: 10, gap: 4 },
  verspätungLogRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#FFF5F5", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7,
  },
  verspätungLogMin: { fontSize: 13, fontWeight: "700", color: COLORS.danger, minWidth: 52 },
  verspätungLogGrund: { flex: 1, fontSize: 12, color: COLORS.textMuted, fontStyle: "italic" },
  verspätungLogTime: { fontSize: 12, color: COLORS.textLight },

  chipsScroll: { marginBottom: 12 },
  chipsContent: { gap: 8, paddingRight: 4 },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 7,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: COLORS.border,
  },
  chipAvatar: { width: 22, height: 22, borderRadius: 11 },
  chipText: { fontSize: 13, fontWeight: "600", color: COLORS.textDark },

  spielStatsRow: { flexDirection: "row", gap: 10, marginBottom: 12, flexWrap: "wrap" },
  spielStatBox: {
    flex: 1, minWidth: 76, alignItems: "center", paddingVertical: 12,
    backgroundColor: COLORS.card, borderRadius: 14,
    borderWidth: 1.5, borderColor: COLORS.blue + "22", gap: 2, ...SHADOWS.light,
  },
  spielStatEmoji: { fontSize: 20 },
  spielStatValue: { fontSize: 20, fontWeight: "800", color: COLORS.blue },
  spielStatLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: "600" },

  spielActionRow: { flexDirection: "row", gap: 10, marginBottom: 10, flexWrap: "wrap" },
  spielActionBtn: {
    flex: 1, minWidth: 100, alignItems: "center", paddingVertical: 14, borderRadius: 14,
    backgroundColor: COLORS.blue + "10", borderWidth: 1.5, borderColor: COLORS.blue + "44", gap: 4,
  },
  spielActionLabel: { fontSize: 13, fontWeight: "700", color: COLORS.blue },
  schockActionEmoji: { fontSize: 26 },
  plusBadge: { backgroundColor: COLORS.blue + "18", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  plusText: { fontSize: 12, fontWeight: "700", color: COLORS.blue },

  wetteToggleBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 10, borderRadius: 12, marginBottom: 12,
    backgroundColor: COLORS.goldBg, borderWidth: 1.5, borderColor: COLORS.gold + "44",
  },
  wetteToggleText: { fontSize: 13, fontWeight: "700", color: COLORS.gold },
  wetteForm: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.light,
  },
  wetteFormTitle: { fontSize: 14, fontWeight: "800", color: COLORS.textDark, marginBottom: 12 },
  wetteFormSubtitle: {
    fontSize: 11, fontWeight: "700", color: COLORS.textMuted,
    textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8,
  },
  betragRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  betragInput: {
    flex: 1, backgroundColor: COLORS.background, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 20, fontWeight: "800", color: COLORS.textDark, textAlign: "right",
  },
  betragLabel: { fontSize: 20, fontWeight: "700", color: COLORS.textMid },
  gegnerGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  gegnerChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    backgroundColor: COLORS.background, borderWidth: 1.5, borderColor: COLORS.border,
  },
  gegnerDot: { width: 10, height: 10, borderRadius: 5 },
  gegnerText: { fontSize: 13, fontWeight: "600", color: COLORS.textDark },
  wetteSubmitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: COLORS.gold, borderRadius: 12, paddingVertical: 12,
  },
  wetteSubmitText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },

  wetteCard: {
    backgroundColor: COLORS.card, borderRadius: 14, padding: 12, marginBottom: 8,
    borderWidth: 1.5, borderColor: "#6B3A8A33", ...SHADOWS.light,
  },
  wetteCardGewonnen: { borderColor: COLORS.success + "66", backgroundColor: "#F5FDF8" },
  wetteCardVerloren: { borderColor: COLORS.danger + "44", backgroundColor: "#FFF5F5" },
  wetteCardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  wetteIconBox: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.background,
    alignItems: "center", justifyContent: "center",
  },
  wetteInfo: { flex: 1 },
  wetteTitel: { fontSize: 13, fontWeight: "700", color: COLORS.textDark },
  wetteBetrag: { fontSize: 12, color: COLORS.gold, fontWeight: "700", marginTop: 2 },
  wetteTime: { fontSize: 11, color: COLORS.textLight },
  wetteActions: { flexDirection: "row", gap: 8, marginTop: 10 },
  wetteGewonnenBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5,
    paddingVertical: 7, borderRadius: 10,
    backgroundColor: COLORS.success + "15", borderWidth: 1, borderColor: COLORS.success + "44",
  },
  wetteGewonnenText: { fontSize: 12, fontWeight: "700", color: COLORS.success },
  wetteVerlorenBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5,
    paddingVertical: 7, borderRadius: 10,
    backgroundColor: COLORS.danger + "10", borderWidth: 1, borderColor: COLORS.danger + "33",
  },
  wetteVerlorenText: { fontSize: 12, fontWeight: "700", color: COLORS.danger },
  wetteReopen: { marginTop: 8, alignItems: "center" },
  wetteReopenText: { fontSize: 11, color: COLORS.textLight, textDecorationLine: "underline" },

  schockFeedRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: COLORS.blue + "0F", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 6,
  },
  schockFeedEmoji: { fontSize: 18 },
  schockFeedText: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  schockFeedMember: { fontSize: 13, fontWeight: "700", color: COLORS.textDark },
  schockFeedTime: { fontSize: 11, color: COLORS.textLight },

  deleteSwipeSmall: {
    backgroundColor: COLORS.danger, borderRadius: 12, width: 52,
    alignItems: "center", justifyContent: "center", marginBottom: 6,
  },

  protokollCard: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 14, marginBottom: 20,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.light,
  },
  protokollHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  protokollTitel: { flex: 1, fontSize: 15, fontWeight: "700", color: COLORS.textDark },
  protokollExcerpt: { fontSize: 13, color: COLORS.textMuted, lineHeight: 19 },
  protokollLeer: { flexDirection: "row", alignItems: "center", gap: 12 },
  protokollLeerIcon: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: COLORS.background, alignItems: "center", justifyContent: "center",
  },
  protokollLeerTitle: { fontSize: 14, fontWeight: "700", color: COLORS.textMid },
  protokollLeerSub: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },

  notFound: { flex: 1, alignItems: "center", justifyContent: "center" },
  notFoundText: { fontSize: 16, color: COLORS.textMuted },

  // Strafen
  strafGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  strafKatBtn: {
    width: "47%", alignItems: "center", paddingVertical: 12, paddingHorizontal: 8,
    borderRadius: 14, backgroundColor: COLORS.card,
    borderWidth: 1.5, borderColor: COLORS.border, gap: 3, ...SHADOWS.light,
  },
  strafKatBtnActive: { backgroundColor: COLORS.danger, borderColor: COLORS.danger },
  strafKatEmoji: { fontSize: 20 },
  strafKatLabel: { fontSize: 11, fontWeight: "700", color: COLORS.textDark, textAlign: "center" },
  strafKatBetrag: { fontSize: 12, fontWeight: "800", color: COLORS.danger },
  strafForm: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: COLORS.danger + "44", ...SHADOWS.light,
  },
  strafFormTitle: { fontSize: 14, fontWeight: "800", color: COLORS.textDark, marginBottom: 4 },
  strafFormHint: { fontSize: 12, color: COLORS.textMuted, fontStyle: "italic", marginBottom: 12 },
  strafFormRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  strafFormLabel: { fontSize: 11, fontWeight: "700", color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 5 },
  strafFormInput: {
    backgroundColor: COLORS.background, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9,
    fontSize: 14, color: COLORS.textDark, borderWidth: 1, borderColor: COLORS.border,
  },
  strafSubmitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7,
    backgroundColor: COLORS.danger, borderRadius: 12, paddingVertical: 11,
  },
  strafSubmitText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  strafFeedRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: COLORS.card, borderRadius: 12, padding: 12, marginBottom: 6,
    borderWidth: 1, borderColor: COLORS.border, borderLeftWidth: 3, borderLeftColor: COLORS.danger,
  },
  strafFeedRowBeglichen: { borderLeftColor: COLORS.success, backgroundColor: "#F8FDF9" },
  strafFeedEmoji: { fontSize: 18 },
  strafFeedLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  strafFeedMember: { fontSize: 13, fontWeight: "700", color: COLORS.textDark },
  strafFeedRight: { alignItems: "flex-end", gap: 4 },
  strafFeedBetrag: { fontSize: 15, fontWeight: "800", color: COLORS.danger },
  strafBegleichenBtn: { padding: 2 },

  // Edit form
  editBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.blue + "15", borderWidth: 1, borderColor: COLORS.blue + "44",
    alignItems: "center", justifyContent: "center",
  },
  editBtnActive: { backgroundColor: COLORS.textMuted, borderColor: COLORS.textMuted },
  editFormCard: {
    backgroundColor: COLORS.card, borderRadius: 18, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: COLORS.blue + "33", ...SHADOWS.light,
  },
  editFormTitle: { fontSize: 15, fontWeight: "800", color: COLORS.textDark, marginBottom: 14 },
  editLabel: { fontSize: 11, fontWeight: "700", color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 5 },
  editInput: {
    backgroundColor: COLORS.background, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: COLORS.textDark, marginBottom: 12,
  },
  editDateBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: COLORS.background, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12,
  },
  editDateBtnText: { fontSize: 14, fontWeight: "600", color: COLORS.textDark },
  editRow: { flexDirection: "row", gap: 10 },
  editSaveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7,
    backgroundColor: COLORS.blue, borderRadius: 12, paddingVertical: 12, marginTop: 4,
  },
  editSaveBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },


  // Stats bar (Anwesenheit tab)
  anwesenheitStatsBar: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: COLORS.card, borderRadius: 14, padding: 12, marginBottom: 12,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.light,
  },
  anwesenheitStatBarItem: { flex: 1, alignItems: "center", gap: 2 },
  anwesenheitStatBarNum: { fontSize: 18, fontWeight: "800", color: COLORS.textDark },
  anwesenheitStatBarLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: "600" },

  // Agenda input (Protokoll tab)
  agendaInput: {
    backgroundColor: COLORS.background, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: COLORS.textDark, lineHeight: 21,
    minHeight: 100,
  },
});
