import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { BabyProfile, ParentProfile, PregnancyProfile, ChatMessage, Memory, FeedingLog, SleepLog } from "../../types";
import { loadProfiles, loadParentProfiles, loadPregnancyProfiles, loadMessages, saveMessages, loadMemories, saveMemories, updateSessionPreview, loadFeedingLogs, loadSleepLogs, loadMilestoneProgress } from "../../utils/storage";
import { MILESTONES } from "../../utils/milestoneData";
import SuggestionChips from "../../components/SuggestionChips";

const API_URL = "https://mia-backend-production-17ee.up.railway.app";

export default function ChatScreen() {
  const { id, babyId: babyIdParam, pregnancyId: pregnancyIdParam } = useLocalSearchParams<{ id: string; babyId?: string; pregnancyId?: string }>();
  const [profile, setProfile] = useState<BabyProfile | null>(null);
  const [pregnancyProfile, setPregnancyProfile] = useState<PregnancyProfile | null>(null);
  const [activeBabyId, setActiveBabyId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [parents, setParents] = useState<ParentProfile[]>([]);
  const [parentMemories, setParentMemories] = useState<Memory[]>([]);
  const [recentFeedings, setRecentFeedings] = useState<FeedingLog[]>([]);
  const [recentSleeps, setRecentSleeps] = useState<SleepLog[]>([]);
  const [achievedMilestones, setAchievedMilestones] = useState<string[]>([]);
  const [tryingMilestones, setTryingMilestones] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    async function init() {
      if (id === "general") {
        const msgs = await loadMessages("general");
        if (msgs.length === 0) {
          const greeting: ChatMessage = {
            id: "greeting", role: "assistant",
            content: "Hallo! Ich bin Mia 👋 Du kannst mich alles rund um Schwangerschaft, Wochenbett und das erste Baby-Jahr fragen. Was beschäftigt dich?",
            timestamp: new Date().toISOString(),
          };
          setMessages([greeting]);
          await saveMessages("general", [greeting]);
        } else {
          setMessages(msgs);
        }
        return;
      }

      const parentList = await loadParentProfiles();
      setParents(parentList);
      const pMems = (await Promise.all(parentList.map((p) => loadMemories(p.id)))).flat();
      setParentMemories(pMems);

      // Schwangerschafts-Chat
      if (pregnancyIdParam) {
        setActiveBabyId(pregnancyIdParam);
        const pregnancyProfiles = await loadPregnancyProfiles();
        const foundPregnancy = pregnancyProfiles.find((p) => p.id === pregnancyIdParam) ?? null;
        setPregnancyProfile(foundPregnancy);
        const mems = await loadMemories(pregnancyIdParam);
        setMemories(mems);

        const msgs = await loadMessages(id);
        if (msgs.length === 0) {
          const greeting: ChatMessage = {
            id: "greeting", role: "assistant",
            content: `Hallo! Ich bin Mia 👋 Schön, dass du da bist. Ich begleite dich und ${foundPregnancy?.nickname ?? "euer Baby"} gerne durch die Schwangerschaft. Was beschäftigt dich gerade?`,
            timestamp: new Date().toISOString(),
          };
          setMessages([greeting]);
          await saveMessages(id, [greeting]);
        } else {
          setMessages(msgs);
        }
        return;
      }

      // Baby-Chat
      const resolvedBabyId = babyIdParam ?? null;
      if (resolvedBabyId) {
        setActiveBabyId(resolvedBabyId);
        const profiles = await loadProfiles();
        const found = profiles.find((p) => p.id === resolvedBabyId) ?? null;
        setProfile(found);
        const cutoff = Date.now() - 86400000;
        const [fl, sl] = await Promise.all([
          loadFeedingLogs(resolvedBabyId),
          loadSleepLogs(resolvedBabyId),
        ]);
        setRecentFeedings(fl.filter((f) => new Date(f.startedAt).getTime() > cutoff));
        setRecentSleeps(sl.filter((s) => new Date(s.startedAt).getTime() > cutoff));
        const mp = await loadMilestoneProgress(resolvedBabyId);
        setAchievedMilestones(
          mp.filter((p) => p.status === "achieved")
            .map((p) => MILESTONES.find((m) => m.id === p.milestoneId)?.title ?? p.milestoneId)
        );
        setTryingMilestones(
          mp.filter((p) => p.status === "trying")
            .map((p) => MILESTONES.find((m) => m.id === p.milestoneId)?.title ?? p.milestoneId)
        );
        const mems = await loadMemories(resolvedBabyId);
        setMemories(mems);

        const msgs = await loadMessages(id);
        if (msgs.length === 0) {
          const greeting: ChatMessage = {
            id: "greeting", role: "assistant",
            content: `Hallo! Ich bin Mia 👋 Schön, dass du da bist. Ich begleite dich und ${found?.name ?? "euch"} gerne durch den Alltag. Was beschäftigt dich gerade?`,
            timestamp: new Date().toISOString(),
          };
          setMessages([greeting]);
          await saveMessages(id, [greeting]);
        } else {
          setMessages(msgs);
        }
      }
    }
    init();
  }, [id, babyIdParam, pregnancyIdParam]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    const isGeneral = id === "general";
    const isPregnancy = !!pregnancyProfile;
    if (!text || !id || (!isGeneral && !profile && !isPregnancy) || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };

    const withUser = [...messages, userMsg];
    setMessages(withUser);
    setIsLoading(true);
    scrollToBottom();

    // Update session preview for baby chats
    if (!isGeneral && activeBabyId) {
      await updateSessionPreview(activeBabyId, id, text);
    }

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: withUser, profile, pregnancyProfile, memories, parents, parentMemories, recentFeedings, recentSleeps, achievedMilestones, tryingMilestones }),
      });

      const data = await res.json();

      if (data.emergency) {
        const isMental = data.type === "mental_health";
        Alert.alert(
          isMental ? "💙 Bitte hol dir Hilfe" : "🚨 Notruf",
          data.message,
          [{ text: "Verstanden", style: isMental ? "default" : "destructive" }]
        );
        const emergencyMsg: ChatMessage = {
          id: (Date.now() + 1).toString(), role: "assistant",
          content: `⚠️ ${data.message}`,
          timestamp: new Date().toISOString(),
        };
        const final = [...withUser, emergencyMsg];
        setMessages(final);
        await saveMessages(id, final);
      } else {
        const memoryRegex = /<memory category='(\w+)'>(.+?)<\/memory>/s;
        const pmemoryRegex = /<pmemory category='(\w+)'>(.+?)<\/pmemory>/s;
        const match = memoryRegex.exec(data.reply);
        const pmatch = pmemoryRegex.exec(data.reply);
        const displayText = data.reply
          .replace(memoryRegex, "")
          .replace(pmemoryRegex, "")
          .trim();

        if (match && activeBabyId) {
          const newMemory: Memory = {
            id: Date.now().toString(),
            babyId: activeBabyId,
            content: match[2].trim(),
            category: match[1] as Memory["category"],
            createdAt: new Date().toISOString(),
          };
          const updatedMemories = [...memories, newMemory];
          setMemories(updatedMemories);
          await saveMemories(activeBabyId, updatedMemories);
        }

        if (pmatch && parents.length > 0) {
          const firstParent = parents[0];
          const newPMemory: Memory = {
            id: (Date.now() + 2).toString(),
            babyId: firstParent.id,
            content: pmatch[2].trim(),
            category: pmatch[1] as Memory["category"],
            createdAt: new Date().toISOString(),
          };
          const updatedPMemories = [...parentMemories, newPMemory];
          setParentMemories(updatedPMemories);
          await saveMemories(firstParent.id, updatedPMemories);
        }

        const miaMsg: ChatMessage = {
          id: (Date.now() + 1).toString(), role: "assistant",
          content: displayText,
          timestamp: new Date().toISOString(),
        };
        const final = [...withUser, miaMsg];
        setMessages(final);
        await saveMessages(id, final);
      }
    } catch {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(), role: "assistant",
        content: "Verbindungsfehler. Ist das Backend gestartet?",
        timestamp: new Date().toISOString(),
      };
      const final = [...withUser, errorMsg];
      setMessages(final);
      await saveMessages(id, final);
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  }, [messages, memories, parents, parentMemories, id, activeBabyId, profile, pregnancyProfile, isLoading, scrollToBottom]);

  const send = useCallback(() => {
    sendMessage(input.trim());
    setInput("");
  }, [input, sendMessage]);

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === "user";
    return (
      <View style={[styles.bubbleRow, isUser && styles.bubbleRowUser]}>
        {!isUser && (
          <View
            style={[
              styles.avatarSmall,
              { backgroundColor: profile?.avatarColor ?? "#4A7C6F" },
            ]}
          >
            <Text style={styles.avatarSmallText}>M</Text>
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleMia]}>
          <Text style={isUser ? styles.bubbleTextUser : styles.bubbleTextMia}>
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        {id === "general" ? (
          <View style={styles.headerProfile}>
            <View style={[styles.avatarMed, { backgroundColor: "#4A7C6F" }]}>
              <Text style={styles.avatarMedText}>M</Text>
            </View>
            <Text style={styles.headerName}>Mia</Text>
          </View>
        ) : pregnancyProfile ? (
          <>
            <View style={styles.headerProfile}>
              <View style={[styles.avatarMed, { backgroundColor: pregnancyProfile.avatarColor }]}>
                <Text style={styles.avatarMedText}>🤰</Text>
              </View>
              <Text style={styles.headerName}>{pregnancyProfile.nickname}</Text>
            </View>
          </>
        ) : profile ? (
          <>
            <View style={styles.headerProfile}>
              <View style={[styles.avatarMed, { backgroundColor: profile.avatarColor }]}>
                <Text style={styles.avatarMedText}>
                  {profile.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.headerName}>{profile.name}</Text>
            </View>
            <TouchableOpacity onPress={() => router.push(`/memory/${id}`)} style={styles.memoryBtn}>
              <Text style={styles.memoryBtnText}>🧠</Text>
              {memories.length > 0 && (
                <View style={styles.memoryBadge}>
                  <Text style={styles.memoryBadgeText}>{memories.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          </>
        ) : null}
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />

        {/* Ladeindikator */}
        {isLoading && (
          <View style={styles.typingRow}>
            <View
              style={[
                styles.avatarSmall,
                { backgroundColor: profile?.avatarColor ?? "#4A7C6F" },
              ]}
            >
              <Text style={styles.avatarSmallText}>M</Text>
            </View>
            <View style={styles.typingBubble}>
              <Text style={styles.typingText}>Mia schreibt…</Text>
            </View>
          </View>
        )}

        {/* Suggestion Chips — nur wenn Chat leer (nur Begrüßung) */}
        {messages.length <= 1 && !isLoading && (
          <SuggestionChips
            onSend={sendMessage}
            birthDate={profile?.birthDate ?? (pregnancyProfile ? new Date(new Date(pregnancyProfile.dueDate).getTime() - 280 * 86400000).toISOString() : undefined)}
          />
        )}

        {/* Input */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Frag Mia..."
            placeholderTextColor="#B0A89A"
            value={input}
            onChangeText={setInput}
            multiline
            returnKeyType="send"
            onSubmitEditing={send}
            editable={!isLoading}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || isLoading) && styles.sendBtnDisabled]}
            onPress={send}
            disabled={!input.trim() || isLoading}
          >
            <Text style={styles.sendBtnText}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FDFAF6" },
  flex: { flex: 1 },
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
  headerProfile: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatarMed: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarMedText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  headerName: { fontSize: 17, fontWeight: "700", color: "#2D2A26" },
  messageList: { padding: 16, gap: 12 },
  bubbleRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 8,
  },
  bubbleRowUser: { flexDirection: "row-reverse" },
  avatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarSmallText: { fontSize: 12, fontWeight: "700", color: "#FFFFFF" },
  bubble: {
    maxWidth: "75%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleUser: { backgroundColor: "#4A7C6F", borderBottomRightRadius: 4 },
  bubbleMia: { backgroundColor: "#F0EDE8", borderBottomLeftRadius: 4 },
  bubbleTextUser: { color: "#FFFFFF", fontSize: 15, lineHeight: 21 },
  bubbleTextMia: { color: "#2D2A26", fontSize: 15, lineHeight: 21 },
  typingRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  typingBubble: {
    backgroundColor: "#F0EDE8",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
  },
  typingText: { color: "#7A7269", fontSize: 14, fontStyle: "italic" },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#EDE8E0",
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: "#F0EBE3",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: "#2D2A26",
    maxHeight: 100,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#4A7C6F",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: "#FFFFFF", fontSize: 20, fontWeight: "700" },
  memoryBtn: { marginLeft: "auto", padding: 4 },
  memoryBtnText: { fontSize: 22 },
  memoryBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: "#D4856A",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  memoryBadgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "700" },
});
