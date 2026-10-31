import React, { useRef, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { MemberProfile } from "../../types";
import { AVATAR_COLORS, FONT, RADIUS, TYPE, ThemeColors } from "../../constants/design";
import { useColors, useThemedStyles } from "../../contexts/ThemeContext";
import { showAlert } from "../../utils/alert";
import InlineDateTimePicker from "../InlineDateTimePicker";
import { Avatar, Button, Card, Chip, Field, FormSection, PressableScale, SectionLabel, ToggleRow } from "../ui";
import { SYMBOL } from "../../constants/symbole";

/** Alle Eingaben des Mitglied-Formulars; Laden und Speichern machen die Screens. */
export function useMitgliedFormular() {
  const [name, setName] = useState("");
  const [spitzname, setSpitzname] = useState("");
  const [rollen, setRollen] = useState<MemberProfile["rollen"]>(["Mitglied"]);
  const [lieblingsgetraenk, setLieblingsgetraenk] = useState("");
  const [beruf, setBeruf] = useState("");
  const [mitgliedSeit, setMitgliedSeit] = useState(new Date());
  const [geburtsdatum, setGeburtsdatum] = useState<Date | null>(null);
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
  const [photoUri, setPhotoUri] = useState<string | undefined>(undefined);
  const [notizen, setNotizen] = useState("");
  const [pinAn, setPinAn] = useState(false);
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");

  function uebernehmen(m: MemberProfile) {
    setName(m.name);
    setSpitzname(m.spitzname ?? "");
    setRollen(m.rollen);
    setLieblingsgetraenk(m.lieblingsgetraenk ?? "");
    setBeruf(m.beruf ?? "");
    setMitgliedSeit(new Date(m.mitgliedSeit));
    setGeburtsdatum(m.geburtsdatum ? new Date(m.geburtsdatum + "T00:00:00") : null);
    setAvatarColor(m.avatarColor);
    setPhotoUri(m.photoUri);
    setNotizen(m.notizen ?? "");
    setPinAn(!!m.pinHash);
  }

  return {
    name, setName, spitzname, setSpitzname, rollen, setRollen,
    lieblingsgetraenk, setLieblingsgetraenk, beruf, setBeruf,
    mitgliedSeit, setMitgliedSeit, geburtsdatum, setGeburtsdatum,
    avatarColor, setAvatarColor, photoUri, setPhotoUri, notizen, setNotizen,
    pinAn, setPinAn, pin, setPin, pinConfirm, setPinConfirm,
    uebernehmen,
  };
}

export type MitgliedForm = ReturnType<typeof useMitgliedFormular>;

const FARBNAMEN = ["Blau", "Senf", "Grün", "Braun", "Lila", "Koralle", "Petrol", "Beere"];

function kurzDatum(d: Date) {
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Kopf mit Abbrechen/Speichern über Titel und Untertitel, wie im Entwurf. */
export function FormularKopf({ title, subtitle, onSpeichern, speichert }: {
  title: string;
  subtitle?: string;
  onSpeichern: () => void;
  speichert?: boolean;
}) {
  const styles = useThemedStyles(makeStyles);
  const abbrechen = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/home"));
  return (
    <View style={styles.kopf}>
      <View style={styles.kopfZeile}>
        <Button label="Abbrechen" variant="secondary" size="sm" onPress={abbrechen} />
        <Button label="Speichern" variant="blue" size="sm" onPress={onSpeichern} loading={speichert} style={{ minWidth: 112 }} />
      </View>
      <View>
        <Text style={styles.titel} accessibilityRole="header" numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.untertitel} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

interface Props {
  form: MitgliedForm;
  rollenOptionen: string[];
  /** Bearbeiten: es gibt schon einen gespeicherten PIN, die Felder ändern ihn nur. */
  pinVorhanden?: boolean;
  /** Schalter umgelegt; der Screen entscheidet (z. B. Rückfrage vor dem Entfernen). */
  onPinUmschalten: (an: boolean) => void;
  /** Nur beim Bearbeiten: zeigt die Gefahrenzone. */
  onEntfernen?: () => void;
}

/** Formular für „Neues Mitglied" und „Mitglied bearbeiten". */
export function MitgliedFormular({ form: f, rollenOptionen, pinVorhanden, onPinUmschalten, onEntfernen }: Props) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const [picker, setPicker] = useState<"seit" | "geburtstag" | null>(null);
  const feld = { backgroundColor: c.cardAlt, borderColor: "transparent" };
  const vorname = f.name.trim().split(/\s+/)[0] || "Das Mitglied";

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showAlert("Kein Zugriff", "Bitte erlaube den Zugriff auf die Fotobibliothek in den Einstellungen.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) f.setPhotoUri(result.assets[0].uri);
  }

  function rolleUmschalten(r: string) {
    // Mindestens eine Rolle bleibt immer gewählt.
    f.setRollen((prev) => (prev.includes(r) ? (prev.length > 1 ? prev.filter((x) => x !== r) : prev) : [...prev, r]));
  }

  return (
    <>
      <Card enterIndex={0}>
        <View style={styles.bildZeile}>
          <PressableScale onPress={pickPhoto} accessibilityLabel={f.photoUri ? "Foto ändern" : "Foto auswählen"}>
            <Avatar name={f.name || "?"} color={f.avatarColor} photoUri={f.photoUri} size={88} />
          </PressableScale>
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <SectionLabel>Farbe</SectionLabel>
            <View style={styles.farben} accessibilityRole="radiogroup" accessibilityLabel="Avatar-Farbe">
              {AVATAR_COLORS.map((farbe, i) => {
                const an = f.avatarColor === farbe;
                return (
                  <PressableScale
                    key={farbe}
                    onPress={() => f.setAvatarColor(farbe)}
                    haptic="leicht"
                    style={styles.farbKnopf}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: an }}
                    accessibilityLabel={FARBNAMEN[i] ?? `Farbe ${i + 1}`}
                  >
                    <View style={[styles.farbRing, an && { borderColor: c.textDark }]}>
                      <View style={[styles.farbPunkt, { backgroundColor: farbe }]}>
                        {an ? <Ionicons name="checkmark" size={16} color={c.onAvatar} /> : null}
                      </View>
                    </View>
                  </PressableScale>
                );
              })}
              <PressableScale onPress={pickPhoto} style={styles.farbKnopf} accessibilityLabel={f.photoUri ? "Foto ändern" : "Foto auswählen"}>
                <View style={[styles.farbPunkt, { backgroundColor: c.cardAlt }]}>
                  <Ionicons name="camera-outline" size={16} color={c.textDark} />
                </View>
              </PressableScale>
            </View>
          </View>
        </View>
        {f.photoUri ? (
          <PressableScale onPress={() => f.setPhotoUri(undefined)} style={styles.fotoWeg} accessibilityLabel="Foto entfernen">
            <Ionicons name="close-circle-outline" size={16} color={c.dangerText} />
            <Text style={styles.fotoWegText}>Foto entfernen</Text>
          </PressableScale>
        ) : null}
      </Card>

      <Card enterIndex={1} style={styles.zweiSpalten}>
        <Field
          label="Name"
          value={f.name}
          onChangeText={f.setName}
          placeholder="z. B. Franz Huber"
          autoComplete="name"
          style={feld}
          containerStyle={{ flex: 1.4, minWidth: 0 }}
        />
        <Field
          label="Spitzname"
          value={f.spitzname}
          onChangeText={f.setSpitzname}
          placeholder="z. B. Franzi"
          style={feld}
          containerStyle={{ flex: 1, minWidth: 0 }}
        />
      </Card>

      <Card enterIndex={2} style={{ gap: 10 }}>
        <SectionLabel meta="mehrere möglich">Rollen</SectionLabel>
        <View style={styles.rollen} accessibilityLabel="Rollen">
          {rollenOptionen.map((r) => {
            const an = f.rollen.includes(r);
            return (
              <Chip
                key={r}
                label={r}
                selected={an}
                onPress={() => rolleUmschalten(r)}
                leading={an ? <Ionicons name="checkmark" size={16} color={c.mustard} /> : undefined}
              />
            );
          })}
        </View>
      </Card>

      <Card enterIndex={3} style={{ gap: 12 }}>
        <View style={styles.zeile}>
          <DatumFeld label="Mitglied seit" value={kurzDatum(f.mitgliedSeit)} onPress={() => setPicker(picker === "seit" ? null : "seit")} />
          <DatumFeld
            label="Geburtstag"
            value={f.geburtsdatum ? kurzDatum(f.geburtsdatum) : undefined}
            placeholder="optional"
            onPress={() => setPicker(picker === "geburtstag" ? null : "geburtstag")}
            onClear={() => f.setGeburtsdatum(null)}
          />
        </View>
        {picker === "seit" ? (
          <InlineDateTimePicker value={f.mitgliedSeit} mode="date" maximumDate={new Date()} onChange={f.setMitgliedSeit} onClose={() => setPicker(null)} />
        ) : null}
        {picker === "geburtstag" ? (
          <InlineDateTimePicker
            value={f.geburtsdatum ?? new Date(1990, 0, 1)}
            mode="date"
            maximumDate={new Date()}
            onChange={f.setGeburtsdatum}
            onClose={() => setPicker(null)}
          />
        ) : null}
        <View style={styles.zeile}>
          <Field
            label="Lieblingsgetränk"
            value={f.lieblingsgetraenk}
            onChangeText={f.setLieblingsgetraenk}
            placeholder="z. B. Helles"
            style={feld}
            containerStyle={styles.spalte}
          />
          <Field
            label="Beruf"
            value={f.beruf}
            onChangeText={f.setBeruf}
            placeholder="z. B. Bäcker"
            style={feld}
            containerStyle={styles.spalte}
          />
        </View>
        <Field
          label="Notizen"
          value={f.notizen}
          onChangeText={f.setNotizen}
          placeholder="Besonderheiten, Vorlieben …"
          multiline
          style={[feld, { minHeight: 80 }]}
        />
      </Card>

      <Card enterIndex={4} style={{ gap: 8, paddingTop: 6 }}>
        <ToggleRow
          title="PIN-Schutz"
          subtitle={f.pinAn ? "Profil nur mit PIN wählen und ändern" : "Jeder kann dieses Profil wählen und ändern"}
          emoji={SYMBOL.pin}
          ton="blue"
          value={f.pinAn}
          onValueChange={onPinUmschalten}
        />
        {f.pinAn ? (
          <View style={{ gap: 12 }}>
            <PinFelder
              label={pinVorhanden ? "Neuer PIN (optional)" : "PIN (4 Ziffern)"}
              value={f.pin}
              onChange={f.setPin}
            />
            <PinFelder label="PIN wiederholen" value={f.pinConfirm} onChange={f.setPinConfirm} />
            {pinVorhanden ? <Text style={styles.pinSub}>Leer lassen, um den bisherigen PIN zu behalten.</Text> : null}
          </View>
        ) : null}
      </Card>

      {onEntfernen ? (
        <FormSection title="Gefahrenzone" style={{ marginTop: 6 }}>
          <Card style={{ paddingTop: 4, gap: 2 }}>
            <PressableScale onPress={onEntfernen} style={styles.entfernen} accessibilityLabel={`${vorname} entfernen`}>
              <Ionicons name="trash-outline" size={18} color={c.dangerText} />
              <Text style={styles.entfernenText}>Mitglied entfernen</Text>
            </PressableScale>
            <Text style={styles.pinSub}>
              {`${vorname} verschwindet aus der Runde, mit allen Einträgen. Das kann nicht rückgängig gemacht werden.`}
            </Text>
          </Card>
        </FormSection>
      ) : null}
    </>
  );
}

