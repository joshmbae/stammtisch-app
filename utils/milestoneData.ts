// ─── Entwicklungs-Meilensteine ───────────────────────────────────────────────
// Quellen: CDC "Learn the Signs. Act Early." (2022), WHO Motor Development Study,
// Mayo Clinic Infant Development, Largo "Babyjahre"
// typicalWeeksFrom/To: Alter in Wochen, in dem die meisten Kinder diesen
// Meilenstein erreichen. Frühchen: korrigiertes Alter bis 24 Monate verwenden.

export type MilestoneCategory = "motorik" | "sprache" | "sozial" | "kognitiv";

export interface Milestone {
  id: string;
  title: string;
  category: MilestoneCategory;
  typicalWeeksFrom: number;
  typicalWeeksTo: number;
  description: string;
  tip?: string;
}

export const CATEGORY_LABELS: Record<MilestoneCategory, string> = {
  motorik: "Motorik",
  sprache: "Sprache",
  sozial: "Sozial & Gefühle",
  kognitiv: "Denken & Lernen",
};

export const CATEGORY_EMOJIS: Record<MilestoneCategory, string> = {
  motorik: "🏃",
  sprache: "💬",
  sozial: "❤️",
  kognitiv: "🧠",
};

export const CATEGORY_COLORS: Record<MilestoneCategory, string> = {
  motorik: "#4A7C6F",
  sprache: "#9B7BB8",
  sozial: "#D4856A",
  kognitiv: "#7B9EC8",
};

