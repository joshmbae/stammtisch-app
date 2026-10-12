import React, { useState } from "react";
import { router } from "expo-router";
import { showAlert } from "../../utils/alert";
import { Spiel, SPIEL_VORLAGEN } from "../../types";
import { addEreignisTyp, addSpiel, instantiateSpielVorlage, loadSpiele, loadVerordnung, saveVerordnung } from "../../utils/storage";
import { useScreenLoad } from "../../utils/useScreenLoad";
import { Button, Screen, ScreenHeader } from "../../components/ui";
import { AktivSchalter, SpielFormular, WeitereSpiele, strafBetragVon, useSpielFormular } from "../../components/spiele/SpielFormular";

export default function NewSpielScreen() {
  const form = useSpielFormular();
  const [aktiv, setAktiv] = useState(false);
  const [saving, setSaving] = useState(false);
  const [spiele, setSpiele] = useState<Spiel[]>([]);
  const [vorlageBusy, setVorlageBusy] = useState<string | null>(null);

  // Nur für „Weitere Spiele / Vorlagen"; das Formular selbst braucht nichts.
  useScreenLoad(async () => {
    setSpiele(await loadSpiele());
  }, []);

  async function save() {
    const gueltig = form.pruefen();
    if (!gueltig) return;
    setSaving(true);
    try {
      const spiel = await addSpiel({ name: form.name.trim(), emoji: form.emoji.trim() || undefined });
      for (let i = 0; i < gueltig.length; i++) {
        const r = gueltig[i];
        await addEreignisTyp(spiel.id, {
          label: r.label.trim(),
          emoji: r.emoji.trim() || undefined,
          reihenfolge: i + 1,
          strafBetrag: strafBetragVon(r),
        });
      }
      if (aktiv) {
        const v = await loadVerordnung();
        await saveVerordnung({ ...v, aktivesSpielId: spiel.id });
      }
      router.replace(`/spiel/${spiel.id}`);
    } catch {
      showAlert("Fehler", "Spiel konnte nicht gespeichert werden.");
    } finally {
      setSaving(false);
    }
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

  return (
    <Screen
      header={
        <ScreenHeader
          back
          title={form.name.trim() || "Neues Spiel"}
          subtitle="Spiel anlegen"
          right={<AktivSchalter value={aktiv} onChange={setAktiv} />}
        />
      }
    >
      <SpielFormular form={form} />
      <Button label="Spiel speichern" variant="blue" loading={saving} onPress={save} />
      <WeitereSpiele
        titel="Oder Vorlage übernehmen"
        spiele={spiele}
        mitSpielen={false}
        busy={vorlageBusy}
        onVorlage={vorlageAnlegen}
      />
    </Screen>
  );
}
