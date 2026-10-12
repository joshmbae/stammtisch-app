import React, { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { useColors } from "../../contexts/ThemeContext";
import { showAlert } from "../../utils/alert";
import { Spiel, SPIEL_VORLAGEN } from "../../types";
import {
  loadSpiele,
  updateSpiel,
  deleteSpiel,
  loadEreignisTypen,
  updateEreignisTyp,
  deleteEreignisTyp,
  addEreignisTyp,
  instantiateSpielVorlage,
  loadVerordnung,
  saveVerordnung,
} from "../../utils/storage";
import { useScreenLoad } from "../../utils/useScreenLoad";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorState from "../../components/ErrorState";
import { Button, Screen, ScreenHeader } from "../../components/ui";
import { AktivSchalter, SpielFormular, WeitereSpiele, strafBetragVon, useSpielFormular } from "../../components/spiele/SpielFormular";

export default function EditSpielScreen() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const form = useSpielFormular();
  const [urspruenglicheIds, setUrspruenglicheIds] = useState<string[]>([]);
  const [aktivesSpielId, setAktivesSpielId] = useState<string | undefined>(undefined);
  const [spiele, setSpiele] = useState<Spiel[]>([]);
  const [saving, setSaving] = useState(false);
  const [aktivBusy, setAktivBusy] = useState(false);
  const [vorlageBusy, setVorlageBusy] = useState<string | null>(null);

  const { loading, error, retry } = useScreenLoad(async () => {
    const [alle, typen, verordnung] = await Promise.all([loadSpiele(), loadEreignisTypen(id), loadVerordnung()]);
    const spiel = alle.find((s) => s.id === id);
    if (!spiel) {
      router.back();
      return;
    }
    setSpiele(alle);
    form.setName(spiel.name);
    form.setEmoji(spiel.emoji ?? "");
    setAktivesSpielId(verordnung.aktivesSpielId);
    form.setEreignisse(
      typen.map((t) => ({
        key: t.id,
        id: t.id,
        label: t.label,
        emoji: t.emoji ?? "",
        strafAktiv: !!t.strafKategorie,
        strafBetrag: t.strafBetrag != null ? String(t.strafBetrag).replace(".", ",") : "",
        strafKategorie: t.strafKategorie,
      }))
    );
    setUrspruenglicheIds(typen.map((t) => t.id));
  }, [id]);

  async function aktivSetzen(an: boolean) {
    const vorher = aktivesSpielId;
    const neu = an ? id : vorher === id ? undefined : vorher;
    setAktivesSpielId(neu);
    setAktivBusy(true);
    try {
      // Frisch laden, damit andere Einstellungen nicht mit altem Stand überschrieben werden.
      const v = await loadVerordnung();
      await saveVerordnung({ ...v, aktivesSpielId: neu });
    } catch (e: any) {
      setAktivesSpielId(vorher);
      showAlert("Fehler", "Spiel konnte nicht aktiviert werden: " + (e?.message ?? "Unbekannter Fehler."));
    } finally {
      setAktivBusy(false);
    }
  }

  async function save() {
    const gueltig = form.pruefen();
    if (!gueltig) return;
    setSaving(true);
    try {
      await updateSpiel(id, { name: form.name.trim(), emoji: form.emoji.trim() || undefined });

      for (let i = 0; i < gueltig.length; i++) {
        const r = gueltig[i];
        const daten = {
          label: r.label.trim(),
          emoji: r.emoji.trim() || undefined,
          reihenfolge: i + 1,
          strafBetrag: strafBetragVon(r),
        };
        if (r.id) await updateEreignisTyp(r.id, daten);
        else await addEreignisTyp(id, daten);
      }

      const verbleibendeIds = new Set(gueltig.filter((r) => r.id).map((r) => r.id!));
      for (const alteId of urspruenglicheIds) {
        if (!verbleibendeIds.has(alteId)) {
          await deleteEreignisTyp(alteId);
        }
      }

      // Nach „Neues Spiel" (replace) gibt es ggf. nichts zum Zurückgehen.
      if (router.canGoBack()) router.back();
      else router.replace("/spiele");
    } catch {
      showAlert("Fehler", "Spiel konnte nicht gespeichert werden.");
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    const istAktiv = aktivesSpielId === id;
    showAlert(
      "Spiel löschen?",
      istAktiv
        ? "Dieses Spiel ist aktuell aktiv. Alle zugehörigen Ereignistypen und Einträge werden unwiderruflich gelöscht, das aktive Spiel wird zurückgesetzt."
        : "Alle zugehörigen Ereignistypen und Einträge werden unwiderruflich gelöscht.",
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Löschen",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteSpiel(id);
              if (istAktiv) {
                const v = await loadVerordnung();
                await saveVerordnung({ ...v, aktivesSpielId: undefined });
              }
              router.replace("/spiele");
            } catch {
              showAlert("Fehler", "Spiel konnte nicht gelöscht werden.");
            }
          },
        },
      ]
    );
  }

  async function vorlageAnlegen(vorlage: (typeof SPIEL_VORLAGEN)[number]) {
    setVorlageBusy(vorlage.name);
    try {
      const spiel = await instantiateSpielVorlage(vorlage);
      router.replace(`/spiel/${spiel.id}`);
    } catch {
      showAlert("Fehler", "Spiel-Vorlage konnte nicht angelegt werden.");
    } finally {
      setVorlageBusy(null);
    }
  }

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={retry} />;

  return (
    <Screen
      header={
        <ScreenHeader
          back
          title={form.name.trim() || "Spiel"}
          subtitle="Spiel bearbeiten"
          right={<AktivSchalter value={aktivesSpielId === id} onChange={aktivSetzen} disabled={aktivBusy} />}
        />
      }
    >
      <SpielFormular form={form} />
      <Button label="Spiel speichern" variant="blue" loading={saving} onPress={save} />
      <Button label="Spiel löschen" variant="ghost" colors={{ bg: "transparent", fg: c.dangerText }} onPress={handleDelete} />
      <WeitereSpiele
        titel="Weitere Spiele / Vorlagen"
        spiele={spiele}
        ausserId={id}
        aktivesSpielId={aktivesSpielId}
        busy={vorlageBusy}
        onSpiel={(s) => router.replace(`/spiel/${s.id}`)}
        onVorlage={vorlageAnlegen}
      />
    </Screen>
  );
}
