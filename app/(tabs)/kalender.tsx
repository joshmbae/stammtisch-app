import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { showAlert } from "../../utils/alert";
import { StammtischTermin, TerminArt, MemberProfile } from "../../types";
import {
  loadTermine,
  loadMembers,
  addTermine,
  deleteTermin,
  logActivity,
} from "../../utils/storage";
import { useSession } from "../../contexts/SessionContext";
import { SHADOWS, ThemeColors, FONT } from "../../constants/design";
import { useColors, useThemedStyles } from "../../contexts/ThemeContext";
import { displayName } from "../../utils/format";
import { HamburgerButton } from "../../components/HamburgerButton";
import { BackButton } from "../../components/BackButton";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorState from "../../components/ErrorState";
import OfflineBanner from "../../components/OfflineBanner";
import { useScreenLoad } from "../../utils/useScreenLoad";
import InlineDateTimePicker from "../../components/InlineDateTimePicker";
import { toLocalIsoDate, toTimeString, parseTimeString } from "../../utils/date";

// ─── Konstanten ───────────────────────────────────────────────────────────────

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const MONTHS   = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CELL_SIZE = Math.floor((SCREEN_WIDTH - 40 - 28) / 7); // 20px content padding + 14px card padding each side

type ArtMeta = { emoji: string; color: string; label: string };

const makeArtConfig = (c: ThemeColors): Record<TerminArt, ArtMeta> => ({
  stammtisch:  { emoji: "🍺", color: c.blue,     label: "Stammtisch"   },
  veranstaltung: { emoji: "🎉", color: c.purple,      label: "Veranstaltung" },
  geburtstag:  { emoji: "🎂", color: c.gold,     label: "Geburtstag"   },
});

// ─── Kalender-Helpers ─────────────────────────────────────────────────────────

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function todayIso(): string {
  return toLocalIsoDate(new Date());
}

function getMonthGrid(year: number, month: number): (number | null)[][] {
  const firstWeekday = new Date(year, month, 1).getDay();
  const offset = firstWeekday === 0 ? 6 : firstWeekday - 1; // Mo = 0
  const daysCount = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: daysCount }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const grid: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) grid.push(cells.slice(i, i + 7));
  return grid;
}

function terminOnDay(t: StammtischTermin, iso: string): boolean {
  if (t.art === "geburtstag") {
    return t.datum.slice(5) === iso.slice(5); // nur Monat+Tag vergleichen (jährlich)
  }
  const end = t.datumBis ?? t.datum;
  return t.datum <= iso && iso <= end;
}

function getEventsForDay(termine: StammtischTermin[], iso: string): StammtischTermin[] {
  return termine.filter((t) => terminOnDay(t, iso));
}

/** Geburtstag eines Mitglieds als virtuelles Termin-Objekt */
function memberBirthdayEvent(m: MemberProfile): StammtischTermin {
  return {
    id: `bd_${m.id}`,
    art: "geburtstag",
    titel: displayName(m),
    datum: m.geburtsdatum!,
    aktiv: false,
    createdAt: m.createdAt,
  };
}

/** Nächstes Vorkommen eines Geburtstags */
function nextBirthdayIso(datum: string): string {
  const today = todayIso();
  const [, m, d] = datum.split("-");
  const thisYear = `${today.slice(0, 4)}-${m}-${d}`;
  return thisYear >= today ? thisYear : `${Number(today.slice(0, 4)) + 1}-${m}-${d}`;
}

function formatDatum(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("de-DE", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });
}

function formatDatumKurz(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("de-DE", {
    day: "2-digit", month: "2-digit",
  });
}

// ─── Kalender-Grid ────────────────────────────────────────────────────────────

