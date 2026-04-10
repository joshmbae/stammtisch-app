// ─── Kinderentwicklung 0–36 Monate ───────────────────────────────────────────
// Quellen: CDC "Learn the Signs. Act Early." (cdc.gov/actearly),
// American Academy of Pediatrics (AAP), NIH StatPearls, WHO Child Growth Standards
//
// Nutzungshinweis für die App:
// "Entwicklungsinformationen basieren auf CDC- und AAP-Richtlinien.
//  Jedes Kind entwickelt sich in seinem eigenen Tempo.
//  Bei Fragen wende dich an deine Kinderärztin oder Hebamme."
//
// Lizenz: Die zugrundeliegenden Meilensteine (CDC, AAP, WHO) sind
// öffentliches Gesundheitswissen und frei zitierbar.
// ─────────────────────────────────────────────────────────────────────────────

export interface DevelopmentPhase {
  id: string;

  // Zeitraum
  weeksFrom: number;        // Alter in Wochen ab Geburt (nicht ET)
  weeksTo: number;
  ageLabel: string;         // Anzeige für UI, z. B. "Woche 1–2"

  // Inhalt
  title: string;            // Kurzer Name der Phase
  emoji: string;
  summary: string;          // 2 Sätze — was ist der Kern dieser Phase

  canDo: string[];          // Was das Kind jetzt kann (3–5 Punkte)
  typical: string[];        // Typisches Verhalten inkl. Schwieriges (3–4 Punkte)
  watchOut: string[];       // Sanfte Warnzeichen
  parentTip: string;        // 1 konkreter Tipp — was Eltern jetzt tun können
  forParents: string;       // Ehrlicher Mental-Health / Erschöpfungs-Hinweis
  developmentHint?: string; // Intensive Entwicklungsphase — wann vorhanden

  // Für Mia's System Prompt
  miaContext: string;       // Kompakter Kontextsatz für KI
}

