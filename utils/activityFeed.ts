import { ActivityLogEntry, MemberProfile, STRAF_KATEGORIEN } from "../types";

function formatEuro(n: number): string {
  return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function displayName(m: MemberProfile | undefined): string {
  if (!m) return "Jemand";
  return m.spitzname ?? m.name.split(" ")[0];
}

export interface RenderedActivity {
  emoji: string;
  text: string;
  actorText?: string;
}

/** Baut den lesbaren Feed-Text aus einem Activity-Log-Eintrag zur Laufzeit. */
export function renderActivity(
  entry: ActivityLogEntry,
  membersById: Map<string, MemberProfile>
): RenderedActivity {
  const actor = entry.actorMemberId ? membersById.get(entry.actorMemberId) : undefined;
  const subject = entry.subjectMemberId ? membersById.get(entry.subjectMemberId) : undefined;
  const actorName = displayName(actor);
  const subjectName = displayName(subject);
  const meta = entry.meta ?? {};
  const eingetragenVon =
    entry.actorMemberId && entry.actorMemberId !== entry.subjectMemberId
      ? `eingetragen von ${actorName}`
      : undefined;

  switch (entry.actionType) {
    case "straf_log_created": {
      const kat = STRAF_KATEGORIEN.find((k) => k.key === meta.kategorie);
      return {
        emoji: kat?.emoji ?? "💰",
        text: `${subjectName} hat eine Strafe bekommen: ${kat?.label ?? meta.kategorie} (${formatEuro(Number(meta.betrag ?? 0))})`,
        actorText: eingetragenVon,
      };
    }
    case "straf_log_beglichen":
      return {
        emoji: "✅",
        text: `${subjectName} hat eine Strafe beglichen (${formatEuro(Number(meta.betrag ?? 0))})`,
        actorText: eingetragenVon,
      };
    case "kasse_einnahme_created":
      return {
        emoji: "➕",
        text: `Einnahme verbucht: ${meta.beschreibung ?? "Sonstiges"} (${formatEuro(Number(meta.betrag ?? 0))})`,
        actorText: eingetragenVon,
      };
    case "kasse_ausgabe_created":
      return {
        emoji: "➖",
        text: `Ausgabe verbucht: ${meta.beschreibung ?? "Sonstiges"} (${formatEuro(Number(meta.betrag ?? 0))})`,
        actorText: eingetragenVon,
      };
    case "abendkosten_created":
      return {
        emoji: "🍺",
        text: `${subjectName} hat den Abend bezahlt (${formatEuro(Number(meta.betrag ?? 0))})`,
        actorText: eingetragenVon,
      };
    case "kasse_beglichen":
      return {
        emoji: "✅",
        text: `Stammtischrechnung beglichen: ${subjectName} wurde zurückgezahlt (${formatEuro(Number(meta.betrag ?? 0))})`,
        actorText: eingetragenVon,
      };
    case "schock_log_created":
      return {
        emoji: meta.typ === "schock_aus" ? "💥" : "🎲",
        text: meta.typ === "schock_aus"
          ? `${subjectName} hat ein Schock-Aus geworfen`
          : `${subjectName} hat beim Schocken verloren`,
        actorText: eingetragenVon,
      };
    case "wette_created":
      return {
        emoji: "🤝",
        text: `${subjectName} hat auf ${displayName(membersById.get(meta.gegenMemberId))} gewettet (${formatEuro(Number(meta.betrag ?? 0))})`,
        actorText: eingetragenVon,
      };
    case "wette_resolved":
      return {
        emoji: meta.gewonnen ? "🏆" : "😔",
        text: `Wette ${meta.gewonnen ? "gewonnen" : "verloren"}: ${subjectName} (${formatEuro(Number(meta.betrag ?? 0))})`,
        actorText: eingetragenVon,
      };
    case "protokoll_updated":
      return {
        emoji: "📝",
        text: `${actorName} hat das Protokoll aktualisiert`,
      };
    case "termin_zusage":
      return {
        emoji: "✅",
        text: `${subjectName} hat zugesagt`,
      };
    case "termin_absage":
      return {
        emoji: "❌",
        text: `${subjectName} hat abgesagt`,
      };
    default:
      return { emoji: "📋", text: `${subjectName ?? actorName}: ${entry.actionType}` };
  }
}
