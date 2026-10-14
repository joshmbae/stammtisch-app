/**
 * Absprache zwischen dem Start-Intro (IntroOverlay) und den Screens dahinter:
 * - `introBereit()`: der Screen unter dem Intro ist fertig geladen.
 * - `introZiel()`: wo das Logo hinfliegen soll (Home-Kopf), samt Bild.
 * Nur beim Kaltstart relevant; danach sind die Aufrufe wirkungslos.
 */

export interface IntroZiel {
  x: number;
  y: number;
  size: number;
  uri?: string;
}

type Hoerer = () => void;

let bereit = false;
let ziel: IntroZiel | null = null;
let vorbei = false;
let zielGesperrt = false;
const hoerer = new Set<Hoerer>();
const danach: (() => void)[] = [];

function melden() {
  hoerer.forEach((h) => h());
}

export function introBereit() {
  if (bereit || vorbei) return;
  bereit = true;
  melden();
}

export function introZiel(z: IntroZiel) {
  if (vorbei || zielGesperrt) return;
  ziel = z;
  melden();
}

/** Kein Flugziel (z. B. ein Push öffnet direkt einen Termin) – das Logo zoomt dann nur durch. */
export function introZielVerwerfen() {
  ziel = null;
  zielGesperrt = true;
}

export function introStatus() {
  return { bereit, ziel, vorbei };
}

export function introVorbei() {
  vorbei = true;
  hoerer.clear();
  danach.splice(0).forEach((f) => f());
}

/** Erst nach dem Intro ausführen (z. B. „Was ist neu“ öffnen), sonst sofort. */
export function introNachher(f: () => void) {
  if (vorbei) f();
  else danach.push(f);
}

export function introAbonnieren(h: Hoerer): () => void {
  hoerer.add(h);
  return () => hoerer.delete(h);
}