export const DEVELOPMENT_PHASES: DevelopmentPhase[] = [

  // ─── NEUGEBORENES ──────────────────────────────────────────────────────────

  {
    id: "w01-02",
    weeksFrom: 0,
    weeksTo: 2,
    ageLabel: "Woche 1–2",
    title: "Ankommen in der Welt",
    emoji: "🌱",
    summary:
      "Dein Baby verarbeitet gerade den größten Wechsel seines Lebens — von der warmen, dunklen Gebärmutter in eine vollkommen neue Welt. Die wichtigste Aufgabe jetzt: Wärme, Nähe und regelmäßiges Trinken.",
    canDo: [
      "Erkennt Mamas Stimme — hat sie neun Monate gehört",
      "Greifreflex: hält angebotene Finger fest",
      "Schaut kurz auf Gesichter (optimale Sehweite: 20–30 cm)",
      "Dreht Kopf in Richtung Geräusche",
      "Moro-Reflex: breitet Arme bei lauten Geräuschen aus (normal)",
    ],
    typical: [
      "Schläft 16–20 Stunden täglich, in kurzen Phasen — kein Durchschlafen erwarten",
      "Trinkt alle 2–3 Stunden, auch nachts",
      "Weint als einzige Kommunikation (Hunger, Nässe, Müdigkeit, Überstimulation)",
      "Verliert in den ersten Tagen bis zu 10 % des Geburtsgewichts — holt das meist bis Woche 2 auf",
    ],
    watchOut: [
      "Trinkt deutlich weniger als 8× täglich nach Tag 5 — sprich mit deiner Hebamme",
      "Uriniert kaum (weniger als 6× täglich ab Tag 4)",
      "Gelbsucht (gelbe Haut/Augen) hält über Woche 2 hinaus an",
      "Reagiert überhaupt nicht auf Berührung oder Stimme",
    ],
    parentTip:
      "Haut-zu-Haut-Kontakt (Känguru-Pflege) beruhigt das Baby und reguliert seinen Herzschlag und seine Temperatur. Deine Stimme ist die vertrauteste Sache der Welt für dein Kind — einfach reden reicht.",
    forParents:
      "Die ersten zwei Wochen sind für viele Eltern die härteste Zeit überhaupt — Schlafentzug, Unsicherheit, Hormone. Das ist nicht Versagen, das ist Normalität. Baby-Blues (Stimmungstiefs in den ersten Wochen) ist sehr häufig. Hält er länger als zwei Wochen an oder wird stärker, sprich mit deiner Hebamme — postpartale Depression ist gut behandelbar. Telefonseelsorge: 0800 111 0 111 (kostenlos, 24h).",
    miaContext:
      "Baby ist 0–2 Wochen alt. Neugeborenenreflexe aktiv, schläft 16–20 Std., trinkt alle 2–3h. Baby-Blues der Mutter möglich. Wichtigste Themen: Trinken, Schlafen, Wochenbett, Bindung.",
  },

  {
    id: "w02-06",
    weeksFrom: 2,
    weeksTo: 6,
    ageLabel: "Woche 2–6",
    title: "Erste Verbindungen",
    emoji: "🤍",
    summary:
      "Das Baby wird zum aktiven Gesprächspartner. Erste Vokale und Gurren entstehen — und das erste echte Lächeln kündigt sich an. Eine der aufregendsten Phasen.",
    canDo: [
      "Hält kurzen, echten Augenkontakt",
      "Folgt bewegten Gesichtern mit den Augen",
      "Erste Gurr- und Vokallaute",
      "Beruhigt sich auf vertraute Stimmen",
      "Zeigt erste Mimik: Stirnrunzeln, Mundwinkel heben",
    ],
    typical: [
      "Weinpeak oft bei Woche 6 — der schwierigste Moment für viele Eltern",
      "Koliken (untröstliches Weinen über 3 Stunden) betreffen ca. 20 % der Babys",
      "Schläft noch 15–18 Stunden, aber wacher in kurzen Phasen",
      "Unterscheidet Tag und Nacht noch nicht zuverlässig",
    ],
    watchOut: [
      "Kein Augenkontakt bis Woche 4 — erwähne es beim nächsten U-Termin",
      "Trinkt unter 6× täglich",
      "Weniger als 5 Windeln nass täglich",
    ],
    parentTip:
      "Auf jedes Gurren eingehen und antworten — Baby wartet auf Reaktion und antwortet dann. So lernt es die Grundstruktur von Dialog.",
    forParents:
      "Der Weinpeak bei Woche 6 überrascht viele Eltern, die dachten, es wird langsam besser. Wenn du nachts alleine bist und das Baby nicht aufhört zu weinen: Baby sicher ablegen, kurz in ein anderes Zimmer gehen, durchatmen. Das ist Selbstfürsorge, kein Versagen.",
    developmentHint:
      "Intensive Entwicklungsphase (Woche 4–6): Das Gehirn verarbeitet die neue Umgebung intensiv — alle Sinne werden aktiver. Mehr Quengeln, Schlafschwierigkeiten und Nähebedarf in dieser Zeit sind biologisch normal. Quelle: AAP Developmental Surveillance.",
    miaContext:
      "Baby ist 2–6 Wochen alt. Erste soziale Laute entstehen, Weinpeak um Woche 6. Koliken möglich. Typische Themen: Schreiphasen, Erschöpfung der Eltern, erstes Lächeln, Bindung.",
  },

  // ─── MONAT 1–3 ─────────────────────────────────────────────────────────────

  {
    id: "w06-09",
    weeksFrom: 6,
    weeksTo: 9,
    ageLabel: "Woche 6–9",
    title: "Das erste Lächeln",
    emoji: "😊",
    summary:
      "Das soziale Lächeln erscheint — ein echter Meilenstein (CDC: 2 Monate). Dein Baby lächelt als Reaktion auf dich, nicht zufällig. Das Gehirn macht jetzt riesige Sprünge in der sozialen Wahrnehmung.",
    canDo: [
      "Soziales Lächeln als Reaktion auf Gesicht oder Stimme (CDC: 2 Monate)",
      "Hebt Kopf in Bauchlage kurz an",
      "Folgt Gesichtern mit den Augen über 180 Grad",
      "Erkennungsfreude bei vertrauten Personen",
    ],
    typical: [
      "Weinphasen noch häufig — aber das erste Lächeln verändert alles emotional",
      "Wachphasen werden etwas länger (30–60 Min am Stück)",
      "Erster sozialer Blickkontakt mit bewusstem Lächeln",
    ],
    watchOut: [
      "Kein soziales Lächeln bis Woche 8 — sprich beim U3 darüber",
      "Kein Augenkontakt möglich",
      "Kopf wird in Bauchlage nie angehoben",
    ],
    parentTip:
      "Kontrastreiche Muster zeigen (Schwarz-Weiß, Gesichter). Auf jedes Lächeln reagieren und wiederholen — das ist Dialog-Lernen.",
    forParents:
      "Wenn du dich oft leer, abgeschnitten oder traurig fühlst — auch als Vater — ist das kein Zeichen von Schwäche. Postpartale Depressionen kommen bei Vätern in 10 % der Fälle vor. Du musst das nicht alleine tragen.",
    miaContext:
      "Baby ist 6–9 Wochen alt. Erstes soziales Lächeln erscheint. Weinpeak oft hinter sich. Themen: Koliken, Lächeln, erste soziale Verbindung, Erschöpfung.",
  },

  {
    id: "w09-13",
    weeksFrom: 9,
    weeksTo: 13,
    ageLabel: "Woche 9–13",
    title: "Entdecken & Staunen",
    emoji: "🔍",
    summary:
      "Das Baby wird aktiver und deutlich wacher. Es entdeckt die eigenen Hände und führt erste 'Gespräche' mit Lauten. Die Welt ist faszinierend.",
    canDo: [
      "Hält Kopf in Bauchlage für mehrere Minuten stabil",
      "Hände öffnen sich — beobachtet sie fasziniert",
      "Lacht laut auf",
      "Führt Laute-Gespräche: wartet auf Reaktion, antwortet dann",
      "Dreht Kopf in Richtung Geräusche zuverlässig",
    ],
    typical: [
      "Wachphasen werden deutlich länger (1–2 Stunden am Stück)",
      "Schlaf beginnt sich langsam zu strukturieren — aber kein Durchschlafen erwarten",
      "Weniger Weinen als in den ersten Wochen",
      "Sehr interessiert an der Umgebung",
    ],
    watchOut: [
      "Kein Lachen bis 3 Monate",
      "Keine Laute oder Reaktion auf Geräusche",
      "Hält Kopf in Bauchlage gar nicht",
      "Zeigt kein Interesse an Gesichtern oder Händen",
    ],
    parentTip:
      "Mobile übers Bett oder Spielbogen mit greifbaren Elementen. Bauchlage täglich 10–15 Minuten — wird später für Krabbeln wichtig.",
    forParents:
      "Jetzt ist ein guter Zeitpunkt, eine sanfte Schlaf-Routine einzuführen — nicht als strenger Zeitplan, sondern als Signale: Baden → Stillen/Füttern → Schlaflied. Vorhersehbarkeit hilft dem Gehirn, sich zu beruhigen.",
    developmentHint:
      "Intensive Entwicklungsphase (Woche 7–10): Das Gehirn baut neuronale Vernetzungen für Mustererkennung auf — das Baby erkennt Muster in Bildern, Klängen und Bewegungen. Mehr Quengeln und Nähebedarf sind typisch. Quelle: AAP.",
    miaContext:
      "Baby ist 9–13 Wochen alt. Hände werden entdeckt, lautes Lachen erscheint. Wachphasen länger. Themen: Schlaf-Routine, Spielen, Bauchlage, Entwicklungsfreude.",
  },

  // ─── MONAT 3–6 ─────────────────────────────────────────────────────────────

  {
    id: "m03-04",
    weeksFrom: 13,
    weeksTo: 18,
    ageLabel: "Monat 3–4",
    title: "Greifen & Drehen",
    emoji: "✋",
    summary:
      "Hände und Augen beginnen zusammenzuarbeiten. Das Baby greift gezielt und dreht sich. Gleichzeitig beginnt eines der bekanntesten Phänomene: die Schlafregression um Monat 4.",
    canDo: [
      "Greift gezielt nach Objekten (CDC: 4 Monate)",
      "Bringt Hände und Gegenstände zum Mund",
      "Babbling: erste Konsonant-Vokal-Verbindungen ba, ma, da",
      "Erkennt Eltern sicher, zeigt Freude bei Wiedersehen",
      "Lacht ausgiebig und reagiert auf Stimmungen",
    ],
    typical: [
      "Schläft möglicherweise plötzlich schlechter — Schlafzyklen verändern sich um Monat 4 biologisch",
      "Legt alles in den Mund (Erkunden, kein Hunger)",
      "Quengeliger abends — oft Überstimulation nach aktivem Tag",
      "Will mehr Aufmerksamkeit und Nähe",
    ],
    watchOut: [
      "Greift bis 4 Monate gar nicht nach Dingen",
      "Kein Lachen",
      "Dreht sich bis 5 Monate noch gar nicht",
      "Kein Interesse an den eigenen Händen",
    ],
    parentTip:
      "Greifspielzeug in Reichweite legen — nicht in die Hand geben. Das Auge-Hand-Greifen selbst zu entdecken ist der eigentliche Lernmoment.",
    forParents:
      "Die Schlafregression um Monat 4 trifft viele Eltern unvorbereitet — gerade wenn es endlich besser geworden war. Sie ist biologisch bedingt: Schlafzyklen reifen, das Baby wacht in leichteren Phasen öfter auf. Das geht vorbei. Konsistenz in der Routine hilft.",
    developmentHint:
      "Intensive Entwicklungsphase (Monat 3–5): Das Gehirn verarbeitet Übergänge — Licht, Klang, Bewegung, Stimmungen werden als Kontinuum wahrgenommen. Mehr Quengeln ist typisch. Quelle: AAP.",
    miaContext:
      "Baby ist 3–4 Monate alt. Gezieltes Greifen beginnt, Babbling startet, Schlafregression Monat 4 möglich. Themen: Schlaf, Greifen, Spielzeug, Überstimulation.",
  },

  {
    id: "m04-06",
    weeksFrom: 18,
    weeksTo: 27,
    ageLabel: "Monat 4–6",
    title: "Entdecker auf dem Bauch",
    emoji: "🚀",
    summary:
      "Das Baby dreht sich, erkennt sich im Spiegel und versteht erstmals Ursache und Wirkung. Beikost steht vor der Tür — ein komplett neues Kapitel.",
    canDo: [
      "Dreht sich von Bauch auf Rücken (CDC: 6 Monate)",
      "Sitzt mit Unterstützung stabil",
      "Bringt Dinge gezielt zum Mund — Erkunden durch Tasten",
      "Erkennt Gesichter von Fremden, reagiert unterschiedlich",
      "Ursache-Wirkung: schüttelt Rassel bewusst, um Geräusch zu machen",
    ],
    typical: [
      "Zeigt Interesse an Essen der Eltern (Beikost-Signal)",
      "Fremdeln beginnt sich anzukündigen",
      "Alles wandert in den Mund — Zahnung kann beginnen",
      "Wachphasen deutlich länger, Schlaf etwas stabiler (nicht bei allen)",
    ],
    watchOut: [
      "Sitzt bis 6 Monate noch nicht mit Unterstützung",
      "Keine Silbenlaute",
      "Kein Drehen",
      "Zeigt kein Interesse an Essen oder Gegenständen",
    ],
    parentTip:
      "Beikost ab Monat 6: Brei oder Baby-Led Weaning — beide Wege funktionieren. Freies Liegen und Spielen auf dem Boden fördert Motorik am besten (kein Sitzen erzwingen).",
    forParents:
      "Wenn du noch stillst und Beikost einführst: Beides kombinieren ist problemlos, solange du willst. Die WHO empfiehlt Stillen bis mindestens 6 Monate, gerne länger. Es gibt kein Richtig oder Falsch.",
    developmentHint:
      "Intensive Entwicklungsphase (Monat 4–6): Baby versteht Ursache und Wirkung bewusster, Objektpermanenz beginnt. Das Kind merkt: Dinge existieren weiter, auch wenn sie nicht sichtbar sind. Quelle: AAP, NIH StatPearls.",
    miaContext:
      "Baby ist 4–6 Monate alt. Dreht sich, sitzt mit Unterstützung, Beikost steht an, Ursache-Wirkung beginnt. Themen: Beikost einführen, Bauchlage, Spielen, Fremdeln kündigt sich an.",
  },

  // ─── MONAT 6–9 ─────────────────────────────────────────────────────────────

  {
    id: "m06-07",
    weeksFrom: 27,
    weeksTo: 31,
    ageLabel: "Monat 6–7",
    title: "Sitzen & Fremdeln",
    emoji: "💞",
    summary:
      "Ein großer Schritt zur Eigenständigkeit — und gleichzeitig der Beginn des Fremdelns. Das ist kein Rückschritt, sondern ein Zeichen, dass dein Baby Bindungspersonen sicher erkennt.",
    canDo: [
      "Sitzt alleine, kurz und noch wackelig",
      "Klatscht in die Hände",
      "Plappert Silbenketten 'mamama', 'dadada' (noch ohne Bedeutung)",
      "Pinzettengriff entwickelt sich (Daumen + Zeigefinger)",
      "Vokalisiert beim Spielen, ruft um Aufmerksamkeit",
    ],
    typical: [
      "Fremdelt stark — weint bei Fremden, sucht Nähe der Bezugsperson",
      "Schläft evtl. schlechter — Separationsangst beginnt",
      "Erkundet aktiv — legt alles in den Mund",
      "Sehr eigenständig und gleichzeitig sehr bindungssuchend",
    ],
    watchOut: [
      "Sitzt bis 7 Monate gar nicht mit Unterstützung",
      "Keine Silben/Laute",
      "Kein Interesse an Umgebung oder Gegenständen",
      "Reagiert nicht auf den eigenen Namen bis 8 Monate",
    ],
    parentTip:
      "Fremdeln respektieren — nicht erzwingen, dass Fremde das Baby halten. Peekaboo trainiert Objektpermanenz: 'Dinge verschwinden nicht für immer.'",
    forParents:
      "Fremdeln ist für Großeltern und Verwandte oft schmerzhaft. Erkläre ihnen: Das ist ein Zeichen gesunder Bindung, kein Persönlichkeitsproblem des Kindes. Es geht vorbei — Geduld und kein Zwang helfen.",
    developmentHint:
      "Intensive Entwicklungsphase (Monat 6–7): Baby versteht räumliche Beziehungen und Entfernungen. Trennungsangst und Objektpermanenz entstehen gleichzeitig. Quelle: AAP, NIH StatPearls.",
    miaContext:
      "Baby ist 6–7 Monate alt. Sitzt mit Unterstützung, Fremdeln beginnt, Pinzettengriff entwickelt sich. Themen: Fremdeln erklären, Babyproofing beginnen, Beikost weiterentwickeln.",
  },

  {
    id: "m07-09",
    weeksFrom: 31,
    weeksTo: 39,
    ageLabel: "Monat 7–9",
    title: "Mobil & neugierig",
    emoji: "🐛",
    summary:
      "Die Welt gehört jetzt dem Baby. Erste Fortbewegung bedeutet Freiheit — und neue Gefahren. Gleichzeitig wächst der passive Wortschatz rasant: das Baby versteht viel mehr als es sagt.",
    canDo: [
      "Robbt, krabbelt oder schiebt sich vorwärts — alle Wege sind normal (CDC 2022)",
      "Sitzt selbstständig und stabil",
      "Zieht sich an Möbeln hoch zum Stehen",
      "Versteht 'Nein' und einfache Sätze",
      "Winkt 'Tschüss'",
    ],
    typical: [
      "Trennungsangst kann sehr stark sein — weint wenn du das Zimmer verlässt",
      "Stopft alles in den Mund (Babyproofing jetzt kritisch)",
      "Schläft möglicherweise schlechter — Mobilitätsschub",
      "Sehr aktiv und explorativ",
    ],
    watchOut: [
      "Keine Fortbewegung (weder krabbeln, robben noch schieben) bis 10 Monate — sprich beim U7 darüber",
      "Kein Interesse am Hochziehen",
      "Versteht 'Nein' und eigenen Namen gar nicht",
    ],
    parentTip:
      "Wohnung babyproofing: Steckdosen, Schranktüren, kleine Gegenstände entfernen. Eine sichere Umgebung gibt dir Entspannung und dem Baby Freiheit.",
    forParents:
      "Mit der Mobilität beginnt die 'Augen-überall'-Phase. Das ist real erschöpfend. Babyproofing schafft Sicherheit — du musst nicht jede Sekunde dabei sein, wenn die Umgebung sicher ist. Das ist keine schlechte Elternschaft, das ist kluge Planung.",
    miaContext:
      "Baby ist 7–9 Monate alt. Krabbelt/robbt, Trennungsangst stark, versteht 'Nein'. Themen: Babyproofing, Trennungsangst, Schlaf, Fortbewegung fördern.",
  },

  // ─── MONAT 9–12 ────────────────────────────────────────────────────────────

  {
    id: "m09-12",
    weeksFrom: 39,
    weeksTo: 52,
    ageLabel: "Monat 9–12",
    title: "Verstehen & erste Worte",
    emoji: "💡",
    summary:
      "Ein bedeutsamer kognitiver Schritt: Das Baby sucht versteckte Gegenstände aktiv — es versteht, dass Dinge existieren, auch wenn es sie nicht sieht. Erste echte Wörter entstehen.",
    canDo: [
      "Objektpermanenz: sucht versteckte Gegenstände aktiv (CDC: 9 Monate)",
      "Zeigt mit dem Finger auf Dinge — shared attention",
      "Sagt 'Mama' und 'Papa' gezielt und bedeutungsvoll",
      "Folgt einfachen Anweisungen ('Bring mir den Ball')",
      "Imitiert Alltagshandlungen (Telefonieren, Kämmen)",
    ],
    typical: [
      "Trennungsangst kann in diesem Alter sehr stark sein",
      "Tagsüber oft auf 1 Schlaf reduziert",
      "Wählerisch beim Essen beginnt — Neo-Phobie ist normal",
      "Stürzt oft beim Stehen und ersten Schritten",
    ],
    watchOut: [
      "Keine gezielten Wörter ('Mama/Papa') bis 12 Monate",
      "Kein Zeigen auf Dinge bis 12 Monate",
      "Keine Fortbewegung bis 10 Monate — sprich beim U7 darüber",
      "Versteht 'Nein' und eigenen Namen gar nicht",
    ],
    parentTip:
      "Versteckspiele wie Kuckuck trainieren aktiv Objektpermanenz. Was wie Spaß aussieht, ist gleichzeitig kognitive Hochleistungsarbeit.",
    forParents:
      "Der erste Geburtstag ist auch dein Jahrestag als Elternteil. Ein Jahr durchgemacht, gewachsen, nicht aufgegeben — das verdient echte Anerkennung, auch von dir selbst. Nimm dir einen Moment: Was hat dich überrascht? Was hat dich stolz gemacht?",
    developmentHint:
      "Intensive Entwicklungsphase (Monat 9–10): Baby ordnet die Welt in Kategorien — alle Hunde sind 'Hunde'. Konstruktives Spielen (Stapeln, Sortieren) ist ein Ausdruck dieser kognitiven Reifung. Quelle: NIH StatPearls, AAP.",
    miaContext:
      "Baby ist 9–12 Monate alt. Erste Wörter, Objektpermanenz, zeigt auf Dinge. Themen: erste Wörter fördern, Trennungsangst, erster Geburtstag, Schlaf.",
  },

  // ─── MONAT 12–18 ───────────────────────────────────────────────────────────

  {
    id: "m12-15",
    weeksFrom: 52,
    weeksTo: 65,
    ageLabel: "Monat 12–15",
    title: "Erste Schritte",
    emoji: "👣",
    summary:
      "Aus dem Baby wird ein Kleinkind. Erste freie Schritte sind möglich — CDC (2022) setzt den Meilenstein für freies Laufen bis 18 Monate. Nicht jedes Kind läuft zum ersten Geburtstag, und das ist völlig normal.",
    canDo: [
      "Erste freie Schritte — variabel, normal bis 18 Monate (CDC 2022)",
      "Läuft an Möbeln entlang sicher (Cruising)",
      "3–10 aktive Wörter (CDC: 15 Monate)",
      "Selbst mit Löffel essen beginnt",
      "Stapelt 2–3 Würfel, legt Dinge in Behälter",
    ],
    typical: [
      "Erste Trotzanfälle — kurzangebunden, schnell vergessen",
      "Wählerisch beim Essen — kein Machtkampf daraus machen",
      "Trennungsangst kann wieder stärker werden",
      "Stürze gehören zum Laufen lernen dazu",
    ],
    watchOut: [
      "Keine freien Schritte bis 18 Monate — beim U7a ansprechen",
      "Weniger als 3 Wörter bis 12 Monate",
      "Kein Zeigen auf Dinge bis 12 Monate",
    ],
    parentTip:
      "Barfuß auf verschiedenen Böden fördert das Gleichgewicht am besten. Schuhe erst draußen. Stürze nicht überdramatisieren — das signalisiert dem Kind, ob es sich traut weiterzumachen.",
    forParents:
      "Trotz ist kein böses Verhalten — es ist Selbstausdruck ohne sprachliche Mittel. Das Kind ist frustriert, nicht manipulativ. Ruhig bleiben und die Emotion benennen ('Du bist gerade wütend, weil...') hilft langfristig.",
    developmentHint:
      "Intensive Entwicklungsphase (Monat 12–14): Kind versteht, dass es verschiedene Wege zum gleichen Ziel gibt — es plant und wählt Strategien (Piaget: präoperationale Phase beginnt). Quelle: NIH StatPearls, AAP.",
    miaContext:
      "Kind ist 12–15 Monate alt. Erste Schritte, 3–10 Wörter, erste Trotzanfälle. Themen: Laufen lernen, Trotz, Wortschatz fördern, Essen.",
  },

  {
    id: "m15-18",
    weeksFrom: 65,
    weeksTo: 78,
    ageLabel: "Monat 15–18",
    title: "Sprache & Selbstwille",
    emoji: "💬",
    summary:
      "Manche Kinder lernen in dieser Phase täglich ein neues Wort. Verstehen kommt immer vor Sprechen — das Kind versteht oft fünfmal so viel wie es sagt. Vorlesen ist jetzt der stärkste Sprachbooster.",
    canDo: [
      "5–20 aktive Wörter (CDC: 18 Monate — großes Spektrum normal)",
      "Selbstständiges Laufen, erste Laufversuche und Rennen",
      "Einfaches Rollenspiel: Puppe füttern, telefonieren",
      "Versteht einfache 2-Schritt-Anweisungen",
      "Zeigt auf Körperteile und Bilder in Büchern",
    ],
    typical: [
      "Trotzanfälle entstehen — kurz, intensiv, schnell vergessen",
      "Will alles selbst machen — braucht dabei aber oft Hilfe",
      "Schläft tagsüber noch 1 Mal",
      "Versteht viel mehr als es sagen kann — Frustration wenn die Sprache fehlt",
    ],
    watchOut: [
      "Unter 5 Wörter bis 18 Monate — beim U7b ansprechen",
      "Keine Reaktion auf einfache Fragen",
      "Verliert Fähigkeiten, die es vorher hatte",
    ],
    parentTip:
      "Wahlmöglichkeiten geben ('Willst du das rote oder das blaue?') gibt dem Kind Gefühl von Kontrolle — und reduziert Trotz erheblich.",
    forParents:
      "Du kannst nicht zu viel vorlesen. Kinder, denen täglich vorgelesen wird, haben mit 5 Jahren einen um Jahre größeren Wortschatz. 10 Minuten am Tag reichen — das gleiche Buch 20 Mal ist völlig normal und gut.",
    miaContext:
      "Kind ist 15–18 Monate alt. 5–20 Wörter, Laufen sicher, Trotz deutlich. Themen: Sprache fördern, Vorlesen, Trotz-Strategien, Rollenspiel.",
  },

  // ─── MONAT 18–24 ───────────────────────────────────────────────────────────

  {
    id: "m18-21",
    weeksFrom: 78,
    weeksTo: 91,
    ageLabel: "Monat 18–21",
    title: "Ich-Phase beginnt",
    emoji: "🙋",
    summary:
      "'Ich!' und 'Nein!' werden häufiger. Das Kind entdeckt seine Identität als eigene Person. Das ist anstrengend und wunderbar zugleich — und absolut gesund.",
    canDo: [
      "20–50 aktive Wörter, erste 2-Wort-Sätze beginnen",
      "Läuft sicher, rennt, klettert auf Möbel",
      "Ich-Bewusstsein: 'Meins', 'Ich will'",
      "Erste echte Empathie: tröstet weinendes Kind oder Puppe",
      "Treppensteigen mit Festhalten klappt gut",
    ],
    typical: [
      "Starke Trotzphasen — emotional sehr intensiv",
      "Will Autonomie: selbst entscheiden, selbst machen",
      "Wählerisch beim Essen (Neophobie-Peak)",
      "Schläft auf 1 Mittagsschlaf oder gar keinen mehr",
    ],
    watchOut: [
      "Kein 2-Wort-Satz bis 24 Monate",
      "Kein symbolisches Spielen bis 24 Monate",
      "Kein Interesse an anderen Kindern",
      "Verliert bereits erworbene Fähigkeiten",
    ],
    parentTip:
      "Routinen stärken — Vorhersehbarkeit reduziert Trotz erheblich. Emotionen benennen: 'Du bist wütend, weil...' ist langfristig wirksamer als Ignorieren.",
    forParents:
      "\"Ich mache das falsch\" ist in dieser Phase fast nie richtig. Liebevolles, konsequentes Elternsein — auch wenn es sich chaotisch anfühlt — ist genug. Kein Elternteil ist immer geduldig. Das Ziel ist nicht Perfektion.",
    developmentHint:
      "Intensive Entwicklungsphase (Monat 18–21): Kind versteht zunehmend abstrakte Prinzipien — fair/unfair, richtig/falsch. Regelverständnis und Autonomieanspruch wachsen gleichzeitig. Quelle: Piaget, AAP.",
    miaContext:
      "Kind ist 18–21 Monate alt. Erste 2-Wort-Sätze, starke Trotzphasen, Ich-Bewusstsein. Themen: Trotz-Strategien, Sprache, Grenzen setzen, Empathie.",
  },

  {
    id: "m21-24",
    weeksFrom: 91,
    weeksTo: 104,
    ageLabel: "Monat 21–24",
    title: "Sprachexplosion",
    emoji: "🌊",
    summary:
      "Viele Kinder verdoppeln ihren Wortschatz in diesen Monaten. Mit 24 Monaten sind 50+ aktive Wörter und erste 2-Wort-Sätze der Meilenstein laut CDC. Parallelspiel neben anderen Kindern beginnt.",
    canDo: [
      "50–100 aktive Wörter, erste 2-Wort-Sätze (CDC: 24 Monate)",
      "Sortiert Farben und einfache Formen",
      "Zeigt auf mindestens 2 Körperteile",
      "Parallelspiel neben anderen Kindern",
      "Befolgt 2-schrittige Anweisungen",
    ],
    typical: [
      "Sprachexplosion: lernt täglich 1–3 neue Wörter",
      "Trotzphasen weiterhin intensiv",
      "Teilen fällt noch sehr schwer",
      "Zeigt erste Ansätze von Problemlösung im Spiel",
    ],
    watchOut: [
      "Kein 2-Wort-Satz bis 24 Monate — beim U7a ansprechen",
      "Kein symbolisches Spielen bis 24 Monate",
      "Kein Interesse an anderen Kindern",
      "Unter 50 Wörter bis 24 Monate",
    ],
    parentTip:
      "Vorlesen ist jetzt der stärkste Sprachbooster — 10 Minuten täglich, gern dasselbe Buch 20 Mal. Fragen stellen: 'Wo ist der Hund?' trainiert aktiv den Wortabruf.",
    forParents:
      "Trotzphasen intensivieren sich oft kurz vor dem zweiten Geburtstag. Das ist Piagets präoperationale Phase: abstrakte Prinzipien werden gespürt, aber noch nicht vollständig verstanden. Real erschöpfend, aber entwicklungsgesund.",
    miaContext:
      "Kind ist 21–24 Monate alt. Sprachexplosion, 2-Wort-Sätze, Parallelspiel. Themen: Wortschatz, Vorlesen, Trotz, Geschwister, sozialer Kontakt.",
  },

  // ─── MONAT 24–36 ───────────────────────────────────────────────────────────

  {
    id: "m24-30",
    weeksFrom: 104,
    weeksTo: 130,
    ageLabel: "Monat 24–30",
    title: "Kleine Persönlichkeit",
    emoji: "🌟",
    summary:
      "Sätze werden länger, Fragen zahlloser. Das Kind wird zu einer echten Persönlichkeit mit Vorlieben, Humor und ersten Freundschaften. Grenzen werden konsequent getestet — das ist kognitive Entwicklung.",
    canDo: [
      "Sätze mit 3–4 Wörtern und mehr",
      "Spielt mit anderen Kindern (nicht nur nebeneinander)",
      "Versteht einfache Regeln und kann sie einhalten",
      "Farben und einfache Formen benennen",
      "Kennt Vornamen und Familiennamen",
    ],
    typical: [
      "Grenzen testen ist der Job — das ist kognitive Entwicklung, kein Aufstand",
      "Intensive Fantasiespiele und Rollenspiele",
      "Fragen ohne Ende ('Warum?')",
      "Trotzphasen können bis ins dritte Jahr anhalten",
    ],
    watchOut: [
      "Spricht keine 2-Wort-Sätze bis 30 Monate",
      "Zeigt kein Interesse an anderen Kindern",
      "Versteht einfache Anweisungen gar nicht",
      "Verliert bereits erworbene Fähigkeiten",
    ],
    parentTip:
      "Regeln erklären, nicht nur diktieren. 'Wir waschen Hände, damit keine Bakterien zu uns kommen' — das ist das Fundament für echte Regelakzeptanz.",
    forParents:
      "Das 'Warum?' kann erschöpfen — es ist aber Hochleistungskognition. Paarkommunikation leidet in dieser Phase oft im Trubel. Ein kurzes abendliches Check-in ('Wie geht es dir wirklich?') macht einen realen Unterschied.",
    miaContext:
      "Kind ist 24–30 Monate alt. Sätze mit 3+ Wörtern, echte Rollenspiele, erstes Regelverständnis. Themen: Warum-Fragen, Grenzen setzen, Freundschaften, Paarkommunikation.",
  },

  {
    id: "m30-36",
    weeksFrom: 130,
    weeksTo: 156,
    ageLabel: "Monat 30–36",
    title: "Eigene Welt",
    emoji: "🏡",
    summary:
      "Das Kleinkind lebt in einer reichen inneren Welt aus Fantasie, Regeln und ersten Moralfragen. Sprache ist jetzt komplex genug für Geschichten, Witze und Verhandlungen.",
    canDo: [
      "Spricht in kurzen Sätzen, erzählt einfache Geschichten",
      "Erste echte Freundschaften mit Lieblingskindern",
      "Versteht Abfolgen: 'Erst essen, dann spielen'",
      "Zeigt Empathie: tröstet, teilt (noch nicht immer)",
      "Fährt Laufrad, springt beidbeinig",
    ],
    typical: [
      "Potty Training beginnt oder ist in vollem Gange",
      "Erste Moralfragen: 'Ist das fair?', 'Das ist nicht nett'",
      "Geschwisterrivalität wenn vorhanden sehr präsent",
      "Braucht mehr Schlaf als es zeigt — Übermüdung als Trotz-Auslöser",
    ],
    watchOut: [
      "Spricht keine 2-Wort-Sätze bis 30 Monate",
      "Zeigt kein Interesse an anderen Kindern",
      "Versteht einfache Anweisungen gar nicht",
    ],
    parentTip:
      "Gemeinsam basteln, malen, bauen — Kreativprozesse fördern Sprache, Konzentration und Frustrationstoleranz gleichzeitig.",
    forParents:
      "In dieser Phase brauchen auch Paare manchmal eine Pause voneinander, nicht nur vom Kind. Gemeinsame Zeit — auch nur 15 Minuten abends — ist wichtig. Das Kind profitiert davon, wenn es euch gut geht.",
    miaContext:
      "Kind ist 30–36 Monate alt. Komplexe Sprache, erste Freundschaften, Potty Training. Themen: Geschwister, Töpfchentraining, Kindergarten-Vorbereitung, Paarpflege.",
  },
];

