import React from "react";
import { StyleProp, StyleSheet, Switch, Text, TextInput, TextInputProps, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FONT, RADIUS, TYPE, ThemeColors } from "../../constants/design";
import { useColors, useThemedStyles } from "../../contexts/ThemeContext";
import { Card } from "./Card";
import { IconSquircle } from "./IconSquircle";
import { PressableScale } from "./PressableScale";
import { Ton } from "./ton";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

/** Abschnitts-Überschrift über einer Gruppe, z. B. „STRAFEN & SPIELE". */
export function FormSection({ title, children, style }: { title?: string; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[{ gap: 8 }, style]}>
      {title ? <Text style={styles.section} accessibilityRole="header">{title}</Text> : null}
      {children}
    </View>
  );
}

/** Karte mit Zeilen und feinen Trennlinien dazwischen. */
export function ListGroup({ children }: { children: React.ReactNode }) {
  const styles = useThemedStyles(makeStyles);
  const kinder = React.Children.toArray(children).filter(Boolean);
  return (
    <Card style={styles.gruppe}>
      {kinder.map((k, i) => (
        <View key={i} style={i > 0 ? styles.trenner : undefined}>{k}</View>
      ))}
    </Card>
  );
}

interface RowProps {
  title: string;
  subtitle?: string;
  /** Wert rechts, z. B. „Die Hellen" oder „5 Kategorien". */
  value?: string;
  icon?: IconName;
  emoji?: string;
  ton?: Ton;
  onPress?: () => void;
  /** Eigenes Element rechts statt Wert + Pfeil (z. B. ein Logo). */
  right?: React.ReactNode;
  destructive?: boolean;
  accessibilityLabel?: string;
}

/** Zeile in einer ListGroup: Symbol, Titel, Wert, Pfeil. */
export function ListRow({ title, subtitle, value, icon, emoji, ton = "neutral", onPress, right, destructive, accessibilityLabel }: RowProps) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const inhalt = (
    <>
      {icon || emoji ? <IconSquircle icon={icon} emoji={emoji} ton={destructive ? "coral" : ton} size={34} /> : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.rowTitle, destructive && { color: c.dangerText }]} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.rowSub} numberOfLines={2}>{subtitle}</Text> : null}
      </View>
      {right ?? (value ? <Text style={styles.rowValue} numberOfLines={1}>{value}</Text> : null)}
      {onPress && !right ? <Ionicons name="chevron-forward" size={18} color={c.textMuted} /> : null}
    </>
  );
  return onPress ? (
    <PressableScale onPress={onPress} scaleTo={0.98} style={styles.row} accessibilityLabel={accessibilityLabel ?? [title, value].filter(Boolean).join(": ")}>
      {inhalt}
    </PressableScale>
  ) : (
    <View style={styles.row} accessible accessibilityLabel={accessibilityLabel ?? [title, value].filter(Boolean).join(": ")}>{inhalt}</View>
  );
}

/** Zeile mit Schalter. */
export function ToggleRow({ title, subtitle, icon, emoji, ton, value, onValueChange, disabled }: Omit<RowProps, "onPress" | "right" | "value"> & {
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.row}>
      {icon || emoji ? <IconSquircle icon={icon} emoji={emoji} ton={ton ?? "neutral"} size={34} /> : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.rowSub}>{subtitle}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: c.borderDark, true: c.blue }}
        thumbColor="#FFFFFF"
        ios_backgroundColor={c.borderDark}
        // Web färbt den Knopf sonst in der Akzentfarbe ein.
        {...({ activeThumbColor: "#FFFFFF" } as object)}
        accessibilityLabel={title}
      />
    </View>
  );
}

interface FieldProps extends TextInputProps {
  label: string;
  /** Hinweis unter dem Feld, z. B. eine Fehlermeldung. */
  hint?: string;
  error?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

/** Eingabefeld mit Label darüber. */
export function Field({ label, hint, error, containerStyle, style, multiline, ...rest }: FieldProps) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[{ gap: 6 }, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={c.textLight}
        accessibilityLabel={label}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        style={[styles.input, multiline && styles.inputMulti, error && { borderColor: c.dangerText, borderWidth: 1.5 }, style]}
        {...rest}
      />
      {hint ? <Text style={[styles.hint, error && { color: c.dangerText }]}>{hint}</Text> : null}
    </View>
  );
}

/** Feld-ähnlicher Knopf, z. B. für Datum oder Uhrzeit. */
export function FieldButton({ label, value, placeholder, icon, onPress, onClear }: {
  label: string;
  value?: string;
  placeholder?: string;
  icon?: IconName;
  onPress: () => void;
  onClear?: () => void;
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={{ gap: 6, flex: 1 }}>
      <Text style={styles.label}>{label}</Text>
      <View>
        <PressableScale onPress={onPress} scaleTo={0.98} style={[styles.input, styles.fieldButton]} accessibilityLabel={`${label}: ${value ?? placeholder ?? "leer"}`}>
          {icon ? <Ionicons name={icon} size={17} color={c.blue} /> : null}
          <Text style={[styles.fieldButtonText, !value && { color: c.textLight }]} numberOfLines={1}>{value ?? placeholder ?? ""}</Text>
        </PressableScale>
        {value && onClear ? (
          <PressableScale onPress={onClear} style={styles.clear} accessibilityLabel={`${label} entfernen`}>
            <Ionicons name="close-circle" size={18} color={c.textMuted} />
          </PressableScale>
        ) : null}
      </View>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    section: { ...TYPE.label, color: c.textMuted, paddingHorizontal: 4 },
    gruppe: { paddingVertical: 2, paddingHorizontal: 14 },
    trenner: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
    row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56, paddingVertical: 8 },
    rowTitle: { fontFamily: FONT.w700, fontSize: 16, color: c.textDark },
    rowSub: { ...TYPE.caption, fontSize: 13, color: c.textMuted },
    rowValue: { fontFamily: FONT.w600, fontSize: 15, color: c.textMuted, maxWidth: "45%" },
    label: { ...TYPE.label, color: c.textMuted },
    input: {
      minHeight: 50, borderRadius: RADIUS.md, paddingHorizontal: 14, backgroundColor: c.card,
      borderWidth: StyleSheet.hairlineWidth, borderColor: c.hairline,
      fontFamily: FONT.w600, fontSize: 16, color: c.textDark,
    },
    inputMulti: { minHeight: 96, paddingTop: 12, paddingBottom: 12 },
    hint: { ...TYPE.caption, fontSize: 13, color: c.textMuted },
    fieldButton: { flexDirection: "row", alignItems: "center", gap: 10 },
    fieldButtonText: { flex: 1, fontFamily: FONT.w600, fontSize: 16, color: c.textDark },
    clear: { position: "absolute", right: 2, top: 3, width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  });
