import { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ActiveTimer } from "../types";

interface TimerCardProps {
  timer: ActiveTimer;
  onStop: () => void;
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function timerLabel(timer: ActiveTimer): string {
  if (timer.timerType === "feeding") {
    if (timer.feedingType === "bottle") return "Flasche";
    const sideMap = { left: "links", right: "rechts", both: "beide Seiten" };
    return `Stillen${timer.side ? " · " + sideMap[timer.side] : ""}`;
  }
  return timer.sleepType === "night" ? "Nachtschlaf" : "Mittagsschlaf / Nap";
}

export default function TimerCard({ timer, onStop }: TimerCardProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const initial = Math.floor((Date.now() - new Date(timer.startedAt).getTime()) / 1000);
    setElapsed(initial);
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [timer.startedAt]);

  const isSleep = timer.timerType === "sleep";
  const accentColor = isSleep ? "#9B7BB8" : "#4A7C6F";
  const bgColor = isSleep ? "#F5EEF9" : "#EAF2EF";
  const borderColor = isSleep ? "#DEC8F0" : "#C5DDD8";

  return (
    <View style={[styles.card, { backgroundColor: bgColor, borderColor }]}>
      <View style={styles.left}>
        {/* Pulsing dot */}
        <View style={[styles.dot, { backgroundColor: accentColor }]} />
        <View>
          <Text style={[styles.label, { color: accentColor }]}>{timerLabel(timer)}</Text>
          <Text style={[styles.elapsed, { color: accentColor }]}>{formatElapsed(elapsed)}</Text>
        </View>
      </View>
      <TouchableOpacity style={[styles.stopBtn, { backgroundColor: accentColor }]} onPress={onStop}>
        <Ionicons name="stop" size={16} color="#FFFFFF" />
        <Text style={styles.stopText}>Beenden</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 16,
  },
  left: { flexDirection: "row", alignItems: "center", gap: 12 },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  label: { fontSize: 13, fontWeight: "700", marginBottom: 2 },
  elapsed: { fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  stopBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  stopText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
});
