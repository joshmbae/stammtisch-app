import React, { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, LinearTransition } from "react-native-reanimated";
import { FONT, RADIUS, TYPE, ThemeColors } from "../../constants/design";
import { useColors, useThemedStyles } from "../../contexts/ThemeContext";
import { useSession } from "../../contexts/SessionContext";
import { TerminAbend } from "../../utils/useTerminAbend";
import { agendaPunkte, agendaText } from "../../utils/agenda";
import { displayName } from "../../utils/format";
import { Avatar, Button, Card, PressableScale } from "../ui";

/**
 * Worüber an dem Abend geredet werden soll. Vorher offen; live einklappbar
 * (zu Beginn zu), damit sie Verspätungen und Strafen nicht nach unten
 * schiebt. Unter jedem Punkt steht, wer ihn eingetragen hat.
 */
export function Agenda({ abend, einklappbar, enterIndex }: { abend: TerminAbend; einklappbar?: boolean; enterIndex?: number }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const { activeMemberId } = useSession();
  const punkte = agendaPunkte(abend.agendaText);
  const [offen, setOffen] = useState(false);
  const [neu, setNeu] = useState("");
  const [aufgeklappt, setAufgeklappt] = useState(!einklappbar);

  function hinzufuegen() {
    const text = neu.trim();
    if (!text) return;
    abend.agendaSpeichern(agendaText([...punkte, { text, von: activeMemberId ?? undefined }])).catch(() => {});
    setNeu("");
    setOffen(false);
  }

  function entfernen(i: number) {
    abend.agendaSpeichern(agendaText(punkte.filter((_, k) => k !== i))).catch(() => {});
  }

  const leer = punkte.length === 0;
  const anzahl = leer ? "" : punkte.length === 1 ? "1 Punkt" : `${punkte.length} Punkte`;

  return (
    <Card enterIndex={enterIndex} style={{ gap: 10, paddingVertical: einklappbar && !aufgeklappt ? 6 : undefined }}>
      <View style={styles.kopf}>
        <PressableScale
          onPress={einklappbar ? () => { setAufgeklappt((v) => !v); setOffen(false); } : undefined}
          disabled={!einklappbar}
          scaleTo={0.99}
          style={styles.titelZeile}
          accessibilityRole={einklappbar ? "button" : undefined}
          accessibilityLabel={einklappbar ? `Agenda, ${anzahl || "nichts geplant"}` : undefined}
          accessibilityState={einklappbar ? { expanded: aufgeklappt } : undefined}
        >
          <Text style={styles.kartenTitel} accessibilityRole="header">Agenda</Text>
          <Text style={styles.meta} numberOfLines={1}>{anzahl || (einklappbar ? "nichts geplant" : "")}</Text>
          {einklappbar ? <Ionicons name={aufgeklappt ? "chevron-up" : "chevron-down"} size={16} color={c.textMuted} style={{ marginLeft: 2 }} /> : null}
        </PressableScale>
        {aufgeklappt ? (
          <PressableScale onPress={() => setOffen((v) => !v)} style={styles.plusKnopf} accessibilityLabel="Agenda-Punkt hinzufügen" accessibilityState={{ expanded: offen }}>
            <Ionicons name={offen ? "close" : "add"} size={18} color={c.blue} />
            <Text style={styles.plusText}>{offen ? "Abbrechen" : "Punkt"}</Text>
          </PressableScale>
        ) : null}
      </View>

      {offen ? (
        <Animated.View entering={FadeIn.duration(200)} style={styles.neuZeile}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={neu}
            onChangeText={setNeu}
            onSubmitEditing={hinzufuegen}
            returnKeyType="done"
            autoFocus
            placeholder="Worüber wollt ihr reden?"
            placeholderTextColor={c.textLight}
            accessibilityLabel="Neuer Agenda-Punkt"
          />
          <Button label="Hinzufügen" size="sm" variant="blue" onPress={hinzufuegen} disabled={!neu.trim()} />
        </Animated.View>
      ) : null}

      {leer && !offen && !einklappbar ? <Text style={styles.leer}>Noch nichts geplant. Was steht an?</Text> : null}

      {aufgeklappt && punkte.map((p, i) => {
        const autor = p.von ? abend.members.find((m) => m.id === p.von) : undefined;
        return (
          <Animated.View key={`${i}-${p.text}`} layout={LinearTransition} style={[styles.punktZeile, i > 0 && styles.trenner]}>
            <View style={styles.nummer}><Text style={styles.nummerText}>{i + 1}</Text></View>
            <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
              <Text style={styles.punktText}>{p.text}</Text>
              {autor ? (
                <View style={styles.autorZeile} accessibilityLabel={`eingetragen von ${displayName(autor)}`}>
                  <Avatar name={displayName(autor)} color={autor.avatarColor} photoUri={autor.photoUri} size={16} />
                  <Text style={styles.autorText} numberOfLines={1}>{displayName(autor)}</Text>
                </View>
              ) : null}
            </View>
            <PressableScale onPress={() => entfernen(i)} style={styles.entfernen} accessibilityLabel={`Punkt „${p.text}" entfernen`} hitSlop={4}>
              <Ionicons name="close" size={16} color={c.textMuted} />
            </PressableScale>
          </Animated.View>
        );
      })}
    </Card>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    kopf: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, minHeight: 44 },
    titelZeile: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44 },
    kartenTitel: { ...TYPE.heading, color: c.textDark },
    meta: { ...TYPE.caption, fontSize: 13, color: c.textMuted },
    plusKnopf: {
      height: 44, paddingHorizontal: 14, borderRadius: RADIUS.pill, flexDirection: "row", alignItems: "center", gap: 4,
      backgroundColor: c.blueBg,
    },
    plusText: { fontFamily: FONT.w600, fontSize: 14, color: c.blue },
    neuZeile: { flexDirection: "row", alignItems: "center", gap: 8 },
    input: {
      minHeight: 44, borderRadius: RADIUS.md, paddingHorizontal: 14, backgroundColor: c.cardAlt,
      fontFamily: FONT.w500, fontSize: 15, color: c.textDark,
    },
    leer: { ...TYPE.body, fontSize: 14, color: c.textMuted },
    punktZeile: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 48, paddingVertical: 6 },
    trenner: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
    nummer: { width: 28, height: 28, borderRadius: 14, backgroundColor: c.blueBg, alignItems: "center", justifyContent: "center" },
    nummerText: { fontFamily: FONT.w700, fontSize: 13, color: c.blue },
    punktText: { fontFamily: FONT.w600, fontSize: 15, color: c.textDark },
    autorZeile: { flexDirection: "row", alignItems: "center", gap: 5 },
    autorText: { ...TYPE.caption, fontSize: 12, color: c.textMuted, flexShrink: 1 },
    entfernen: { width: 44, height: 44, marginRight: -10, alignItems: "center", justifyContent: "center" },
  });
