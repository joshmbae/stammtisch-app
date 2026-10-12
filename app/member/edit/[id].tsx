import React, { useState, useEffect } from "react";
import { Platform, KeyboardAvoidingView } from "react-native";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { showAlert } from "../../../utils/alert";
import { loadMembers, saveMembers, uploadAvatar, loadVerordnung, deleteMember } from "../../../utils/storage";
import LoadingSpinner from "../../../components/LoadingSpinner";
import { toLocalIsoDate } from "../../../utils/date";
import { hashPin, isValidPin } from "../../../utils/pin";
import { Screen } from "../../../components/ui";
import { FormularKopf, MitgliedFormular, useMitgliedFormular } from "../../../components/mitglied/MitgliedFormular";

export default function EditMemberScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const f = useMitgliedFormular();
  const [pinHash, setPinHash] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [speichert, setSpeichert] = useState(false);
  const [rollenOptionen, setRollenOptionen] = useState<string[]>(["Mitglied"]);
  // Untertitel zeigt den gespeicherten Stand, nicht die Eingabe.
  const [untertitel, setUntertitel] = useState<string | undefined>(undefined);

  useEffect(() => {
    loadVerordnung().then((v) => {
      if (v.rollenOptionen?.length) setRollenOptionen(v.rollenOptionen);
    });
    loadMembers().then((members) => {
      const m = members.find((x) => x.id === id);
      if (!m) { setLoading(false); return; }
      f.uebernehmen(m);
      setPinHash(m.pinHash);
      setUntertitel([m.name, m.rollen.filter((r) => r !== "Mitglied").join(", ")].filter(Boolean).join(" · "));
      setLoading(false);
    });
  }, [id]);

  function pinFelderLeeren() {
    f.setPin("");
    f.setPinConfirm("");
  }

  function removePin() {
    showAlert("PIN entfernen?", "Das Profil kann danach von jedem bearbeitet oder gelöscht werden.", [
      { text: "Abbrechen", style: "cancel" },
      {
        text: "Entfernen",
        style: "destructive",
        onPress: () => {
          setPinHash(undefined);
          f.setPinAn(false);
          pinFelderLeeren();
        },
      },
    ]);
  }

  function pinUmschalten(an: boolean) {
    if (an) {
      f.setPinAn(true);
      return;
    }
    if (pinHash) {
      removePin();
      return;
    }
    f.setPinAn(false);
    pinFelderLeeren();
  }

  async function save() {
    if (!f.name.trim()) {
      showAlert("Name fehlt", "Bitte einen Namen eingeben.");
      return;
    }
    let finalPinHash = pinHash;
    // Schalter neu eingeschaltet ohne gespeicherten PIN: dann muss einer eingegeben werden.
    if (f.pin || f.pinConfirm || (f.pinAn && !pinHash)) {
      if (!isValidPin(f.pin) || f.pin !== f.pinConfirm) {
        showAlert("PIN ungültig", "Der PIN muss 4-stellig sein und in beiden Feldern übereinstimmen.");
        return;
      }
      finalPinHash = await hashPin(id, f.pin);
    }
    setSpeichert(true);
    try {
      const uploadedPhotoUri =
        f.photoUri && !f.photoUri.startsWith("http") ? await uploadAvatar(id, f.photoUri) : f.photoUri;
      const members = await loadMembers();
      const updated = members.map((m) =>
        m.id === id
          ? {
              ...m,
              name: f.name.trim(),
              spitzname: f.spitzname.trim() || undefined,
              mitgliedSeit: f.mitgliedSeit.toISOString(),
              geburtsdatum: f.geburtsdatum ? toLocalIsoDate(f.geburtsdatum) : undefined,
              rollen: f.rollen,
              lieblingsgetraenk: f.lieblingsgetraenk.trim() || undefined,
              beruf: f.beruf.trim() || undefined,
              avatarColor: f.avatarColor,
              photoUri: uploadedPhotoUri,
              notizen: f.notizen.trim() || undefined,
              pinHash: finalPinHash,
            }
          : m
      );
      await saveMembers(updated);
      router.back();
    } catch {
      showAlert("Fehler", "Die Änderungen konnten nicht gespeichert werden.");
    } finally {
      setSpeichert(false);
    }
  }

  function entfernen() {
    // Hierher kommt man nur über das Profil, dort wurde ein gesetzter PIN schon geprüft.
    showAlert(
      `${f.name.trim() || "Mitglied"} entfernen?`,
      "Alle Daten dieses Mitglieds werden gelöscht. Das kann nicht rückgängig gemacht werden.",
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Entfernen",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteMember(id);
            } catch {
              showAlert("Fehler", "Das Mitglied konnte nicht entfernt werden.");
              return;
            }
            // Bearbeiten und das (jetzt leere) Profil darunter schließen.
            if ((navigation.getState()?.index ?? 0) >= 2) router.dismiss(2);
            else router.replace("/mitglieder");
          },
        },
      ]
    );
  }

  if (loading) return <LoadingSpinner />;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={0}>
      <Screen header={<FormularKopf title="Mitglied bearbeiten" subtitle={untertitel} onSpeichern={save} speichert={speichert} />}>
        <MitgliedFormular
          form={f}
          rollenOptionen={rollenOptionen}
          pinVorhanden={!!pinHash}
          onPinUmschalten={pinUmschalten}
          onEntfernen={entfernen}
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}
