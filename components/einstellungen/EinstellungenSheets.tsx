import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Spiel, SPIEL_VORLAGEN } from "../../types";
import { FONT, RADIUS, TYPE, ThemeColors } from "../../constants/design";
import { useColors, useThemedStyles } from "../../contexts/ThemeContext";
import StammtischLogo from "../StammtischLogo";
import { Button, Card, Field, IconSquircle, PressableScale, Sheet, tonFarben, tonFuer } from "../ui";
import { SYMBOL } from "../../constants/symbole";

type SaveFn<T> = (wert: T) => Promise<boolean>;

// ─── Textfelder ───────────────────────────────────────────────────────────────

export interface FeldDef {
  key: string;
  label: string;
  value?: string;
  placeholder?: string;
  pflicht?: boolean;
}

/** Ein oder mehrere Textfelder bearbeiten (Name, Treffpunkt, Tag & Uhrzeit). */
export function FeldSheet({ visible, title, felder, hinweis, onClose, onSave }: {
  visible: boolean;
  title: string;
  felder: FeldDef[];
  hinweis?: string;
  onClose: () => void;
  onSave: SaveFn<Record<string, string>>;
}) {
  const styles = useThemedStyles(makeStyles);
  const [werte, setWerte] = useState<Record<string, string>>({});
  const [fehler, setFehler] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setWerte(Object.fromEntries(felder.map((f) => [f.key, f.value ?? ""])));
    setFehler(false);
  }, [visible]);

  async function speichern() {
    if (felder.some((f) => f.pflicht && !(werte[f.key] ?? "").trim())) {
      setFehler(true);
      return;
    }
    setBusy(true);
    const ok = await onSave(Object.fromEntries(Object.entries(werte).map(([k, v]) => [k, v.trim()])));
    setBusy(false);
    if (ok) onClose();
  }

  return (
    <Sheet visible={visible} onClose={onClose} title={title} footer={<Button label="Speichern" icon="checkmark" variant="blue" loading={busy} onPress={speichern} />}>
      {hinweis ? <Text style={styles.hinweis}>{hinweis}</Text> : null}
      {felder.map((f, i) => {
        const leer = fehler && f.pflicht && !(werte[f.key] ?? "").trim();
        return (
          <Field
            key={f.key}
            label={f.label}
            value={werte[f.key] ?? ""}
            onChangeText={(t) => setWerte((w) => ({ ...w, [f.key]: t }))}
            placeholder={f.placeholder}
            autoFocus={i === 0}
            onSubmitEditing={i === felder.length - 1 ? speichern : undefined}
            error={!!leer}
            hint={leer ? "Pflichtfeld" : undefined}
          />
        );
      })}
    </Sheet>
  );
}

// ─── Gründung (Monat & Jahr) ──────────────────────────────────────────────────

const MONATE = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

/** "YYYY" oder "YYYY-MM" (alt: nur Jahr -> Januar). */
function parseGruendung(value?: string): { jahr: number; monat: number } {
  const match = value?.match(/^(\d{4})(?:-(\d{2}))?/);
  const heute = new Date();
  if (!match) return { jahr: heute.getFullYear(), monat: heute.getMonth() };
  return { jahr: parseInt(match[1], 10), monat: match[2] ? parseInt(match[2], 10) - 1 : 0 };
}