export const MILESTONES: Milestone[] = [

  // ── Neugeborene ──────────────────────────────────────────────────────────────
  {
    id: "newborn_reflexes",
    title: "Neugeborenenreflexe",
    category: "motorik",
    typicalWeeksFrom: 0,
    typicalWeeksTo: 4,
    description:
      "Saug-, Greif-, Moro- und Schreitreflex sind von Geburt an aktiv. Diese angeborenen Programme sichern das Überleben und bilden die Grundlage für spätere willkürliche Bewegungen — sie werden sich in den ersten Monaten schrittweise zurückbilden.",
    tip: "Alle Reflexe werden bei der U1 und U2 geprüft. Für dich: Kein Handlungsbedarf, einfach beobachten.",
  },

  // ── Motorik: Grobmotorik ─────────────────────────────────────────────────────
  {
    id: "head_lift",
    title: "Kopf in Bauchlage anheben",
    category: "motorik",
    typicalWeeksFrom: 4,
    typicalWeeksTo: 10,
    description:
      "Dein Baby hebt in Bauchlage kurz den Kopf an — erster Schritt zur Kopfkontrolle, die Basis für alles Weitere.",
    tip: "Täglich 5–10 Min Bauchlage (unter Aufsicht) — anfangs auf deiner Brust.",
  },
  {
    id: "head_hold",
    title: "Kopf stabil halten",
    category: "motorik",
    typicalWeeksFrom: 10,
    typicalWeeksTo: 16,
    description:
      "Kopf und Nacken sind so weit gestärkt, dass dein Baby den Kopf ohne Stütze halten kann.",
    tip: "Tragen in aufrechter Position stärkt die Nackenmuskulatur auf natürliche Weise.",
  },
  {
    id: "roll_front_back",
    title: "Drehen: Bauch → Rücken",
    category: "motorik",
    typicalWeeksFrom: 12,
    typicalWeeksTo: 22,
    description:
      "Das erste Drehen — meist vom Bauch auf den Rücken, weil der Schwung hilft.",
    tip: "Buntes Spielzeug seitlich in Sichtweite legt den Grundstein fürs Drehen.",
  },
  {
    id: "roll_back_front",
    title: "Drehen: Rücken → Bauch",
    category: "motorik",
    typicalWeeksFrom: 16,
    typicalWeeksTo: 26,
    description:
      "Dreht von Rücken auf Bauch — erfordert mehr Kraft und Koordination als die andere Richtung.",
    tip: "Ab jetzt nie mehr ungesichert auf dem Wickeltisch lassen.",
  },
  {
    id: "sit_support",
    title: "Sitzen mit Unterstützung",
    category: "motorik",
    typicalWeeksFrom: 16,
    typicalWeeksTo: 26,
    description:
      "Sitzt mit Rücken- oder Kissenstütze — Rumpfmuskulatur wird aufgebaut.",
    tip: "Kein erzwungenes Sitzen — Bodenzeit ist wichtiger für die Entwicklung.",
  },
  {
    id: "sit_alone",
    title: "Alleine sitzen",
    category: "motorik",
    typicalWeeksFrom: 26,
    typicalWeeksTo: 39,
    description:
      "Sitzt stabil ohne Unterstützung — Hände sind jetzt frei zum Spielen.",
    tip: "Weiche Unterlage drumherum, falls es fällt — das gehört dazu.",
  },
  {
    id: "crawl",
    title: "Krabbeln oder Robben",
    category: "motorik",
    typicalWeeksFrom: 28,
    typicalWeeksTo: 48,
    description:
      "Erste echte Fortbewegung — ob Krabbeln, Robben oder Schieben, alle Wege sind entwicklungsrelevant.",
    tip: "Krabbeln stärkt Koordination und Körpermitte. Kein Lauflernwagen in dieser Phase.",
  },
  {
    id: "pull_up",
    title: "Hochziehen zum Stehen",
    category: "motorik",
    typicalWeeksFrom: 36,
    typicalWeeksTo: 48,
    description:
      "Zieht sich an Möbeln oder Gitter hoch — Beinmuskeln und Gleichgewicht trainieren sich.",
    tip: "Stabile, niedrige Möbel bereitstellen. Tischchen und Stühle sichern.",
  },
  {
    id: "cruise",
    title: "An Möbeln entlanglaufen",
    category: "motorik",
    typicalWeeksFrom: 40,
    typicalWeeksTo: 52,
    description:
      "Läuft seitlich an Sofas und Tischen entlang — das Gleichgewicht für freies Laufen wird trainiert.",
    tip: "Eine sichere Route entlangführen — nicht festhalten, es soll selbst balancieren.",
  },
  {
    id: "walk",
    title: "Freies Laufen",
    category: "motorik",
    typicalWeeksFrom: 48,
    typicalWeeksTo: 68,
    description:
      "Die ersten freien Schritte — einer der aufregendsten Meilensteine. Alles zwischen 9 und 15 Monaten ist normal.",
    tip: "Barfuß auf verschiedenen Böden trainiert das Gleichgewicht am besten. Schuhe erst draußen.",
  },
  {
    id: "climb",
    title: "Klettern",
    category: "motorik",
    typicalWeeksFrom: 52,
    typicalWeeksTo: 72,
    description:
      "Klettert auf Sofas, Stühle und Treppen — Gleichgewicht und Körperbewusstsein werden intensiv trainiert.",
    tip: "Klettern erlauben, aber sichern: Treppengitter, weiche Matten unter Kletterobjekten.",
  },
  {
    id: "stairs",
    title: "Treppen steigen",
    category: "motorik",
    typicalWeeksFrom: 60,
    typicalWeeksTo: 90,
    description:
      "Steigt Treppen rauf und runter — zunächst mit Festhalten, später freihändig. Koordination und Vertrauen wachsen.",
    tip: "Erst mit Festhalten üben, dann eine Stufe gleichzeitig freihändig. Nie unbeaufsichtigt.",
  },
  {
    id: "run",
    title: "Rennen",
    category: "motorik",
    typicalWeeksFrom: 72,
    typicalWeeksTo: 96,
    description:
      "Rennt, obwohl die Koordination noch wackelt — Stürze gehören dazu und sind normal.",
    tip: "Weiches Terrain und Raum zum Ausprobieren. Stürze nicht dramatisieren.",
  },
  {
    id: "jump",
    title: "Springen",
    category: "motorik",
    typicalWeeksFrom: 80,
    typicalWeeksTo: 104,
    description:
      "Springt mit beiden Füßen gleichzeitig vom Boden — erfordert Kraft, Koordination und Vertrauen in den eigenen Körper.",
    tip: "Trampolin-Matratzen, Kissen auf dem Boden — Springen üben macht riesigen Spaß.",
  },
  {
    id: "kick_ball",
    title: "Ball kicken",
    category: "motorik",
    typicalWeeksFrom: 68,
    typicalWeeksTo: 96,
    description:
      "Tritt gezielt gegen einen Ball — kombiniert Gleichgewicht auf einem Bein mit Koordination.",
    tip: "Großen, leichten Ball verwenden. Vorzeigen und gemeinsam üben.",
  },

  // ── Motorik: Feinmotorik ─────────────────────────────────────────────────────
  {
    id: "hands_midline",
    title: "Hände zusammenführen",
    category: "motorik",
    typicalWeeksFrom: 8,
    typicalWeeksTo: 14,
    description:
      "Bringt beide Hände zur Körpermitte und beobachtet sie — erste bewusste Körperwahrnehmung und Koordination.",
    tip: "Spielzeug über dem Bauch aufhängen (Babygymnastik) motiviert die Hände.",
  },
  {
    id: "reach",
    title: "Nach Dingen greifen",
    category: "motorik",
    typicalWeeksFrom: 12,
    typicalWeeksTo: 20,
    description:
      "Augen und Hände arbeiten erstmals zusammen — ein enormer Entwicklungsschritt.",
    tip: "Greifspielzeug (Ringe, Rasseln) in Reichweite legen, nicht direkt in die Hand geben.",
  },
  {
    id: "transfer",
    title: "Objekte von Hand zu Hand",
    category: "motorik",
    typicalWeeksFrom: 20,
    typicalWeeksTo: 28,
    description:
      "Reicht ein Spielzeug von einer Hand in die andere — zeigt bewusste bimanuele Koordination.",
    tip: "Spielzeug anbieten, das eine Hand schon hält — das animiert zum Transferieren.",
  },
  {
    id: "bang",
    title: "Dinge zusammenschlagen",
    category: "motorik",
    typicalWeeksFrom: 28,
    typicalWeeksTo: 40,
    description:
      "Schlägt zwei Gegenstände gegeneinander — entdeckt, dass Aktionen Geräusche erzeugen.",
    tip: "Holzlöffel, Becher oder Rasseln — alles ist erlaubt (und laut).",
  },
  {
    id: "finger_foods",
    title: "Mit Fingern essen",
    category: "motorik",
    typicalWeeksFrom: 28,
    typicalWeeksTo: 40,
    description:
      "Nimmt kleine Stücke auf und führt sie zum Mund — kombiniert Feinmotorik mit Selbstständigkeit.",
    tip: "Weiche Stücke anbieten (Banane, gekochte Karotte). Selbst essen fördern, nicht füttern.",
  },
  {
    id: "pincer",
    title: "Pinzettengriff",
    category: "motorik",
    typicalWeeksFrom: 32,
    typicalWeeksTo: 44,
    description:
      "Greift mit Zeigefinger und Daumen — eine präzise Feinmotorik, die für fast alle späteren Tätigkeiten wichtig ist.",
    tip: "Kleine, sichere Dinge zum Greifen anbieten. Zeigefinger und Daumen gezielt einsetzen lassen.",
  },
  {
    id: "stack_blocks",
    title: "Würfel stapeln",
    category: "motorik",
    typicalWeeksFrom: 52,
    typicalWeeksTo: 72,
    description:
      "Stapelt 2–4 Würfel aufeinander — kombiniert Feinmotorik, Augen-Hand-Koordination und erste räumliche Planung.",
    tip: "Große, leichte Holzwürfel sind am einfachsten. Begeisterung beim Umwerfen ist normal.",
  },
  {
    id: "throw_ball",
    title: "Ball werfen",
    category: "motorik",
    typicalWeeksFrom: 52,
    typicalWeeksTo: 72,
    description:
      "Wirft einen Ball gezielt — koordiniert Arm, Körperdrehung und Blick auf ein Ziel.",
    tip: "Leichten, großen Ball verwenden. Hin-und-her-Werfen macht am meisten Spaß.",
  },
  {
    id: "spoon",
    title: "Löffel benutzen",
    category: "motorik",
    typicalWeeksFrom: 52,
    typicalWeeksTo: 78,
    description:
      "Führt einen Löffel mit Essen zum Mund — noch kleckrig, aber das ist Teil des Lernens.",
    tip: "Dicken Brei anbieten, der am Löffel bleibt. Kleckern aushalten — es ist Übung.",
  },
  {
    id: "scribble",
    title: "Kritzeln mit Stift",
    category: "motorik",
    typicalWeeksFrom: 64,
    typicalWeeksTo: 96,
    description:
      "Hält einen Stift und kritzelt auf Papier — erste Verbindung zwischen Handlung und sichtbarem Ergebnis.",
    tip: "Große Wachsstifte, viel Papier. Das Kritzeln selbst ist das Ziel, kein Ergebnis erwartet.",
  },

  // ── Sprache ──────────────────────────────────────────────────────────────────
  {
    id: "coo",
    title: "Gurren & erste Laute",
    category: "sprache",
    typicalWeeksFrom: 4,
    typicalWeeksTo: 10,
    description:
      "Gibt weiche, kehlige Laute von sich — erste Kommunikationsversuche jenseits des Weinens.",
    tip: "Auf jeden Laut eingehen und antworten — das zeigt dem Baby, dass seine Stimme zählt.",
  },
  {
    id: "vocal_turn",
    title: "Lautgespräche führen",
    category: "sprache",
    typicalWeeksFrom: 8,
    typicalWeeksTo: 18,
    description:
      "Wartet auf deine Reaktion, äußert einen Laut, wartet wieder — ein echter Dialog ohne Worte.",
    tip: "Pause machen nach einem Laut des Babys und es 'antworten lassen'. Kein Überreden.",
  },
  {
    id: "babble",
    title: "Silben plappern",
    category: "sprache",
    typicalWeeksFrom: 16,
    typicalWeeksTo: 28,
    description:
      "'Mamama', 'bababa', 'dadada' — noch ohne Bedeutung, aber die Sprechorgane und das Gehirn üben intensiv.",
    tip: "Auf Laute eingehen, antworten, erweitern — Konversationen imitieren.",
  },
  {
    id: "name_response",
    title: "Auf eigenen Namen reagieren",
    category: "sprache",
    typicalWeeksFrom: 20,
    typicalWeeksTo: 32,
    description:
      "Dreht sich um oder schaut, wenn der eigene Name gerufen wird — das Gehirn verarbeitet Sprache als bedeutungsvoll.",
    tip: "Namen konsequent in natürlichem Ton nutzen — nicht im Befehlston.",
  },
  {
    id: "understands_no",
    title: 'Versteht "Nein"',
    category: "sprache",
    typicalWeeksFrom: 36,
    typicalWeeksTo: 52,
    description:
      "Hält inne oder schaut, wenn 'Nein' gesagt wird — zeigt, dass einzelne Wörter verstanden werden.",
    tip: "Klar und ruhig sagen, nicht schreien. Konsequenz ist wichtiger als Lautstärke.",
  },
  {
    id: "follow_simple",
    title: "Einfache Aufforderungen verstehen",
    category: "sprache",
    typicalWeeksFrom: 44,
    typicalWeeksTo: 60,
    description:
      "Holt einen Ball, wenn man 'Bring mir den Ball' sagt — Sprache verbindet sich mit Handlung.",
    tip: "Aufforderungen mit Geste kombinieren ('Komm her' + Hand ausstrecken) erleichtert den Einstieg.",
  },
  {
    id: "first_words",
    title: "Erste gezielte Wörter",
    category: "sprache",
    typicalWeeksFrom: 44,
    typicalWeeksTo: 64,
    description:
      "'Mama', 'Papa', 'da', 'nein' — das erste Mal gezielt und mit Bedeutung benutzt. Revolutionär.",
    tip: "Wörter natürlich wiederholen, nie als Übung erzwingen.",
  },
  {
    id: "body_parts",
    title: "Körperteile zeigen",
    category: "sprache",
    typicalWeeksFrom: 52,
    typicalWeeksTo: 68,
    description:
      "Zeigt auf Nase, Mund, Bauch wenn gefragt — Sprache und Körperwahrnehmung verbinden sich.",
    tip: "Beim Baden spielerisch benennen: 'Wo ist die Nase?' Keine Pflichtübung daraus machen.",
  },
  {
    id: "vocab_10",
    title: "10 Wörter sprechen",
    category: "sprache",
    typicalWeeksFrom: 56,
    typicalWeeksTo: 78,
    description:
      "Nutzt aktiv etwa 10 einzelne Wörter — auch 'Babyversionen' wie 'wau-wau' oder 'wauwau' zählen.",
    tip: "Jedes neue Wort feiern. Korrekte Aussprache kommt von selbst — nicht korrigieren.",
  },
  {
    id: "two_words",
    title: "Zwei-Wort-Sätze",
    category: "sprache",
    typicalWeeksFrom: 72,
    typicalWeeksTo: 104,
    description:
      "'Mehr Saft', 'Mama da', 'Hund groß' — die Grammatik beginnt sich zu formen.",
    tip: "Sätze leicht erweitern: Kind sagt 'Ball' → Du sagst 'Ja, der rote Ball!'",
  },
  {
    id: "vocab_50",
    title: "50 Wörter sprechen",
    category: "sprache",
    typicalWeeksFrom: 78,
    typicalWeeksTo: 104,
    description:
      "Wortschatz-Explosion — viele Kinder lernen jetzt täglich 1–3 neue Wörter. Ein enormer Schub.",
    tip: "Vorlesen, Benennen im Alltag, Lieder — Sprache ist Input, der sich summiert.",
  },

  // ── Sozial & Gefühle ─────────────────────────────────────────────────────────
  {
    id: "eye_contact",
    title: "Augenkontakt halten",
    category: "sozial",
    typicalWeeksFrom: 3,
    typicalWeeksTo: 8,
    description:
      "Hält gezielt Blickkontakt — das Gesicht der Bezugsperson ist das faszinierendste Objekt der Welt.",
    tip: "Nah am Gesicht sprechen (20–30 cm), langsam sprechen, Pausen lassen.",
  },
  {
    id: "smile",
    title: "Soziales Lächeln",
    category: "sozial",
    typicalWeeksFrom: 6,
    typicalWeeksTo: 10,
    description:
      "Das erste echte Lächeln als Reaktion auf dein Gesicht — kein Reflex mehr. Das Gehirn erkennt dich als vertraute, sichere Person.",
    tip: "Lächle viel zurück und sprich dabei — das verstärkt die Verbindung.",
  },
  {
    id: "mirror_faces",
    title: "Mimik nachahmen",
    category: "sozial",
    typicalWeeksFrom: 6,
    typicalWeeksTo: 14,
    description:
      "Ahmt Mundbewegungen oder Zungenzeigen nach — der Beginn von Empathie und sozialem Lernen.",
    tip: "Übertriebene Mimik machen (weit öffnen, staunen) — das motiviert zur Nachahmung.",
  },
  {
    id: "laugh",
    title: "Lachen",
    category: "sozial",
    typicalWeeksFrom: 10,
    typicalWeeksTo: 18,
    description:
      "Lautes, echtes Lachen als soziale Reaktion — zeigt Freude und soziale Verbindung.",
    tip: "Leichtes Kitzeln, lustige Geräusche, Guck-Guck — alles ist erlaubt.",
  },
  {
    id: "separation_anxiety",
    title: "Trennungsangst",
    category: "sozial",
    typicalWeeksFrom: 34,
    typicalWeeksTo: 60,
    description:
      "Weint, wenn du das Zimmer verlässt — zeigt, wie stark die Bindung ist. Kein Rückschritt, sondern gesunde Entwicklung.",
    tip: "Kurze Abwesenheiten ankündigen und konsequent zurückkommen — Verlässlichkeit ist die Lösung.",
  },
  {
    id: "stranger_anxiety",
    title: "Fremdeln",
    category: "sozial",
    typicalWeeksFrom: 26,
    typicalWeeksTo: 48,
    description:
      "Weint bei Fremden, sucht Nähe der Bezugsperson — Beweis gesunder Bindungsentwicklung.",
    tip: "Nicht erzwingen, dass Fremde das Baby halten. Fremdeln geht von selbst vorbei.",
  },
  {
    id: "wave",
    title: "Winken",
    category: "sozial",
    typicalWeeksFrom: 36,
    typicalWeeksTo: 52,
    description:
      "Winkt 'Hallo' und 'Tschüss' — soziale Kommunikation durch Geste, ein Vorläufer der Sprache.",
    tip: "Konsequent winken beim Kommen und Gehen — Imitation ist der Motor.",
  },
  {
    id: "imitate_actions",
    title: "Aktionen nachahmen",
    category: "sozial",
    typicalWeeksFrom: 40,
    typicalWeeksTo: 56,
    description:
      "Klatscht, wenn du klatschst — ahmt einfache Handlungen nach und lernt durch Beobachtung.",
    tip: "Alltägliche Handlungen bewusst und langsam vorzeigen: Hände waschen, Zähne putzen.",
  },
  {
    id: "pointing",
    title: "Zeigen auf Dinge",
    category: "sozial",
    typicalWeeksFrom: 40,
    typicalWeeksTo: 56,
    description:
      "'Shared attention' — zeigt auf Dinge, die es interessant findet oder will. Wichtiger sozialer und sprachlicher Meilenstein.",
    tip: "Auf alles eingehen, was gezeigt wird, und benennen: 'Ja, das ist ein Vogel!'",
  },
  {
    id: "express_emotions",
    title: "Gefühle ausdrücken",
    category: "sozial",
    typicalWeeksFrom: 48,
    typicalWeeksTo: 68,
    description:
      "Zeigt Freude, Ärger, Enttäuschung klar — und beginnt, auf die Gefühle anderer zu reagieren.",
    tip: "Gefühle benennen: 'Du bist gerade traurig, weil...' — das gibt Worten eine Bedeutung.",
  },
  {
    id: "empathy",
    title: "Erste Empathie",
    category: "sozial",
    typicalWeeksFrom: 72,
    typicalWeeksTo: 104,
    description:
      "Tröstet eine weinende Puppe oder ein trauriges Kind — zeigt Theory of Mind in erster Form.",
    tip: "Gefühle vorleben und benennen. Kein Erzwingen von Trösten.",
  },
  {
    id: "parallel_play",
    title: "Parallelspiel",
    category: "sozial",
    typicalWeeksFrom: 68,
    typicalWeeksTo: 96,
    description:
      "Spielt neben anderen Kindern, noch nicht wirklich mit ihnen — das ist normale erste Sozialentwicklung, kein Zeichen von Desinteresse.",
    tip: "Spieldates ermöglichen. Nicht auf gemeinsames Spiel drängen — Parallelspiel ist der natürliche erste Schritt.",
  },

  // ── Denken & Lernen ──────────────────────────────────────────────────────────
  {
    id: "tracking",
    title: "Bewegungen verfolgen",
    category: "kognitiv",
    typicalWeeksFrom: 4,
    typicalWeeksTo: 10,
    description:
      "Folgt einem sich bewegenden Gesicht oder Spielzeug mit den Augen — visuelles Tracking, Grundlage späterer Kognition.",
    tip: "Langsame Bewegungen mit buntem Spielzeug oder dem eigenen Gesicht.",
  },
  {
    id: "voice_recognition",
    title: "Bekannte Stimmen erkennen",
    category: "kognitiv",
    typicalWeeksFrom: 2,
    typicalWeeksTo: 8,
    description:
      "Dreht sich zur vertrauten Stimme — das Gehirn hat sie bereits vor der Geburt gespeichert.",
    tip: "Viel sprechen, singen, vorlesen — besonders in ruhiger Umgebung.",
  },
  {
    id: "cause_effect",
    title: "Ursache & Wirkung",
    category: "kognitiv",
    typicalWeeksFrom: 16,
    typicalWeeksTo: 28,
    description:
      "Merkt, dass Handlungen Konsequenzen haben ('Ich schüttle die Rassel → es macht Geräusch').",
    tip: "Spielzeug mit Ursache-Wirkung-Mechanismus (Knopf drücken → Tier erscheint).",
  },
  {
    id: "oral_explore",
    title: "Alles erkunden & testen",
    category: "kognitiv",
    typicalWeeksFrom: 12,
    typicalWeeksTo: 28,
    description:
      "Steckt alles in den Mund — das ist kein Unsinn, sondern die effizienteste Sinneserkundung in diesem Alter.",
    tip: "Ausreichend sicheres Spielzeug bereitstellen und gefährliche Objekte aus Reichweite räumen.",
  },
  {
    id: "object_permanence",
    title: "Objektpermanenz",
    category: "kognitiv",
    typicalWeeksFrom: 28,
    typicalWeeksTo: 44,
    description:
      "Sucht nach Dingen, die verschwunden sind — versteht, dass Objekte existieren, auch wenn sie nicht sichtbar sind.",
    tip: "Guck-Guck und Verstecken unter Tuch spielen — das ist kein Spaß, sondern kognitive Übung.",
  },
  {
    id: "containers",
    title: "Dinge in Behälter legen",
    category: "kognitiv",
    typicalWeeksFrom: 36,
    typicalWeeksTo: 52,
    description:
      "Legt Spielzeug gezielt in eine Box und leert sie wieder — versteht räumliche Beziehungen.",
    tip: "Eimer mit großen Ringen oder Bällen anbieten. Das Ein-und-Ausräumen nicht unterbrechen.",
  },
  {
    id: "book_pictures",
    title: "Bilder in Büchern zeigen",
    category: "kognitiv",
    typicalWeeksFrom: 44,
    typicalWeeksTo: 64,
    description:
      "Zeigt auf Bilder, wenn man fragt: 'Wo ist der Hund?' — verbindet Sprache mit Darstellungen.",
    tip: "Einfache Pappbücher mit klaren Bildern. Auf das zeigen, was du benennst.",
  },
  {
    id: "shape_sort",
    title: "Formen stecken",
    category: "kognitiv",
    typicalWeeksFrom: 56,
    typicalWeeksTo: 80,
    description:
      "Steckt einfache Formen (Kreis, Dreieck) in das passende Loch — räumliches Denken und Problemlösen.",
    tip: "Einfaches Formensortierspielzeug mit 2–3 Formen. Nicht vorführen, sondern ausprobieren lassen.",
  },
  {
    id: "symbolic_play",
    title: "Symbolisches Spielen",
    category: "kognitiv",
    typicalWeeksFrom: 64,
    typicalWeeksTo: 96,
    description:
      "Füttert eine Puppe, telefoniert mit einem Baustein — nutzt Objekte als Symbole für etwas anderes.",
    tip: "Spielzeugküche, Puppen, Fahrzeuge — und mitspielen, nicht vorspielen.",
  },
  {
    id: "mirror_self",
    title: "Sich im Spiegel erkennen",
    category: "kognitiv",
    typicalWeeksFrom: 78,
    typicalWeeksTo: 104,
    description:
      "Zeigt auf sich im Spiegel, wenn gefragt, oder wischt einen Fleck von der eigenen Nase — Selbstwahrnehmung entsteht.",
    tip: "Großen Spiegel in Bodennähe anbieten. Gemeinsam schauen und benennen.",
  },
  {
    id: "simple_puzzle",
    title: "Einfache Puzzles lösen",
    category: "kognitiv",
    typicalWeeksFrom: 72,
    typicalWeeksTo: 104,
    description:
      "Legt 2–3 Teile in ein Einlegepuzzle — Problemlösen, räumliches Denken und Ausdauer.",
    tip: "Mit 2-teiligen Holzpuzzles beginnen. Nicht die Lösung zeigen — Fehler gehören dazu.",
  },
];

