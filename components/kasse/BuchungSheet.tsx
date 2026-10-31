import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StrafKategorieDef } from "../../types";
import { FONT, MAX_FONT_SCALE, RADIUS, TYPE, ThemeColors } from "../../constants/design";
import { useColors, useThemedStyles } from "../../contexts/ThemeContext";
import { Kasse, NeueBuchung } from "../../utils/useKasse";
import { formatWochentagDatum, toLocalIsoDate } from "../../utils/date";
import { displayName, formatEuro, formatBetrag } from "../../utils/format";
import { showAlert } from "../../utils/alert";
import { Button, Chip, Emoji, KategorieIcon, PersonChip, PressableScale, Sheet, haptik } from "../ui";
import { SYMBOL } from "../../constants/symbole";

export type BuchungsArt = "einnahme" | "ausgabe" | "abendkosten" | "strafe";

const ARTEN: { key: BuchungsArt; label: string; emoji: string }[] = [
  { key: "einnahme", label: "Einnahme", emoji: SYMBOL.einnahme },
  { key: "ausgabe", label: "Ausgabe", emoji: SYMBOL.ausgabe },
  { key: "abendkosten", label: "Rechnung", emoji: SYMBOL.rechnung },
  { key: "strafe", label: "Strafe", emoji: SYMBOL.strafe },
];
const SCHNELL: Partial<Record<BuchungsArt, string[]>> = {
  einnahme: ["Mitgliedsbeitrag", "Spende", "Sonstiges"],
  ausgabe: ["Getränke", "Material", "Geschenk", "Sonstiges"],
};
const TASTEN = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ",", "0", "⌫"];

/** Betrag als Text „12,5" → Zahl; leer oder ungültig → NaN. */
function alsZahl(t: string): number {
  return t ? parseFloat(t.replace(",", ".")) : NaN;
}

/**
 * Der eine Weg, Geld einzutragen: Einnahme, Ausgabe, Stammtischrechnung
 * oder Strafe. Betrag über das Zahlenfeld, optional mit Bezug zum Termin.
 */
