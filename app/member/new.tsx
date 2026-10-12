import React, { useState, useEffect } from "react";
import { Platform, KeyboardAvoidingView } from "react-native";
import { router } from "expo-router";
import { showAlert } from "../../utils/alert";
import { MemberProfile } from "../../types";
import { loadMembers, saveMembers, uploadAvatar, loadVerordnung } from "../../utils/storage";
import { useSession } from "../../contexts/SessionContext";
import { toLocalIsoDate } from "../../utils/date";
import { hashPin, isValidPin } from "../../utils/pin";
import { Screen } from "../../components/ui";
import { FormularKopf, MitgliedFormular, useMitgliedFormular } from "../../components/mitglied/MitgliedFormular";

export default function NewMemberScreen() {
  const { activeMemberId, setActiveSession } = useSession();
  const f = useMitgliedFormular();
  const [rollenOptionen, setRollenOptionen] = useState<string[]>(["Mitglied"]);
  const [speichert, setSpeichert] = useState(false);

  useEffect(() => {
    loadVerordnung().then((v) => {
      if (v.rollenOptionen?.length) setRollenOptionen(v.rollenOptionen);
    });
  }, []);

  function pinUmschalten(an: boolean) {
    f.setPinAn(an);
    if (!an) {
      f.setPin("");
      f.setPinConfirm("");
    }
  }

  async function save() {
    if (!f.name.trim()) {
      showAlert("Name fehlt", "Bitte einen Namen eingeben.");
      return;
    }
    // Schalter an heißt: ohne gültigen PIN wird nicht gespeichert.
    if (f.pinAn || f.pin || f.pinConfirm) {
      if (!isValidPin(f.pin) || f.pin !== f.pinConfirm) {
        showAlert("PIN ungültig", "Der PIN muss 4-stellig sein und in beiden Feldern übereinstimmen.");
        return;
      }
    }
    setSpeichert(true);
    try {
      const id = Date.now().toString();
      const uploadedPhotoUri = f.photoUri ? await uploadAvatar(id, f.photoUri) : undefined;
      const newMember: MemberProfile = {
        id,
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
        createdAt: new Date().toISOString(),
        pinHash: f.pin ? await hashPin(id, f.pin) : undefined,
      };
      const existing = await loadMembers();
      await saveMembers([...existing, newMember]);
      if (!activeMemberId) {
        // Onboarding: noch niemand aktiv -> direkt als neues Mitglied weiter in die App
        await setActiveSession(newMember.id);
        router.replace("/onboarding-intro");
      } else {
        router.back();
      }
    } catch {
      showAlert("Fehler", "Das Mitglied konnte nicht gespeichert werden.");
    } finally {
      setSpeichert(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={0}>
      <Screen header={<FormularKopf title="Neues Mitglied" subtitle="Nur der Name ist Pflicht" onSpeichern={save} speichert={speichert} />}>
        <MitgliedFormular form={f} rollenOptionen={rollenOptionen} onPinUmschalten={pinUmschalten} />
      </Screen>
    </KeyboardAvoidingView>
  );
}