/** Datumsfeld im Stil der Eingabefelder; Löschen-Knopf daneben statt darin (keine verschachtelten Knöpfe). */
function DatumFeld({ label, value, placeholder, onPress, onClear }: {
  label: string;
  value?: string;
  placeholder?: string;
  onPress: () => void;
  onClear?: () => void;
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.spalte}>
      <Text style={styles.label}>{label}</Text>
      <View>
        <PressableScale onPress={onPress} scaleTo={0.98} style={styles.datum} accessibilityLabel={`${label}: ${value ?? "leer"}`}>
          <Text style={[styles.datumText, !value && { color: c.textLight }]} numberOfLines={1}>{value ?? placeholder ?? ""}</Text>
        </PressableScale>
        {value && onClear ? (
          <PressableScale onPress={onClear} style={styles.leeren} accessibilityLabel={`${label} entfernen`}>
            <Ionicons name="close-circle" size={18} color={c.textMuted} />
          </PressableScale>
        ) : null}
      </View>
    </View>
  );
}

/**
 * Vier PIN-Kästchen. Darüber liegt ein unsichtbares Eingabefeld, damit
 * Tastatur, Einfügen und Löschen wie gewohnt funktionieren.
 */
function PinFelder({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const ref = useRef<TextInput>(null);
  const [fokus, setFokus] = useState(false);
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.label}>{label}</Text>
      <View>
        <View style={styles.pinReihe}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={[styles.pinKasten, fokus && i === Math.min(value.length, 3) && { borderColor: c.blue }]}>
              {i < value.length ? <View style={styles.pinPunkt} /> : null}
            </View>
          ))}
        </View>
        <TextInput
          ref={ref}
          value={value}
          onChangeText={(t) => onChange(t.replace(/\D/g, "").slice(0, 4))}
          onFocus={() => setFokus(true)}
          onBlur={() => setFokus(false)}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={4}
          caretHidden
          accessibilityLabel={label}
          style={styles.pinEingabe}
        />
      </View>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    kopf: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, gap: 10 },
    kopfZeile: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    titel: { ...TYPE.title, color: c.textDark, paddingHorizontal: 4 },
    untertitel: { ...TYPE.caption, fontSize: 13, color: c.textMuted, marginTop: 1, paddingHorizontal: 4 },

    bildZeile: { flexDirection: "row", alignItems: "center", gap: 16 },
    farben: { flexDirection: "row", flexWrap: "wrap", columnGap: 0 },
    farbKnopf: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
    farbRing: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: "transparent", alignItems: "center", justifyContent: "center" },
    farbPunkt: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
    fotoWeg: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", minHeight: 44, marginTop: 4, marginBottom: -8 },
    fotoWegText: { fontFamily: FONT.w600, fontSize: 14, color: c.dangerText },

    zweiSpalten: { flexDirection: "row", gap: 10 },
    zeile: { flexDirection: "row", gap: 10 },
    spalte: { flex: 1, minWidth: 0, gap: 6 },
    rollen: { flexDirection: "row", flexWrap: "wrap", gap: 8 },

    label: { ...TYPE.label, color: c.textMuted },
    datum: { minHeight: 50, borderRadius: RADIUS.md, paddingHorizontal: 14, backgroundColor: c.cardAlt, justifyContent: "center" },
    datumText: { fontFamily: FONT.w600, fontSize: 16, color: c.textDark, paddingRight: 24 },
    leeren: { position: "absolute", right: 0, top: 3, width: 44, height: 44, alignItems: "center", justifyContent: "center" },

    pinSub: { ...TYPE.caption, fontSize: 13, color: c.textMuted, lineHeight: 18 },
    pinReihe: { flexDirection: "row", gap: 8 },
    pinKasten: {
      flex: 1, height: 56, borderRadius: RADIUS.md, backgroundColor: c.blueBg,
      borderWidth: 2, borderColor: "transparent", alignItems: "center", justifyContent: "center",
    },
    pinPunkt: { width: 10, height: 10, borderRadius: 5, backgroundColor: c.textDark },
    pinEingabe: { ...StyleSheet.absoluteFillObject, opacity: 0.02, color: "transparent", fontSize: 16 },

    entfernen: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start", minHeight: 44 },
    entfernenText: { fontFamily: FONT.w700, fontSize: 16, color: c.dangerText },
  });