export function BuchungSheet({ visible, kasse, onClose, start }: {
  visible: boolean;
  kasse: Kasse;
  onClose: () => void;
  start?: { art?: BuchungsArt; terminId?: string };
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const [art, setArt] = useState<BuchungsArt>("einnahme");
  const [betrag, setBetrag] = useState("");
  const [text, setText] = useState("");
  const [schnell, setSchnell] = useState<string | null>(null);
  const [mitTermin, setMitTermin] = useState(false);
  const [zahler, setZahler] = useState<string | null>(null);
  const [dabei, setDabei] = useState<string[]>([]);
  const [wer, setWer] = useState<string | null>(null);
  const [kat, setKat] = useState<StrafKategorieDef | null>(null);
  const [busy, setBusy] = useState(false);

  // Termin zum Verknüpfen: der übergebene, sonst der letzte bis heute.
  const termin = useMemo(() => {
    if (start?.terminId) return kasse.termine.find((t) => t.id === start.terminId);
    const heute = toLocalIsoDate(new Date());
    return [...kasse.termine].filter((t) => t.datum <= heute).sort((a, b) => b.datum.localeCompare(a.datum))[0];
  }, [kasse.termine, start?.terminId]);

  useEffect(() => {
    if (!visible) return;
    const a = start?.art ?? "einnahme";
    setArt(a);
    setBetrag("");
    setText("");
    setSchnell(null);
    setZahler(null);
    setWer(null);
    setKat(null);
    setMitTermin(!!start?.terminId || a === "abendkosten");
    setDabei(start?.terminId ? termin?.anwesenheit ?? [] : []);
  }, [visible]);

  function artWechseln(a: BuchungsArt) {
    setArt(a);
    setSchnell(null);
    if (schnell && text === schnell) setText("");
    if (a === "abendkosten" || a === "strafe") setMitTermin(!!termin);
    if (a === "abendkosten" && dabei.length === 0 && termin) setDabei(termin.anwesenheit ?? []);
  }

  function taste(t: string) {
    haptik("leicht");
    setBetrag((b) => {
      if (t === "⌫") return b.slice(0, -1);
      if (t === ",") return b.includes(",") ? b : (b || "0") + ",";
      const [vor, nach] = b.split(",");
      if (nach !== undefined && nach.length >= 2) return b;
      if (nach === undefined && vor.replace(/^0+/, "").length >= 5) return b;
      if (b === "0") return t;
      return b + t;
    });
  }

  function schnellWahl(s: string) {
    const neu = schnell === s ? null : s;
    if (!text || text === schnell) setText(neu ?? "");
    setSchnell(neu);
  }

  function katWahl(k: StrafKategorieDef) {
    const neu = kat?.id === k.id ? null : k;
    setKat(neu);
    if (neu && neu.betrag > 0) setBetrag(formatEuro(neu.betrag).replace(",00", ""));
  }

  const zahl = alsZahl(betrag);
  const fehlt =
    !(zahl > 0) ? "Betrag eingeben"
    : art === "abendkosten" && !zahler ? "Wer hat bezahlt?"
    : art === "abendkosten" && dabei.length === 0 ? "Wer war dabei?"
    : art === "strafe" && !wer ? "Wer bekommt die Strafe?"
    : art === "strafe" && !kat ? "Wofür?"
    : null;
  const farbe = { einnahme: { bg: c.success, fg: c.onAccent }, ausgabe: { bg: c.coral, fg: c.onCoral }, abendkosten: { bg: c.heroBlue, fg: c.onHeroBlue }, strafe: { bg: c.coral, fg: c.onCoral } }[art];
  const artLabel = ARTEN.find((a) => a.key === art)!.label;
  const teilnehmerZahl = art === "abendkosten" ? (zahler && !dabei.includes(zahler) ? dabei.length + 1 : dabei.length) : 0;

  async function speichern() {
    if (fehlt) return;
    const terminId = mitTermin ? termin?.id : undefined;
    let b: NeueBuchung;
    if (art === "abendkosten") b = { typ: "abendkosten", betrag: zahl, beschreibung: text.trim() || undefined, terminId, bezahltVon: zahler!, teilnehmerIds: dabei };
    else if (art === "strafe") b = { typ: "strafe", betrag: zahl, memberId: wer!, kategorie: kat!, notiz: text.trim() || undefined, terminId };
    else b = { typ: art, betrag: zahl, beschreibung: text.trim() || undefined, terminId };
    setBusy(true);
    try {
      await kasse.buchen(b);
      haptik("erfolg");
      onClose();
    } catch {
      showAlert("Nicht gespeichert", "Die Buchung konnte nicht gespeichert werden. Prüf deine Verbindung.");
    } finally {
      setBusy(false);
    }
  }

  const personenChips = (gewaehlt: (id: string) => boolean, tippen: (id: string) => void) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={styles.chips}>
      {kasse.members.map((m) => (
        <PersonChip key={m.id} member={m} ich={kasse.activeMemberId} selected={gewaehlt(m.id)} onPress={() => tippen(m.id)} />
      ))}
    </ScrollView>
  );

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Neue Buchung"
      gross
      footer={
        <View style={{ gap: 10 }}>
          <View style={styles.tasten} accessibilityLabel="Zahlenfeld">
            {TASTEN.map((t) => (
              <PressableScale key={t} onPress={() => taste(t)} scaleTo={0.94} style={styles.taste} accessibilityLabel={t === "⌫" ? "Löschen" : t === "," ? "Komma" : t}>
                {t === "⌫" ? <Ionicons name="backspace-outline" size={22} color={c.textDark} /> : <Text style={styles.tasteText}>{t}</Text>}
              </PressableScale>
            ))}
          </View>
          <Button
            label={fehlt ?? `${artLabel} eintragen · ${formatBetrag(zahl)}`}
            colors={fehlt ? { bg: c.cardAlt, fg: c.textMuted } : farbe}
            icon={fehlt ? undefined : "checkmark"}
            loading={busy}
            onPress={speichern}
            style={{ height: 56 }}
            accessibilityLabel={fehlt ? `Noch nicht möglich: ${fehlt}` : `${artLabel} über ${formatEuro(zahl)} Euro eintragen`}
          />
        </View>
      }
    >
      <View style={styles.arten} accessibilityRole="radiogroup">
        {ARTEN.map((a) => {
          const sel = a.key === art;
          return (
            <PressableScale
              key={a.key}
              onPress={() => artWechseln(a.key)}
              accessibilityRole="radio"
              accessibilityState={{ selected: sel }}
              accessibilityLabel={a.label}
              style={[styles.art, sel && { backgroundColor: c.heroBlue }]}
            >
              <Emoji size={17}>{a.emoji}</Emoji>
              <Text style={[styles.artText, sel && { color: c.onHeroBlue }]}>{a.label}</Text>
            </PressableScale>
          );
        })}
      </View>

      <View>
        <Text style={[styles.betrag, !betrag && { color: c.textLight }]} maxFontSizeMultiplier={MAX_FONT_SCALE} accessibilityLiveRegion="polite">
          {`${betrag || "0,00"} €`}
        </Text>
        <Text style={styles.betragSub}>
          {art === "einnahme" ? "Einnahme für die Kasse"
            : art === "ausgabe" ? "Ausgabe aus der Kasse"
            : art === "abendkosten" ? (teilnehmerZahl > 0 && zahl > 0 ? `${formatBetrag(zahl / teilnehmerZahl)} pro Kopf` : "Einer zahlt für alle, die anderen zahlen ihm zurück")
            : "Landet erst beim Bezahlen in der Kasse"}
        </Text>
      </View>

      {termin ? (
        <View style={{ flexDirection: "row" }}>
          <Chip
            label={`Zu Termin ${formatWochentagDatum(new Date(`${termin.datum}T00:00:00`))}`}
            selected={mitTermin}
            onPress={() => setMitTermin((v) => !v)}
            leading={<Emoji size={14}>{SYMBOL.termin}</Emoji>}
            accessibilityLabel={`Zum Termin ${formatWochentagDatum(new Date(`${termin.datum}T00:00:00`))} zuordnen`}
          />
        </View>
      ) : null}

      {art === "abendkosten" ? (
        <>
          <Text style={styles.label}>Wer hat bezahlt?</Text>
          {personenChips((id) => id === zahler, (id) => setZahler(id === zahler ? null : id))}
          <Text style={styles.label}>Wer war dabei?</Text>
          {personenChips((id) => dabei.includes(id), (id) => setDabei((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id])))}
        </>
      ) : null}

      {art === "strafe" ? (
        <>
          <Text style={styles.label}>Wer</Text>
          {personenChips((id) => id === wer, (id) => setWer(id === wer ? null : id))}
          <Text style={styles.label}>Wofür</Text>
          <View style={styles.katListe}>
            {kasse.strafKategorien.filter((k) => !k.spielEreignisTypId).map((k) => {
              const sel = kat?.id === k.id;
              return (
                <PressableScale key={k.id} onPress={() => katWahl(k)} accessibilityRole="radio" accessibilityState={{ selected: sel }} accessibilityLabel={k.label} style={[styles.kat, sel && { borderColor: c.coral, backgroundColor: c.coralSoft }]}>
                  <KategorieIcon kat={k} size={28} />
                  <Text style={styles.katText} numberOfLines={1}>{k.label}</Text>
                  {k.betrag > 0 ? <Text style={[styles.katBetrag, { color: c.coralText }]}>{formatBetrag(k.betrag)}</Text> : null}
                </PressableScale>
              );
            })}
          </View>
        </>
      ) : null}

      {SCHNELL[art] ? (
        <>
          <Text style={styles.label}>Kategorie</Text>
          <View style={styles.schnell}>
            {SCHNELL[art]!.map((s) => <Chip key={s} label={s} selected={schnell === s} onPress={() => schnellWahl(s)} />)}
          </View>
        </>
      ) : null}

      <View style={styles.feld}>
        <Text style={styles.feldLabel}>{art === "strafe" ? "Notiz" : "Beschreibung"}</Text>
        <TextInput
          style={styles.feldInput}
          value={text}
          onChangeText={setText}
          placeholder={art === "einnahme" ? "z. B. Beitrag Oktober" : art === "ausgabe" ? "z. B. Würfelbecher" : art === "abendkosten" ? "z. B. Gasthof Kandler" : "optional"}
          placeholderTextColor={c.textLight}
          accessibilityLabel={art === "strafe" ? "Notiz" : "Beschreibung"}
        />
      </View>
    </Sheet>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    arten: { flexDirection: "row", gap: 8 },
    art: { flex: 1, minHeight: 60, borderRadius: RADIUS.md + 2, backgroundColor: c.cardAlt, alignItems: "center", justifyContent: "center", gap: 4 },
    artText: { fontFamily: FONT.w600, fontSize: 13, color: c.textDark },
    betrag: { ...TYPE.num, fontSize: 40, lineHeight: 46, color: c.textDark, letterSpacing: -1 },
    betragSub: { ...TYPE.caption, fontSize: 13, color: c.textMuted },
    label: { ...TYPE.label, color: c.textMuted, marginTop: 4 },
    chips: { gap: 8, paddingHorizontal: 16 },
    schnell: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    katListe: { gap: 8 },
    kat: {
      flexDirection: "row", alignItems: "center", gap: 10, minHeight: 48, paddingHorizontal: 10, borderRadius: RADIUS.md,
      backgroundColor: c.card, borderWidth: 1.5, borderColor: c.hairline,
    },
    katText: { flex: 1, fontFamily: FONT.w600, fontSize: 15, color: c.textDark },
    katBetrag: { fontFamily: FONT.w700, fontSize: 15 },
    feld: { minHeight: 52, borderRadius: RADIUS.md, backgroundColor: c.cardAlt, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 10 },
    feldLabel: { fontFamily: FONT.w600, fontSize: 14, color: c.textDark },
    feldInput: { flex: 1, minHeight: 48, fontFamily: FONT.w500, fontSize: 15, color: c.textDark },
    tasten: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    taste: { width: "31.8%", height: 48, borderRadius: RADIUS.md, backgroundColor: c.cardAlt, alignItems: "center", justifyContent: "center", flexGrow: 1 },
    tasteText: { fontFamily: FONT.w600, fontSize: 22, color: c.textDark },
  });
