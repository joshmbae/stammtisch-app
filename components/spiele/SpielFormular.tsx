import React, { useState } from "react";
import { StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Spiel, SPIEL_VORLAGEN, StrafKategorie } from "../../types";
import { FONT, MAX_FONT_SCALE, RADIUS, TYPE, ThemeColors } from "../../constants/design";
import { useColors, useThemedStyles } from "../../contexts/ThemeContext";
import { useSession } from "../../contexts/SessionContext";
import { displayName, formatEuro } from "../../utils/format";
import { showAlert } from "../../utils/alert";
import { Avatar, Card, Emoji, IconSquircle, ListGroup, ListRow, PressableScale, SectionLabel, StatusPill, Ton } from "../ui";

export const MAX_EREIGNISSE = 4;

/** Gleiche Farbfolge wie die Zähl-Knöpfe am Abend (SpielZaehler), damit die Vorschau passt. */
const TOENE: Ton[] = ["mustard", "coral", "green", "blue"];

// react-native-web nimmt für den eingeschalteten Zustand activeThumbColor (sonst Türkis).
const WEB_THUMB = { activeThumbColor: "#FFFFFF" } as object;

const SYMBOLE = ["🎲", "🃏", "🎳", "🎯", "🍺"];

export interface EreignisRow {
  key: string;
  id?: string;                       // gesetzt bei bereits gespeicherten Ereignistypen
  label: string;
  emoji: string;
  strafAktiv: boolean;
  strafBetrag: string;
  strafKategorie?: StrafKategorie;   // verknüpfte Kategorie bleibt beim Speichern erhalten
}

export function neueZeile(): EreignisRow {
  return { key: Date.now().toString() + Math.random().toString(36).slice(2, 6), label: "", emoji: "", strafAktiv: false, strafBetrag: "" };
}

const zahl = (s: string) => Number(s.replace(",", ".")) || 0;
const euro = (n: number) => `${formatEuro(n).replace(",00", "")} €`;

/** Formularzustand für „Neues Spiel" und „Spiel bearbeiten". */
export function useSpielFormular() {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("");
  const [ereignisse, setEreignisse] = useState<EreignisRow[]>([neueZeile()]);

  function updateRow(key: string, partial: Partial<EreignisRow>) {
    setEreignisse((prev) => prev.map((r) => (r.key === key ? { ...r, ...partial } : r)));
  }
  function addRow() {
    setEreignisse((prev) => (prev.length >= MAX_EREIGNISSE ? prev : [...prev, neueZeile()]));
  }
  function removeRow(key: string) {
    setEreignisse((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.key !== key)));
  }

  /** Prüft Name und Ereignisse; gibt die zu speichernden Zeilen zurück oder null. */
  function pruefen(): EreignisRow[] | null {
    if (!name.trim()) {
      showAlert("Name fehlt", "Bitte einen Namen für das Spiel eingeben.");
      return null;
    }
    const gueltig = ereignisse.filter((r) => r.label.trim());
    if (gueltig.length === 0) {
      showAlert("Ereignis fehlt", "Bitte mindestens einen Ereignistyp mit Bezeichnung anlegen.");
      return null;
    }
    return gueltig;
  }

  return { name, setName, emoji, setEmoji, ereignisse, setEreignisse, updateRow, addRow, removeRow, pruefen };
}

export type SpielForm = ReturnType<typeof useSpielFormular>;

export function strafBetragVon(r: EreignisRow): number | undefined {
  return r.strafAktiv ? zahl(r.strafBetrag) : undefined;
}

/** „Aktiv"-Schalter für den Kopf: Spiel erscheint am Abend als eigener Tab. */
export function AktivSchalter({ value, onChange, disabled }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.aktiv}>
      <Text style={styles.aktivText}>Aktiv</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: c.borderDark, true: c.blue }}
        thumbColor="#FFFFFF"
        {...WEB_THUMB}
        ios_backgroundColor={c.borderDark}
        accessibilityLabel="Am Abend aktiv"
      />
    </View>
  );
}

