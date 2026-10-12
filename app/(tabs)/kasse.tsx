import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
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
  RefreshControl,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Swipeable from "react-native-gesture-handler/Swipeable";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { showAlert } from "../../utils/alert";
import { KassenEintrag, KassenEintragTyp, MemberProfile, StammtischTermin } from "../../types";
import {
  loadKasse,
  addKassenEintrag,
  updateKassenEintrag,
  deleteKassenEintrag,
  loadMembers,
  logActivity,
  loadActivityFeed,
  loadTermine,
} from "../../utils/storage";
import { terminBezeichnung } from "../../utils/activityFeed";
import { formatUhrzeit, formatWochentagDatum } from "../../utils/date";
import { SHADOWS, ThemeColors, FONT } from "../../constants/design";
import { useColors, useThemedStyles } from "../../contexts/ThemeContext";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorState from "../../components/ErrorState";
import OfflineBanner from "../../components/OfflineBanner";
import { useScreenLoad } from "../../utils/useScreenLoad";
import { useSession } from "../../contexts/SessionContext";
import { formatEuro, getInitial } from "../../utils/format";
import { useSingleFlight } from "../../utils/useSingleFlight";
import { NAV_INSET } from "../../components/ui";

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

const makeTypMeta = (c: ThemeColors): Record<KassenEintragTyp, { label: string; emoji: string; color: string; bg: string }> => ({
  einnahme:     { label: "Einnahme",    emoji: "➕", color: c.success,  bg: c.successBg },
  ausgabe:      { label: "Ausgabe",     emoji: "➖", color: c.danger,   bg: c.dangerBg },
  abendkosten:  { label: "Stammtischrechnung", emoji: "🍺", color: c.gold,    bg: c.goldBg },
});

function formatDatumZeit(iso: string): string {
  const d = new Date(iso);
  return `${formatWochentagDatum(d, true)} · ${formatUhrzeit(iso)} Uhr`;
}

function kurzName(m: MemberProfile | undefined): string | undefined {
  return m ? m.spitzname ?? m.name.split(" ")[0] : undefined;
}

// ─── Eintrag Detail ───────────────────────────────────────────────────────────

function DetailZeile({ label, value, onPress }: { label: string; value: string; onPress?: () => void }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const content = (
    <>
      <Text style={styles.detailLabel}>{label}</Text>
      <View style={styles.detailValueRow}>
        <Text style={[styles.detailValue, onPress && { color: c.blue }]}>{value}</Text>
        {onPress ? <Ionicons name="chevron-forward" size={16} color={c.blue} /> : null}
      </View>
    </>
  );
  return onPress ? (
    <TouchableOpacity style={styles.detailZeile} onPress={onPress} activeOpacity={0.7}>{content}</TouchableOpacity>
  ) : (
    <View style={styles.detailZeile}>{content}</View>
  );
}