/**
 * Aktive Meilensteine: typisch jetzt oder bis 4 Wochen voraus.
 * Das ist der "Haupt-Pool" für Fortschritts-Zählung.
 */
export function getActiveMilestones(ageWeeks: number): Milestone[] {
  return MILESTONES.filter((m) => m.typicalWeeksFrom <= ageWeeks + 4)
    .sort((a, b) => a.typicalWeeksFrom - b.typicalWeeksFrom);
}

/**
 * Alle Meilensteine sortiert — aktive zuerst, dann zukünftige.
 * Für die vollständige Liste mit ausgegrauten Vorschauen.
 */
export function getAllMilestonesSorted(ageWeeks: number): Milestone[] {
  return [...MILESTONES].sort((a, b) => a.typicalWeeksFrom - b.typicalWeeksFrom);
}

/** @deprecated Benutze getActiveMilestones oder getAllMilestonesSorted */
export function getMilestonesForAge(ageWeeks: number): Milestone[] {
  return getActiveMilestones(ageWeeks);
}

/**
 * Formatiert eine Wochen-Range als lesbares Deutsch
 */
export function formatMilestoneAge(from: number, to: number): string {
  const fromMonths = Math.round(from / 4.33);
  const toMonths = Math.round(to / 4.33);
  if (from < 17) return `${from}–${to} Wochen`;
  if (fromMonths === toMonths) return `ca. ${fromMonths} Monate`;
  return `${fromMonths}–${toMonths} Monate`;
}

/**
 * Formatiert nur den Startzeitpunkt (für „Ab …" Anzeige bei zukünftigen Meilensteinen)
 */
export function formatMilestoneStart(from: number): string {
  if (from < 17) return `Woche ${from}`;
  const months = Math.round(from / 4.33);
  return `${months} Monaten`;
}