/** Name, Symbol, Ereignisse (1–4) mit optionaler Strafe und die Vorschau für den Abend. */
export function SpielFormular({ form }: { form: SpielForm }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const { name, setName, emoji, setEmoji, ereignisse, updateRow, addRow, removeRow } = form;
  const eigenes = !!emoji && !SYMBOLE.includes(emoji);

  function schritt(r: EreignisRow, d: number) {
    const neu = Math.max(0, Math.round(zahl(r.strafBetrag)) + d);
    updateRow(r.key, { strafBetrag: String(neu) });
  }

  return (
    <>
      <Card style={{ gap: 14 }}>
        <View style={{ gap: 6 }}>
          <Text style={styles.feldLabel}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="z. B. Doppelkopf"
            placeholderTextColor={c.textLight}
            accessibilityLabel="Name des Spiels"
          />
        </View>
        <View style={{ gap: 6 }}>
          <Text style={styles.feldLabel}>Symbol</Text>
          <View style={styles.symbole}>
            {SYMBOLE.map((s) => {
              const an = emoji === s;
              return (
                <PressableScale
                  key={s}
                  onPress={() => setEmoji(an ? "" : s)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: an }}
                  accessibilityLabel={`Symbol ${s}`}
                  style={[styles.symbol, an && styles.symbolAn]}
                >
                  <Text style={styles.symbolText} maxFontSizeMultiplier={1}>{s}</Text>
                </PressableScale>
              );
            })}
            <TextInput
              style={[styles.symbol, styles.symbolText, styles.symbolEigen, eigenes && styles.symbolAn]}
              value={eigenes ? emoji : ""}
              onChangeText={setEmoji}
              placeholder="…"
              placeholderTextColor={c.textMuted}
              maxLength={4}
              accessibilityLabel="Eigenes Emoji als Symbol"
            />
          </View>
        </View>
      </Card>

      <View style={styles.abschnitt}>
        <SectionLabel meta={`${ereignisse.length} von ${MAX_EREIGNISSE}`}>Ereignisse</SectionLabel>
      </View>

      {ereignisse.map((r, i) => {
        const ton = TOENE[i % TOENE.length];
        const betrag = zahl(r.strafBetrag);
        return (
          <Card key={r.key} style={styles.ereignis}>
            <View style={styles.ereignisKopf}>
              <TextInput
                style={[styles.nr, ton === "mustard" ? styles.nrMustard : ton === "coral" ? styles.nrCoral : ton === "green" ? styles.nrGreen : styles.nrBlue]}
                value={r.emoji}
                onChangeText={(t) => updateRow(r.key, { emoji: t })}
                placeholder={String(i + 1)}
                placeholderTextColor={ton === "mustard" ? c.mustardText : ton === "coral" ? c.coralText : ton === "green" ? c.greenText : c.blue}
                maxLength={4}
                accessibilityLabel={`Ereignis ${i + 1}: Symbol (Emoji, optional)`}
              />
              <TextInput
                style={styles.label}
                value={r.label}
                onChangeText={(t) => updateRow(r.key, { label: t })}
                placeholder="z. B. Verloren"
                placeholderTextColor={c.textLight}
                accessibilityLabel={`Ereignis ${i + 1}: Bezeichnung`}
              />
              <View>
                {r.strafAktiv ? <StatusPill label={`+${euro(betrag)} Strafe`} ton="coral" /> : <StatusPill label="zählt nur" />}
              </View>
              {ereignisse.length > 1 ? (
                <PressableScale onPress={() => removeRow(r.key)} style={styles.weg} accessibilityLabel={`Ereignis ${i + 1} entfernen`}>
                  <Ionicons name="close" size={20} color={c.textMid} />
                </PressableScale>
              ) : null}
            </View>

            <View style={[styles.zeile, styles.trenner]}>
              <Emoji size={17} style={{ opacity: r.strafAktiv ? 1 : 0.45 }}>🔗</Emoji>
              <Text style={styles.zeileText}>Strafe koppeln</Text>
              <Switch
                value={r.strafAktiv}
                onValueChange={(v) => updateRow(r.key, { strafAktiv: v, strafBetrag: v && !r.strafBetrag ? "1" : r.strafBetrag })}
                trackColor={{ false: c.borderDark, true: c.blue }}
                thumbColor="#FFFFFF"
                {...WEB_THUMB}
                ios_backgroundColor={c.borderDark}
                accessibilityLabel={`Strafe koppeln für ${r.label || `Ereignis ${i + 1}`}`}
              />
            </View>

            {r.strafAktiv ? (
              <View style={[styles.zeile, styles.trenner]}>
                <Text style={[styles.zeileText, { paddingLeft: 30 }]}>Betrag</Text>
                <PressableScale onPress={() => schritt(r, -1)} disabled={betrag <= 0} style={styles.stepper} accessibilityLabel="Betrag um einen Euro senken">
                  <Ionicons name="remove" size={20} color={c.textDark} />
                </PressableScale>
                <View style={styles.betragFeld}>
                  <TextInput
                    style={styles.betrag}
                    value={r.strafBetrag}
                    onChangeText={(t) => updateRow(r.key, { strafBetrag: t.replace(/[^0-9,.]/g, "") })}
                    keyboardType="decimal-pad"
                    maxLength={6}
                    accessibilityLabel="Betrag in Euro"
                    maxFontSizeMultiplier={MAX_FONT_SCALE}
                  />
                  <Text style={styles.betragEuro}>€</Text>
                </View>
                <PressableScale onPress={() => schritt(r, 1)} style={styles.stepper} accessibilityLabel="Betrag um einen Euro erhöhen">
                  <Ionicons name="add" size={20} color={c.textDark} />
                </PressableScale>
              </View>
            ) : null}
          </Card>
        );
      })}

      {ereignisse.length < MAX_EREIGNISSE ? (
        <PressableScale onPress={addRow} style={styles.neu} accessibilityLabel="Ereignis hinzufügen">
          <Ionicons name="add" size={20} color={c.blue} />
          <Text style={styles.neuText}>Ereignis hinzufügen</Text>
        </PressableScale>
      ) : null}

      <SpielVorschau ereignisse={ereignisse} />
    </>
  );
}

