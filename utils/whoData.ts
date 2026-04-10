// WHO Child Growth Standards — Weight-for-age
// Source: WHO Child Growth Standards (public domain)
// Values in grams, age in months (0–24)

export interface WhoPoint {
  ageMonths: number;
  grams: number;
}

export const WHO_WEIGHT: {
  m: { p3: WhoPoint[]; p15: WhoPoint[]; p50: WhoPoint[]; p85: WhoPoint[]; p97: WhoPoint[] };
  f: { p3: WhoPoint[]; p15: WhoPoint[]; p50: WhoPoint[]; p85: WhoPoint[]; p97: WhoPoint[] };
} = {
  // ── Boys ──────────────────────────────────────────────────────────────────
  m: {
    p3: [
      { ageMonths: 0, grams: 2500 }, { ageMonths: 1, grams: 3400 }, { ageMonths: 2, grams: 4300 },
      { ageMonths: 3, grams: 5000 }, { ageMonths: 4, grams: 5600 }, { ageMonths: 5, grams: 6100 },
      { ageMonths: 6, grams: 6400 }, { ageMonths: 7, grams: 6700 }, { ageMonths: 8, grams: 6900 },
      { ageMonths: 9, grams: 7100 }, { ageMonths: 10, grams: 7300 }, { ageMonths: 11, grams: 7400 },
      { ageMonths: 12, grams: 7700 }, { ageMonths: 15, grams: 8400 }, { ageMonths: 18, grams: 8900 },
      { ageMonths: 21, grams: 9400 }, { ageMonths: 24, grams: 9700 },
    ],
    p15: [
      { ageMonths: 0, grams: 2900 }, { ageMonths: 1, grams: 3800 }, { ageMonths: 2, grams: 4800 },
      { ageMonths: 3, grams: 5500 }, { ageMonths: 4, grams: 6200 }, { ageMonths: 5, grams: 6700 },
      { ageMonths: 6, grams: 7100 }, { ageMonths: 7, grams: 7400 }, { ageMonths: 8, grams: 7700 },
      { ageMonths: 9, grams: 7900 }, { ageMonths: 10, grams: 8100 }, { ageMonths: 11, grams: 8300 },
      { ageMonths: 12, grams: 8600 }, { ageMonths: 15, grams: 9300 }, { ageMonths: 18, grams: 9900 },
      { ageMonths: 21, grams: 10400 }, { ageMonths: 24, grams: 10900 },
    ],
    p50: [
      { ageMonths: 0, grams: 3300 }, { ageMonths: 1, grams: 4500 }, { ageMonths: 2, grams: 5600 },
      { ageMonths: 3, grams: 6400 }, { ageMonths: 4, grams: 7000 }, { ageMonths: 5, grams: 7500 },
      { ageMonths: 6, grams: 7900 }, { ageMonths: 7, grams: 8300 }, { ageMonths: 8, grams: 8600 },
      { ageMonths: 9, grams: 8900 }, { ageMonths: 10, grams: 9200 }, { ageMonths: 11, grams: 9400 },
      { ageMonths: 12, grams: 9600 }, { ageMonths: 15, grams: 10300 }, { ageMonths: 18, grams: 10900 },
      { ageMonths: 21, grams: 11500 }, { ageMonths: 24, grams: 12200 },
    ],
    p85: [
      { ageMonths: 0, grams: 3800 }, { ageMonths: 1, grams: 5200 }, { ageMonths: 2, grams: 6400 },
      { ageMonths: 3, grams: 7300 }, { ageMonths: 4, grams: 8000 }, { ageMonths: 5, grams: 8600 },
      { ageMonths: 6, grams: 9000 }, { ageMonths: 7, grams: 9400 }, { ageMonths: 8, grams: 9700 },
      { ageMonths: 9, grams: 10000 }, { ageMonths: 10, grams: 10300 }, { ageMonths: 11, grams: 10500 },
      { ageMonths: 12, grams: 10800 }, { ageMonths: 15, grams: 11600 }, { ageMonths: 18, grams: 12300 },
      { ageMonths: 21, grams: 12900 }, { ageMonths: 24, grams: 13700 },
    ],
    p97: [
      { ageMonths: 0, grams: 4200 }, { ageMonths: 1, grams: 5800 }, { ageMonths: 2, grams: 7100 },
      { ageMonths: 3, grams: 8000 }, { ageMonths: 4, grams: 8700 }, { ageMonths: 5, grams: 9300 },
      { ageMonths: 6, grams: 9800 }, { ageMonths: 7, grams: 10200 }, { ageMonths: 8, grams: 10500 },
      { ageMonths: 9, grams: 10800 }, { ageMonths: 10, grams: 11100 }, { ageMonths: 11, grams: 11400 },
      { ageMonths: 12, grams: 11700 }, { ageMonths: 15, grams: 12600 }, { ageMonths: 18, grams: 13400 },
      { ageMonths: 21, grams: 14100 }, { ageMonths: 24, grams: 14900 },
    ],
  },
  // ── Girls ─────────────────────────────────────────────────────────────────
  f: {
    p3: [
      { ageMonths: 0, grams: 2400 }, { ageMonths: 1, grams: 3200 }, { ageMonths: 2, grams: 4000 },
      { ageMonths: 3, grams: 4600 }, { ageMonths: 4, grams: 5100 }, { ageMonths: 5, grams: 5500 },
      { ageMonths: 6, grams: 5800 }, { ageMonths: 7, grams: 6100 }, { ageMonths: 8, grams: 6300 },
      { ageMonths: 9, grams: 6500 }, { ageMonths: 10, grams: 6700 }, { ageMonths: 11, grams: 6800 },
      { ageMonths: 12, grams: 7000 }, { ageMonths: 15, grams: 7600 }, { ageMonths: 18, grams: 8100 },
      { ageMonths: 21, grams: 8600 }, { ageMonths: 24, grams: 9000 },
    ],
    p15: [
      { ageMonths: 0, grams: 2700 }, { ageMonths: 1, grams: 3600 }, { ageMonths: 2, grams: 4500 },
      { ageMonths: 3, grams: 5200 }, { ageMonths: 4, grams: 5700 }, { ageMonths: 5, grams: 6200 },
      { ageMonths: 6, grams: 6500 }, { ageMonths: 7, grams: 6800 }, { ageMonths: 8, grams: 7100 },
      { ageMonths: 9, grams: 7300 }, { ageMonths: 10, grams: 7500 }, { ageMonths: 11, grams: 7700 },
      { ageMonths: 12, grams: 7900 }, { ageMonths: 15, grams: 8600 }, { ageMonths: 18, grams: 9100 },
      { ageMonths: 21, grams: 9600 }, { ageMonths: 24, grams: 10100 },
    ],
    p50: [
      { ageMonths: 0, grams: 3200 }, { ageMonths: 1, grams: 4200 }, { ageMonths: 2, grams: 5100 },
      { ageMonths: 3, grams: 5800 }, { ageMonths: 4, grams: 6400 }, { ageMonths: 5, grams: 6900 },
      { ageMonths: 6, grams: 7300 }, { ageMonths: 7, grams: 7600 }, { ageMonths: 8, grams: 7900 },
      { ageMonths: 9, grams: 8200 }, { ageMonths: 10, grams: 8500 }, { ageMonths: 11, grams: 8700 },
      { ageMonths: 12, grams: 8900 }, { ageMonths: 15, grams: 9600 }, { ageMonths: 18, grams: 10200 },
      { ageMonths: 21, grams: 10900 }, { ageMonths: 24, grams: 11500 },
    ],
    p85: [
      { ageMonths: 0, grams: 3700 }, { ageMonths: 1, grams: 4900 }, { ageMonths: 2, grams: 5900 },
      { ageMonths: 3, grams: 6700 }, { ageMonths: 4, grams: 7400 }, { ageMonths: 5, grams: 7900 },
      { ageMonths: 6, grams: 8300 }, { ageMonths: 7, grams: 8700 }, { ageMonths: 8, grams: 9000 },
      { ageMonths: 9, grams: 9300 }, { ageMonths: 10, grams: 9600 }, { ageMonths: 11, grams: 9900 },
      { ageMonths: 12, grams: 10100 }, { ageMonths: 15, grams: 10900 }, { ageMonths: 18, grams: 11600 },
      { ageMonths: 21, grams: 12300 }, { ageMonths: 24, grams: 13000 },
    ],
    p97: [
      { ageMonths: 0, grams: 4100 }, { ageMonths: 1, grams: 5500 }, { ageMonths: 2, grams: 6600 },
      { ageMonths: 3, grams: 7500 }, { ageMonths: 4, grams: 8200 }, { ageMonths: 5, grams: 8800 },
      { ageMonths: 6, grams: 9300 }, { ageMonths: 7, grams: 9700 }, { ageMonths: 8, grams: 10000 },
      { ageMonths: 9, grams: 10400 }, { ageMonths: 10, grams: 10700 }, { ageMonths: 11, grams: 11000 },
      { ageMonths: 12, grams: 11300 }, { ageMonths: 15, grams: 12200 }, { ageMonths: 18, grams: 13000 },
      { ageMonths: 21, grams: 13800 }, { ageMonths: 24, grams: 14600 },
    ],
  },
};

/** Interpoliert einen WHO-Wert für ein beliebiges Alter in Monaten */
export function interpolateWho(curve: WhoPoint[], ageMonths: number): number {
  if (ageMonths <= curve[0].ageMonths) return curve[0].grams;
  if (ageMonths >= curve[curve.length - 1].ageMonths) return curve[curve.length - 1].grams;
  for (let i = 0; i < curve.length - 1; i++) {
    if (ageMonths >= curve[i].ageMonths && ageMonths <= curve[i + 1].ageMonths) {
      const t = (ageMonths - curve[i].ageMonths) / (curve[i + 1].ageMonths - curve[i].ageMonths);
      return curve[i].grams + t * (curve[i + 1].grams - curve[i].grams);
    }
  }
  return curve[curve.length - 1].grams;
}
