import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StammtischVerordnung, TerminArt } from "../../types";
import { FONT, RADIUS, TYPE, ThemeColors } from "../../constants/design";
import { useColors, useThemedStyles } from "../../contexts/ThemeContext";
import { useSession } from "../../contexts/SessionContext";
import { addTermine, logActivity } from "../../utils/storage";
import { formatWochentagDatum, parseTimeString, toLocalIsoDate, toTimeString } from "../../utils/date";
import { showAlert } from "../../utils/alert";
import InlineDateTimePicker from "../InlineDateTimePicker";
import { Button, Chip, Field, FieldButton, PressableScale, SegmentedTabs, Sheet, ToggleRow } from "../ui";
import { SYMBOL } from "../../constants/symbole";

type Intervall = "woechentlich" | "alle2wochen" | "monatlich";
const INTERVALLE: { key: Intervall; label: string }[] = [
  { key: "woechentlich", label: "Wöchentlich" },
  { key: "alle2wochen", label: "Alle 2 Wochen" },
  { key: "monatlich", label: "Monatlich" },
];
type Picker = "datum" | "bis" | "start" | "ende" | null;

function weiter(d: Date, i: Intervall): Date {
  const n = new Date(d);
  if (i === "woechentlich") n.setDate(n.getDate() + 7);
  else if (i === "alle2wochen") n.setDate(n.getDate() + 14);
  else n.setMonth(n.getMonth() + 1);
  return n;
}

const datumText = (d: Date) => d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });

/**
 * Neuer Termin: Stammtisch, Veranstaltung oder Geburtstag, optional als
 * Serie. Beim Stammtisch sind Uhrzeit und Treffpunkt aus der Satzung
 * vorbelegt. Eine Serie erzeugt nur einen Chronik-Eintrag (sonst ein Push
 * pro Termin).
 */
