import React, { useState, useCallback } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { showAlert } from "../../utils/alert";
import { StammtischTermin, TerminArt, MemberProfile } from "../../types";
import {
  loadTermine,
  loadMembers,
  addTermin,
  deleteTermin,
} from "../../utils/storage";
import { COLORS, SHADOWS } from "../../constants/design";
import { HamburgerButton } from "../../components/HamburgerButton";
import { toLocalIsoDate, toTimeString, parseTimeString } from "../../utils/date";

// ─── Konstanten ───────────────────────────────────────────────────────────────

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const MONTHS   = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CELL_SIZE = Math.floor((SCREEN_WIDTH - 40 - 28) / 7); // 20px content padding + 14px card padding each side

const ART_CONFIG: Record<TerminArt, { emoji: string; color: string; label: string }> = {
  stammtisch:  { emoji: "🍺", color: COLORS.blue,     label: "Stammtisch"   },
  veranstaltung: { emoji: "🎉", color: "#7C3AED",     label: "Veranstaltung" },
  geburtstag:  { emoji: "🎂", color: COLORS.gold,     label: "Geburtstag"   },
};

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
    titel: m.name + (m.spitzname ? ` „${m.spitzname}"` : ""),
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
                      style={[gridStyles.dot, { backgroundColor: ART_CONFIG[art].color }]}
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