// ─── Badge-Logik ─────────────────────────────────────────────────────────────
// Importiert aus milestoneData — wird hier separat übergeben um zirkuläre
// Abhängigkeiten zu vermeiden. Aufrufer übergibt achievedIds + MILESTONES.

/**
 * Gibt die Phasen-Badge-Nummer zurück:
 * Wie viele Phasen (von Phase 0 aufwärts, inkl. aktueller) haben alle
 * ihre Meilensteine abgeschlossen? Null = kein Badge.
 */
export function getPhaseBadgeNumber(
  birthDateISO: string,
  achievedIds: Set<string>,
  milestones: { id: string; typicalWeeksFrom: number; typicalWeeksTo: number }[]
): number {
  const weeks = getAgeWeeks(birthDateISO);
  let count = 0;
  for (const phase of DEVELOPMENT_PHASES) {
    if (phase.weeksFrom > weeks) break; // Phase noch nicht erreicht
    const ms = milestones.filter(
      (m) => m.typicalWeeksFrom < phase.weeksTo && m.typicalWeeksTo > phase.weeksFrom
    );
    if (ms.length === 0 || !ms.every((m) => achievedIds.has(m.id))) break;
    count++;
  }
  return count;
}

// ─── Hilfsfunktionen ──────────────────────────────────────────────────────────

