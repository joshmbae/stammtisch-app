import { ScrollView, TouchableOpacity, Text, StyleSheet } from "react-native";

function getChips(birthDate?: string): string[] {
  if (!birthDate) {
    return [
      "Hebamme finden 🤝",
      "Schwangerschaft 🤰",
      "Geburt vorbereiten 🏥",
      "Stillen 🤱",
      "Wochenbett",
      "Ich brauche Rat",
    ];
  }

  const days = Math.floor((Date.now() - new Date(birthDate).getTime()) / 86400000);

  if (days < 0) {
    // Noch ungeboren — Schwangerschaft
    const weeks = Math.abs(Math.floor(days / 7));
    return [
      `Noch ${weeks} Wochen 🗓️`,
      "Geburt vorbereiten 🏥",
      "Hebamme finden 🤝",
      "Klinikkoffer packen 🎒",
      "Stillen lernen 🤱",
      "Ich bin nervös",
    ];
  }

  if (days < 14) {
    return [
      "Stillen klappt nicht 😟",
      "Wie viel schlafen? 😴",
      "Nabelschnur pflegen",
      "Baby schreit viel",
      "Gewichtszunahme prüfen ⚖️",
      "Wochenbett-Tipps",
    ];
  }

  if (days < 90) {
    return [
      "Schlafrhythmus aufbauen 😴",
      "Schreien & Koliken 😢",
      "Stillen & Zufüttern 🤱",
      "Entwicklung 1-3 Monate 🌱",
      "Bin so erschöpft",
      "Ist das normal? 🤔",
    ];
  }

  if (days < 180) {
    return [
      "Schlafregression 4 Monate 😴",
      "Beikost vorbereiten 🥦",
      "Zahnen 🦷",
      "Krabbelkurs sinnvoll?",
      "Entwicklung 3-6 Monate 🌱",
      "Impfungen 🩺",
    ];
  }

  if (days < 365) {
    return [
      "Beikost starten 🥕",
      "Schlafen durchschlafen",
      "Erste Wörter 🗣️",
      "Sicherheit im Haus 🏠",
      "Entwicklung 6-12 Monate 🌱",
      "Abstillen wann? 🤱",
    ];
  }

  if (days < 730) {
    return [
      "Trotzphase 😤",
      "Sprechen fördern 🗣️",
      "Schlafen verbessern 😴",
      "Ernährung Kleinkind 🥗",
      "Geschwister bekommen?",
      "Kita-Eingewöhnung",
    ];
  }

  return [
    "Trotzphase 😤",
    "Sprechen & Sprache 🗣️",
    "Schlafprobleme 😴",
    "Ernährung 🥗",
    "Entwicklung 🌱",
    "Ich brauche Rat",
  ];
}

interface Props {
  onSend: (text: string) => void;
  birthDate?: string;
}

export default function SuggestionChips({ onSend, birthDate }: Props) {
  const chips = getChips(birthDate);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.container}
    >
      {chips.map((chip) => (
        <TouchableOpacity
          key={chip}
          style={styles.chip}
          onPress={() => onSend(chip)}
          activeOpacity={0.7}
        >
          <Text style={styles.chipText}>{chip}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 0 },
  row: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  chip: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#4A7C6F",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: {
    color: "#4A7C6F",
    fontSize: 14,
    fontWeight: "600",
  },
});
