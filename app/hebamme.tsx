import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Linking,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const TIPS = [
  {
    icon: "calendar-outline",
    title: "Früh suchen — ab SSW 8",
    text: "Hebammen sind oft Monate im Voraus ausgebucht. Starte die Suche so früh wie möglich, idealerweise ab der 8.–10. Schwangerschaftswoche.",
  },
  {
    icon: "people-outline",
    title: "Was macht eine Hebamme?",
    text: "Hebammen betreuen dich während der Schwangerschaft, bei der Geburt und im Wochenbett (bis zu 12 Wochen nach der Geburt). Die Kosten trägt die Krankenkasse.",
  },
  {
    icon: "home-outline",
    title: "Beleghebamme vs. freie Hebamme",
    text: "Eine Beleghebamme begleitet dich auch in der Klinik. Eine freie Hebamme betreut Schwangerschaft und Wochenbett — ideal für Hausgeburten oder Geburtshäuser.",
  },
  {
    icon: "chatbubble-outline",
    title: "Was beim Erstkontakt fragen?",
    text: "Erfahrung, Kapazität, Erreichbarkeit, Philosophie (z. B. natürliche Geburt vs. Schmerzmittel), und ob sie Beleghebamme ist.",
  },
  {
    icon: "heart-outline",
    title: "Kein Platz mehr? Alternativen",
    text: "Geburtshaus als Alternative zur Klinik. Hebammengruppen-Praxen haben oft mehr Kapazität. Auch Nachbarkreise oder benachbarte Städte lohnen sich.",
  },
];

export default function HebammeScreen() {
  const [plz, setPlz] = useState("");

  function openSearch() {
    if (plz.trim().length < 4) {
      Alert.alert("PLZ eingeben", "Bitte gib deine Postleitzahl ein.");
      return;
    }
    // Öffnet die offizielle Suche des Deutschen Hebammenverbands
    Linking.openURL(`https://www.hebammenverband.de/hebammensuche/?plz=${plz.trim()}&umkreis=20`);
  }

  function openGeburtshaus() {
    Linking.openURL("https://www.netzwerk-der-geburtshaeuser.de/geburtshaus-suche/");
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={24} color="#4A7C6F" />
      </TouchableOpacity>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerEmoji}>🤝</Text>
          <Text style={styles.title}>Hebamme finden</Text>
          <Text style={styles.subtitle}>
            Eine gute Hebamme ist einer der wichtigsten Begleiter in dieser Zeit — such sie früh.
          </Text>
        </View>

        {/* PLZ Suche */}
        <View style={styles.searchCard}>
          <Text style={styles.searchTitle}>Jetzt in deiner Nähe suchen</Text>
          <Text style={styles.searchSub}>
            Öffnet die offizielle Suche des Deutschen Hebammenverbands
          </Text>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.plzInput}
              placeholder="Deine PLZ"
              placeholderTextColor="#B0A89A"
              value={plz}
              onChangeText={setPlz}
              keyboardType="numeric"
              maxLength={5}
              returnKeyType="search"
              onSubmitEditing={openSearch}
            />
            <TouchableOpacity
              style={[styles.searchBtn, plz.trim().length < 4 && styles.searchBtnDisabled]}
              onPress={openSearch}
              disabled={plz.trim().length < 4}
            >
              <Ionicons name="search" size={20} color="#FFFFFF" />
              <Text style={styles.searchBtnText}>Suchen</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.geburtshausBtn} onPress={openGeburtshaus}>
            <Ionicons name="home-outline" size={16} color="#9B7BB8" />
            <Text style={styles.geburtshausBtnText}>Geburtshaus in der Nähe suchen</Text>
          </TouchableOpacity>
        </View>

        {/* Tips */}
        <Text style={styles.sectionTitle}>Was du wissen solltest</Text>
        {TIPS.map((tip) => (
          <View key={tip.title} style={styles.tipCard}>
            <View style={styles.tipIcon}>
              <Ionicons name={tip.icon as any} size={22} color="#4A7C6F" />
            </View>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>{tip.title}</Text>
              <Text style={styles.tipText}>{tip.text}</Text>
            </View>
          </View>
        ))}

        {/* Kasseninfo */}
        <View style={styles.infoBox}>
          <Ionicons name="shield-checkmark-outline" size={20} color="#4A7C6F" />
          <Text style={styles.infoBoxText}>
            Hebammenleistungen während Schwangerschaft, Geburt und Wochenbett werden vollständig von der gesetzlichen Krankenkasse übernommen — du zahlst nichts dazu.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FDFAF6" },
  backBtn: { padding: 12, paddingBottom: 0 },
  content: { padding: 20, paddingBottom: 48 },

  header: { alignItems: "center", marginBottom: 28, paddingTop: 8 },
  headerEmoji: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 26, fontWeight: "800", color: "#2D2A26", letterSpacing: -0.3, marginBottom: 10 },
  subtitle: {
    fontSize: 15, color: "#7A7269", textAlign: "center", lineHeight: 22, paddingHorizontal: 16,
  },

  searchCard: {
    backgroundColor: "#EAF2EF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 28,
    borderWidth: 1.5,
    borderColor: "#C5DDD8",
  },
  searchTitle: { fontSize: 17, fontWeight: "700", color: "#2D2A26", marginBottom: 4 },
  searchSub: { fontSize: 13, color: "#7A7269", marginBottom: 16, lineHeight: 18 },
  searchRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  plzInput: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 16,
    color: "#2D2A26",
  },
  searchBtn: {
    backgroundColor: "#4A7C6F",
    borderRadius: 12,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  searchBtnDisabled: { opacity: 0.4 },
  searchBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  geburtshausBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    justifyContent: "center",
    borderTopWidth: 1,
    borderTopColor: "#C5DDD8",
    marginTop: 4,
  },
  geburtshausBtnText: { color: "#9B7BB8", fontSize: 14, fontWeight: "600" },

  sectionTitle: {
    fontSize: 13, fontWeight: "700", color: "#7A7269",
    letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 14,
  },

  tipCard: {
    flexDirection: "row",
    backgroundColor: "#F0EBE3",
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    gap: 14,
    alignItems: "flex-start",
  },
  tipIcon: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: "#EAF2EF",
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  tipContent: { flex: 1 },
  tipTitle: { fontSize: 15, fontWeight: "700", color: "#2D2A26", marginBottom: 4 },
  tipText: { fontSize: 13, color: "#7A7269", lineHeight: 19 },

  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#EAF2EF",
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#C5DDD8",
  },
  infoBoxText: { flex: 1, fontSize: 13, color: "#4A7C6F", lineHeight: 20, fontWeight: "500" },
});