/** So erscheinen die Zähl-Knöpfe am Abend, mit dem eigenen Profil als Beispiel. */
function SpielVorschau({ ereignisse }: { ereignisse: EreignisRow[] }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const { activeMember } = useSession();
  const zeilen = ereignisse.map((r, i) => ({ r, ton: TOENE[i % TOENE.length] })).filter(({ r }) => r.label.trim());
  if (zeilen.length === 0) return null;
  const mitStrafe = zeilen.filter(({ r }) => r.strafAktiv && zahl(r.strafBetrag) > 0);
  const voll = (ton: Ton) => ({
    mustard: { bg: c.mustard, fg: c.onMustard },
    coral: { bg: c.coral, fg: c.onCoral },
    green: { bg: c.success, fg: c.onAccent },
    blue: { bg: c.blue, fg: c.onAccent },
    neutral: { bg: c.textDark, fg: c.background },
  }[ton]);
  const name = activeMember ? displayName(activeMember) : "Du";

  return (
    <View style={styles.vorschau} accessible accessibilityLabel={`Vorschau am Abend: ${zeilen.map(({ r }) => r.label).join(", ")}`}>
      <Text style={styles.vorschauTitel}>So sieht es am Abend aus</Text>
      <View style={styles.vorschauReihe}>
        <View style={styles.vorschauPerson}>
          <Avatar name={name} color={activeMember?.avatarColor ?? c.blue} photoUri={activeMember?.photoUri} size={32} />
          <Text style={styles.vorschauName} numberOfLines={1}>{name}</Text>
        </View>
        <View style={styles.vorschauKnoepfe}>
          {zeilen.map(({ r, ton }) => {
            const f = voll(ton);
            return (
              <View key={r.key} style={[styles.vorschauKnopf, { backgroundColor: f.bg }]}>
                <Text style={[styles.vorschauLabel, { color: f.fg }]} numberOfLines={2}>{r.label}</Text>
                <Text style={[styles.vorschauZahl, { color: f.fg }]}>+1</Text>
              </View>
            );
          })}
        </View>
      </View>
      <Text style={styles.vorschauFuss}>
        {mitStrafe.length > 0
          ? mitStrafe.map(({ r }) => `${r.label} bucht ${euro(zahl(r.strafBetrag))}`).join(", ") + " automatisch in die Kasse"
          : "Ereignisse werden nur gezählt, ohne Strafe."}
      </Text>
    </View>
  );
}

