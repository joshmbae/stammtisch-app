import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { MemberProfile, Spiel, StammtischVerordnung, StrafKategorieDef } from "../../types";
import { loadMembers, loadSpiele, loadStrafKategorien, loadVerordnung } from "../../utils/storage";
import { formatDauer, formatGruendungMonat, gruendungsDauer, displayName } from "../../utils/format";
import { useScreenLoad } from "../../utils/useScreenLoad";
import { useFuehrende } from "../../utils/useFuehrende";
import { TYPE, FONT, ThemeColors } from "../../constants/design";
import { ERSCHEINUNGSBILD_OPTIONEN, useTheme, useThemedStyles } from "../../contexts/ThemeContext";
import { useStammtisch } from "../../contexts/StammtischContext";
import StammtischLogo from "../../components/StammtischLogo";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorState from "../../components/ErrorState";
import OfflineBanner from "../../components/OfflineBanner";
import {
  Avatar,
  Button,
  Card,
  HeaderIconButton,
  IconSquircle,
  PressableScale,
  Screen,
  ScreenHeader,
  SectionLabel,
  SegmentedTabs,
  Ton,
} from "../../components/ui";
import { SYMBOL } from "../../constants/symbole";



/**
 * „Die Runde": wer dazugehört, was uns ausmacht und alles, was früher im
 * Menü stand (Satzung, Protokolle, Strafenkatalog, Spiele, Einstellungen).
 */