/** Gründungsmonat wählen: Jahr mit −/+, Monat als Raster; nichts in der Zukunft. */
export function GruendungSheet({ visible, value, onClose, onSave }: {
  visible: boolean;
  value?: string;
  onClose: () => void;
  onSave: SaveFn<string>;
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const heute = new Date();
  const [jahr, setJahr] = useState(heute.getFullYear());
  const [monat, setMonat] = useState(heute.getMonth());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const p = parseGruendung(value);
    setJahr(p.jahr);
    setMonat(p.monat);
  }, [visible]);

  const zukunft = (j: number, m: number) => j > heute.getFullYear() || (j === heute.getFullYear() && m > heute.getMonth());

  function jahrAendern(d: number) {
    const j = Math.min(heute.getFullYear(), Math.max(1900, jahr + d));
    setJahr(j);
    if (zukunft(j, monat)) setMonat(heute.getMonth());
  }

  async function speichern() {
    setBusy(true);
    const ok = await onSave(`${jahr}-${String(monat + 1).padStart(2, "0")}`);
    setBusy(false);
    if (ok) onClose();
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Gegründet" footer={<Button label="Speichern" icon="checkmark" variant="blue" loading={busy} onPress={speichern} />}>
      <View style={styles.jahrReihe}>
        <PressableScale onPress={() => jahrAendern(-1)} style={styles.rund} accessibilityLabel="Ein Jahr früher">
          <Ionicons name="remove" size={22} color={c.textDark} />
        </PressableScale>
        <Text style={styles.jahr} accessibilityLiveRegion="polite">{jahr}</Text>
        <PressableScale onPress={() => jahrAendern(1)} disabled={jahr >= heute.getFullYear()} style={styles.rund} accessibilityLabel="Ein Jahr später">
          <Ionicons name="add" size={22} color={c.textDark} />
        </PressableScale>
      </View>
      <View style={styles.monate}>
        {MONATE.map((m, i) => {
          const an = i === monat;
          return (
            <PressableScale
              key={m}
              onPress={() => setMonat(i)}
              disabled={zukunft(jahr, i)}
              accessibilityState={{ selected: an, disabled: zukunft(jahr, i) }}
              accessibilityLabel={new Date(jahr, i, 1).toLocaleDateString("de-DE", { month: "long" })}
              style={[styles.monat, an && styles.monatAn]}
            >
              <Text style={[styles.monatText, an && styles.monatTextAn]}>{m}</Text>
            </PressableScale>
          );
        })}
      </View>
    </Sheet>
  );
}

// ─── Logo ─────────────────────────────────────────────────────────────────────

export function LogoSheet({ visible, uri, uploading, onClose, onPick, onRemove }: {
  visible: boolean;
  uri?: string;
  uploading: boolean;
  onClose: () => void;
  onPick: () => void;
  onRemove: () => void;
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <Sheet visible={visible} onClose={onClose} title="Logo">
      <View style={styles.logoMitte}>
        <StammtischLogo size={112} uri={uri} />
        <Text style={styles.hinweis}>{uri ? "Euer Logo, quadratisch zugeschnitten." : "Noch kein eigenes Logo, es wird das Standard-Logo gezeigt."}</Text>
      </View>
      <Button label={uri ? "Logo ändern" : "Logo hochladen"} icon="image-outline" variant="blue" loading={uploading} onPress={onPick} />
      {uri ? <Button label="Logo entfernen" icon="trash-outline" variant="ghost" colors={{ bg: "transparent", fg: c.dangerText }} onPress={onRemove} /> : null}
    </Sheet>
  );
}

// ─── Rollen ───────────────────────────────────────────────────────────────────

