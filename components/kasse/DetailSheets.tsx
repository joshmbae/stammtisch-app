import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { KassenEintrag, StrafLog } from "../../types";
import { FONT, MAX_FONT_SCALE, RADIUS, TYPE, ThemeColors } from "../../constants/design";
import { useColors, useThemedStyles } from "../../contexts/ThemeContext";
import { Kasse } from "../../utils/useKasse";
import { anteilProKopf, rechnungBeglichen, schuldnerVon } from "../../utils/kasse";
import { formatUhrzeit, formatWochentagDatum } from "../../utils/date";
import { displayName, formatEuro } from "../../utils/format";
import { terminBezeichnung } from "../../utils/activityFeed";
import { showAlert } from "../../utils/alert";
import { Button, KategorieIcon, PressableScale, Sheet } from "../ui";

const wann = (iso: string) => `${formatWochentagDatum(new Date(iso), true)} · ${formatUhrzeit(iso)} Uhr`;

function Zeile({ label, wert, onPress }: { label: string; wert: string; onPress?: () => void }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const inhalt = (
    <>
      <Text style={styles.zeileLabel}>{label}</Text>
      <View style={styles.zeileWertReihe}>
        <Text style={[styles.zeileWert, onPress && { color: c.blue }]}>{wert}</Text>
        {onPress ? <Ionicons name="chevron-forward" size={16} color={c.blue} /> : null}
      </View>
    </>
  );
  return onPress ? (
    <PressableScale onPress={onPress} style={styles.zeile} accessibilityLabel={`${label}: ${wert}`}>{inhalt}</PressableScale>
  ) : (
    <View style={styles.zeile}>{inhalt}</View>
  );
}

function useLoeschen(titel: string, text: string, loeschen: () => Promise<void>, onClose: () => void) {
  const [busy, setBusy] = useState(false);
  return {
    busy,
    frage: () =>
      showAlert(titel, text, [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Löschen",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            try { await loeschen(); onClose(); } catch { showAlert("Fehler", "Das konnte nicht gelöscht werden."); } finally { setBusy(false); }
          },
        },
      ]),
  };
}

