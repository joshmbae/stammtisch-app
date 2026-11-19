import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { FONT, RADIUS, TYPE, ThemeColors } from "../../constants/design";
import { useColors, useThemedStyles } from "../../contexts/ThemeContext";
import { einladungscodeErneuern, loadAnmeldename, passwortAendern } from "../../utils/storage";
import { hashStammtischPassword } from "../../utils/pin";
import { rundeEinladen } from "../../utils/einladen";
import { showAlert } from "../../utils/alert";
import { Button, Field, PressableScale, Sheet, haptik } from "../ui";

/**
 * Einladungscode groß zum Vorlesen oder Abtippen, Teilen und Kopieren. Damit
 * kommt jede:r ohne Passwort in die Runde – auch wer es vergessen hat.
 * Admins können einen neuen Code erzeugen; der alte gilt dann nicht mehr.
 */
export function EinladungSheet({ visible, code, name, istAdmin, onClose, onNeuerCode }: {
  visible: boolean;
  code: string | null;
  name: string;
  istAdmin: boolean;
  onClose: () => void;
  onNeuerCode: (code: string) => void;
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const [busy, setBusy] = useState(false);
  const [kopiert, setKopiert] = useState(false);
  useEffect(() => { if (visible) setKopiert(false); }, [visible]);

  async function kopieren() {
    if (!code) return;
    await Clipboard.setStringAsync(code);
    haptik("erfolg");
    setKopiert(true);
  }

  function erneuern() {
    showAlert(
      "Neuen Code erzeugen?",
      "Der bisherige Code funktioniert danach nicht mehr – z. B. wenn er in falsche Hände geraten ist. Wer schon drin ist, bleibt drin.",
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Neuer Code",
          onPress: async () => {
            setBusy(true);
            try {
              onNeuerCode(await einladungscodeErneuern());
              setKopiert(false);
            } catch {
              showAlert("Nicht erneuert", "Bitte nochmal versuchen.");
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Einladungscode">
      <Text style={styles.hinweis}>
        Mit diesem Code kommt man ohne Passwort in die Runde: In der App „Beitreten“ und dann „Mit Einladungscode beitreten“ wählen.
      </Text>
      <PressableScale onPress={kopieren} scaleTo={0.98} style={[styles.codeBox, { backgroundColor: c.blueBg }]} accessibilityLabel={code ? `Einladungscode ${code.split("").join(" ")}. Tippen zum Kopieren` : "Code wird geladen"}>
        {code ? <Text style={[styles.code, { color: c.blue }]} selectable>{code}</Text> : <ActivityIndicator color={c.blue} />}
        <Text style={[styles.codeSub, { color: c.blue }]}>{kopiert ? "Kopiert ✓" : "Tippen zum Kopieren"}</Text>
      </PressableScale>
      <Button label="Runde einladen" icon="share-outline" variant="blue" onPress={() => rundeEinladen(name)} disabled={!code} />
      {istAdmin ? (
        <Button label="Neuen Code erzeugen" icon="refresh" variant="secondary" onPress={erneuern} loading={busy} />
      ) : null}
    </Sheet>
  );
}

/** Stammtisch-Passwort ändern (nur Admins). Wer schon drin ist, bleibt drin. */
export function PasswortSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const [neu, setNeu] = useState("");
  const [wieder, setWieder] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (visible) { setNeu(""); setWieder(""); } }, [visible]);

  async function speichern() {
    if (neu.length < 4) {
      showAlert("Zu kurz", "Bitte mindestens 4 Zeichen.");
      return;
    }
    if (neu !== wieder) {
      showAlert("Stimmt nicht überein", "Bitte das neue Passwort zweimal gleich eingeben.");
      return;
    }
    setBusy(true);
    try {
      // Gleicher Hash wie beim Anlegen und Beitreten: Anmeldename + Passwort.
      const anmeldename = await loadAnmeldename();
      await passwortAendern(await hashStammtischPassword(anmeldename, neu));
      haptik("erfolg");
      onClose();
      showAlert("Passwort geändert", "Ab jetzt gilt das neue Passwort. Wer schon drin ist, bleibt drin.");
    } catch {
      showAlert("Nicht geändert", "Bitte nochmal versuchen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Passwort ändern"
      footer={<Button label="Speichern" icon="checkmark" variant="blue" loading={busy} onPress={speichern} />}
    >
      <Text style={styles.hinweis}>
        Das Passwort brauchen nur neue Leute zum Beitreten – alternativ geht der Einladungscode. Wer schon drin ist, bleibt drin.
      </Text>
      <View style={{ gap: 12 }}>
        <Field label="Neues Passwort" value={neu} onChangeText={setNeu} secureTextEntry autoCapitalize="none" autoComplete="off" textContentType="none" placeholder="Passwort" />
        <Field label="Wiederholen" value={wieder} onChangeText={setWieder} secureTextEntry autoCapitalize="none" autoComplete="off" textContentType="none" placeholder="Passwort" onSubmitEditing={speichern} />
      </View>
    </Sheet>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    hinweis: { ...TYPE.body, fontSize: 14, lineHeight: 20, color: c.textMid },
    codeBox: { borderRadius: RADIUS.card, paddingVertical: 22, alignItems: "center", gap: 6 },
    code: { fontFamily: FONT.w800, fontSize: 34, letterSpacing: 3, fontVariant: ["tabular-nums"] },
    codeSub: { fontFamily: FONT.w600, fontSize: 13 },
  });
