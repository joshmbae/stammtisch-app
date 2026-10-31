import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import * as ImagePicker from "expo-image-picker";

import { showAlert } from "../utils/alert";
import { StammtischVerordnung, Spiel, SPIEL_VORLAGEN, StrafKategorieDef } from "../types";
import { loadVerordnung, saveVerordnung, uploadStammtischLogo, loadSpiele, loadStrafKategorien, deleteStammtisch, instantiateSpielVorlage, bilderLoeschen, loadMembers, loadTermine } from "../utils/storage";
import { hashStammtischPassword } from "../utils/pin";
import { displayName, formatGruendungMonat } from "../utils/format";
import { useScreenLoad } from "../utils/useScreenLoad";
import { FONT, TYPE, ThemeColors } from "../constants/design";
import { ERSCHEINUNGSBILD_OPTIONEN, useTheme, useThemedStyles } from "../contexts/ThemeContext";
import { useStammtisch } from "../contexts/StammtischContext";
import { useSession } from "../contexts/SessionContext";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorState from "../components/ErrorState";
import StammtischLogo from "../components/StammtischLogo";
import { Avatar, FormSection, ListGroup, ListRow, Screen, ScreenHeader, SegmentedTabs, ToggleRow } from "../components/ui";
import { SatzungSheet } from "../components/einstellungen/SatzungSheet";
import {
  FeldDef,
  FeldSheet,
  GruendungSheet,
  LoeschenSheet,
  LogoSheet,
  RollenPills,
  RollenSheet,
  SpielWahlSheet,
} from "../components/einstellungen/EinstellungenSheets";
import { SYMBOL } from "../constants/symbole";
import { normalisiereZahlungsLink, zahlungsAnbieter } from "../utils/zahlungslink";


type Offen = "name" | "treffpunkt" | "tag" | "zahlung" | "gruendung" | "logo" | "satzung" | "rollen" | "spiel" | "loeschen" | null;

/**
 * Einstellungen als Liste: jede Zeile öffnet ein Sheet, das seinen Teil
 * sofort speichert. So gibt es keinen ungespeicherten Zustand, der beim
 * Zurückgehen verloren gehen könnte.
 */