/** Andere Spiele (ohne `ausserId`) und noch nicht angelegte Vorlagen. */
export function WeitereSpiele({ titel, spiele, ausserId, mitSpielen = true, aktivesSpielId, busy, onSpiel, onVorlage }: {
  titel: string;
  /** Alle Spiele des Stammtischs; schon angelegte Vorlagen werden ausgeblendet. */
  spiele: Spiel[];
  ausserId?: string;
  mitSpielen?: boolean;
  aktivesSpielId?: string;
  busy: string | null;
  onSpiel?: (s: Spiel) => void;
  onVorlage: (v: (typeof SPIEL_VORLAGEN)[number]) => void;
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const vorlagen = SPIEL_VORLAGEN.filter((v) => !spiele.some((s) => s.name === v.name));
  const andere = mitSpielen ? spiele.filter((s) => s.id !== ausserId) : [];
  if (andere.length === 0 && vorlagen.length === 0) return null;
  return (
    <View style={{ gap: 8 }}>
      <View style={styles.abschnitt}>
        <SectionLabel>{titel}</SectionLabel>
      </View>
      <ListGroup>
        {andere.map((s) => (
          <ListRow
            key={s.id}
            title={s.name}
            subtitle={aktivesSpielId === s.id ? "Aktiv am Abend" : undefined}
            emoji={s.emoji ?? "🎮"}
            ton="mustard"
            onPress={onSpiel ? () => onSpiel(s) : undefined}
          />
        ))}
        {vorlagen.map((v) => (
          <ListRow
            key={v.name}
            title={v.name}
            subtitle={`Vorlage · ${v.ereignisTypen.map((e) => e.label).join(", ")}`}
            emoji={v.emoji}
            ton="mustard"
            right={
              <PressableScale onPress={() => onVorlage(v)} disabled={busy !== null} style={styles.plus} accessibilityLabel={`Vorlage ${v.name} anlegen`}>
                {busy === v.name ? <Text style={styles.plusText}>…</Text> : <Ionicons name="add" size={22} color={c.blue} />}
              </PressableScale>
            }
          />
        ))}
      </ListGroup>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    aktiv: {
      flexDirection: "row", alignItems: "center", gap: 8, height: 44, paddingLeft: 14, paddingRight: 6, borderRadius: 22,
      backgroundColor: c.card, borderWidth: StyleSheet.hairlineWidth, borderColor: c.hairline,
    },
    aktivText: { fontFamily: FONT.w800, fontSize: 15, color: c.blue },
    feldLabel: { ...TYPE.label, color: c.textMuted },
    input: {
      minHeight: 50, borderRadius: RADIUS.md, paddingHorizontal: 14, backgroundColor: c.cardAlt,
      fontFamily: FONT.w700, fontSize: 17, color: c.textDark,
    },
    symbole: { flexDirection: "row", gap: 8 },
    symbol: {
      flex: 1, height: 50, borderRadius: RADIUS.md, backgroundColor: c.cardAlt, alignItems: "center", justifyContent: "center",
      borderWidth: 2, borderColor: "transparent",
    },
    symbolAn: { backgroundColor: c.blueBg, borderColor: c.blue },
    symbolText: { fontSize: 22 },
    symbolEigen: { textAlign: "center", color: c.textDark, padding: 0, minWidth: 0 },
    abschnitt: { paddingHorizontal: 4, marginTop: 6 },
    ereignis: { paddingVertical: 6, paddingHorizontal: 14 },
    ereignisKopf: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 60 },
    nr: { width: 40, height: 40, borderRadius: 13, textAlign: "center", fontFamily: FONT.w800, fontSize: 17, padding: 0 },
    nrMustard: { backgroundColor: c.mustardSoft, color: c.mustardText },
    nrCoral: { backgroundColor: c.coralSoft, color: c.coralText },
    nrGreen: { backgroundColor: c.greenSoft, color: c.greenText },
    nrBlue: { backgroundColor: c.blueBg, color: c.blue },
    label: {
      flex: 1, minWidth: 0, minHeight: 44, fontFamily: FONT.w800, fontSize: 18, color: c.textDark,
      borderBottomWidth: 1, borderBottomColor: c.borderDark, borderStyle: "dashed",
    },
    weg: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.cardAlt, alignItems: "center", justifyContent: "center" },
    zeile: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56 },
    trenner: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
    zeileText: { flex: 1, fontFamily: FONT.w700, fontSize: 16, color: c.textDark },
    stepper: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.cardAlt, alignItems: "center", justifyContent: "center" },
    betragFeld: { flexDirection: "row", alignItems: "center", justifyContent: "center", minWidth: 64 },
    betrag: { ...TYPE.num, fontSize: 22, color: c.coralText, textAlign: "right", minWidth: 24, maxWidth: 72, padding: 0 },
    betragEuro: { ...TYPE.num, fontSize: 22, color: c.coralText, marginLeft: 4 },
    neu: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 52, borderRadius: RADIUS.card,
      borderWidth: 1.5, borderStyle: "dashed", borderColor: c.borderDark,
    },
    neuText: { fontFamily: FONT.w800, fontSize: 16, color: c.blue },
    // Hell: Tinten-Fläche wie der Abend-Modus; dunkel: Karte mit Kante.
    vorschau: {
      borderRadius: RADIUS.card, padding: 16, gap: 12,
      backgroundColor: c.heroStyle === "outline" ? c.cardAlt : c.textDark,
      borderWidth: c.heroStyle === "outline" ? 1 : 0, borderColor: c.navBorder,
    },
    vorschauTitel: { ...TYPE.label, color: c.heroStyle === "outline" ? c.gold : c.goldLight },
    vorschauReihe: { flexDirection: "row", alignItems: "center", gap: 12 },
    vorschauPerson: { alignItems: "center", gap: 4, width: 52 },
    vorschauName: { fontFamily: FONT.w700, fontSize: 12, color: c.heroStyle === "outline" ? c.textDark : c.background, maxWidth: 52 },
    vorschauKnoepfe: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 8 },
    vorschauKnopf: { flexGrow: 1, flexBasis: "45%", minHeight: 48, borderRadius: 16, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6 },
    vorschauLabel: { flex: 1, fontFamily: FONT.w800, fontSize: 13 },
    vorschauZahl: { ...TYPE.num, fontSize: 15 },
    vorschauFuss: { ...TYPE.caption, fontSize: 13, color: c.heroStyle === "outline" ? c.textMid : c.background, opacity: 0.85 },
    plus: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.blueBg, alignItems: "center", justifyContent: "center" },
    plusText: { fontFamily: FONT.w800, fontSize: 16, color: c.blue },
  });