const gridStyles = StyleSheet.create({
  container: { paddingHorizontal: 0 },
  weekRow: { flexDirection: "row" },
  weekCell: { width: CELL_SIZE, alignItems: "center", paddingVertical: 6 },
  weekLabel: { fontSize: 11, fontWeight: "700", color: COLORS.textMuted },

  cell: { width: CELL_SIZE, alignItems: "center", paddingVertical: 3 },
  dayCircle: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
  },
  todayCircle: { backgroundColor: COLORS.blue + "18" },
  selectedCircle: { backgroundColor: COLORS.blue },
  dayText: { fontSize: 14, fontWeight: "500", color: COLORS.textDark },
  dayTextSunday: { color: COLORS.danger },
  dayTextToday: { color: COLORS.blue, fontWeight: "700" },
  dayTextSelected: { color: "#FFFFFF", fontWeight: "800" },
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
  const cfg = ART_CONFIG[termin.art];
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
        { borderColor: vergangen ? COLORS.border : cfg.color + "55" },
      ]}
      onPress={handlePress}
      activeOpacity={isGeburtstag ? 1 : 0.88}
    >
      <View style={styles.eventTop}>
        <View style={[styles.eventIcon, { backgroundColor: cfg.color + "18" }]}>
          <Text style={styles.eventEmoji}>{cfg.emoji}</Text>
        </View>

        <View style={styles.eventInfo}>
          <Text style={[styles.eventTitel, vergangen && { color: COLORS.textMuted }]}>
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
            <Text style={styles.eventMeta}>
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
            <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
          </TouchableOpacity>
        )}
        {isMemberBirthday && (
          <Ionicons name="chevron-forward" size={16} color={COLORS.textLight} />
        )}
      </View>

      {!isGeburtstag && !vergangen && (
        <View style={styles.detailsHint}>
          <Text style={styles.detailsHintText}>Details & Statistiken</Text>
          <Ionicons name="chevron-forward" size={13} color={COLORS.textLight} />
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Neuer Termin – Formular ──────────────────────────────────────────────────

function NeuerTerminForm({ initialDate, onSave, onCancel }: {
  initialDate?: string;
  onSave: () => void;
  onCancel: () => void;
}) {
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

  const isStammtisch = art === "stammtisch";
  const isGeburtstag = art === "geburtstag";
  const isVeranstaltung = art === "veranstaltung";

  function localIso(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  async function speichern() {
    if ((isVeranstaltung || isGeburtstag) && !titel.trim()) {
      showAlert("Bitte Titel angeben");
      return;
    }
    await addTermin({
      art,
      titel: titel.trim() || undefined,
      datum: localIso(datum),
      datumBis: datumBis ? localIso(datumBis) : undefined,
      startZeit: startZeit ? toTimeString(startZeit) : undefined,
      endZeit: endZeit ? toTimeString(endZeit) : undefined,
      ort: ort.trim() || undefined,
      notizen: notizen.trim() || undefined,
    });
    onSave();
  }

  return (
    <View style={styles.formCard}>
      <View style={styles.formHeader}>
        <Text style={styles.formTitle}>Neuer Eintrag</Text>
        <TouchableOpacity onPress={onCancel}>
          <Ionicons name="close" size={22} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Art-Auswahl */}
      <View style={styles.artRow}>
        {(["stammtisch", "veranstaltung", "geburtstag"] as TerminArt[]).map((a) => {
          const c = ART_CONFIG[a];
          const active = art === a;
          return (
            <TouchableOpacity
              key={a}
              style={[styles.artChip, active && { backgroundColor: c.color, borderColor: c.color }]}
              onPress={() => setArt(a)}
            >
              <Text style={styles.artEmoji}>{c.emoji}</Text>
              <Text style={[styles.artChipText, active && { color: "#FFFFFF" }]}>
                {c.label}
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
          placeholderTextColor={COLORS.textLight}
        />
      )}

      {/* Datum Von */}
      <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDate(true)}>
        <Ionicons name="calendar-outline" size={16} color={COLORS.blue} />
        <Text style={styles.dateBtnText}>
          {isGeburtstag ? "Geburtstag: " : ""}
          {datum.toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}
        </Text>
      </TouchableOpacity>
      {showDate && (
        <DateTimePicker
          value={datum}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(_, d) => { setShowDate(false); if (d) setDatum(d); }}
        />
      )}

      {/* Datum Bis (nur für Veranstaltungen) */}
      {isVeranstaltung && (
        <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDateBis(true)}>
          <Ionicons name="calendar-outline" size={16} color={COLORS.textMuted} />
          <Text style={[styles.dateBtnText, { color: datumBis ? COLORS.textDark : COLORS.textLight }]}>
            {datumBis
              ? `Bis: ${datumBis.toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}`
              : "Bis: (optional, für mehrtägige Events)"}
          </Text>
          {datumBis && (
            <TouchableOpacity onPress={() => setDatumBis(null)}>
              <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      )}
      {showDateBis && (
        <DateTimePicker
          value={datumBis ?? datum}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          minimumDate={datum}
          onChange={(_, d) => { setShowDateBis(false); if (d) setDatumBis(d); }}
        />
      )}

      {/* Zeiten (nicht bei Geburtstag) */}
      {!isGeburtstag && (
        <View style={styles.zeitRow}>
          <TouchableOpacity style={[styles.dateBtn, { flex: 1 }]} onPress={() => setShowStartZeit(true)}>
            <Ionicons name="time-outline" size={16} color={COLORS.blue} />
            <Text style={[styles.dateBtnText, { color: startZeit ? COLORS.textDark : COLORS.textLight }]}>
              {startZeit ? `Von: ${toTimeString(startZeit)}` : "Von (optional)"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.dateBtn, { flex: 1 }]} onPress={() => setShowEndZeit(true)}>
            <Ionicons name="time-outline" size={16} color={COLORS.blue} />
            <Text style={[styles.dateBtnText, { color: endZeit ? COLORS.textDark : COLORS.textLight }]}>
              {endZeit ? `Bis: ${toTimeString(endZeit)}` : "Bis (optional)"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      {showStartZeit && (
        <DateTimePicker
          value={startZeit ?? parseTimeString("19:30")}
          mode="time"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          is24Hour
          onChange={(_, d) => { setShowStartZeit(false); if (d) setStartZeit(d); }}
        />
      )}
      {showEndZeit && (
        <DateTimePicker
          value={endZeit ?? parseTimeString("23:00")}
          mode="time"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          is24Hour
          onChange={(_, d) => { setShowEndZeit(false); if (d) setEndZeit(d); }}
        />
      )}

      {/* Ort (nicht bei Geburtstag) */}
      {!isGeburtstag && (
        <TextInput
          style={styles.input}
          value={ort}
          onChangeText={setOrt}
          placeholder="Ort (optional)"
          placeholderTextColor={COLORS.textLight}
        />
      )}

      {/* Notizen */}
      <TextInput
        style={[styles.input, { minHeight: 56 }]}
        value={notizen}
        onChangeText={setNotizen}
        placeholder="Notizen (optional)"
        placeholderTextColor={COLORS.textLight}
        multiline
        textAlignVertical="top"
      />

      <TouchableOpacity
        style={[styles.saveBtn, { backgroundColor: ART_CONFIG[art].color }]}
        onPress={speichern}
      >
        <Ionicons name="add" size={18} color="#FFFFFF" />
        <Text style={styles.saveBtnText}>Eintrag anlegen</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function KalenderTab() {
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

  useFocusEffect(useCallback(() => { load(); }, []));

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
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <HamburgerButton />
          <View style={styles.headerTexts}>
            <Text style={styles.headerTitle}>Kalender</Text>
            <Text style={styles.headerSub}>Termine & Geburtstage</Text>
          </View>
          <TouchableOpacity
            style={[styles.addBtn, showForm && { backgroundColor: COLORS.textMuted }]}
            onPress={() => setShowForm((v) => !v)}
          >
            <Ionicons name={showForm ? "close" : "add"} size={22} color="#FFFFFF" />
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
              <Ionicons name="chevron-back" size={20} color={COLORS.blue} />
            </TouchableOpacity>
            <TouchableOpacity onPress={goToToday} activeOpacity={0.7}>
              <Text style={styles.monthLabel}>
                {MONTHS[viewMonth]} {viewYear}
                {!isCurrentMonth && <Text style={styles.todayHint}> · heute</Text>}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={nextMonth} style={styles.monthNavBtn}>
              <Ionicons name="chevron-forward" size={20} color={COLORS.blue} />
            </TouchableOpacity>
          </View>

          {/* Legende */}
          <View style={styles.legend}>
            {(Object.entries(ART_CONFIG) as [TerminArt, typeof ART_CONFIG[TerminArt]][]).map(([art, cfg]) => (
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
    </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, paddingBottom: 48 },

  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: COLORS.cardAlt, borderRadius: 20,
    padding: 16, marginBottom: 16, ...SHADOWS.card,
    borderWidth: 1, borderColor: COLORS.border,
  },
  headerTexts: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: COLORS.textDark },
  headerSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  addBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: COLORS.blue, alignItems: "center", justifyContent: "center",
  },

  aktivBanner: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: COLORS.gold, borderRadius: 16, padding: 14, marginBottom: 14,
    ...SHADOWS.card,
  },
  aktivPulse: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#FFFFFF" },
  aktivBannerTitle: { fontSize: 15, fontWeight: "800", color: "#FFFFFF" },
  aktivBannerSub: { fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 2 },
  aktivStopBtn: {
    backgroundColor: "rgba(255,255,255,0.25)", borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  aktivStopText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },

  // ── Kalender-Karte ──
  calCard: {
    backgroundColor: COLORS.card, borderRadius: 20, padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.card,
  },
  monthNav: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10,
  },
  monthNavBtn: { padding: 6 },
  monthLabel: { fontSize: 16, fontWeight: "800", color: COLORS.textDark },
  todayHint: { fontSize: 13, fontWeight: "600", color: COLORS.blue },

  legend: { flexDirection: "row", gap: 14, marginBottom: 10, flexWrap: "wrap" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: "600" },

  // ── Tages-Sektion ──
  daySection: { marginBottom: 16 },
  daySectionTitle: {
    fontSize: 15, fontWeight: "800", color: COLORS.textDark,
    marginBottom: 10, marginTop: 4,
  },
  dayEmpty: {
    backgroundColor: COLORS.card, borderRadius: 14, padding: 16,
    alignItems: "center", borderWidth: 1, borderColor: COLORS.border,
    borderStyle: "dashed",
  },
  dayEmptyText: { fontSize: 14, color: COLORS.textMuted, marginBottom: 6 },
  dayEmptyAdd: { fontSize: 14, color: COLORS.blue, fontWeight: "700" },

  sectionTitle: {
    fontSize: 14, fontWeight: "800", color: COLORS.textMid,
    marginBottom: 10, marginTop: 4,
  },

  // ── Event-Karte ──
  eventCard: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 14,
    marginBottom: 10, borderWidth: 1.5, ...SHADOWS.light,
  },
  aktivBadge: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  aktivDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.gold },
  aktivText: { fontSize: 12, fontWeight: "700", color: COLORS.gold },

  eventTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  eventIcon: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  eventEmoji: { fontSize: 20 },
  eventInfo: { flex: 1 },
  eventTitel: { fontSize: 15, fontWeight: "800", color: COLORS.textDark, marginBottom: 2 },
  eventDatum: { fontSize: 13, fontWeight: "600", marginBottom: 3 },
  eventMeta: { fontSize: 12, color: COLORS.textMuted, marginBottom: 2 },
  eventNotizen: { fontSize: 12, color: COLORS.textMuted, fontStyle: "italic", marginTop: 4 },
  deleteBtn: { padding: 4 },

  eventActions: { marginTop: 12 },
  startBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: COLORS.blue, borderRadius: 12, paddingVertical: 10,
  },
  startBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  stopBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: COLORS.danger, borderRadius: 12, paddingVertical: 10,
  },
  stopBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  detailsHint: {
    flexDirection: "row", alignItems: "center", justifyContent: "flex-end",
    gap: 4, marginTop: 8, paddingTop: 8,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  detailsHintText: { fontSize: 12, color: COLORS.textLight, fontWeight: "500" },

  // ── Formular ──
  formCard: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: COLORS.border,
  },
  formHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  formTitle: { fontSize: 15, fontWeight: "800", color: COLORS.textDark },
  artRow: { flexDirection: "row", gap: 6, marginBottom: 12 },
  artChip: {
    flex: 1, flexDirection: "column", alignItems: "center", justifyContent: "center",
    gap: 4, paddingVertical: 10, borderRadius: 12,
    backgroundColor: COLORS.background, borderWidth: 1.5, borderColor: COLORS.border,
  },
  artEmoji: { fontSize: 18 },
  artChipText: { fontSize: 11, fontWeight: "700", color: COLORS.textDark },
  input: {
    backgroundColor: COLORS.background, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: COLORS.textDark, marginBottom: 10,
  },
  dateBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: COLORS.background, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10,
  },
  dateBtnText: { flex: 1, fontSize: 14, color: COLORS.textDark, fontWeight: "600" },
  zeitRow: { flexDirection: "row", gap: 10 },
  saveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    borderRadius: 12, paddingVertical: 12, marginTop: 4,
  },
  saveBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },

  empty: { alignItems: "center", paddingTop: 48, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 15, color: COLORS.textMuted, textAlign: "center", lineHeight: 22 },
});