export function NeuerTerminSheet({ visible, onClose, onSaved, tag, verordnung }: {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  /** Vorgewählter Tag "YYYY-MM-DD". */
  tag?: string | null;
  verordnung: StammtischVerordnung | null;
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const { activeMemberId } = useSession();
  const [art, setArt] = useState<TerminArt>("stammtisch");
  const [titel, setTitel] = useState("");
  const [datum, setDatum] = useState(new Date());
  const [bis, setBis] = useState<Date | null>(null);
  const [start, setStart] = useState<Date | null>(null);
  const [ende, setEnde] = useState<Date | null>(null);
  const [ort, setOrt] = useState("");
  const [notiz, setNotiz] = useState("");
  const [serie, setSerie] = useState(false);
  const [intervall, setIntervall] = useState<Intervall>("woechentlich");
  const [anzahl, setAnzahl] = useState(8);
  const [picker, setPicker] = useState<Picker>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setArt("stammtisch");
    setTitel("");
    setDatum(tag ? new Date(`${tag}T00:00:00`) : new Date());
    setBis(null);
    setStart(verordnung?.stammtischzeit ? parseTimeString(verordnung.stammtischzeit) : null);
    setEnde(null);
    setOrt(verordnung?.treffpunkt ?? "");
    setNotiz("");
    setSerie(false);
    setIntervall("woechentlich");
    setAnzahl(8);
    setPicker(null);
  }, [visible]);

  function artWechseln(a: TerminArt) {
    setArt(a);
    setPicker(null);
    // Vorbelegung aus der Satzung gilt nur für den Stammtisch.
    if (a === "stammtisch") {
      if (!start && verordnung?.stammtischzeit) setStart(parseTimeString(verordnung.stammtischzeit));
      if (!ort && verordnung?.treffpunkt) setOrt(verordnung.treffpunkt);
    }
  }

  const geburtstag = art === "geburtstag";
  const veranstaltung = art === "veranstaltung";
  const mitSerie = serie && !geburtstag;
  const n = mitSerie ? anzahl : 1;
  let letzter = datum;
  for (let i = 1; i < n; i++) letzter = weiter(letzter, intervall);

  async function speichern() {
    if ((geburtstag || veranstaltung) && !titel.trim()) {
      showAlert("Titel fehlt", geburtstag ? "Wessen Geburtstag ist es?" : "Wie heißt die Veranstaltung?");
      return;
    }
    const entwuerfe: Parameters<typeof addTermine>[0] = [];
    let d = datum;
    for (let i = 0; i < n; i++) {
      entwuerfe.push({
        art,
        titel: titel.trim() || undefined,
        datum: toLocalIsoDate(d),
        datumBis: veranstaltung && bis ? toLocalIsoDate(bis) : undefined,
        startZeit: !geburtstag && start ? toTimeString(start) : undefined,
        endZeit: !geburtstag && ende ? toTimeString(ende) : undefined,
        ort: !geburtstag ? ort.trim() || undefined : undefined,
        notizen: notiz.trim() || undefined,
      });
      d = weiter(d, intervall);
    }
    setBusy(true);
    try {
      const angelegt = await addTermine(entwuerfe);
      const erster = angelegt[0];
      await logActivity({
        actorMemberId: activeMemberId ?? undefined,
        actionType: "termin_erstellt",
        terminId: erster.id,
        meta: { terminDatum: erster.datum, terminTitel: erster.titel, terminArt: erster.art, anzahl: angelegt.length, letztesDatum: angelegt[angelegt.length - 1].datum },
      });
      onSaved();
    } catch (e) {
      showAlert("Konnte nicht gespeichert werden", e instanceof Error ? e.message : "Bitte prüf deine Verbindung und versuch es nochmal.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Neuer Termin"
      gross
      footer={
        <Button
          label={busy ? "Wird angelegt …" : n > 1 ? `${n} Termine anlegen` : "Termin anlegen"}
          icon="checkmark"
          variant="blue"
          loading={busy}
          onPress={speichern}
          style={{ height: 56 }}
        />
      }
    >
      <SegmentedTabs
        variant="blue"
        value={art}
        onChange={artWechseln}
        items={[{ key: "stammtisch", label: "Stammtisch" }, { key: "veranstaltung", label: "Veranstaltung" }, { key: "geburtstag", label: "Geburtstag" }]}
      />

      {art !== "stammtisch" ? (
        <Field label={geburtstag ? "Wer hat Geburtstag?" : "Titel"} value={titel} onChangeText={setTitel} placeholder={geburtstag ? "Name" : "z. B. Weihnachtsfeier"} />
      ) : null}

      <View style={styles.zeile}>
        <FieldButton label={geburtstag ? "Geburtstag" : "Datum"} icon="calendar-outline" value={formatWochentagDatum(datum, true)} onPress={() => setPicker(picker === "datum" ? null : "datum")} />
        {!geburtstag ? (
          <FieldButton label="Uhrzeit" icon="time-outline" value={start ? toTimeString(start) : undefined} placeholder="optional" onPress={() => setPicker(picker === "start" ? null : "start")} onClear={() => setStart(null)} />
        ) : null}
      </View>
      {picker === "datum" ? <InlineDateTimePicker value={datum} mode="date" onChange={setDatum} onClose={() => setPicker(null)} /> : null}
      {picker === "start" ? <InlineDateTimePicker value={start ?? parseTimeString("19:30")} mode="time" is24Hour onChange={setStart} onClose={() => setPicker(null)} /> : null}

      {veranstaltung ? (
        <>
          <View style={styles.zeile}>
            <FieldButton label="Bis (mehrtägig)" icon="calendar-outline" value={bis ? formatWochentagDatum(bis, true) : undefined} placeholder="optional" onPress={() => setPicker(picker === "bis" ? null : "bis")} onClear={() => setBis(null)} />
            <FieldButton label="Ende" icon="time-outline" value={ende ? toTimeString(ende) : undefined} placeholder="optional" onPress={() => setPicker(picker === "ende" ? null : "ende")} onClear={() => setEnde(null)} />
          </View>
          {picker === "bis" ? <InlineDateTimePicker value={bis ?? datum} mode="date" minimumDate={datum} onChange={setBis} onClose={() => setPicker(null)} /> : null}
          {picker === "ende" ? <InlineDateTimePicker value={ende ?? parseTimeString("23:00")} mode="time" is24Hour onChange={setEnde} onClose={() => setPicker(null)} /> : null}
        </>
      ) : null}

      {!geburtstag ? <Field label="Ort" value={ort} onChangeText={setOrt} placeholder="z. B. Gasthof Kandler" /> : null}

      {!geburtstag ? (
        <View style={styles.serie}>
          <ToggleRow title="Wiederholen" subtitle={mitSerie ? `${INTERVALLE.find((x) => x.key === intervall)!.label.toLowerCase()} · ${n} Termine` : "Serie anlegen"} emoji={SYMBOL.serie} ton="blue" value={serie} onValueChange={setSerie} />
          {mitSerie ? (
            <View style={{ gap: 10, paddingBottom: 6 }}>
              <View style={styles.chips}>
                {INTERVALLE.map((x) => <Chip key={x.key} label={x.label} selected={intervall === x.key} onPress={() => setIntervall(x.key)} />)}
              </View>
              <View style={styles.anzahlZeile}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Bis</Text>
                  <Text style={styles.anzahlDatum}>{datumText(letzter)}</Text>
                </View>
                <PressableScale onPress={() => setAnzahl((a) => Math.max(2, a - 1))} style={styles.stepper} accessibilityLabel="Ein Termin weniger">
                  <Ionicons name="remove" size={20} color={c.textDark} />
                </PressableScale>
                <Text style={styles.anzahl} accessibilityLiveRegion="polite">{`${anzahl} Termine`}</Text>
                <PressableScale onPress={() => setAnzahl((a) => Math.min(52, a + 1))} style={styles.stepper} accessibilityLabel="Ein Termin mehr">
                  <Ionicons name="add" size={20} color={c.textDark} />
                </PressableScale>
              </View>
            </View>
          ) : null}
        </View>
      ) : null}

      <Field label="Notiz" value={notiz} onChangeText={setNotiz} placeholder="z. B. Tisch für 10 reserviert" multiline />
    </Sheet>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    zeile: { flexDirection: "row", gap: 10 },
    serie: { backgroundColor: c.card, borderRadius: RADIUS.tile, paddingHorizontal: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: c.hairline },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    anzahlZeile: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: c.cardAlt, borderRadius: RADIUS.md, padding: 10 },
    label: { ...TYPE.label, color: c.textMuted },
    anzahlDatum: { fontFamily: FONT.w700, fontSize: 15, color: c.textDark },
    stepper: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.card, alignItems: "center", justifyContent: "center" },
    anzahl: { fontFamily: FONT.w700, fontSize: 15, color: c.textDark, minWidth: 84, textAlign: "center" },
  });