export default function EinstellungenScreen() {
  const { colors: c, preference, setPreference } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [verordnung, setVerordnung] = useState<StammtischVerordnung>({ name: "Mein Stammtisch", regeln: [] });
  const [spiele, setSpiele] = useState<Spiel[]>([]);
  const [strafKategorien, setStrafKategorien] = useState<StrafKategorieDef[]>([]);
  const [offen, setOffen] = useState<Offen>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [activatingSpiel, setActivatingSpiel] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { stammtischId, clearStammtisch } = useStammtisch();
  const { activeMember, clearSession } = useSession();

  const { loading, error, retry } = useScreenLoad(async () => {
    const [v, s, k] = await Promise.all([loadVerordnung(), loadSpiele(), loadStrafKategorien()]);
    setVerordnung(v);
    setSpiele(s);
    setStrafKategorien(k);
  }, []);

  /** Speichert einen Teil der Verordnung; false bei Fehler (Sheet bleibt dann offen). */
  async function speichern(partial: Partial<StammtischVerordnung>): Promise<boolean> {
    const updated = { ...verordnung, ...partial };
    try {
      await saveVerordnung(updated);
      setVerordnung(updated);
      return true;
    } catch (e: any) {
      showAlert("Fehler", "Speichern fehlgeschlagen: " + (e?.message ?? "Unbekannter Fehler.") + "\n\nBitte nochmal versuchen.");
      return false;
    }
  }

  async function handleSelectSpiel(spiel: Spiel | null) {
    setActivatingSpiel(spiel?.id ?? "none");
    try {
      await speichern({ aktivesSpielId: spiel?.id });
    } finally {
      setActivatingSpiel(null);
    }
  }

  async function handleActivateVorlage(vorlage: (typeof SPIEL_VORLAGEN)[number]) {
    setActivatingSpiel(vorlage.name);
    try {
      const spiel = await instantiateSpielVorlage(vorlage);
      setSpiele((prev) => [...prev, spiel]);
      await speichern({ aktivesSpielId: spiel.id });
    } catch (e: any) {
      showAlert("Fehler", "Spiel-Vorlage konnte nicht angelegt werden: " + (e?.message ?? "Unbekannter Fehler."));
    } finally {
      setActivatingSpiel(null);
    }
  }

  async function pickLogo() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showAlert("Kein Zugriff", "Bitte erlaube den Zugriff auf die Fotobibliothek in den Einstellungen.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !stammtischId) return;
    setUploadingLogo(true);
    try {
      const alt = verordnung.logoUrl;
      const url = await uploadStammtischLogo(stammtischId, result.assets[0].uri);
      if (await speichern({ logoUrl: url })) {
        setOffen(null);
        await bilderLoeschen([alt]);
      }
    } catch {
      showAlert("Fehler", "Logo konnte nicht hochgeladen werden.");
    } finally {
      setUploadingLogo(false);
    }
  }

  function removeLogo() {
    showAlert("Logo entfernen?", "Dann wird wieder das Standard-Logo gezeigt.", [
      { text: "Abbrechen", style: "cancel" },
      { text: "Entfernen", style: "destructive", onPress: async () => {
        const alt = verordnung.logoUrl;
        if (await speichern({ logoUrl: undefined })) {
          setOffen(null);
          await bilderLoeschen([alt]);
        }
      } },
    ]);
  }

  function handleDeleteStammtisch(passwort: string) {
    if (!stammtischId || !passwort) {
      showAlert("Passwort fehlt", "Bitte das Stammtisch-Passwort eingeben.");
      return;
    }
    showAlert(
      "Stammtisch endgültig löschen?",
      "Alle Daten – Mitglieder, Termine, Kasse, Strafen, Protokolle – werden für alle unwiderruflich gelöscht. Das kann nicht rückgängig gemacht werden.",
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Endgültig löschen",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              const passwordHash = await hashStammtischPassword(verordnung.name, passwort);
              // Bilder vorher einsammeln: nach dem Löschen sind die Verweise weg.
              const [ms, ts] = await Promise.all([loadMembers().catch(() => []), loadTermine().catch(() => [])]);
              const bilder = [verordnung.logoUrl, ...ms.map((m) => m.photoUri), ...ts.map((t) => t.bildUrl)];
              const ok = await deleteStammtisch(stammtischId, passwordHash);
              if (!ok) {
                showAlert("Falsches Passwort", "Der Stammtisch wurde nicht gelöscht.");
                return;
              }
              await bilderLoeschen(bilder);
              setOffen(null);
              await clearSession();
              await clearStammtisch();
              router.replace("/stammtisch-waehlen");
            } catch {
              showAlert("Fehler", "Stammtisch konnte nicht gelöscht werden.");
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  }

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={retry} />;

  const v = verordnung;
  const regeln = v.regeln.filter((r) => r.trim()).length;
  const rollen = v.rollenOptionen ?? [];
  const manuelleKategorien = strafKategorien.filter((k) => !k.spielEreignisTypId).length;
  const aktivesSpiel = spiele.find((s) => s.id === v.aktivesSpielId);
  const tagZeit = [v.stammtischTag, v.stammtischzeit].filter(Boolean).join(", ");
  const version = Constants.expoConfig?.version;

  const feldSheet = (key: "name" | "treffpunkt" | "tag" | "zahlung"): { title: string; felder: FeldDef[]; hinweis?: string } => {
    if (key === "zahlung") return {
      title: "Zahlungslink",
      hinweis: "Wohin ihr Strafen zahlt, z. B. euer PayPal-Pool. Beim Begleichen fragt die App, ob man dorthin möchte. Leer lassen, um den Link zu entfernen.",
      felder: [{ key: "zahlungsLink", label: "Link", value: v.zahlungsLink, placeholder: "https://www.paypal.com/pool/…" }],
    };
    if (key === "name") return { title: "Name", felder: [{ key: "name", label: "Name des Stammtischs", value: v.name, placeholder: "z. B. Die Hellen", pflicht: true }] };
    if (key === "treffpunkt") return { title: "Treffpunkt", felder: [{ key: "treffpunkt", label: "Treffpunkt", value: v.treffpunkt, placeholder: "z. B. Gasthof Zum Wirt, hinten links" }] };
    return {
      title: "Stammtischtag",
      felder: [
        { key: "stammtischTag", label: "Tag", value: v.stammtischTag, placeholder: "Jeden Donnerstag" },
        { key: "stammtischzeit", label: "Uhrzeit", value: v.stammtischzeit, placeholder: "19:30 Uhr" },
      ],
    };
  };
  const offenesFeld = offen === "name" || offen === "treffpunkt" || offen === "tag" || offen === "zahlung" ? feldSheet(offen) : null;

  return (
    <Screen
      header={
        <ScreenHeader
          back
          title="Einstellungen"
          subtitle={[v.name, v.gruendungsjahr ? `seit ${v.gruendungsjahr.slice(0, 4)}` : null].filter(Boolean).join(" · ")}
        />
      }
      contentStyle={{ gap: 18 }}
    >
      <FormSection title="Stammtisch">
        <ListGroup>
          <ListRow title="Name" value={v.name} emoji={SYMBOL.name} ton="blue" onPress={() => setOffen("name")} />
          <ListRow
            title="Logo"
            emoji={SYMBOL.logo}
            ton="blue"
            onPress={() => setOffen("logo")}
            accessibilityLabel={v.logoUrl ? "Logo ändern" : "Logo hochladen"}
            right={
              <View style={styles.rechts}>
                <StammtischLogo size={32} uri={v.logoUrl} />
                <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
              </View>
            }
          />
          <ListRow title="Treffpunkt" value={v.treffpunkt || "fehlt"} emoji={SYMBOL.treffpunkt} ton="blue" onPress={() => setOffen("treffpunkt")} />
          <ListRow title="Stammtischtag" value={tagZeit || "fehlt"} emoji={SYMBOL.stammtischtag} ton="blue" onPress={() => setOffen("tag")} />
          <ListRow
            title="Gegründet"
            value={v.gruendungsjahr ? formatGruendungMonat(v.gruendungsjahr) : "fehlt"}
            emoji={SYMBOL.gegruendet}
            ton="blue"
            onPress={() => setOffen("gruendung")}
          />
        </ListGroup>
      </FormSection>

      <FormSection title="Regeln & Rollen">
        <ListGroup>
          <ListRow
            title="Satzung bearbeiten"
            value={regeln ? `${regeln} ${regeln === 1 ? "Regel" : "Regeln"}` : "noch leer"}
            emoji={SYMBOL.satzung}
            ton="mustard"
            onPress={() => setOffen("satzung")}
          />
          <View>
            <ListRow title="Rollen" value={String(rollen.length)} emoji={SYMBOL.rollen} ton="mustard" onPress={() => setOffen("rollen")} accessibilityLabel={`Rollen: ${rollen.join(", ") || "keine"}`} />
            {rollen.length > 0 ? (
              <View style={styles.rollen} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                <RollenPills rollen={rollen} />
              </View>
            ) : null}
          </View>
        </ListGroup>
      </FormSection>

      <FormSection title="Strafen & Spiele">
        <ListGroup>
          <ListRow
            title="Strafenkatalog"
            value={`${manuelleKategorien} ${manuelleKategorien === 1 ? "Kategorie" : "Kategorien"}`}
            emoji={SYMBOL.strafenkatalog}
            ton="coral"
            onPress={() => router.push("/strafen-kategorien")}
          />
          <ListRow
            title="Zahlungslink"
            value={v.zahlungsLink ? zahlungsAnbieter(v.zahlungsLink) : "keiner"}
            emoji={SYMBOL.einnahme}
            ton="green"
            onPress={() => setOffen("zahlung")}
          />
          <ListRow
            title="Spiele"
            value={aktivesSpiel ? `${aktivesSpiel.name} aktiv` : "kein Spiel"}
            emoji={SYMBOL.spiele}
            ton="mustard"
            onPress={() => setOffen("spiel")}
          />
          <ToggleRow
            title="Strafen am Abend erfassen"
            subtitle="Strafen-Tab im Termin"
            emoji={SYMBOL.liveErfassen}
            ton="coral"
            value={v.tabStrafenAktiv !== false}
            onValueChange={(an) => { speichern({ tabStrafenAktiv: an }); }}
          />
        </ListGroup>
      </FormSection>

      <FormSection title="Dieses Gerät">
        <ListGroup>
          <View style={styles.erscheinung}>
            <ListRow title="Erscheinungsbild" value={ERSCHEINUNGSBILD_OPTIONEN.find((e) => e.key === preference)?.label} emoji={SYMBOL.erscheinungsbild} />
            <SegmentedTabs variant="blue" items={ERSCHEINUNGSBILD_OPTIONEN} value={preference} onChange={setPreference} />
          </View>
          <ListRow
            title="Profil wechseln"
            emoji={SYMBOL.profilWechseln}
            onPress={() => router.push("/mitglied-waehlen")}
            accessibilityLabel={activeMember ? `Profil wechseln, angemeldet als ${displayName(activeMember)}` : "Profil wechseln"}
            right={
              <View style={styles.rechts}>
                {activeMember ? (
                  <>
                    <Avatar name={displayName(activeMember)} color={activeMember.avatarColor} photoUri={activeMember.photoUri} size={26} />
                    <Text style={styles.wert} numberOfLines={1}>{displayName(activeMember)}</Text>
                  </>
                ) : null}
                <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
              </View>
            }
          />
        </ListGroup>
      </FormSection>

      <FormSection title="Hilfe">
        <ListGroup>
          <ListRow title="Tutorial erneut ansehen" emoji={SYMBOL.tutorial} ton="green" onPress={() => router.push("/onboarding-intro?replay=1")} />
        </ListGroup>
      </FormSection>

      <FormSection>
        <Text style={styles.gefahr} accessibilityRole="header">Gefahrenzone</Text>
        <ListGroup>
          <ListRow title="Stammtisch löschen" emoji={SYMBOL.loeschen} destructive onPress={() => setOffen("loeschen")} />
        </ListGroup>
      </FormSection>

      {version ? <Text style={styles.version}>DeinStammtisch {version}</Text> : null}

      <FeldSheet
        visible={!!offenesFeld}
        title={offenesFeld?.title ?? ""}
        felder={offenesFeld?.felder ?? []}
        onClose={() => setOffen(null)}
        onSave={(w) => {
          if (offen === "zahlung") {
            if (!w.zahlungsLink) return speichern({ zahlungsLink: "" });
            const link = normalisiereZahlungsLink(w.zahlungsLink);
            if (!link) {
              showAlert("Ungültiger Link", "Bitte einen https-Link eingeben, z. B. den Link zu eurem PayPal-Pool.");
              return Promise.resolve(false);
            }
            return speichern({ zahlungsLink: link });
          }
          return speichern(
            offen === "name"
              ? { name: w.name }
              : offen === "treffpunkt"
                ? { treffpunkt: w.treffpunkt || undefined }
                : { stammtischTag: w.stammtischTag || undefined, stammtischzeit: w.stammtischzeit || undefined }
          );
        }}
      />
      <GruendungSheet visible={offen === "gruendung"} value={v.gruendungsjahr} onClose={() => setOffen(null)} onSave={(g) => speichern({ gruendungsjahr: g })} />
      <LogoSheet visible={offen === "logo"} uri={v.logoUrl} uploading={uploadingLogo} onClose={() => setOffen(null)} onPick={pickLogo} onRemove={removeLogo} />
      <SatzungSheet
        visible={offen === "satzung"}
        regeln={v.regeln}
        sonstiges={v.sonstiges}
        onClose={() => setOffen(null)}
        onSave={(r, s) => speichern({ regeln: r, sonstiges: s })}
      />
      <RollenSheet visible={offen === "rollen"} rollen={rollen} onClose={() => setOffen(null)} onSave={(r) => speichern({ rollenOptionen: r })} />
      <SpielWahlSheet
        visible={offen === "spiel"}
        spiele={spiele}
        aktivesSpielId={v.aktivesSpielId}
        busyId={activatingSpiel}
        onClose={() => setOffen(null)}
        onSelect={handleSelectSpiel}
        onVorlage={handleActivateVorlage}
        onVerwalten={() => { setOffen(null); router.push("/spiele"); }}
      />
      <LoeschenSheet visible={offen === "loeschen"} busy={deleting} onClose={() => setOffen(null)} onDelete={handleDeleteStammtisch} />
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    rechts: { flexDirection: "row", alignItems: "center", gap: 8, maxWidth: "50%" },
    wert: { fontFamily: FONT.w600, fontSize: 15, color: c.textMuted, flexShrink: 1 },
    rollen: { paddingLeft: 46, paddingBottom: 14 },
    erscheinung: { paddingBottom: 12 },
    gefahr: { ...TYPE.label, color: c.dangerText, paddingHorizontal: 4 },
    version: { ...TYPE.caption, fontSize: 13, color: c.textMuted, textAlign: "center" },
  });