/** Rollen als getönte Pillen; Farbe fest pro Rollenname. */
export function RollenPills({ rollen, onRemove }: { rollen: string[]; onRemove?: (i: number) => void }) {
  const klein = !onRemove;
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.pills}>
      {rollen.map((r, i) => {
        const f = tonFarben(tonFuer(r), c);
        return (
          <View key={r} style={[styles.pill, klein && styles.pillKlein, { backgroundColor: f.bg }, onRemove && { paddingRight: 0 }]}>
            <Text style={[styles.pillText, klein && styles.pillTextKlein, { color: f.fg }]}>{r}</Text>
            {onRemove ? (
              <PressableScale onPress={() => onRemove(i)} style={styles.pillWeg} accessibilityLabel={`Rolle ${r} entfernen`}>
                <Ionicons name="close" size={16} color={f.fg} />
              </PressableScale>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

export function RollenSheet({ visible, rollen, onClose, onSave }: {
  visible: boolean;
  rollen: string[];
  onClose: () => void;
  onSave: SaveFn<string[]>;
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const [liste, setListe] = useState<string[]>([]);
  const [neu, setNeu] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setListe(rollen);
    setNeu("");
  }, [visible]);

  function hinzufuegen() {
    const r = neu.trim();
    if (!r || liste.includes(r)) return;
    setListe((l) => [...l, r]);
    setNeu("");
  }

  async function speichern() {
    setBusy(true);
    const offen = neu.trim();
    const ok = await onSave(offen && !liste.includes(offen) ? [...liste, offen] : liste);
    setBusy(false);
    if (ok) onClose();
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Rollen" footer={<Button label="Speichern" icon="checkmark" variant="blue" loading={busy} onPress={speichern} />}>
      <Text style={styles.hinweis}>Stehen beim Anlegen und Bearbeiten eines Mitglieds zur Auswahl. Rein organisatorisch, ohne Zugriffsrechte.</Text>
      {liste.length > 0 ? <RollenPills rollen={liste} onRemove={(i) => setListe((l) => l.filter((_, j) => j !== i))} /> : <Text style={styles.hinweis}>Noch keine Rollen.</Text>}
      <View style={styles.neuReihe}>
        <Field label="Neue Rolle" value={neu} onChangeText={setNeu} placeholder="z. B. Bierwart" onSubmitEditing={hinzufuegen} containerStyle={{ flex: 1 }} />
        <PressableScale onPress={hinzufuegen} disabled={!neu.trim() || liste.includes(neu.trim())} style={styles.plus} accessibilityLabel="Rolle hinzufügen">
          <Ionicons name="add" size={22} color={c.onAccent} />
        </PressableScale>
      </View>
    </Sheet>
  );
}

// ─── Spiel am Abend ───────────────────────────────────────────────────────────

/** Welches Spiel im Termin als eigener Tab erscheint; Auswahl wird sofort gespeichert. */
export function SpielWahlSheet({ visible, spiele, aktivesSpielId, busyId, onClose, onSelect, onVorlage, onVerwalten }: {
  visible: boolean;
  spiele: Spiel[];
  aktivesSpielId?: string;
  /** Id des Spiels (oder "none" / Vorlagen-Name), das gerade gespeichert wird. */
  busyId: string | null;
  onClose: () => void;
  onSelect: (spiel: Spiel | null) => void;
  onVorlage: (vorlage: (typeof SPIEL_VORLAGEN)[number]) => void;
  onVerwalten: () => void;
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const vorlagen = SPIEL_VORLAGEN.filter((v) => !spiele.some((s) => s.name === v.name));

  const zeile = (key: string, titel: string, an: boolean, onPress: () => void, symbol: React.ReactNode, rechts?: React.ReactNode, label?: string) => (
    <PressableScale
      key={key}
      onPress={onPress}
      disabled={busyId !== null}
      scaleTo={0.98}
      accessibilityState={{ selected: an }}
      accessibilityLabel={label ?? titel}
      style={[styles.wahl, key !== "none" && styles.trenner]}
    >
      {symbol}
      <Text style={styles.wahlText} numberOfLines={1}>{titel}</Text>
      {busyId === key ? <ActivityIndicator size="small" color={c.blue} /> : rechts ?? (an ? <Ionicons name="checkmark-circle" size={22} color={c.blue} /> : null)}
    </PressableScale>
  );

  return (
    <Sheet visible={visible} onClose={onClose} title="Spiel am Abend">
      <Text style={styles.hinweis}>Das gewählte Spiel erscheint im Termin als eigener Tab. Manche Ereignisse buchen automatisch eine Strafe.</Text>
      <Card style={styles.wahlKarte}>
        {zeile("none", "Kein Spiel", !aktivesSpielId, () => onSelect(null), <IconSquircle emoji={SYMBOL.keinSpiel} size={34} />)}
        {spiele.map((s) =>
          zeile(s.id, s.name, aktivesSpielId === s.id, () => onSelect(s), <IconSquircle emoji={s.emoji ?? "🎮"} ton="mustard" size={34} />)
        )}
        {vorlagen.map((v) =>
          zeile(
            v.name, v.name, false, () => onVorlage(v),
            <IconSquircle emoji={v.emoji} size={34} />,
            <Text style={styles.vorlage}>+ Vorlage</Text>,
            `${v.name} als Vorlage anlegen und aktivieren`
          )
        )}
      </Card>
      <Button label="Spiele verwalten" icon="dice-outline" variant="secondary" onPress={onVerwalten} />
    </Sheet>
  );
}

// ─── Stammtisch löschen ───────────────────────────────────────────────────────

export function LoeschenSheet({ visible, busy, onClose, onDelete }: {
  visible: boolean;
  busy: boolean;
  onClose: () => void;
  onDelete: (passwort: string) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const [passwort, setPasswort] = useState("");
  useEffect(() => { if (visible) setPasswort(""); }, [visible]);
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Stammtisch löschen"
      footer={<Button label={busy ? "Wird gelöscht …" : "Endgültig löschen"} icon="warning-outline" variant="danger" loading={busy} disabled={!passwort} onPress={() => onDelete(passwort)} />}
    >
      <Text style={styles.warnung}>
        Löscht diesen Stammtisch komplett und unwiderruflich, für alle Mitglieder. Alle Termine, Kasse, Strafen, Spiele-Logs und Protokolle gehen dabei verloren.
      </Text>
      <Field label="Stammtisch-Passwort zur Bestätigung" value={passwort} onChangeText={setPasswort} secureTextEntry autoCapitalize="none" placeholder="Passwort" />
    </Sheet>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    hinweis: { ...TYPE.body, fontSize: 14, color: c.textMuted, lineHeight: 20 },
    warnung: { ...TYPE.body, fontSize: 14, color: c.dangerText, lineHeight: 20, backgroundColor: c.dangerBg, borderRadius: RADIUS.md, padding: 14 },
    jahrReihe: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 24 },
    rund: { width: 48, height: 48, borderRadius: 24, backgroundColor: c.cardAlt, alignItems: "center", justifyContent: "center" },
    jahr: { ...TYPE.num, fontSize: 32, color: c.textDark, minWidth: 96, textAlign: "center" },
    monate: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    monat: {
      width: "31.5%", minHeight: 48, borderRadius: RADIUS.md, alignItems: "center", justifyContent: "center",
      backgroundColor: c.card, borderWidth: StyleSheet.hairlineWidth, borderColor: c.hairline,
    },
    monatAn: { backgroundColor: c.blue, borderColor: c.blue },
    monatText: { fontFamily: FONT.w600, fontSize: 15, color: c.textDark },
    monatTextAn: { color: c.onAccent },
    logoMitte: { alignItems: "center", gap: 12, paddingVertical: 8 },
    pills: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    pill: { flexDirection: "row", alignItems: "center", minHeight: 36, paddingHorizontal: 14, borderRadius: 999 },
    pillText: { fontFamily: FONT.w700, fontSize: 14 },
    pillKlein: { minHeight: 32, paddingHorizontal: 12 },
    pillTextKlein: { fontSize: 13 },
    pillWeg: { width: 40, height: 44, alignItems: "center", justifyContent: "center" },
    neuReihe: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
    plus: { width: 50, height: 50, borderRadius: 25, backgroundColor: c.blue, alignItems: "center", justifyContent: "center" },
    wahlKarte: { paddingVertical: 2, paddingHorizontal: 14 },
    wahl: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56, paddingVertical: 8 },
    trenner: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
    wahlText: { flex: 1, fontFamily: FONT.w600, fontSize: 16, color: c.textDark },
    vorlage: { fontFamily: FONT.w600, fontSize: 14, color: c.blue },
  });
