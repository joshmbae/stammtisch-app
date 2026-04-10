import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Swipeable from "react-native-gesture-handler/Swipeable";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useLocalSearchParams, router, useFocusEffect } from "expo-router";
import { Memory } from "../../types";
import { loadMemories, saveMemories } from "../../utils/storage";

const CATEGORY_LABELS: Record<Memory["category"], string> = {
  sleep: "Schlaf",
  feeding: "Ernährung",
  health: "Gesundheit",
  development: "Entwicklung",
  general: "Allgemein",
  mood: "Stimmung",
};

const CATEGORY_COLORS: Record<Memory["category"], string> = {
  sleep: "#7B9EC8",
  feeding: "#4A7C6F",
  health: "#D4856A",
  development: "#9B7BB8",
  general: "#C8A96E",
  mood: "#D4856A",
};

export default function MemoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [memories, setMemories] = useState<Memory[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadMemories(id).then(setMemories);
    }, [id])
  );

  const deleteMemory = useCallback(
    async (memoryId: string) => {
      const updated = memories.filter((m) => m.id !== memoryId);
      setMemories(updated);
      await saveMemories(id, updated);
    },
    [memories, id]
  );

  const confirmDelete = (memoryId: string) => {
    Alert.alert("Erinnerung löschen?", "Diese Info wird dauerhaft entfernt.", [
      { text: "Abbrechen", style: "cancel" },
      { text: "Löschen", style: "destructive", onPress: () => deleteMemory(memoryId) },
    ]);
  };

  const renderRightActions = (memoryId: string) => (
    <TouchableOpacity style={styles.deleteAction} onPress={() => confirmDelete(memoryId)}>
      <Text style={styles.deleteActionText}>Löschen</Text>
    </TouchableOpacity>
  );

  const renderItem = ({ item }: { item: Memory }) => (
    <Swipeable renderRightActions={() => renderRightActions(item.id)}>
      <View style={styles.card}>
        <View style={[styles.categoryBadge, { backgroundColor: CATEGORY_COLORS[item.category] }]}>
          <Text style={styles.categoryText}>{CATEGORY_LABELS[item.category]}</Text>
        </View>
        <Text style={styles.content}>{item.content}</Text>
        <Text style={styles.date}>
          {new Date(item.createdAt).toLocaleDateString("de-DE", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })}
        </Text>
      </View>
    </Swipeable>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Mias Erinnerungen</Text>
        </View>

        {memories.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🧠</Text>
            <Text style={styles.emptyText}>
              Noch keine Erinnerungen gespeichert.{"\n"}Mia lernt dein Kind beim Chatten kennen.
            </Text>
          </View>
        ) : (
          <FlatList
            data={memories}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
          />
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FDFAF6" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EDE8E0",
    gap: 12,
  },
  backBtn: { padding: 4 },
  backText: { fontSize: 32, color: "#4A7C6F", lineHeight: 36 },
  title: { fontSize: 18, fontWeight: "700", color: "#2D2A26" },
  list: { padding: 16, gap: 10 },
  card: {
    backgroundColor: "#F0EBE3",
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  categoryText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  content: { fontSize: 15, color: "#2D2A26", lineHeight: 21 },
  date: { fontSize: 12, color: "#7A7269" },
  deleteAction: {
    backgroundColor: "#C0392B",
    justifyContent: "center",
    alignItems: "center",
    width: 90,
    borderRadius: 14,
    marginLeft: 8,
  },
  deleteActionText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 16 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 15, color: "#7A7269", textAlign: "center", lineHeight: 22 },
});
