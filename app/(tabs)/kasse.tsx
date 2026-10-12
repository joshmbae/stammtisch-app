import React, { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { KassenEintrag, StrafLog } from "../../types";
import { useKasse } from "../../utils/useKasse";
import { useStammtisch } from "../../contexts/StammtischContext";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorState from "../../components/ErrorState";
import OfflineBanner from "../../components/OfflineBanner";
import { HeaderIconButton, Screen, ScreenHeader, SegmentedTabs } from "../../components/ui";
import { UebersichtTab } from "../../components/kasse/UebersichtTab";
import { StrafenTab } from "../../components/kasse/StrafenTab";
import { RechnungenTab } from "../../components/kasse/RechnungenTab";
import { EintragSheet, StrafeSheet } from "../../components/kasse/DetailSheets";
import { BuchungSheet, BuchungsArt } from "../../components/kasse/BuchungSheet";

type Tab = "uebersicht" | "strafen" | "rechnungen";

/**
 * Alles Geld an einem Ort: Übersicht (Stand, offene Posten, Verlauf),
 * Strafen und Stammtischrechnungen. Neues kommt immer über das „+".
 *
 * Deep-Links: ?tab=strafen&memberId=… · ?eintragId=… (Details) ·
 * ?neu=abendkosten&terminId=… (Rechnung zum Termin).
 */
export default function KasseScreen() {
  const params = useLocalSearchParams<{ tab?: string; memberId?: string; eintragId?: string; neu?: string; terminId?: string }>();
  const kasse = useKasse();
  const { stammtischName } = useStammtisch();
  const [tab, setTab] = useState<Tab>("uebersicht");
  const [filter, setFilter] = useState<string | null>(null);
  const [eintrag, setEintrag] = useState<KassenEintrag | null>(null);
  const [strafe, setStrafe] = useState<StrafLog | null>(null);
  const [buchung, setBuchung] = useState<{ art?: BuchungsArt; terminId?: string } | null>(null);

  // Parameter aus Links und Pushes einmal anwenden, dann aus der URL nehmen,
  // damit ein späterer Tab-Wechsel nicht wieder dorthin springt.
  useEffect(() => {
    if (kasse.loading) return;
    const { tab: t, memberId, eintragId, neu, terminId } = params;
    if (!t && !memberId && !eintragId && !neu) return;
    if (t === "strafen" || t === "rechnungen" || t === "uebersicht") setTab(t);
    if (memberId) { setTab("strafen"); setFilter(memberId); }
    if (eintragId) {
      const e = kasse.eintraege.find((x) => x.id === eintragId);
      if (e) { setEintrag(e); if (e.typ === "abendkosten") setTab("rechnungen"); }
    }
    if (neu === "abendkosten" || neu === "einnahme" || neu === "ausgabe" || neu === "strafe") setBuchung({ art: neu, terminId });
    router.setParams({ tab: undefined, memberId: undefined, eintragId: undefined, neu: undefined, terminId: undefined });
  }, [kasse.loading, params.tab, params.memberId, params.eintragId, params.neu]);

  const ich = kasse.members.find((m) => m.id === kasse.activeMemberId);
  const kassenwart = ich?.rollen?.some((r) => /kasse/i.test(r));
  const untertitel = [stammtischName, kassenwart ? "du bist Kassenwart" : null].filter(Boolean).join(" · ");
  const offeneStrafen = kasse.strafen.filter((l) => !l.beglichen).length;

  return (
    <Screen
      withNav
      refreshing={kasse.refreshing}
      onRefresh={kasse.onRefresh}
      header={
        <ScreenHeader
          title="Kasse"
          subtitle={untertitel || undefined}
          right={<HeaderIconButton icon="add" label="Neue Buchung" onPress={() => setBuchung({ art: tab === "strafen" ? "strafe" : tab === "rechnungen" ? "abendkosten" : "einnahme" })} />}
        />
      }
    >
      <OfflineBanner />
      {kasse.loading ? (
        <LoadingSpinner />
      ) : kasse.error ? (
        <ErrorState message={kasse.error} onRetry={kasse.retry} />
      ) : (
        <>
          <SegmentedTabs
            variant="blue"
            value={tab}
            onChange={setTab}
            items={[
              { key: "uebersicht", label: "Übersicht" },
              { key: "strafen", label: offeneStrafen ? `Strafen · ${offeneStrafen}` : "Strafen" },
              { key: "rechnungen", label: "Rechnungen" },
            ]}
          />
          {tab === "uebersicht" ? (
            <UebersichtTab kasse={kasse} onStrafen={() => setTab("strafen")} onRechnungen={() => setTab("rechnungen")} onEintrag={setEintrag} />
          ) : null}
          {tab === "strafen" ? <StrafenTab kasse={kasse} filter={filter} onFilter={setFilter} onStrafe={setStrafe} /> : null}
          {tab === "rechnungen" ? <RechnungenTab kasse={kasse} onEintrag={setEintrag} /> : null}
        </>
      )}

      <EintragSheet eintrag={eintrag} kasse={kasse} onClose={() => setEintrag(null)} />
      <StrafeSheet strafe={strafe} kasse={kasse} onClose={() => setStrafe(null)} />
      <BuchungSheet visible={!!buchung} kasse={kasse} start={buchung ?? undefined} onClose={() => setBuchung(null)} />
    </Screen>
  );
}
