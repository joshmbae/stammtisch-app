import React, { useMemo, useRef, useState } from "react";
import { ActivityIndicator, Image, Platform, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import { MemberProfile } from "../../types";
import { FONT, MAX_FONT_SCALE, RADIUS, TYPE, ThemeColors } from "../../constants/design";
import { useColors, useThemedStyles } from "../../contexts/ThemeContext";
import { TerminAbend } from "../../utils/useTerminAbend";
import { abendStats, ereignisGesamt } from "../../utils/abendStats";
import { formatWochentagDatum } from "../../utils/date";
import { displayName, formatBetrag } from "../../utils/format";
import { useSession } from "../../contexts/SessionContext";
import { showAlert } from "../../utils/alert";
import { begleichenDialog } from "../../utils/zahlungslink";
import { Avatar, BarList, BarRow, Button, Card, Emoji, IconSquircle, Krone, PressableScale, Ring, Ton, haptik, tonFarben } from "../ui";
import { SYMBOL } from "../../constants/symbole";
import { RueckblickBild, RueckblickSieger } from "./RueckblickBild";


interface Kategorie {
  key: string;
  label: string;
  wert: string;
  ton: Ton;
  emoji?: string;
  titel: string;
  summe: string;
  zeilen: BarRow[];
}

/** Nach dem Abend: Anwesenheit, Zahlen pro Kategorie, Offenes, Rechnung, Protokoll. */
export function DanachView({ abend, start }: { abend: TerminAbend; start: Date | null }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const { activeMemberId } = useSession();
  const [zahltGerade, setZahltGerade] = useState(false);
  const [teiltGerade, setTeiltGerade] = useState(false);
  const bildRef = useRef<View>(null);
  const t = abend.termin!;
  const strafLogs = useMemo(() => Object.values(abend.strafMap).flat(), [abend.strafMap]);
  const spielLogs = useMemo(() => Object.values(abend.spielLogMap).flat(), [abend.spielLogMap]);
  const stats = abendStats(t, abend.members, strafLogs, spielLogs);
  const byId = new Map(abend.members.map((m) => [m.id, m]));

  const avatar = (m: MemberProfile) => (
    <Avatar name={displayName(m)} color={m.avatarColor} photoUri={m.photoUri} size={34} />
  );

  function zeilen(werte: Map<string, number>, anzeige: (v: number) => string, sub?: (id: string) => string | undefined): BarRow[] {
    const sortiert = [...werte.entries()].filter(([id, v]) => v > 0 && byId.has(id)).sort((a, b) => b[1] - a[1]);
    const max = sortiert[0]?.[1] ?? 0;
    return sortiert.map(([id, v]) => {
      const m = byId.get(id)!;
      return {
        id, value: v, display: anzeige(v), label: displayName(m), sub: sub?.(id), leading: avatar(m),
        trailing: v === max ? <Krone size={14} /> : undefined,
      };
    });
  }

  function zahlen(offen: typeof strafLogs, betrag: number) {
    begleichenDialog({
      link: abend.verordnung.zahlungsLink,
      betragText: formatBetrag(betrag),
      beschreibung: `${offen.length} ${offen.length === 1 ? "Strafe von heute wird" : "Strafen von heute werden"}`,
      onBeglichen: async () => {
        setZahltGerade(true);
        try {
          await abend.meineStrafenBegleichen(offen);
          haptik("erfolg");
        } catch {
          showAlert("Fehler", "Nicht alles konnte gespeichert werden. Bitte in der Kasse prüfen.");
        } finally {
          setZahltGerade(false);
        }
      },
    });
  }

  const kategorien: Kategorie[] = [];
  // Strafen abgeschaltet (Einstellungen) → keine Kachel, außer es gibt trotzdem welche.
  if (abend.verordnung.tabStrafenAktiv !== false || strafLogs.length > 0) {
    const proKopf = new Map<string, number>();
    const gruende = new Map<string, string[]>();
    for (const l of strafLogs) {
      proKopf.set(l.memberId, (proKopf.get(l.memberId) ?? 0) + l.betrag);
      const label = abend.strafKategorien.find((k) => k.id === l.kategorie)?.label ?? "Strafe";
      gruende.set(l.memberId, [...(gruende.get(l.memberId) ?? []), label]);
    }
    // Pro Person: bezahlt (✓) oder offen; bei dir selbst mit offenen Strafen ein „Zahlen"-Knopf.
    const offenVon = (id: string) => strafLogs.filter((l) => l.memberId === id && !l.beglichen);
    const status = (id: string): React.ReactNode => {
      const offen = offenVon(id);
      if (offen.length === 0) {
        return <Ionicons name="checkmark-circle" size={20} color={c.greenText} accessibilityLabel="bezahlt" />;
      }
      if (id !== activeMemberId) {
        return <Text style={[styles.statusOffen, { color: c.coralText }]}>offen</Text>;
      }
      const betrag = offen.reduce((s, l) => s + l.betrag, 0);
      return (
        <PressableScale
          onPress={() => zahlen(offen, betrag)}
          disabled={zahltGerade}
          scaleTo={0.94}
          hitSlop={6}
          style={[styles.zahlen, { backgroundColor: c.coral }]}
          accessibilityRole="button"
          accessibilityLabel={`Deine Strafen von heute begleichen, ${formatBetrag(betrag)}`}
        >
          {zahltGerade ? <ActivityIndicator size="small" color={c.onCoral} /> : <Text style={[styles.zahlenText, { color: c.onCoral }]}>Zahlen</Text>}
        </PressableScale>
      );
    };
    const offenSumme = strafLogs.filter((l) => !l.beglichen).reduce((s, l) => s + l.betrag, 0);
    kategorien.push({
      key: "strafen", label: "Strafen", wert: formatBetrag(stats.strafenSumme), ton: "blue", titel: "Strafen pro Kopf",
      summe: strafLogs.length === 0 ? "keine"
        : offenSumme === 0 ? `${formatBetrag(stats.strafenSumme)} · alles bezahlt`
        : offenSumme === stats.strafenSumme ? `${formatBetrag(offenSumme)} offen`
        : `${formatBetrag(stats.strafenSumme)} · ${formatBetrag(offenSumme)} offen`,
      zeilen: zeilen(proKopf, formatBetrag, (id) => [...new Set(gruende.get(id))].join(", ")).map((r) => ({ ...r, after: status(r.id) })),
    });
  }
  const toene: Ton[] = ["mustard", "coral", "green", "blue"];
  abend.ereignisTypen.forEach((typ, i) => {
    const n = ereignisGesamt(stats, typ.id);
    const mitStrafe = (typ.strafBetrag ?? 0) > 0;
    kategorien.push({
      key: typ.id, label: typ.label, wert: `${n}×`, ton: toene[i % toene.length], emoji: typ.emoji, titel: `${typ.label} pro Kopf`,
      summe: mitStrafe && n > 0 ? `${n} × ${formatBetrag(typ.strafBetrag!)} = ${formatBetrag(n * typ.strafBetrag!)}` : `${n} insgesamt`,
      zeilen: zeilen(stats.spielZaehler.get(typ.id) ?? new Map(), (v) => `${v}×`),
    });
  });

  // Nach dem Abend zählt zuerst, wer was zahlen muss – deshalb startet die Ansicht bei den Strafen.
  const [gewaehlt, setGewaehlt] = useState<string>("strafen");
  const kat = kategorien.find((k) => k.key === gewaehlt) ?? kategorien[0] as Kategorie | undefined;
  const volleFarbe = (ton: Ton) => ({
    blue: { bg: c.heroBlue, fg: c.onHeroBlue }, mustard: { bg: c.mustard, fg: c.onMustard },
    coral: { bg: c.coral, fg: c.onCoral }, green: { bg: c.success, fg: c.onAccent }, neutral: { bg: c.textDark, fg: c.background },
  }[ton]);

  const ende = t.endedAt ? new Date(t.endedAt) : null;
  const dauer = start && ende && ende > start ? Math.round((ende.getTime() - start.getTime()) / 60_000) : null;
  const zahler = abend.rechnung?.bezahltVon ? byId.get(abend.rechnung.bezahltVon) : undefined;
  const strafenMitSpiel = abend.ereignisTypen.some((e) => (e.strafBetrag ?? 0) > 0);
  const vieleKacheln = kategorien.length > 3;

  // Rückblick-Bild: wer im Spiel und bei den Strafen vorne lag, mit Profilbild und großer Zahl.
  const siegerVon = (k: Kategorie): RueckblickSieger | null => {
    const erste = k.zeilen.filter((z) => z.value === k.zeilen[0]?.value && byId.has(z.id));
    if (erste.length === 0) return null;
    const strafen = k.key === "strafen";
    return {
      emoji: strafen ? "💸" : k.emoji ?? "🎲",
      label: strafen ? "Strafenkönig" : k.label,
      wert: k.zeilen[0].display,
      personen: erste.map((z) => {
        const m = byId.get(z.id)!;
        return { id: m.id, name: displayName(m), color: m.avatarColor, photoUri: m.photoUri };
      }),
    };
  };
  const bildSieger = [
    ...kategorien.filter((k) => k.key !== "strafen"),
    ...kategorien.filter((k) => k.key === "strafen"),
  ].map(siegerVon).filter((x): x is RueckblickSieger => !!x);
  const bildFuss = [
    stats.strafenSumme > 0 ? `${formatBetrag(stats.strafenSumme)} für die Kasse` : null,
    stats.fehlten.length === 0 ? "Alle waren da 🎉" : `${stats.fehlten.map(displayName).join(", ")} ${stats.fehlten.length === 1 ? "hat" : "haben"} gefehlt`,
  ].filter(Boolean).join(" · ");
  const dauerText = dauer ? `${Math.floor(dauer / 60)}:${String(dauer % 60).padStart(2, "0")} h gesessen` : null;

  /** Als Bild teilen (WhatsApp & Co.); wo das nicht geht (Web), als Text. */
  async function teilen() {
    if (Platform.OS !== "web" && bildRef.current && (await Sharing.isAvailableAsync())) {
      setTeiltGerade(true);
      try {
        // Foto und Profilbilder müssen geladen sein, sonst fehlen sie im Bild.
        const bilder = [t.bildUrl, ...bildSieger.flatMap((s) => s.personen.map((p) => p.photoUri))].filter((u): u is string => !!u);
        await Promise.all(bilder.map((u) => Image.prefetch(u).catch(() => false)));
        const uri = await captureRef(bildRef, { format: "png", quality: 1, width: 1080, result: "tmpfile" });
        await Sharing.shareAsync(uri, { mimeType: "image/png", UTI: "public.png", dialogTitle: "Rückblick teilen" });
        return;
      } catch {
        // Bild ging nicht – unten als Text.
      } finally {
        setTeiltGerade(false);
      }
    }
    const zeilenText = [
      `${t.titel ?? "Stammtisch"} · ${formatWochentagDatum(new Date(`${t.datum}T00:00:00`), true)}`,
      `${stats.da.length} von ${stats.mitglieder.length} da (${Math.round(stats.quote * 100)}\u202F%)`,
      ...kategorien.filter((k) => k.zeilen.length > 0).map((k) => `${k.label}: ${k.wert} – vorne: ${k.zeilen.filter((z) => z.value === k.zeilen[0].value).map((z) => z.label).join(", ")}`),
    ];
    try { await Share.share({ message: zeilenText.join("\n") }); } catch { /* abgebrochen */ }
  }

  const kacheln = kategorien.map((k) => {
    const sel = k.key === kat?.key;
    const voll = volleFarbe(k.ton);
    const tint = tonFarben(k.ton, c);
    return (
      <PressableScale
        key={k.key}
        onPress={() => setGewaehlt(k.key)}
        accessibilityRole="tab"
        accessibilityState={{ selected: sel }}
        accessibilityLabel={`${k.label}: ${k.wert}`}
        style={[styles.kachel, vieleKacheln ? { width: 112 } : { flex: 1 }, sel ? { backgroundColor: voll.bg, borderColor: voll.bg } : null]}
      >
        {k.emoji ? (
          <View style={[styles.kachelIcon, { backgroundColor: sel ? "rgba(255,255,255,0.22)" : tint.bg }]}>
            <Text style={{ fontSize: 17 }} maxFontSizeMultiplier={1}>{k.emoji}</Text>
          </View>
        ) : (
          <View style={[styles.kachelIcon, { backgroundColor: sel ? "rgba(255,255,255,0.22)" : tint.bg }]}>
            <Emoji size={17}>{SYMBOL.strafe}</Emoji>
          </View>
        )}
        <Text style={[styles.kachelWert, { color: sel ? voll.fg : c.textDark }]} maxFontSizeMultiplier={MAX_FONT_SCALE} numberOfLines={1}>{k.wert}</Text>
        <Text style={[styles.kachelLabel, { color: sel ? voll.fg : c.textMuted }]} numberOfLines={1}>{k.label}</Text>
      </PressableScale>
    );
  });

  return (
    <>
      <Card enterIndex={0} style={styles.anwesenheit}>
        <Ring progress={stats.quote} size={104} stroke={12} color={c.success} track={c.cardAlt}>
          <Text style={styles.ringZahl} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            {Math.round(stats.quote * 100)}<Text style={styles.ringProzent}>%</Text>
          </Text>
          <Text style={styles.ringDa}>da</Text>
        </Ring>
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <Text style={styles.label}>Anwesenheit</Text>
          <Text style={styles.anwTitel}>{`${stats.da.length} von ${stats.mitglieder.length} am Tisch`}</Text>
          <View style={styles.miniReihe} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {[...stats.da, ...stats.fehlten].map((m, i) => (
              <View key={m.id} style={{ marginLeft: i === 0 ? 0 : -4, borderRadius: 13, borderWidth: 2, borderColor: c.card }}>
                <Avatar name={displayName(m)} color={m.avatarColor} photoUri={m.photoUri} size={22} absent={i >= stats.da.length} />
              </View>
            ))}
          </View>
          <Text style={styles.anwSub} numberOfLines={2}>
            {[
              stats.fehlten.length ? `Gefehlt: ${stats.fehlten.map(displayName).join(", ")}` : "Alle waren da",
              dauer ? `${Math.floor(dauer / 60)}:${String(dauer % 60).padStart(2, "0")} h gesessen` : null,
            ].filter(Boolean).join(" · ")}
          </Text>
        </View>
      </Card>

      {kat ? (
        <>
        <View accessibilityRole="tablist" accessibilityLabel="Der Abend in Zahlen">
          {vieleKacheln ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }}>
              {kacheln}
            </ScrollView>
          ) : (
            <View style={{ flexDirection: "row", gap: 10 }}>{kacheln}</View>
          )}
        </View>

        <Card enterIndex={1} style={{ gap: 4 }}>
          <View style={styles.kopf}>
            <Text style={styles.kartenTitel} accessibilityRole="header">{kat.titel}</Text>
            <Text style={styles.meta}>{kat.summe}</Text>
          </View>
          <Animated.View key={kat.key} entering={FadeIn.duration(220)}>
            {/* Blaue Balken in der hellen Akzentfarbe: im Dunkeln wäre das tiefe Blau auf der Karte kaum zu sehen. */}
            {kat.zeilen.length > 0 ? (
              <BarList rows={kat.zeilen} color={kat.ton === "blue" ? c.blue : volleFarbe(kat.ton).bg} />
            ) : (
              <Text style={styles.leer}>{kat.key === "strafen" ? "Keine Strafen – ein sauberer Abend." : "Heute niemand."}</Text>
            )}
          </Animated.View>
        </Card>
        </>
      ) : null}

      {stats.strafenOffen > 0 ? (
        <PressableScale onPress={() => router.push("/kasse?tab=strafen")} style={[styles.hinweis, { backgroundColor: c.coralSoft }]} accessibilityLabel={`${formatBetrag(stats.strafenOffen)} noch offen, in der Kasse abhaken`}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.hinweisTitel, { color: c.coralText }]}>{`${formatBetrag(stats.strafenOffen)} noch offen`}</Text>
            <Text style={[styles.hinweisSub, { color: c.coralText }]}>{`${strafenMitSpiel ? "Strafen und Niederlagen" : "Strafen"} · in der Kasse abhaken`}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={c.coralText} />
        </PressableScale>
      ) : stats.strafenSumme > 0 ? (
        <View style={[styles.hinweis, { backgroundColor: c.greenSoft }]}>
          <Ionicons name="checkmark-circle" size={20} color={c.greenText} />
          <Text style={[styles.hinweisTitel, { color: c.greenText, flex: 1 }]}>Alle Strafen bezahlt</Text>
        </View>
      ) : null}

      {abend.rechnung ? (
        <PressableScale onPress={() => router.push(`/kasse?eintragId=${abend.rechnung!.id}`)} style={[styles.rechnung, styles.rechnungDa]} accessibilityLabel="Rechnung ansehen">
          <IconSquircle emoji={SYMBOL.rechnung} ton="blue" size={36} />
          <View style={{ flex: 1 }}>
            <Text style={styles.rechnungTitel}>{`Rechnung · ${formatBetrag(abend.rechnung.betrag)}`}</Text>
            <Text style={styles.rechnungSub}>
              {[
                zahler ? `${displayName(zahler)} hat bezahlt` : null,
                abend.rechnung.teilnehmerIds?.length ? `${formatBetrag(abend.rechnung.betrag / abend.rechnung.teilnehmerIds.length)} p. P.` : null,
              ].filter(Boolean).join(" · ")}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
        </PressableScale>
      ) : (
        <PressableScale onPress={() => router.push(`/kasse?neu=abendkosten&terminId=${t.id}`)} style={[styles.rechnung, styles.rechnungLeer]} accessibilityLabel="Rechnung hinzufügen, optional">
          <IconSquircle emoji={SYMBOL.rechnung} ton="blue" size={36} />
          <View style={{ flex: 1 }}>
            <Text style={styles.rechnungTitel}>Rechnung hinzufügen</Text>
            <Text style={styles.rechnungSub}>Optional – wenn einer für alle zahlt</Text>
          </View>
          <Ionicons name="add" size={22} color={c.blue} />
        </PressableScale>
      )}

      <Card enterIndex={2} style={{ gap: 10 }}>
        <View style={styles.kopf}>
          <Text style={styles.kartenTitel} accessibilityRole="header">Protokoll</Text>
          {abend.protokoll ? (
            <Text style={styles.meta}>{new Date(abend.protokoll.updatedAt).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</Text>
          ) : null}
        </View>
        {abend.protokoll?.inhalt ? (
          <Text style={styles.protokollText} numberOfLines={4}>{abend.protokoll.inhalt}</Text>
        ) : (
          <Text style={styles.leer}>Noch kein Protokoll. Beschlüsse und Termine kurz festhalten?</Text>
        )}
        <Button
          label={abend.protokoll ? "Weiterlesen / Bearbeiten" : "Protokoll schreiben"}
          variant="secondary"
          colors={{ bg: c.blueBg, fg: c.blue }}
          onPress={() => router.push(`/protokoll/${t.id}`)}
        />
      </Card>

      <Button label="Rückblick teilen" icon="share-outline" variant="secondary" loading={teiltGerade} onPress={teilen} />

      {/* Unsichtbar außerhalb des Bildschirms, nur zum Abfotografieren. */}
      <View style={styles.bildAblage} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <RueckblickBild
          ref={bildRef}
          datum={formatWochentagDatum(new Date(`${t.datum}T00:00:00`))}
          titel={t.titel ?? "Stammtisch"}
          zeile={[t.ort, `${stats.da.length} von ${stats.mitglieder.length} da`, dauerText].filter(Boolean).join(" · ")}
          bildUrl={t.bildUrl}
          sieger={bildSieger}
          fuss={bildFuss}
          stammtisch={abend.verordnung.name}
        />
      </View>
    </>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    bildAblage: { position: "absolute", left: -10000, top: 0 },
    anwesenheit: { flexDirection: "row", alignItems: "center", gap: 16 },
    ringZahl: { ...TYPE.num, fontSize: 26, color: c.textDark },
    ringProzent: { fontSize: 15 },
    ringDa: { ...TYPE.caption, color: c.textMuted, marginTop: -2 },
    label: { ...TYPE.label, color: c.textMuted },
    anwTitel: { fontFamily: FONT.w700, fontSize: 19, color: c.textDark },
    miniReihe: { flexDirection: "row", flexWrap: "wrap", rowGap: 4 },
    anwSub: { ...TYPE.caption, color: c.textMuted },

    kachel: {
      minHeight: 112, borderRadius: RADIUS.tile, padding: 12, gap: 2, justifyContent: "flex-end",
      backgroundColor: c.card, borderWidth: StyleSheet.hairlineWidth, borderColor: c.hairline,
    },
    kachelIcon: { position: "absolute", top: 12, left: 12, width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center" },
    kachelWert: { ...TYPE.num, fontSize: 24 },
    kachelLabel: { fontFamily: FONT.w600, fontSize: 13 },

    kopf: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 4 },
    kartenTitel: { ...TYPE.heading, color: c.textDark, flexShrink: 1 },
    meta: { ...TYPE.caption, fontSize: 13, color: c.textMuted },
    leer: { ...TYPE.body, fontSize: 14, color: c.textMuted, paddingVertical: 6 },

    statusOffen: { fontFamily: FONT.w600, fontSize: 12, minWidth: 36, textAlign: "right" },
    zahlen: { height: 28, minWidth: 60, paddingHorizontal: 10, borderRadius: RADIUS.pill, alignItems: "center", justifyContent: "center" },
    zahlenText: { fontFamily: FONT.w600, fontSize: 13 },
    hinweis: { minHeight: 60, borderRadius: RADIUS.tile, paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 10 },
    hinweisTitel: { fontFamily: FONT.w700, fontSize: 16 },
    hinweisSub: { ...TYPE.caption, fontSize: 13, opacity: 0.9 },

    rechnung: { minHeight: 72, borderRadius: RADIUS.tile, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 },
    rechnungLeer: { borderWidth: 1.5, borderStyle: "dashed", borderColor: c.borderDark },
    rechnungDa: { backgroundColor: c.card, borderWidth: StyleSheet.hairlineWidth, borderColor: c.hairline },
    rechnungTitel: { fontFamily: FONT.w700, fontSize: 16, color: c.textDark },
    rechnungSub: { ...TYPE.caption, fontSize: 13, color: c.textMuted },

    protokollText: { ...TYPE.body, lineHeight: 22, color: c.textDark },
  });