/** Bottom-Sheet mit allen Infos zu einem Kassen-Eintrag — voller Text, wer, wann, verknüpfter Termin. */
function EintragDetail({
  eintrag,
  members,
  termin,
  actorId,
  onClose,
}: {
  eintrag: KassenEintrag | null;
  members: MemberProfile[];
  termin?: StammtischTermin;
  actorId?: string;
  onClose: () => void;
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  if (!eintrag) return null;
  const meta = makeTypMeta(c)[eintrag.typ];
  const isPositive = eintrag.typ === "einnahme";
  const betragFarbe = eintrag.typ === "abendkosten" ? c.gold : isPositive ? c.success : c.danger;
  const zahler = members.find((m) => m.id === eintrag.bezahltVon);
  const actor = actorId ? members.find((m) => m.id === actorId) : undefined;
  const teilnehmer = (eintrag.teilnehmerIds ?? []).map((id) => members.find((m) => m.id === id)).filter(Boolean) as MemberProfile[];
  const offen = schuldnerVon(eintrag).filter((id) => !(eintrag.beglichenIds ?? []).includes(id));

  function geheZu(route: string) {
    onClose();
    router.push(route as any);
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{meta.emoji} {meta.label}</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={20} color={c.textMuted} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={[styles.detailBetrag, { color: betragFarbe }]}>
              {eintrag.typ === "abendkosten" ? "" : isPositive ? "+" : "−"}{formatEuro(eintrag.betrag)} €
            </Text>
            {eintrag.beschreibung?.trim() ? (
              <Text style={styles.detailBeschreibung} selectable>{eintrag.beschreibung.trim()}</Text>
            ) : null}

            <View style={styles.detailCard}>
              <DetailZeile label="Datum" value={formatDatumZeit(eintrag.datum)} />
              {zahler && (
                <DetailZeile label="Vorgestreckt von" value={zahler.name} onPress={() => geheZu(`/member/${zahler.id}`)} />
              )}
              {teilnehmer.length > 0 && (
                <DetailZeile
                  label="Dabei"
                  value={`${teilnehmer.length} ${teilnehmer.length === 1 ? "Person" : "Personen"} · ${formatEuro(eintrag.betrag / teilnehmer.length)} € pro Kopf\n${teilnehmer.map((m) => kurzName(m)).join(", ")}`}
                />
              )}
              {eintrag.typ === "abendkosten" && (
                <DetailZeile
                  label="Status"
                  value={isEintragBeglichen(eintrag)
                    ? "✅ Komplett beglichen"
                    : offen.length > 0
                      ? `Offen: ${offen.map((id) => kurzName(members.find((m) => m.id === id)) ?? "?").join(", ")}`
                      : "Offen"}
                />
              )}
              {actor && (
                <DetailZeile label="Eingetragen von" value={actor.name} onPress={() => geheZu(`/member/${actor.id}`)} />
              )}
              {eintrag.terminId && (
                <DetailZeile
                  label="Termin"
                  value={termin ? terminBezeichnung({ terminDatum: termin.datum, terminTitel: termin.titel, terminArt: termin.art }, true) : "Zum Termin"}
                  onPress={() => geheZu(`/termin/${eintrag.terminId}`)}
                />
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Eintrag Row ──────────────────────────────────────────────────────────────

function EintragRow({
  eintrag,
  actorName,
  onDelete,
  onOpen,
}: {
  eintrag: KassenEintrag;
  actorName?: string;
  onDelete: () => void;
  onOpen: () => void;
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const meta = makeTypMeta(c)[eintrag.typ];
  const isPositive = eintrag.typ === "einnahme";
  const headline = eintrag.beschreibung?.trim() || meta.label;
  const subParts = [
    formatDatum(eintrag.datum),
    eintrag.beschreibung ? meta.label : null,
    actorName ? `von ${actorName}` : null,
  ].filter(Boolean);

  function renderRight() {
    return (
      <TouchableOpacity style={styles.deleteAction} onPress={onDelete} activeOpacity={0.8}>
        <Ionicons name="trash-outline" size={20} color={c.onAccent} />
      </TouchableOpacity>
    );
  }

  return (
    <Swipeable renderRightActions={renderRight} overshootRight={false}>
      <TouchableOpacity style={[styles.eintragRow, { borderLeftColor: meta.color }]} onPress={onOpen} activeOpacity={0.8}>
        <View style={[styles.eintragIcon, { backgroundColor: meta.bg }]}>
          <Text style={{ fontFamily: FONT.w400, fontSize: 18 }}>{meta.emoji}</Text>
        </View>
        <View style={styles.eintragMeta}>
          <Text style={styles.eintragHeadline}>{headline}</Text>
          <Text style={styles.eintragSub}>{subParts.join(" · ")}</Text>
        </View>
        <Text style={[styles.eintragBetrag, { color: isPositive ? c.success : c.danger }]}>
          {isPositive ? "+" : "−"}{formatEuro(eintrag.betrag)} €
        </Text>
      </TouchableOpacity>
    </Swipeable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

type FormTyp = KassenEintragTyp | null;

export default function KasseScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const TYP_META = useMemo(() => makeTypMeta(c), [c]);
  const { activeMemberId } = useSession();
  const { eintragId, neu, terminId: terminIdParam } = useLocalSearchParams<{ eintragId?: string; neu?: string; terminId?: string }>();
  const guard = useSingleFlight();
  const [eintraege, setEintraege] = useState<KassenEintrag[]>([]);
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [actorByRefId, setActorByRefId] = useState<Map<string, string>>(new Map());
  const [activeForm, setActiveForm] = useState<FormTyp>(null);
  const [showBeglichen, setShowBeglichen] = useState(false);
  const [termineById, setTermineById] = useState<Map<string, StammtischTermin>>(new Map());
  const [detailId, setDetailId] = useState<string | null>(null);

  // Form state
  const [betrag, setBetrag] = useState("");
  const [beschreibung, setBeschreibung] = useState("");
  const [bezahltVon, setBezahltVon] = useState<string | null>(null);
  const [teilnehmerIds, setTeilnehmerIds] = useState<string[]>([]);
  const [formTerminId, setFormTerminId] = useState<string | null>(null);

  async function load() {
    const [k, ms, activity, termine] = await Promise.all([loadKasse(), loadMembers(), loadActivityFeed(300), loadTermine()]);
    setEintraege(k);
    setMembers(ms);
    setTermineById(new Map(termine.map((t) => [t.id, t])));
    const map = new Map<string, string>();
    for (const a of activity) {
      if (
        (a.actionType === "kasse_einnahme_created" || a.actionType === "kasse_ausgabe_created" || a.actionType === "abendkosten_created") &&
        a.refId && a.actorMemberId
      ) {
        map.set(a.refId, a.actorMemberId);
      }
    }
    setActorByRefId(map);
  }

  const { loading, refreshing, error, onRefresh, retry } = useScreenLoad(load, []);

  // Deep-Link aus Feed/Push: /kasse?eintragId=… öffnet direkt die Detailansicht.
  useEffect(() => {
    if (!loading && eintragId && eintraege.some((e) => e.id === eintragId)) setDetailId(eintragId);
  }, [loading, eintragId]);

  // Aus dem Termin: /kasse?neu=abendkosten&terminId=… öffnet die Rechnung mit
  // Bezug zum Abend; wer da war, ist schon vorausgewählt.
  useEffect(() => {
    if (loading || neu !== "abendkosten") return;
    const t = terminIdParam ? termineById.get(terminIdParam) : undefined;
    openForm("abendkosten");
    setFormTerminId(t?.id ?? null);
    if (t) setTeilnehmerIds(t.anwesenheit ?? []);
    router.setParams({ neu: undefined, terminId: undefined });
  }, [loading, neu, terminIdParam]);

  const detailEintrag = detailId ? eintraege.find((e) => e.id === detailId) ?? null : null;

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
    setFormTerminId(null);
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
      terminId: formTerminId ?? undefined,
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
      terminId: eintrag.terminId,
      refId: eintrag.id,
      meta: {
        betrag: eintrag.betrag,
        beschreibung: eintrag.beschreibung,
        teilnehmerAnzahl: eintrag.teilnehmerIds?.length,
      },
    });
    closeForm();
  }

  async function handleDelete(id: string) {
    const e = eintraege.find((x) => x.id === id);
    await deleteKassenEintrag(id);
    setEintraege((prev) => prev.filter((x) => x.id !== id));
    await logActivity({
      actorMemberId: activeMemberId ?? undefined,
      subjectMemberId: e?.bezahltVon,
      actionType: "kasse_eintrag_deleted",
      terminId: e?.terminId,
      refId: id,
      meta: { betrag: e?.betrag ?? 0, beschreibung: e?.beschreibung },
    });
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
        meta: { betrag: anteil, anteil: true },
      });
    }
  }

  const saldoPositiv = saldo >= 0;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={0}>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        {loading ? <LoadingSpinner /> : error ? <ErrorState message={error} onRetry={retry} /> : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.blue} />}
        >
          <OfflineBanner />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTexts}>
              <Text style={styles.headerTitle}>Kasse</Text>
              <Text style={styles.headerSub}>Einnahmen, Ausgaben & Stammtischrechnung</Text>
            </View>
          </View>

          {/* Saldo Card */}
          <View style={[styles.saldoCard, { borderColor: saldoPositiv ? c.success + "44" : c.danger + "44" }]}>
            <Text style={styles.saldoLabel}>Kassenstand</Text>
            <Text style={[styles.saldoValue, { color: saldoPositiv ? c.success : c.danger }]}>
              {saldoPositiv ? "+" : "−"}{formatEuro(Math.abs(saldo))} €
            </Text>
            {kassenEintraege.length > 0 && (
              <View style={styles.saldoStats}>
                <View style={styles.saldoStatItem}>
                  <Text style={[styles.saldoStatValue, { color: c.success }]}>
                    +{formatEuro(kassenEintraege.filter(e => e.typ === "einnahme").reduce((s, e) => s + e.betrag, 0))} €
                  </Text>
                  <Text style={styles.saldoStatLabel}>Einnahmen</Text>
                </View>
                <View style={styles.saldoStatDivider} />
                <View style={styles.saldoStatItem}>
                  <Text style={[styles.saldoStatValue, { color: c.danger }]}>
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
              style={[styles.actionBtn, activeForm === "einnahme" && styles.actionBtnActive, { borderColor: c.success }]}
              onPress={() => activeForm === "einnahme" ? closeForm() : openForm("einnahme")}
              activeOpacity={0.8}
            >
              <Text style={styles.actionBtnEmoji}>➕</Text>
              <Text style={[styles.actionBtnText, { color: c.success }]}>Einnahme</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, activeForm === "ausgabe" && styles.actionBtnActive, { borderColor: c.danger }]}
              onPress={() => activeForm === "ausgabe" ? closeForm() : openForm("ausgabe")}
              activeOpacity={0.8}
            >
              <Text style={styles.actionBtnEmoji}>➖</Text>
              <Text style={[styles.actionBtnText, { color: c.danger }]}>Ausgabe</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, activeForm === "abendkosten" && styles.actionBtnActive, { borderColor: c.gold }]}
              onPress={() => activeForm === "abendkosten" ? closeForm() : openForm("abendkosten")}
              activeOpacity={0.8}
            >
              <Text style={styles.actionBtnEmoji}>🍺</Text>
              <Text style={[styles.actionBtnText, { color: c.gold }]}>Rechnung</Text>
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
                  placeholderTextColor={c.textLight}
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
                    placeholderTextColor={c.textLight}
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
                            <Text style={{ fontSize: 11, fontFamily: FONT.w700, color: bezahltVon === m.id ? c.onAvatar : m.avatarColor }}>
                              {getInitial(m.name)}
                            </Text>
                          </View>
                        )}
                        <Text style={[styles.chipName, bezahltVon === m.id && { color: c.onAvatar }]}>
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
                              <Text style={{ fontSize: 11, fontFamily: FONT.w700, color: selected ? c.onAvatar : m.avatarColor }}>
                                {getInitial(m.name)}
                              </Text>
                            </View>
                          )}
                          <Text style={[styles.chipName, selected && { color: c.onAvatar }]}>
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
                  onPress={() => guard(handleSubmit)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark" size={16} color={c.onAccent} />
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
                        <Ionicons name="trash-outline" size={20} color={c.onAccent} />
                      </TouchableOpacity>
                    )}
                    overshootRight={false}
                  >
                    <View style={[
                      styles.abendkostenCard,
                      { borderLeftColor: beglichen ? c.success : meta.color },
                      beglichen && { backgroundColor: c.successBg },
                    ]}>
                      <TouchableOpacity style={styles.eintragRowInner} onPress={() => setDetailId(e.id)} activeOpacity={0.8}>
                        <View style={[styles.eintragIcon, { backgroundColor: beglichen ? c.success + "15" : meta.bg }]}>
                          <Text style={{ fontFamily: FONT.w400, fontSize: 18 }}>{beglichen ? "✅" : meta.emoji}</Text>
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
                          { color: beglichen ? c.textLight : c.gold },
                          beglichen && { textDecorationLine: "line-through" },
                        ]}>
                          {formatEuro(e.betrag)} €
                        </Text>
                        {!hatTeilnehmer && (
                          <TouchableOpacity
                            onPress={() => guard(() => handleToggleBeglichen(e.id, !!e.beglichen))}
                            activeOpacity={0.8}
                            style={{ paddingLeft: 8 }}
                          >
                            <Ionicons
                              name={e.beglichen ? "checkmark-circle" : "ellipse-outline"}
                              size={22}
                              color={e.beglichen ? c.success : c.border}
                            />
                          </TouchableOpacity>
                        )}
                      </TouchableOpacity>

                      {hatTeilnehmer && schuldner.length > 0 && (
                        <View style={styles.schuldnerList}>
                          {schuldner.map((id) => {
                            const m = members.find((mm) => mm.id === id);
                            const bezahlt = (e.beglichenIds ?? []).includes(id);
                            return (
                              <TouchableOpacity
                                key={id}
                                style={styles.schuldnerRow}
                                onPress={() => guard(() => handleToggleTeilnehmerBeglichen(e.id, id))}
                                activeOpacity={0.75}
                              >
                                <Text style={[styles.schuldnerName, bezahlt && styles.schuldnerNameBeglichen]}>
                                  {m?.name ?? "Unbekannt"}
                                </Text>
                                <Text style={[styles.schuldnerBetrag, bezahlt && { color: c.textLight }]}>
                                  {formatEuro(anteil)} €
                                </Text>
                                <Ionicons
                                  name={bezahlt ? "checkmark-circle" : "ellipse-outline"}
                                  size={18}
                                  color={bezahlt ? c.success : c.border}
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
              {kassenEintraege.map((e) => {
                const actorId = actorByRefId.get(e.id);
                const actor = actorId ? members.find((m) => m.id === actorId) : undefined;
                return (
                  <EintragRow
                    key={e.id}
                    eintrag={e}
                    actorName={actor?.spitzname ?? actor?.name.split(" ")[0]}
                    onDelete={() => handleDelete(e.id)}
                    onOpen={() => setDetailId(e.id)}
                  />
                );
              })}
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
        <EintragDetail
          eintrag={detailEintrag}
          members={members}
          termin={detailEintrag?.terminId ? termineById.get(detailEintrag.terminId) : undefined}
          actorId={detailEintrag ? actorByRefId.get(detailEintrag.id) : undefined}
          onClose={() => setDetailId(null)}
        />
      </SafeAreaView>
      </KeyboardAvoidingView>
    </GestureHandlerRootView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background },
  // Platz für die schwebende Leiste unten.
  content: { padding: 20, paddingBottom: NAV_INSET },

  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: c.cardAlt, borderRadius: 20,
    padding: 16, marginBottom: 16, ...SHADOWS.card,
    borderWidth: 1, borderColor: c.border,
  },
  headerTexts: { flex: 1 },
  headerTitle: { fontSize: 18, fontFamily: FONT.w800, color: c.textDark },
  headerSub: { fontFamily: FONT.w400, fontSize: 12, color: c.textMuted, marginTop: 2 },

  saldoCard: {
    backgroundColor: c.card, borderRadius: 20, padding: 20,
    marginBottom: 16, borderWidth: 1.5, ...SHADOWS.card,
    alignItems: "center",
  },
  saldoLabel: { fontSize: 13, fontFamily: FONT.w700, color: c.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  saldoValue: { fontSize: 40, fontFamily: FONT.w900, letterSpacing: -1 },
  saldoStats: { flexDirection: "row", alignItems: "center", marginTop: 14, gap: 0 },
  saldoStatItem: { flex: 1, alignItems: "center", gap: 2 },
  saldoStatValue: { fontSize: 15, fontFamily: FONT.w800 },
  saldoStatLabel: { fontFamily: FONT.w400, fontSize: 11, color: c.textMuted },
  saldoStatDivider: { width: 1, height: 30, backgroundColor: c.border },

  actionRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  actionBtn: {
    flex: 1, alignItems: "center", gap: 4,
    paddingVertical: 12, borderRadius: 14,
    backgroundColor: c.card, borderWidth: 1.5, ...SHADOWS.light,
  },
  actionBtnActive: { backgroundColor: c.cardAlt },
  actionBtnEmoji: { fontFamily: FONT.w400, fontSize: 20 },
  actionBtnText: { fontSize: 11, fontFamily: FONT.w700 },

  formCard: {
    backgroundColor: c.card, borderRadius: 18, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: c.border, ...SHADOWS.card,
  },
  formTitle: { fontSize: 16, fontFamily: FONT.w800, color: c.textDark, marginBottom: 12 },
  terminHint: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: c.blue + "11", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 12,
  },
  terminHintText: { fontSize: 12, color: c.blue, fontFamily: FONT.w600 },
  formRow: { marginBottom: 12 },
  formLabel: { fontSize: 12, fontFamily: FONT.w700, color: c.textMid, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.3 },
  formInput: { fontFamily: FONT.w400, backgroundColor: c.background, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 15, color: c.textDark, borderWidth: 1, borderColor: c.border,
  },

  memberChipsScroll: { marginTop: 2 },
  memberChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: c.background, borderWidth: 1.5, borderColor: c.border, marginRight: 8,
  },
  chipAvatar: { width: 22, height: 22, borderRadius: 11 },
  chipAvatarFallback: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  chipName: { fontSize: 13, fontFamily: FONT.w600, color: c.textMid },
  teilnehmerHint: { fontFamily: FONT.w400, fontSize: 12, color: c.textMuted, marginTop: 8 },

  formBtns: { flexDirection: "row", gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingVertical: 12, borderRadius: 12,
    backgroundColor: c.background, borderWidth: 1, borderColor: c.border,
  },
  cancelBtnText: { fontSize: 14, fontFamily: FONT.w600, color: c.textMuted },
  submitBtn: {
    flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 12, borderRadius: 12,
  },
  submitBtnText: { fontSize: 14, fontFamily: FONT.w700, color: c.onAccent },

  section: { marginBottom: 8 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  sectionTitle: { fontSize: 13, fontFamily: FONT.w800, color: c.textMid, letterSpacing: 0.2 },
  sectionToggle: { fontSize: 12, fontFamily: FONT.w600, color: c.blue },

  eintragRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: c.card, borderRadius: 14, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: c.border, borderLeftWidth: 3, ...SHADOWS.light,
  },
  eintragIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  eintragMeta: { flex: 1 },
  eintragTypLabel: { fontSize: 13, fontFamily: FONT.w700, color: c.textDark },
  eintragDesc: { fontFamily: FONT.w400, fontSize: 12, color: c.textMuted, marginTop: 1 },
  eintragZahler: { fontSize: 12, color: c.blue, marginTop: 1, fontFamily: FONT.w600 },
  eintragDatum: { fontFamily: FONT.w400, fontSize: 11, color: c.textLight, marginTop: 2 },
  eintragHeadline: { fontSize: 14, fontFamily: FONT.w700, color: c.textDark, lineHeight: 19 },
  eintragSub: { fontFamily: FONT.w400, fontSize: 11, color: c.textMuted, marginTop: 2 },
  eintragBetrag: { fontSize: 16, fontFamily: FONT.w800, minWidth: 80, textAlign: "right" },

  abendkostenCard: {
    backgroundColor: c.card, borderRadius: 14, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: c.border, borderLeftWidth: 3, ...SHADOWS.light,
  },
  eintragRowInner: { flexDirection: "row", alignItems: "center", gap: 12 },
  schuldnerList: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: c.border, gap: 6 },
  schuldnerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  schuldnerName: { flex: 1, fontSize: 13, fontFamily: FONT.w600, color: c.textDark },
  schuldnerNameBeglichen: { textDecorationLine: "line-through", color: c.textLight },
  schuldnerBetrag: { fontSize: 13, fontFamily: FONT.w700, color: c.gold },

  deleteAction: {
    backgroundColor: c.danger, borderRadius: 14, marginBottom: 8,
    justifyContent: "center", alignItems: "center", width: 64,
  },


  emptyState: { alignItems: "center", paddingVertical: 40, gap: 8 },
  emptyEmoji: { fontFamily: FONT.w400, fontSize: 40 },
  emptyTitle: { fontSize: 17, fontFamily: FONT.w800, color: c.textDark },
  emptySub: { fontFamily: FONT.w400, fontSize: 13, color: c.textMuted, textAlign: "center" },

  // ── Detail-Sheet ──────────────────────────────────────────────────────────
  modalOverlay: { flex: 1, backgroundColor: c.overlay, justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: c.background, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32, maxHeight: "85%", ...SHADOWS.card,
  },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  modalTitle: { fontSize: 17, fontFamily: FONT.w800, color: c.textDark },
  modalCloseBtn: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: c.cardAlt,
    alignItems: "center", justifyContent: "center",
  },
  detailBetrag: { fontSize: 32, fontFamily: FONT.w800, textAlign: "center", marginVertical: 8 },
  detailBeschreibung: { fontFamily: FONT.w400, fontSize: 15, color: c.textDark, lineHeight: 21, textAlign: "center",
    marginBottom: 14, paddingHorizontal: 8,
  },
  detailCard: {
    backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border,
    paddingHorizontal: 14, overflow: "hidden", ...SHADOWS.light,
  },
  // marginBottom -1: die Trennlinie der letzten Zeile verschwindet unter dem Kartenrand.
  detailZeile: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border, marginBottom: -1 },
  detailLabel: {
    fontSize: 11, fontFamily: FONT.w700, color: c.textMuted,
    textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 3,
  },
  detailValueRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  detailValue: { flex: 1, fontSize: 14, fontFamily: FONT.w600, color: c.textDark, lineHeight: 20 },
});