/** Alter in Wochen ab Geburtsdatum */
export function getAgeWeeks(birthDateISO: string): number {
  return Math.floor(
    (Date.now() - new Date(birthDateISO).getTime()) / (7 * 24 * 60 * 60 * 1000)
  );
}

/** Aktuelle Phase basierend auf Geburtsdatum */
export function getCurrentPhase(birthDateISO: string): DevelopmentPhase | null {
  const weeks = getAgeWeeks(birthDateISO);
  return (
    DEVELOPMENT_PHASES.find((p) => weeks >= p.weeksFrom && weeks < p.weeksTo) ??
    (weeks >= 156 ? DEVELOPMENT_PHASES[DEVELOPMENT_PHASES.length - 1] : null)
  );
}

/** Nächste Phase */
export function getNextPhase(currentId: string): DevelopmentPhase | null {
  const idx = DEVELOPMENT_PHASES.findIndex((p) => p.id === currentId);
  return idx >= 0 && idx < DEVELOPMENT_PHASES.length - 1
    ? DEVELOPMENT_PHASES[idx + 1]
    : null;
}

/** Wochen bis zur nächsten Phase */
export function getWeeksUntilNextPhase(birthDateISO: string): number | null {
  const weeks = getAgeWeeks(birthDateISO);
  const current = getCurrentPhase(birthDateISO);
  if (!current) return null;
  return current.weeksTo - weeks;
}