/** Alles zu einer Buchung oder Rechnung: Betrag, Text, wer, wann, Termin – und Löschen. */
export function EintragSheet({ eintrag, kasse, onClose }: { eintrag: KassenEintrag | null; kasse: Kasse; onClose: () => void }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const e = eintrag;
  const loeschen = useLoeschen("Eintrag löschen?", "Der Eintrag wird für alle aus der Kasse entfernt.", () => kasse.eintragLoeschen(e!.id), onClose);
  if (!e) return null;
  const rechnung = e.typ === "abendkosten";
  const rein = e.typ === "einnahme";
  const m = (id?: string) => kasse.members.find((x) => x.id === id);
  const zahler = m(e.bezahltVon);
  const actor = m(kasse.actorByRefId.get(e.id));
  const termin = kasse.termine.find((t) => t.id === e.terminId);
  const teilnehmer = (e.teilnehmerIds ?? []).map((id) => m(id)).filter(Boolean);
  const offen = schuldnerVon(e).filter((id) => !(e.beglichenIds ?? []).includes(id));
  const geheZu = (route: string) => { onClose(); router.push(route as any); };

  return (
    <Sheet
      visible
      onClose={onClose}
      title={rechnung ? "Stammtischrechnung" : rein ? "Einnahme" : "Ausgabe"}
      footer={<Button label="Eintrag löschen" icon="trash-outline" variant="ghost" colors={{ bg: "transparent", fg: c.dangerText }} loading={loeschen.busy} onPress={loeschen.frage} />}
    >
      <Text style={[styles.betrag, { color: rechnung ? c.textDark : rein ? c.successText : c.coralText }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
        {`${rechnung ? "" : rein ? "+" : "−"}${formatEuro(e.betrag)} €`}
      </Text>
      {e.beschreibung?.trim() ? <Text style={styles.text} selectable>{e.beschreibung.trim()}</Text> : null}
      <View style={styles.karte}>
        <Zeile label="Datum" wert={wann(e.datum)} />
        {zahler ? <Zeile label="Bezahlt von" wert={zahler.name} onPress={() => geheZu(`/member/${zahler.id}`)} /> : null}
        {teilnehmer.length > 0 ? (
          <Zeile label="Dabei" wert={`${teilnehmer.length} Personen · ${formatEuro(anteilProKopf(e))} € pro Kopf\n${teilnehmer.map((x) => displayName(x!)).join(", ")}`} />
        ) : null}
        {rechnung ? (
          <Zeile label="Status" wert={rechnungBeglichen(e) ? "Alle haben bezahlt" : offen.length ? `Offen: ${offen.map((id) => (m(id) ? displayName(m(id)!) : "?")).join(", ")}` : "Offen"} />
        ) : null}
        {actor ? <Zeile label="Eingetragen von" wert={actor.name} onPress={() => geheZu(`/member/${actor.id}`)} /> : null}
        {e.terminId ? (
          <Zeile
            label="Termin"
            wert={termin ? terminBezeichnung({ terminDatum: termin.datum, terminTitel: termin.titel, terminArt: termin.art }, true) : "Termin gelöscht"}
            onPress={termin ? () => geheZu(`/termin/${termin.id}`) : undefined}
          />
        ) : null}
      </View>
    </Sheet>
  );
}

/** Eine Strafe im Detail: abhaken oder löschen. */
export function StrafeSheet({ strafe, kasse, onClose }: { strafe: StrafLog | null; kasse: Kasse; onClose: () => void }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const l = strafe ? kasse.strafen.find((x) => x.id === strafe.id) ?? strafe : null;
  const loeschen = useLoeschen("Strafe löschen?", "Die Strafe wird entfernt. Eine schon gebuchte Einnahme bleibt in der Kasse; zum Zurücknehmen erst „Wieder offen setzen\".", () => kasse.strafeLoeschen(l!.id), onClose);
  const [busy, setBusy] = useState(false);
  if (!l) return null;
  const kat = kasse.strafKategorien.find((k) => k.id === l.kategorie);
  const person = kasse.members.find((x) => x.id === l.memberId);
  const termin = kasse.termine.find((t) => t.id === l.terminId);
  const geheZu = (route: string) => { onClose(); router.push(route as any); };

  async function umschalten() {
    setBusy(true);
    try { await kasse.strafeUmschalten(l!.id); } finally { setBusy(false); }
  }

  return (
    <Sheet
      visible
      onClose={onClose}
      title="Strafe"
      footer={
        <View style={{ gap: 4 }}>
          <Button
            label={l.beglichen ? "Wieder offen setzen" : "Als bezahlt markieren"}
            icon={l.beglichen ? "arrow-undo-outline" : "checkmark"}
            variant={l.beglichen ? "secondary" : "blue"}
            colors={l.beglichen ? undefined : { bg: c.success, fg: c.onAccent }}
            haptic={l.beglichen ? "leicht" : "erfolg"}
            loading={busy}
            onPress={umschalten}
          />
          <Button label="Strafe löschen" icon="trash-outline" variant="ghost" colors={{ bg: "transparent", fg: c.dangerText }} loading={loeschen.busy} onPress={loeschen.frage} />
        </View>
      }
    >
      <View style={styles.strafKopf}>
        <KategorieIcon kat={kat} size={52} />
        <View style={{ flex: 1 }}>
          <Text style={styles.strafWas}>{kat?.systemKey === "sonstiges" && l.notiz ? l.notiz : kat?.label ?? "Strafe"}</Text>
          <Text style={[styles.strafStatus, { color: l.beglichen ? c.successText : c.coralText }]}>{l.beglichen ? "bezahlt" : "offen"}</Text>
        </View>
        <Text style={[styles.strafBetrag, { color: l.beglichen ? c.textMuted : c.coralText }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{`${formatEuro(l.betrag)} €`}</Text>
      </View>
      <View style={styles.karte}>
        {person ? <Zeile label="Wer" wert={person.name} onPress={() => geheZu(`/member/${person.id}`)} /> : null}
        <Zeile label="Wann" wert={wann(l.loggedAt)} />
        {l.notiz && kat?.systemKey !== "sonstiges" ? <Zeile label="Notiz" wert={l.notiz} /> : null}
        {l.terminId ? (
          <Zeile
            label="Termin"
            wert={termin ? terminBezeichnung({ terminDatum: termin.datum, terminTitel: termin.titel, terminArt: termin.art }, true) : "Termin gelöscht"}
            onPress={termin ? () => geheZu(`/termin/${termin.id}`) : undefined}
          />
        ) : null}
      </View>
    </Sheet>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    betrag: { ...TYPE.num, fontSize: 40, lineHeight: 46 },
    text: { ...TYPE.body, color: c.textDark, lineHeight: 22 },
    karte: { backgroundColor: c.card, borderRadius: RADIUS.tile, paddingHorizontal: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: c.hairline },
    zeile: { paddingVertical: 12, gap: 2, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
    zeileLabel: { ...TYPE.label, color: c.textMuted },
    zeileWertReihe: { flexDirection: "row", alignItems: "center", gap: 4 },
    zeileWert: { flex: 1, fontFamily: FONT.w600, fontSize: 15, color: c.textDark, lineHeight: 21 },
    strafKopf: { flexDirection: "row", alignItems: "center", gap: 14 },
    strafWas: { fontFamily: FONT.w800, fontSize: 18, color: c.textDark },
    strafStatus: { fontFamily: FONT.w700, fontSize: 13 },
    strafBetrag: { ...TYPE.num, fontSize: 26 },
  });