export default function RundeScreen() {
  const { colors: c, preference, setPreference } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { stammtischName } = useStammtisch();
  const fuehrende = useFuehrende();
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [verordnung, setVerordnung] = useState<StammtischVerordnung | null>(null);
  const [kategorien, setKategorien] = useState<StrafKategorieDef[]>([]);
  const [spiele, setSpiele] = useState<Spiel[]>([]);

  const { loading, refreshing, error, onRefresh, retry } = useScreenLoad(async () => {
    const [ms, v, kats, sp] = await Promise.all([loadMembers(), loadVerordnung(), loadStrafKategorien(), loadSpiele()]);
    setMembers([...ms].sort((a, b) => displayName(a).localeCompare(displayName(b), "de")));
    setVerordnung(v);
    setKategorien(kats);
    setSpiele(sp);
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={retry} />;

  const name = verordnung?.name || stammtischName || "Unser Stammtisch";
  const dauer = verordnung?.gruendungsjahr ? gruendungsDauer(verordnung.gruendungsjahr) : null;
  const wannWo = [verordnung?.treffpunkt, [verordnung?.stammtischTag, verordnung?.stammtischzeit].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(" · ");
  const aktivesSpiel = spiele.find((s) => s.id === verordnung?.aktivesSpielId);
  const regeln = verordnung?.regeln?.filter((r) => r.trim()).length ?? 0;

  const mehr: { label: string; info: string; emoji: string; ton: Ton; route: string }[] = [
    { label: "Satzung", info: regeln ? `${regeln} ${regeln === 1 ? "Regel" : "Regeln"}` : "noch leer", emoji: SYMBOL.satzung, ton: "blue", route: "/satzung" },
    { label: "Protokolle", info: "pro Termin", emoji: SYMBOL.protokoll, ton: "green", route: "/protokolle" },
    { label: "Strafenkatalog", info: `${kategorien.length} ${kategorien.length === 1 ? "Kategorie" : "Kategorien"}`, emoji: SYMBOL.strafenkatalog, ton: "coral", route: "/strafen-kategorien" },
    { label: "Spiele", info: aktivesSpiel ? `aktiv: ${aktivesSpiel.name}` : `${spiele.length} angelegt`, emoji: SYMBOL.spiele, ton: "mustard", route: "/spiele" },
    { label: "Einstellungen", info: "Grunddaten & Verwaltung", emoji: SYMBOL.einstellungen, ton: "neutral", route: "/einstellungen" },
  ];

  return (
    <Screen
      withNav
      refreshing={refreshing}
      onRefresh={onRefresh}
      header={
        <>
          <OfflineBanner />
          <ScreenHeader
            title="Die Runde"
            subtitle={`${members.length} ${members.length === 1 ? "Mitglied" : "Mitglieder"}${dauer ? ` · seit ${verordnung?.gruendungsjahr?.slice(0, 4)}` : ""}`}
            right={<HeaderIconButton icon="person-add-outline" label="Mitglied hinzufügen" onPress={() => router.push("/member/new")} />}
          />
        </>
      }
    >
      <Card enterIndex={0}>
        <SectionLabel meta={dauer ? formatDauer(dauer) : undefined}>Unser Stammtisch</SectionLabel>
        <View style={styles.stammtischRow}>
          <StammtischLogo size={44} uri={verordnung?.logoUrl} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.stammtischName} numberOfLines={1}>{name}</Text>
            {wannWo ? <Text style={styles.muted} numberOfLines={2}>{wannWo}</Text> : null}
            {verordnung?.gruendungsjahr ? (
              <Text style={styles.muted}>gegründet {formatGruendungMonat(verordnung.gruendungsjahr)}</Text>
            ) : null}
          </View>
        </View>
      </Card>

      <Card enterIndex={1}>
        <SectionLabel action={{ label: "Alle", onPress: () => router.push("/mitglieder") }}>Mitglieder</SectionLabel>
        {members.length === 0 ? (
          <View style={{ marginTop: 12, gap: 10 }}>
            <Text style={styles.muted}>Noch niemand dabei.</Text>
            <Button label="Erstes Mitglied anlegen" icon="person-add-outline" size="sm" onPress={() => router.push("/member/new")} />
          </View>
        ) : (
          <View style={styles.grid}>
            {members.map((m) => (
              <PressableScale
                key={m.id}
                onPress={() => router.push(`/member/${m.id}`)}
                style={styles.member}
                accessibilityLabel={`${displayName(m)}, ${m.rollen.join(", ")}`}
              >
                <Avatar name={displayName(m)} color={m.avatarColor} photoUri={m.photoUri} size={44} fuehrt={fuehrende.get(m.id)} />
                <Text style={styles.memberName} numberOfLines={1}>{displayName(m)}</Text>
                <Text style={styles.memberRolle} numberOfLines={1}>{m.rollen[0]}</Text>
              </PressableScale>
            ))}
          </View>
        )}
      </Card>

      <Card enterIndex={2} style={{ paddingVertical: 6 }}>
        {mehr.map((z, i) => (
          <PressableScale key={z.route} onPress={() => router.push(z.route as never)} style={[styles.mehrRow, i > 0 && styles.mehrLine]} scaleTo={0.98} accessibilityLabel={`${z.label}, ${z.info}`}>
            <IconSquircle emoji={z.emoji} ton={z.ton} size={32} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.mehrLabel}>{z.label}</Text>
              <Text style={styles.muted} numberOfLines={1}>{z.info}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
          </PressableScale>
        ))}
      </Card>

      <Card enterIndex={3}>
        <SectionLabel>Erscheinungsbild</SectionLabel>
        <View style={{ marginTop: 10 }}>
          <SegmentedTabs variant="light" items={ERSCHEINUNGSBILD_OPTIONEN} value={preference} onChange={setPreference} />
        </View>
      </Card>

      <Button label="Profil wechseln" icon="swap-horizontal" variant="secondary" onPress={() => router.push("/mitglied-waehlen")} />
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    stammtischRow: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 12 },
    stammtischName: { ...TYPE.heading, color: c.textDark },
    muted: { ...TYPE.caption, fontSize: 13, color: c.textMuted, marginTop: 1 },
    grid: { flexDirection: "row", flexWrap: "wrap", marginTop: 12, rowGap: 10 },
    member: { width: "25%", alignItems: "center", gap: 4, minHeight: 84, paddingTop: 2 },
    memberName: { fontFamily: FONT.w600, fontSize: 13, color: c.textDark, maxWidth: "92%" },
    memberRolle: { ...TYPE.caption, color: c.textMuted, maxWidth: "92%" },
    mehrRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52, paddingVertical: 7 },
    mehrLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
    mehrLabel: { ...TYPE.bodyStrong, color: c.textDark },
  });
