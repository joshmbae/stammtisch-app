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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { MemberProfile, ChatMessage, Erinnerung } from "../../types";
import {
  loadMembers,
  loadMessages,
  saveMessages,
  loadErinnerungen,
  saveErinnerungen,
  loadVerordnung,
  loadProtokolle,
  updateSessionPreview,
  updateGeneralSessionPreview,
} from "../../utils/storage";
import { COLORS } from "../../constants/design";
import SuggestionChips from "../../components/SuggestionChips";
import MarkdownText from "../../components/MarkdownText";

const API_URL = "http://192.168.1.102:3001";

export default function ChatScreen() {
  const { id, memberId: memberIdParam } = useLocalSearchParams<{ id: string; memberId?: string }>();
  const [member, setMember] = useState<MemberProfile | null>(null);
  const [alleMitglieder, setAlleMitglieder] = useState<MemberProfile[]>([]);
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [erinnerungen, setErinnerungen] = useState<Erinnerung[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    async function init() {
      const verordnung = await loadVerordnung();
      const alle = await loadMembers();
      setAlleMitglieder(alle);

      if (!memberIdParam) {
        const msgs = await loadMessages(id);
        if (msgs.length === 0) {
          const greeting: ChatMessage = {
            id: "greeting", role: "assistant",
            content: "Servus! Ich bin der Sepp 🧔 Ich kenn mich aus mit Stammtisch — Regeln, Bier, Traditionen, Strafen, alles. Was liegt an?",
            timestamp: new Date().toISOString(),
          };
          setMessages([greeting]);
          await saveMessages(id, [greeting]);
        } else {
          setMessages(msgs);
        }
        return;
      }

      if (memberIdParam) {
        setActiveMemberId(memberIdParam);
        const found = alle.find((m) => m.id === memberIdParam) ?? null;
        setMember(found);
        const erins = await loadErinnerungen(memberIdParam);
        setErinnerungen(erins);

        const msgs = await loadMessages(id);
        if (msgs.length === 0) {
          const name = found?.name ?? "dem Mitglied";
          const greeting: ChatMessage = {
            id: "greeting", role: "assistant",
            content: `Servus! Ich bin der Sepp 🧔 Was kann i dir über ${name} sagen — oder was willst wissen?`,
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
  }, [id, memberIdParam]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    const isGeneral = !memberIdParam;
    if (!text || !id || (!isGeneral && !member) || isLoading) return;

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

    if (isGeneral) {
      await updateGeneralSessionPreview(id, text);
    } else if (activeMemberId) {
      await updateSessionPreview(activeMemberId, id, text);
    }

    try {
      const [verordnung, protokolle] = await Promise.all([loadVerordnung(), loadProtokolle()]);
      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: withUser,
          member: isGeneral ? null : member,
          erinnerungen: isGeneral ? [] : erinnerungen,
          alleMitglieder,
          verordnung,
          protokolle,
        }),
      });

      const data = await res.json();

      // Erinnerungen aus <erinnerung> Tags extrahieren
      const erinnerungRegex = /<erinnerung category='(\w+)'>(.+?)<\/erinnerung>/s;
      const match = erinnerungRegex.exec(data.reply);
      const displayText = data.reply.replace(erinnerungRegex, "").trim();

      if (match && activeMemberId) {
        const newErinnerung: Erinnerung = {
          id: Date.now().toString(),
          memberId: activeMemberId,
          content: match[2].trim(),
          category: match[1] as Erinnerung["category"],
          createdAt: new Date().toISOString(),
        };
        const updated = [...erinnerungen, newErinnerung];
        setErinnerungen(updated);
        await saveErinnerungen(activeMemberId, updated);
      }

      const seppMsg: ChatMessage = {
        id: (Date.now() + 1).toString(), role: "assistant",
        content: displayText,
        timestamp: new Date().toISOString(),
      };
      const final = [...withUser, seppMsg];
      setMessages(final);
      await saveMessages(id, final);
    } catch {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(), role: "assistant",
        content: "Hm, da ist was schiefgloffen. Ist das Backend gestartet?",
        timestamp: new Date().toISOString(),
      };
      const final = [...withUser, errorMsg];
      setMessages(final);
      await saveMessages(id, final);
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  }, [messages, erinnerungen, alleMitglieder, id, activeMemberId, member, isLoading, scrollToBottom]);

  const send = useCallback(() => {
    sendMessage(input.trim());
    setInput("");
  }, [input, sendMessage]);

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === "user";
    return (
      <View style={[styles.bubbleRow, isUser && styles.bubbleRowUser]}>
        {!isUser && (
          <View style={styles.avatarSmall}>
            <Text style={styles.avatarSmallText}>S</Text>
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleSepp]}>
          <MarkdownText variant={isUser ? "user" : "sepp"}>
            {item.content}
          </MarkdownText>
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
        {!memberIdParam ? (
          <View style={styles.headerProfile}>
            <View style={styles.avatarMed}>
              <Text style={styles.avatarMedEmoji}>🧔</Text>
            </View>
            <View>
              <Text style={styles.headerName}>Sepp</Text>
              <Text style={styles.headerSub}>Stammtisch-Experte</Text>
            </View>
          </View>
        ) : member ? (
          <View style={styles.headerProfile}>
            <View style={[styles.avatarMed, { backgroundColor: member.avatarColor }]}>
              <Text style={styles.avatarMedText}>{member.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View>
              <Text style={styles.headerName}>{member.name}</Text>
              <Text style={styles.headerSub}>Sepp über {member.name}</Text>
            </View>
          </View>
        ) : null}
        {erinnerungen.length > 0 && (
          <View style={styles.erinnerungBadge}>
            <Text style={styles.erinnerungBadgeText}>🧠 {erinnerungen.length}</Text>
          </View>
        )}
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

        {isLoading && (
          <View style={styles.typingRow}>
            <View style={styles.avatarSmall}>
              <Text style={styles.avatarSmallText}>S</Text>
            </View>
            <View style={styles.typingBubble}>
              <Text style={styles.typingText}>Sepp überlegt…</Text>
            </View>
          </View>
        )}

        {messages.length <= 1 && !isLoading && (
          <SuggestionChips onSend={sendMessage} />
        )}

        {/* Input */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Frag den Sepp…"
            placeholderTextColor={COLORS.textLight}
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
  safe: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },

  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    gap: 12, backgroundColor: COLORS.card,
  },
  backBtn: { padding: 4 },
  backText: { fontSize: 32, color: COLORS.blue, lineHeight: 36 },
  headerProfile: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  avatarMed: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: COLORS.gold, alignItems: "center", justifyContent: "center",
  },
  avatarMedEmoji: { fontSize: 20 },
  avatarMedText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  headerName: { fontSize: 17, fontWeight: "700", color: COLORS.textDark },
  headerSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },

  erinnerungBadge: {
    backgroundColor: COLORS.goldBg, borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: COLORS.gold + "44",
  },
  erinnerungBadgeText: { fontSize: 12, fontWeight: "700", color: COLORS.gold },

  messageList: { padding: 16, gap: 12 },
  bubbleRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginBottom: 8 },
  bubbleRowUser: { flexDirection: "row-reverse" },

  avatarSmall: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.gold, alignItems: "center", justifyContent: "center",
  },
  avatarSmallText: { fontSize: 12, fontWeight: "700", color: "#FFFFFF" },

  bubble: { maxWidth: "78%", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  bubbleUser: { backgroundColor: COLORS.blue, borderBottomRightRadius: 4 },
  bubbleSepp: { backgroundColor: COLORS.card, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: COLORS.border },

  typingRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  typingBubble: {
    backgroundColor: COLORS.card, paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 18, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: COLORS.border,
  },
  typingText: { color: COLORS.textMuted, fontSize: 14, fontStyle: "italic" },

  inputRow: {
    flexDirection: "row", alignItems: "flex-end",
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: COLORS.border,
    gap: 10, backgroundColor: COLORS.card,
  },
  input: {
    flex: 1, backgroundColor: COLORS.background,
    borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, color: COLORS.textDark, maxHeight: 100,
    borderWidth: 1, borderColor: COLORS.border,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: COLORS.blue, alignItems: "center", justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: "#FFFFFF", fontSize: 20, fontWeight: "700" },
});
