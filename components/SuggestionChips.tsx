import { ScrollView, TouchableOpacity, Text, StyleSheet } from "react-native";
import { COLORS } from "../constants/design";

const STAMMTISCH_CHIPS = [
  "Was darf ich am Stammtisch? 📜",
  "Welches Bier empfiehlst du? 🍺",
  "Strafe berechnen ⏱️",
  "Wer war zuletzt spät dran? 😅",
  "Stammtisch-Tradition erklären 🎩",
  "Guter Trinkspruch 🥂",
  "Was macht ein guter Stammtisch aus?",
  "Regeln für Neulinge 👋",
];

interface Props {
  onSend: (text: string) => void;
}

export default function SuggestionChips({ onSend }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.container}
    >
      {STAMMTISCH_CHIPS.map((chip) => (
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
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.blue,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: {
    color: COLORS.blue,
    fontSize: 14,
    fontWeight: "600",
  },
});
