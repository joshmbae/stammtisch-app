import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

// ─── Data ─────────────────────────────────────────────────────────────────────

interface FeatureItem {
  emoji: string;
  title: string;
  summary: string;
  tip?: string;
}

interface FeatureGroup {
  heading: string;
  color: string;
  items: FeatureItem[];
}

const GROUPS: FeatureGroup[] = [
  {
    heading: "Erste Schritte",
    color: "#4A7C6F",
    items: [
      {
        emoji: "👶",
        title: "Kindprofil anlegen",
        summary:
          "Tippe auf dem Home-Tab auf das + und lege ein Profil mit Name, Geburtsdatum, Geschlecht und Ernährungsweise an. Optional: Foto, Frühgeburt-Info, Geschwister und medizinische Besonderheiten.",
        tip: "Je vollständiger das Profil, desto gezielter antwortet Mia.",
      },
      {
        emoji: "🤰",
        title: "Schwangerschaftsprofil",
        summary:
          "Du kannst auch ein Schwangerschaftsprofil erstellen. Gib den errechneten Geburtstermin ein und Mia begleitet dich mit wöchentlichen Entwicklungsinfos, Körperveränderungen und Tipps.",
      },
      {
        emoji: "👨‍👩‍👧",
        title: "Familienprofil",
        summary:
          'Unter "Familie" kannst du ein Elternprofil anlegen und mehrere Kinder- oder Schwangerschaftsprofile verwalten. Alle Profile sind lokal auf deinem Gerät gespeichert.',
      },
    ],
  },
  {
    heading: "Chat mit Mia",
    color: "#7B9EC8",
    items: [
      {
        emoji: "💬",
        title: "Gespräche starten",
        summary:
          "Über den Chat-Tab oder direkt im Kindprofil kannst du ein neues Gespräch mit Mia beginnen. Mia kennt das ausgewählte Kind und antwortet immer bezogen auf sein Alter und seine Situation.",
        tip: 'Frag ruhig konkret: "Warum schläft Leon seit 3 Tagen schlechter?" statt "Schlafprobleme".',
      },
      {
        emoji: "🧠",
        title: "Mias Gedächtnis",
        summary:
          "Mia merkt sich wichtige Infos aus dem Gespräch automatisch als Erinnerungen — z. B. Schlafgewohnheiten oder Ernährungsvorlieben. Diese Erinnerungen fließen in alle zukünftigen Chats ein.",
      },
      {
        emoji: "🌩️",
        title: "Entwicklungsschübe im Chat",
        summary:
          "Wenn dein Kind gerade einen Entwicklungsschub macht, weiß Mia das und berücksichtigt es in ihren Antworten — z. B. warum dein Baby gerade quengeliger ist als sonst.",
      },
    ],
  },
  {
    heading: "Entwicklung & Meilensteine",
    color: "#4A7C6F",
    items: [
      {
        emoji: "🌱",
        title: "Diese Woche",
        summary:
          'Im Profil unter "Entwicklung" -> "Diese Woche" siehst du, was dein Kind in dieser Entwicklungsphase typischerweise kann, welches Verhalten normal ist, wie du es fördern kannst — und wann du zum Kinderarzt solltest.',
      },
      {
        emoji: "⭐",
        title: "Meilensteine",
        summary:
          'Im Tab "Meilensteine" siehst du alle Entwicklungsschritte nach Bereichen (Motorik, Sprache, Soziales, Kognition). Aktive Meilensteine sind jetzt oder in den nächsten 4 Wochen typisch. Zukünftige werden ausgegraut angezeigt.',
        tip: 'Setze einen Meilenstein auf "Kann es" — Konfetti inklusive 🎉',
      },
      {
        emoji: "🔢",
        title: "Fortschritt & Schnell entwickelt",
        summary:
          'Der Fortschrittsbalken zeigt, wie viele aktive Meilensteine dein Kind bereits erreicht hat. Wenn es mehr schafft als aktuell erwartet, erscheint "✨ Schnell entwickelt!".',
      },
      {
        emoji: "🗓️",
        title: "Schwangerschaft: Diese Woche & Timeline",
        summary:
          "Im Schwangerschaftsprofil gibt es ebenfalls einen Entwicklungsbereich: Babygröße und -gewicht, Körperveränderungen, Was ist normal, Warnzeichen, Todos und eine Timeline aller Schwangerschaftsphasen.",
      },
    ],
  },
  {
    heading: "Tracker",
    color: "#9B7BB8",
    items: [
      {
        emoji: "📈",
        title: "Gewichtsverlauf",
        summary:
          "Erfasse das Gewicht deines Kindes über die Zeit. Die Kurve wird zusammen mit den WHO-Referenzperzentilen (P3, P50, P97) angezeigt. Mia bewertet die Zunahme und gibt einen Hinweis, wenn sie auffällig ist.",
        tip: "Zugänglich über Kindprofil → Tracker → Gewichtsverlauf.",
      },
      {
        emoji: "🤱",
        title: "Still & Schlaf Tracker",
        summary:
          "Starte einen Timer für Stillen (links/rechts), Flasche oder Schlaf (Nap/Nacht). Mia sieht die letzten 24 Stunden und kann gezielt auf Schlaf- und Fütterungsfragen eingehen.",
        tip: "Den Tab-Tracker findest du auch im Hauptmenü — dort kannst du zwischen mehreren Kindern wechseln.",
      },
      {
        emoji: "📊",
        title: "Tages- & Wochenübersicht",
        summary:
          'Im Tracker siehst du eine Zusammenfassung für heute (Fütterungen, Schlafzeit) sowie Tabs für "Heute" und "Diese Woche" mit allen aufgezeichneten Einträgen. Einträge können per Wischgeste gelöscht werden.',
      },
    ],
  },
  {
    heading: "Erinnerungen",
    color: "#C8A96E",
    items: [
      {
        emoji: "🧠",
        title: "Automatische Erinnerungen",
        summary:
          "Mia speichert wichtige Erkenntnisse aus euren Gesprächen automatisch — zum Beispiel Schlafrituale, Allergien oder besondere Verhaltensweisen. So muss du nicht jedes Mal neu erklären.",
      },
      {
        emoji: "✏️",
        title: "Eigene Erinnerungen",
        summary:
          'Im Kindprofil unter "Erinnerungen" kannst du selbst Notizen anlegen und kategorisieren (Schlaf, Ernährung, Gesundheit, Entwicklung, Stimmung, Allgemein). Erinnerungen werden per Wischgeste gelöscht.',
        tip: 'Der Tab "Gedächtnis" zeigt alle Erinnerungen über alle Kinder hinweg.',
      },
    ],
  },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function GuideScreen() {
  const [expanded, setExpanded] = useState<string | null>(null);

  function toggle(key: string) {
    setExpanded((prev) => (prev === key ? null : key));
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>So funktioniert Mia</Text>
          <Text style={styles.pageSubtitle}>Alle Features auf einen Blick — tippe auf eine Karte für Details.</Text>
        </View>

        {GROUPS.map((group) => (
          <View key={group.heading} style={styles.group}>
            <Text style={[styles.groupHeading, { color: group.color }]}>{group.heading}</Text>

            {group.items.map((item) => {
              const key = `${group.heading}__${item.title}`;
              const isOpen = expanded === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.card, isOpen && { borderColor: group.color, borderWidth: 1.5 }]}
                  onPress={() => toggle(key)}
                  activeOpacity={0.8}
                >
                  <View style={styles.cardRow}>
                    <Text style={styles.cardEmoji}>{item.emoji}</Text>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Ionicons
                      name={isOpen ? "chevron-up" : "chevron-down"}
                      size={16}
                      color="#B0A89A"
                    />
                  </View>

                  {isOpen && (
                    <View style={styles.cardBody}>
                      <Text style={styles.cardSummary}>{item.summary}</Text>
                      {item.tip && (
                        <View style={[styles.tipRow, { borderLeftColor: group.color }]}>
                          <Text style={[styles.tipText, { color: group.color }]}>
                            💡 {item.tip}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        <Text style={styles.footer}>
          Mia ist eine KI-Assistentin und kein Ersatz für ärztlichen Rat. Bei medizinischen Fragen wende dich immer an deinen Kinderarzt.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FDFAF6" },
  content: { padding: 20, paddingBottom: 48 },

  pageHeader: { marginBottom: 28 },
  pageTitle: { fontSize: 26, fontWeight: "800", color: "#2D2A26", letterSpacing: -0.3 },
  pageSubtitle: { fontSize: 14, color: "#7A7269", marginTop: 6, lineHeight: 20 },

  group: { marginBottom: 28 },
  groupHeading: {
    fontSize: 13, fontWeight: "800",
    textTransform: "uppercase", letterSpacing: 0.8,
    marginBottom: 10,
  },

  card: {
    backgroundColor: "#F5F0E8",
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5DDD5",
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardEmoji: { fontSize: 20, width: 28, textAlign: "center" },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#2D2A26", flex: 1 },

  cardBody: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#E5DDD5" },
  cardSummary: { fontSize: 14, color: "#4A4440", lineHeight: 21 },

  tipRow: {
    marginTop: 10,
    borderLeftWidth: 3,
    paddingLeft: 10,
    paddingVertical: 2,
  },
  tipText: { fontSize: 13, lineHeight: 19, fontWeight: "600" },

  footer: {
    fontSize: 12, color: "#B0A89A", textAlign: "center",
    lineHeight: 18, marginTop: 8, fontStyle: "italic",
  },
});
