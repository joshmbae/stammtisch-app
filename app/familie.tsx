import { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ParentProfile } from "../types";
import { loadParentProfiles } from "../utils/storage";

export default function FamilieScreen() {
  const [parents, setParents] = useState<ParentProfile[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadParentProfiles().then(setParents);
    }, [])
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#4A7C6F" />
          </TouchableOpacity>
          <Text style={styles.title}>Familie & Mehr</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Eltern */}
        <Text style={styles.sectionTitle}>🏡 Eltern</Text>
        {parents.map((parent) => (
          <TouchableOpacity
            key={parent.id}
            style={styles.card}
            onPress={() => router.push(`/profile/parent/${parent.id}`)}
            activeOpacity={0.85}
          >
            <View style={styles.parentAvatar}>
              <Text style={styles.parentAvatarText}>{parent.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardName}>{parent.name}</Text>
              <Text style={styles.cardSub}>{parent.role}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#B0A89A" />
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.addDashed, { marginBottom: 28 }]}
          onPress={() => router.push("/profile/parent-new")}
        >
          <Ionicons name="add-circle-outline" size={18} color="#4A7C6F" />
          <Text style={styles.addDashedText}>
            {parents.length === 0 ? "Elternteil hinzufügen" : "Weiteres Elternteil"}
          </Text>
        </TouchableOpacity>

        {/* Hebamme */}
        <Text style={styles.sectionTitle}>🤝 Unterstützung</Text>
        <TouchableOpacity
          style={styles.hebammeCard}
          onPress={() => router.push("/hebamme")}
          activeOpacity={0.85}
        >
          <View style={styles.hebammeIcon}>
            <Text style={{ fontSize: 26 }}>🤝</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardName}>Hebamme finden</Text>
            <Text style={styles.cardSub}>Tipps & offizielle Suche nach PLZ</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#9B7BB8" />
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FDFAF6" },
  content: { padding: 20, paddingBottom: 48 },
  header: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginBottom: 24, paddingTop: 4,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: "700", color: "#2D2A26" },

  sectionTitle: { fontSize: 15, fontWeight: "800", color: "#2D2A26", marginBottom: 12, letterSpacing: -0.2 },

  card: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#FFFFFF", borderRadius: 18,
    padding: 14, marginBottom: 10, gap: 14,
    shadowColor: "#2D2A26", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
  },
  parentAvatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: "#C8A96E", alignItems: "center", justifyContent: "center",
  },
  parentAvatarText: { fontSize: 21, fontWeight: "700", color: "#FFFFFF" },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: "700", color: "#2D2A26" },
  cardSub: { fontSize: 13, color: "#7A7269", marginTop: 3 },

  addDashed: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 13, gap: 6, borderRadius: 16,
    borderWidth: 1.5, borderColor: "#C5DDD8", borderStyle: "dashed",
  },
  addDashedText: { color: "#4A7C6F", fontSize: 14, fontWeight: "600" },

  hebammeCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#F5EEF9", borderRadius: 18,
    padding: 14, gap: 14,
    borderWidth: 1.5, borderColor: "#DEC8F0",
    shadowColor: "#2D2A26", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  hebammeIcon: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: "#EEE0F8", alignItems: "center", justifyContent: "center",
  },
});