function KalenderGrid({
  year, month, termine, selectedDay, onSelectDay,
}: {
  year: number;
  month: number;
  termine: StammtischTermin[];
  selectedDay: string | null;
  onSelectDay: (iso: string) => void;
}) {
  const c = useColors();
  const gridStyles = useThemedStyles(makeGridStyles);
  const artConfig = useMemo(() => makeArtConfig(c), [c]);
  const grid = getMonthGrid(year, month);
  const today = todayIso();

  return (
    <View style={gridStyles.container}>
      {/* Wochentag-Header */}
      <View style={gridStyles.weekRow}>
        {WEEKDAYS.map((d) => (
          <View key={d} style={gridStyles.weekCell}>
            <Text style={gridStyles.weekLabel}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Tage */}
      {grid.map((week, wi) => (
        <View key={wi} style={gridStyles.weekRow}>
          {week.map((day, di) => {
            if (!day) return <View key={di} style={gridStyles.cell} />;
            const iso = isoDate(year, month, day);
            const events = getEventsForDay(termine, iso);
            const isToday = iso === today;
            const isSelected = iso === selectedDay;
            const isSunday = di === 6;

            // max 3 Dots
            const dotArten = [...new Set(events.map((e) => e.art))].slice(0, 3);

            return (
              <TouchableOpacity
                key={di}
                style={gridStyles.cell}
                onPress={() => onSelectDay(iso)}
                activeOpacity={0.7}
              >
                <View style={[
                  gridStyles.dayCircle,
                  isToday && gridStyles.todayCircle,
                  isSelected && gridStyles.selectedCircle,
                ]}>
                  <Text style={[
                    gridStyles.dayText,
                    isSunday && gridStyles.dayTextSunday,
                    isToday && gridStyles.dayTextToday,
                    isSelected && gridStyles.dayTextSelected,
                  ]}>
                    {day}
                  </Text>
                </View>
                <View style={gridStyles.dotsRow}>
                  {dotArten.map((art) => (
                    <View
                      key={art}
                      style={[gridStyles.dot, { backgroundColor: artConfig[art].color }]}
                    />
                  ))}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const makeGridStyles = (c: ThemeColors) => StyleSheet.create({
  container: { paddingHorizontal: 0 },
  weekRow: { flexDirection: "row" },
  weekCell: { width: CELL_SIZE, alignItems: "center", paddingVertical: 6 },
  weekLabel: { fontSize: 11, fontFamily: FONT.w700, color: c.textMuted },

  cell: { width: CELL_SIZE, alignItems: "center", paddingVertical: 3 },
  dayCircle: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
  },
  todayCircle: { backgroundColor: c.blue + "18" },
  selectedCircle: { backgroundColor: c.blue },
  dayText: { fontSize: 14, fontFamily: FONT.w500, color: c.textDark },
  dayTextSunday: { color: c.danger },
  dayTextToday: { color: c.blue, fontFamily: FONT.w700 },
  dayTextSelected: { color: c.onAccent, fontFamily: FONT.w800 },
  dotsRow: { flexDirection: "row", gap: 2, height: 6, alignItems: "center", marginTop: 1 },
  dot: { width: 5, height: 5, borderRadius: 3 },
});

// ─── Event-Karte ─────────────────────────────────────────────────────────────

function EventCard({
  termin,
  onDelete,
}: {
  termin: StammtischTermin;
  onDelete: () => void;
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const artConfig = useMemo(() => makeArtConfig(c), [c]);
  const cfg = artConfig[termin.art];
  const isStammtisch = termin.art === "stammtisch";
  const isGeburtstag = termin.art === "geburtstag";
  const isMemberBirthday = termin.id.startsWith("bd_");
  const vergangen = (termin.datumBis ?? termin.datum) < todayIso();
  const mehrtagig = termin.datumBis && termin.datumBis !== termin.datum;

  function handlePress() {
    if (isMemberBirthday) {
      const memberId = termin.id.slice(3); // "bd_" entfernen
      router.push(`/member/${memberId}`);
      return;
    }
    if (isGeburtstag) return;
    router.push(`/termin/${termin.id}`);
  }

  return (
    <TouchableOpacity
      style={[
        styles.eventCard,
        { borderColor: vergangen ? c.border : cfg.color + "55" },
      ]}
      onPress={handlePress}
      activeOpacity={isGeburtstag ? 1 : 0.88}
    >
      <View style={styles.eventTop}>
        <View style={[styles.eventIcon, { backgroundColor: cfg.color + "18" }]}>
          <Text style={styles.eventEmoji}>{cfg.emoji}</Text>
        </View>

        <View style={styles.eventInfo}>
          <Text style={[styles.eventTitel, vergangen && { color: c.textMuted }]}>
            {termin.titel ?? (isStammtisch ? "Stammtisch" : cfg.label)}
          </Text>
          <Text style={[styles.eventDatum, { color: cfg.color }]}>
            {mehrtagig
              ? `${formatDatumKurz(termin.datum)} – ${formatDatumKurz(termin.datumBis!)}`
              : isGeburtstag
              ? (() => {
                  const d = new Date(termin.datum + "T00:00:00");
                  const alter = new Date().getFullYear() - d.getFullYear();
                  return `${d.toLocaleDateString("de-DE", { day: "2-digit", month: "long" })} · wird ${alter} 🎂`;
                })()
              : formatDatum(termin.datum)}
          </Text>
          {(termin.startZeit || termin.ort) ? (
            <Text style={styles.eventMeta} numberOfLines={1}>
              {termin.startZeit ? `⏰ ${termin.startZeit}${termin.endZeit ? ` – ${termin.endZeit}` : ""}` : ""}
              {termin.startZeit && termin.ort ? "   " : ""}
              {termin.ort ? `📍 ${termin.ort}` : ""}
            </Text>
          ) : null}
          {termin.notizen ? (
            <Text style={styles.eventNotizen} numberOfLines={2}>{termin.notizen}</Text>
          ) : null}
        </View>

        {!isMemberBirthday && (
          <TouchableOpacity onPress={onDelete} style={styles.deleteBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="trash-outline" size={16} color={c.danger} />
          </TouchableOpacity>
        )}
        {isMemberBirthday && (
          <Ionicons name="chevron-forward" size={16} color={c.textLight} />
        )}
      </View>

      {!isGeburtstag && !vergangen && (
        <View style={styles.detailsHint}>
          <Text style={styles.detailsHintText}>Details & Statistiken</Text>
          <Ionicons name="chevron-forward" size={13} color={c.textLight} />
        </View>
      )}
    </TouchableOpacity>
  );
}

type WiederholIntervall = "woechentlich" | "alle2wochen" | "monatlich";
const WIEDERHOL_OPTIONEN: { key: WiederholIntervall; label: string }[] = [
  { key: "woechentlich", label: "Wöchentlich" },
  { key: "alle2wochen", label: "Alle 2 Wochen" },
  { key: "monatlich", label: "Monatlich" },
];

// ─── Neuer Termin – Formular ──────────────────────────────────────────────────

function NeuerTerminForm({ initialDate, onSave, onCancel }: {
  initialDate?: string;
  onSave: () => void;
  onCancel: () => void;
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const artConfig = useMemo(() => makeArtConfig(c), [c]);
  const [art, setArt] = useState<TerminArt>("stammtisch");
  const [titel, setTitel] = useState("");
  const [datum, setDatum] = useState(
    initialDate ? new Date(initialDate + "T00:00:00") : new Date()
  );
  const [datumBis, setDatumBis] = useState<Date | null>(null);
  const [showDate, setShowDate] = useState(false);
  const [showDateBis, setShowDateBis] = useState(false);
  const [startZeit, setStartZeit] = useState<Date | null>(null);
  const [endZeit, setEndZeit] = useState<Date | null>(null);
  const [showStartZeit, setShowStartZeit] = useState(false);
  const [showEndZeit, setShowEndZeit] = useState(false);
  const [ort, setOrt] = useState("");
  const [notizen, setNotizen] = useState("");
  const [wiederholen, setWiederholen] = useState(false);
  const [wiederholIntervall, setWiederholIntervall] = useState<WiederholIntervall>("woechentlich");
  const [wiederholAnzahl, setWiederholAnzahl] = useState("8");
  const [saving, setSaving] = useState(false);
  const { activeMemberId } = useSession();

  const isStammtisch = art === "stammtisch";
  const isGeburtstag = art === "geburtstag";
  const isVeranstaltung = art === "veranstaltung";

  function localIso(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function naechsterTermin(d: Date, intervall: WiederholIntervall): Date {
    const next = new Date(d);
    if (intervall === "woechentlich") next.setDate(next.getDate() + 7);
    else if (intervall === "alle2wochen") next.setDate(next.getDate() + 14);
    else next.setMonth(next.getMonth() + 1);
    return next;
  }

  async function speichern() {
    if ((isVeranstaltung || isGeburtstag) && !titel.trim()) {
      showAlert("Bitte Titel angeben");
      return;
    }
    const anzahl = wiederholen ? Math.min(Math.max(parseInt(wiederholAnzahl, 10) || 1, 1), 52) : 1;

    const entwuerfe: Parameters<typeof addTermine>[0] = [];
    let laufendesDatum = datum;
    for (let i = 0; i < anzahl; i++) {
      entwuerfe.push({
        art,
        titel: titel.trim() || undefined,
        datum: localIso(laufendesDatum),
        datumBis: datumBis ? localIso(datumBis) : undefined,
        startZeit: startZeit ? toTimeString(startZeit) : undefined,
        endZeit: endZeit ? toTimeString(endZeit) : undefined,
        ort: ort.trim() || undefined,
        notizen: notizen.trim() || undefined,
      });
      laufendesDatum = naechsterTermin(laufendesDatum, wiederholIntervall);
    }

    setSaving(true);
    try {
      const angelegt = await addTermine(entwuerfe);
      const erster = angelegt[0];
      // Bewusst nur ein Aktivitäts-Eintrag für die ganze Serie: jeder Eintrag
      // löst ein Push an alle anderen aus — bei 52 Wochen wären das 52
      // Benachrichtigungen pro Mitglied gewesen.
      await logActivity({
        actorMemberId: activeMemberId ?? undefined,
        actionType: "termin_erstellt",
        terminId: erster.id,
        meta: {
          terminDatum: erster.datum,
          terminTitel: erster.titel,
          terminArt: erster.art,
          anzahl: angelegt.length,
          letztesDatum: angelegt[angelegt.length - 1].datum,
        },
      });
      onSave();
    } catch (e) {
      showAlert(
        "Konnte nicht gespeichert werden",
        e instanceof Error ? e.message : "Bitte prüf deine Verbindung und versuch es nochmal."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.formCard}>
      <View style={styles.formHeader}>
        <Text style={styles.formTitle}>Neuer Eintrag</Text>
        <TouchableOpacity onPress={onCancel}>
          <Ionicons name="close" size={22} color={c.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Art-Auswahl */}
      <View style={styles.artRow}>
        {(["stammtisch", "veranstaltung", "geburtstag"] as TerminArt[]).map((a) => {
          const cfg = artConfig[a];
          const active = art === a;
          return (
            <TouchableOpacity
              key={a}
              style={[styles.artChip, active && { backgroundColor: cfg.color, borderColor: cfg.color }]}
              onPress={() => setArt(a)}
            >
              <Text style={styles.artEmoji}>{cfg.emoji}</Text>
              <Text style={[styles.artChipText, active && { color: c.onAccent }]}>
                {cfg.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Titel (nicht bei Stammtisch) */}
      {!isStammtisch && (
        <TextInput
          style={styles.input}
          value={titel}
          onChangeText={setTitel}
          placeholder={isGeburtstag ? "Name der Person" : "Name der Veranstaltung"}
          placeholderTextColor={c.textLight}
        />
      )}

      {/* Datum Von */}
      <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDate(true)}>
        <Ionicons name="calendar-outline" size={16} color={c.blue} />
        <Text style={styles.dateBtnText}>
          {isGeburtstag ? "Geburtstag: " : ""}
          {datum.toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}
        </Text>
      </TouchableOpacity>
      {showDate && (
        <InlineDateTimePicker
          value={datum}
          mode="date"
          onChange={setDatum}
          onClose={() => setShowDate(false)}
        />
      )}

      {/* Datum Bis (nur für Veranstaltungen) */}
      {isVeranstaltung && (
        <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDateBis(true)}>
          <Ionicons name="calendar-outline" size={16} color={c.textMuted} />
          <Text style={[styles.dateBtnText, { color: datumBis ? c.textDark : c.textLight }]}>
            {datumBis
              ? `Bis: ${datumBis.toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}`
              : "Bis: (optional, für mehrtägige Events)"}
          </Text>
          {datumBis && (
            <TouchableOpacity onPress={() => setDatumBis(null)}>
              <Ionicons name="close-circle" size={16} color={c.textMuted} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      )}
      {showDateBis && (
        <InlineDateTimePicker
          value={datumBis ?? datum}
          mode="date"
          minimumDate={datum}
          onChange={setDatumBis}
          onClose={() => setShowDateBis(false)}
        />
      )}

      {/* Zeiten (nicht bei Geburtstag) */}
      {!isGeburtstag && (
        <View style={styles.zeitRow}>
          <TouchableOpacity style={[styles.dateBtn, { flex: 1 }]} onPress={() => setShowStartZeit(true)}>
            <Ionicons name="time-outline" size={16} color={c.blue} />
            <Text style={[styles.dateBtnText, { color: startZeit ? c.textDark : c.textLight }]}>
              {startZeit ? `Von: ${toTimeString(startZeit)}` : "Von (optional)"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.dateBtn, { flex: 1 }]} onPress={() => setShowEndZeit(true)}>
            <Ionicons name="time-outline" size={16} color={c.blue} />
            <Text style={[styles.dateBtnText, { color: endZeit ? c.textDark : c.textLight }]}>
              {endZeit ? `Bis: ${toTimeString(endZeit)}` : "Bis (optional)"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      {showStartZeit && (
        <InlineDateTimePicker
          value={startZeit ?? parseTimeString("19:30")}
          mode="time"
          is24Hour
          onChange={setStartZeit}
          onClose={() => setShowStartZeit(false)}
        />
      )}
      {showEndZeit && (
        <InlineDateTimePicker
          value={endZeit ?? parseTimeString("23:00")}
          mode="time"
          is24Hour
          onChange={setEndZeit}
          onClose={() => setShowEndZeit(false)}
        />
      )}

      {/* Serientermine (nicht bei Geburtstag) */}
      {!isGeburtstag && (
        <>
          <TouchableOpacity style={styles.wiederholToggle} onPress={() => setWiederholen((v) => !v)} activeOpacity={0.8}>
            <Ionicons name={wiederholen ? "checkbox" : "square-outline"} size={20} color={wiederholen ? c.blue : c.textMuted} />
            <Text style={styles.wiederholToggleText}>Wiederholen (Serientermin)</Text>
          </TouchableOpacity>

          {wiederholen && (
            <View style={styles.wiederholOptionen}>
              <View style={styles.artRow}>
                {WIEDERHOL_OPTIONEN.map((opt) => {
                  const active = wiederholIntervall === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      style={[styles.artChip, active && { backgroundColor: c.blue, borderColor: c.blue }]}
                      onPress={() => setWiederholIntervall(opt.key)}
                    >
                      <Text style={[styles.artChipText, active && { color: c.onAccent }]}>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.wiederholAnzahlRow}>
                <Text style={styles.wiederholAnzahlLabel}>Anzahl Termine (inkl. diesem)</Text>
                <TextInput
                  style={styles.wiederholAnzahlInput}
                  value={wiederholAnzahl}
                  onChangeText={(t) => setWiederholAnzahl(t.replace(/\D/g, ""))}
                  keyboardType="number-pad"
                  placeholder="8"
                  placeholderTextColor={c.textLight}
                  maxLength={2}
                />
              </View>
            </View>
          )}
        </>
      )}

      {/* Ort (nicht bei Geburtstag) */}
      {!isGeburtstag && (
        <TextInput
          style={styles.input}
          value={ort}
          onChangeText={setOrt}
          placeholder="Ort (optional)"
          placeholderTextColor={c.textLight}
        />
      )}

      {/* Notizen */}
      <TextInput
        style={[styles.input, { minHeight: 56 }]}
        value={notizen}
        onChangeText={setNotizen}
        placeholder="Notizen (optional)"
        placeholderTextColor={c.textLight}
        multiline
        textAlignVertical="top"
      />

      <TouchableOpacity
        style={[styles.saveBtn, { backgroundColor: artConfig[art].color }, saving && { opacity: 0.6 }]}
        onPress={speichern}
        disabled={saving}
        accessibilityRole="button"
        accessibilityLabel="Eintrag anlegen"
      >
        <Ionicons name={saving ? "hourglass-outline" : "add"} size={18} color={c.onAccent} />
        <Text style={styles.saveBtnText}>{saving ? "Wird angelegt …" : "Eintrag anlegen"}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function KalenderTab() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const artConfig = useMemo(() => makeArtConfig(c), [c]);
  const today = new Date();
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(todayIso());
  const [termine, setTermine] = useState<StammtischTermin[]>([]);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    const [ts, members] = await Promise.all([loadTermine(), loadMembers()]);
    const birthdayEvents = members
      .filter((m) => m.geburtsdatum)
      .map(memberBirthdayEvent);
    setTermine([...ts, ...birthdayEvents]);
  }

  const { loading, refreshing, error, onRefresh, retry } = useScreenLoad(load, []);

  function prevMonth() {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  }

  function goToToday() {
    const n = new Date();
    setViewYear(n.getFullYear());
    setViewMonth(n.getMonth());
    setSelectedDay(todayIso());
  }

  async function handleDelete(id: string) {
    showAlert("Eintrag löschen?", "Dieser Eintrag wird entfernt.", [
      { text: "Abbrechen", style: "cancel" },
      { text: "Löschen", style: "destructive", onPress: async () => { await deleteTermin(id); await load(); } },
    ]);
  }

  // Events für den ausgewählten Tag
  const selectedEvents = selectedDay ? getEventsForDay(termine, selectedDay) : [];

  // Nächste Termine für "Demnächst"-Liste
  const iso = todayIso();
  const upcoming = [
    ...termine
      .filter((t) => t.art !== "geburtstag" && (t.datumBis ?? t.datum) >= iso)
      .sort((a, b) => a.datum.localeCompare(b.datum))
      .slice(0, 5),
    ...termine
      .filter((t) => t.art === "geburtstag")
      .map((t) => ({ ...t, _next: nextBirthdayIso(t.datum) }))
      .sort((a, b) => a._next.localeCompare(b._next))
      .slice(0, 3),
  ];

  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={0}>
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {loading ? <LoadingSpinner /> : error ? <ErrorState message={error} onRetry={retry} /> : (
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.blue} />}
      >
        <OfflineBanner />

        {/* ── Header ── */}
        <View style={styles.header}>
          <BackButton />
          <HamburgerButton />
          <View style={styles.headerTexts}>
            <Text style={styles.headerTitle}>Kalender</Text>
            <Text style={styles.headerSub}>Termine & Geburtstage</Text>
          </View>
          <TouchableOpacity
            style={[styles.addBtn, showForm && { backgroundColor: c.textMuted }]}
            onPress={() => setShowForm((v) => !v)}
          >
            <Ionicons name={showForm ? "close" : "add"} size={22} color={c.onAccent} />
          </TouchableOpacity>
        </View>

        {/* ── Neues Formular ── */}
        {showForm && (
          <NeuerTerminForm
            initialDate={selectedDay ?? undefined}
            onSave={() => { setShowForm(false); load(); }}
            onCancel={() => setShowForm(false)}
          />
        )}

        {/* ── Kalender-Karte ── */}
        <View style={styles.calCard}>
          {/* Monats-Navigation */}
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={prevMonth} style={styles.monthNavBtn}>
              <Ionicons name="chevron-back" size={20} color={c.blue} />
            </TouchableOpacity>
            <TouchableOpacity onPress={goToToday} activeOpacity={0.7}>
              <Text style={styles.monthLabel}>
                {MONTHS[viewMonth]} {viewYear}
                {!isCurrentMonth && <Text style={styles.todayHint}> · heute</Text>}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={nextMonth} style={styles.monthNavBtn}>
              <Ionicons name="chevron-forward" size={20} color={c.blue} />
            </TouchableOpacity>
          </View>

          {/* Legende */}
          <View style={styles.legend}>
            {(Object.entries(artConfig) as [TerminArt, ArtMeta][]).map(([art, cfg]) => (
              <View key={art} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: cfg.color }]} />
                <Text style={styles.legendLabel}>{cfg.label}</Text>
              </View>
            ))}
          </View>

          {/* Grid */}
          <KalenderGrid
            year={viewYear}
            month={viewMonth}
            termine={termine}
            selectedDay={selectedDay}
            onSelectDay={(iso) => setSelectedDay((prev) => prev === iso ? null : iso)}
          />
        </View>

        {/* ── Events für ausgewählten Tag ── */}
        {selectedDay && (
          <View style={styles.daySection}>
            <Text style={styles.daySectionTitle}>
              {new Date(selectedDay + "T00:00:00").toLocaleDateString("de-DE", {
                weekday: "long", day: "2-digit", month: "long",
              })}
            </Text>
            {selectedEvents.length === 0 ? (
              <View style={styles.dayEmpty}>
                <Text style={styles.dayEmptyText}>Keine Einträge</Text>
                <TouchableOpacity onPress={() => setShowForm(true)}>
                  <Text style={styles.dayEmptyAdd}>+ Eintrag anlegen</Text>
                </TouchableOpacity>
              </View>
            ) : (
              selectedEvents.map((t) => (
                <EventCard
                  key={t.id}
                  termin={t}
                  onDelete={() => handleDelete(t.id)}
                />
              ))
            )}
          </View>
        )}

        {/* ── Demnächst ── */}
        {upcoming.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>🗓 Demnächst</Text>
            {upcoming.map((t) => (
              <EventCard
                key={t.id}
                termin={t}
                onDelete={() => handleDelete(t.id)}
              />
            ))}
          </>
        )}

        {termine.length === 0 && !showForm && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyText}>
              Noch keine Einträge.{"\n"}Tippe auf + um einen anzulegen.
            </Text>
          </View>
        )}

      </ScrollView>
      )}
    </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background },
  content: { padding: 20, paddingBottom: 48 },

  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: c.cardAlt, borderRadius: 20,
    padding: 16, marginBottom: 16, ...SHADOWS.card,
    borderWidth: 1, borderColor: c.border,
  },
  headerTexts: { flex: 1 },
  headerTitle: { fontSize: 18, fontFamily: FONT.w800, color: c.textDark },
  headerSub: { fontFamily: FONT.w400, fontSize: 12, color: c.textMuted, marginTop: 2 },
  addBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: c.blue, alignItems: "center", justifyContent: "center",
  },

  aktivBanner: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: c.gold, borderRadius: 16, padding: 14, marginBottom: 14,
    ...SHADOWS.card,
  },
  aktivPulse: { width: 10, height: 10, borderRadius: 5, backgroundColor: c.onAccent },
  aktivBannerTitle: { fontSize: 15, fontFamily: FONT.w800, color: c.onAccent },
  aktivBannerSub: { fontFamily: FONT.w400, fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 2 },
  aktivStopBtn: {
    backgroundColor: "rgba(255,255,255,0.25)", borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  aktivStopText: { color: c.onAccent, fontFamily: FONT.w700, fontSize: 13 },

  // ── Kalender-Karte ──
  calCard: {
    backgroundColor: c.card, borderRadius: 20, padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: c.border, ...SHADOWS.card,
  },
  monthNav: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10,
  },
  monthNavBtn: { padding: 6 },
  monthLabel: { fontSize: 16, fontFamily: FONT.w800, color: c.textDark },
  todayHint: { fontSize: 13, fontFamily: FONT.w600, color: c.blue },

  legend: { flexDirection: "row", gap: 14, marginBottom: 10, flexWrap: "wrap" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 11, color: c.textMuted, fontFamily: FONT.w600 },

  // ── Tages-Sektion ──
  daySection: { marginBottom: 16 },
  daySectionTitle: {
    fontSize: 15, fontFamily: FONT.w800, color: c.textDark,
    marginBottom: 10, marginTop: 4,
  },
  dayEmpty: {
    backgroundColor: c.card, borderRadius: 14, padding: 16,
    alignItems: "center", borderWidth: 1, borderColor: c.border,
    borderStyle: "dashed",
  },
  dayEmptyText: { fontFamily: FONT.w400, fontSize: 14, color: c.textMuted, marginBottom: 6 },
  dayEmptyAdd: { fontSize: 14, color: c.blue, fontFamily: FONT.w700 },

  sectionTitle: {
    fontSize: 14, fontFamily: FONT.w800, color: c.textMid,
    marginBottom: 10, marginTop: 4,
  },

  // ── Event-Karte ──
  eventCard: {
    backgroundColor: c.card, borderRadius: 16, padding: 14,
    marginBottom: 10, borderWidth: 1.5, ...SHADOWS.light,
  },
  aktivBadge: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  aktivDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.gold },
  aktivText: { fontSize: 12, fontFamily: FONT.w700, color: c.gold },

  eventTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  eventIcon: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  eventEmoji: { fontFamily: FONT.w400, fontSize: 20 },
  eventInfo: { flex: 1 },
  eventTitel: { fontSize: 15, fontFamily: FONT.w800, color: c.textDark, marginBottom: 2 },
  eventDatum: { fontSize: 13, fontFamily: FONT.w600, marginBottom: 3 },
  eventMeta: { fontFamily: FONT.w400, fontSize: 12, color: c.textMuted, marginBottom: 2 },
  eventNotizen: { fontFamily: FONT.w400i, fontSize: 12, color: c.textMuted, marginTop: 4 },
  deleteBtn: { padding: 4 },

  eventActions: { marginTop: 12 },
  startBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: c.blue, borderRadius: 12, paddingVertical: 10,
  },
  startBtnText: { color: c.onAccent, fontFamily: FONT.w700, fontSize: 14 },
  stopBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: c.danger, borderRadius: 12, paddingVertical: 10,
  },
  stopBtnText: { color: c.onAccent, fontFamily: FONT.w700, fontSize: 14 },
  detailsHint: {
    flexDirection: "row", alignItems: "center", justifyContent: "flex-end",
    gap: 4, marginTop: 8, paddingTop: 8,
    borderTopWidth: 1, borderTopColor: c.border,
  },
  detailsHintText: { fontSize: 12, color: c.textLight, fontFamily: FONT.w500 },

  // ── Formular ──
  formCard: {
    backgroundColor: c.card, borderRadius: 16, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: c.border,
  },
  formHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  formTitle: { fontSize: 15, fontFamily: FONT.w800, color: c.textDark },
  artRow: { flexDirection: "row", gap: 6, marginBottom: 12 },
  artChip: {
    flex: 1, flexDirection: "column", alignItems: "center", justifyContent: "center",
    gap: 4, paddingVertical: 10, borderRadius: 12,
    backgroundColor: c.background, borderWidth: 1.5, borderColor: c.border,
  },
  artEmoji: { fontFamily: FONT.w400, fontSize: 18 },
  artChipText: { fontSize: 11, fontFamily: FONT.w700, color: c.textDark },
  input: { fontFamily: FONT.w400, backgroundColor: c.background, borderRadius: 10, borderWidth: 1, borderColor: c.border,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: c.textDark, marginBottom: 10,
  },
  dateBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: c.background, borderRadius: 10, borderWidth: 1, borderColor: c.border,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10,
  },
  dateBtnText: { flex: 1, fontSize: 14, color: c.textDark, fontFamily: FONT.w600 },
  zeitRow: { flexDirection: "row", gap: 10 },
  wiederholToggle: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  wiederholToggleText: { fontSize: 14, fontFamily: FONT.w600, color: c.textDark },
  wiederholOptionen: { marginBottom: 4 },
  wiederholAnzahlRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10, gap: 10 },
  wiederholAnzahlLabel: { fontFamily: FONT.w400, fontSize: 13, color: c.textMuted, flex: 1 },
  wiederholAnzahlInput: { fontFamily: FONT.w400, backgroundColor: c.background, borderRadius: 10, borderWidth: 1, borderColor: c.border,
    paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: c.textDark, width: 56, textAlign: "center",
  },
  saveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    borderRadius: 12, paddingVertical: 12, marginTop: 4,
  },
  saveBtnText: { color: c.onAccent, fontFamily: FONT.w700, fontSize: 14 },

  empty: { alignItems: "center", paddingTop: 48, gap: 12 },
  emptyIcon: { fontFamily: FONT.w400, fontSize: 48 },
  emptyText: { fontFamily: FONT.w400, fontSize: 15, color: c.textMuted, textAlign: "center", lineHeight: 22 },
});