/**
 * Kontext-String für Mia's System Prompt
 * Kombiniert Phase + nächste Phase + ggf. Entwicklungshinweis
 */
export function buildMiaContext(birthDateISO: string, babyName: string): string {
  const weeks = getAgeWeeks(birthDateISO);
  const phase = getCurrentPhase(birthDateISO);
  const next = phase ? getNextPhase(phase.id) : null;
  const weeksUntilNext = getWeeksUntilNextPhase(birthDateISO);

  if (!phase) {
    return `${babyName} ist ${weeks} Wochen alt. Keine spezifische Entwicklungsphase verfügbar.`;
  }

  let ctx = `${babyName} ist ${weeks} Wochen alt (${phase.ageLabel}). ${phase.miaContext}`;

  if (phase.developmentHint) {
    ctx += ` Hinweis: ${phase.developmentHint}`;
  }

  if (next && weeksUntilNext !== null) {
    if (weeksUntilNext <= 2) {
      ctx += ` Die nächste Entwicklungsphase ("${next.title}") steht in ca. ${weeksUntilNext} Woche(n) bevor — mehr Quengeln oder Unruhe kann ein Vorzeichen sein.`;
    } else {
      ctx += ` Nächste Phase: "${next.title}" in ca. ${weeksUntilNext} Wochen.`;
    }
  }

  return ctx;
}
