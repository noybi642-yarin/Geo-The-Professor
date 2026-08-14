// בדיקות להיסטוריית ריבית בנק ישראל ולשינוי בנקודות אחוז

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BOI_FETCH_RECORDS,
  BOI_HISTORY_MONTHS,
  buildBoiHistory,
  calcPrime,
  parseBoi,
  pickPolicyRateSeries,
  rateChangePts,
  sdmxSeriesList,
  withRateChange,
  type BoiReading,
} from "../src/lib/liveData.ts";

const close = (a: number, b: number, eps = 1e-9, m?: string) =>
  assert.ok(Math.abs(a - b) <= eps, m ?? `expected ${a} ≈ ${b}`);

/** בונה תשובת SDMX עם סדרת תצפיות (מהישן לחדש, כמו במקור) */
const sdmx = (rows: [string, number][]) => ({
  data: {
    dataSets: [
      {
        series: {
          "0:0:0": {
            observations: Object.fromEntries(rows.map(([, v], i) => [String(i), [v]])),
          },
        },
      },
    ],
    structures: [
      { dimensions: { observation: [{ values: rows.map(([id]) => ({ id })) }] } },
    ],
  },
});

/** 13 תקופות חודשיות לאחור מיוני 2026 */
const thirteen = (): [string, number][] => {
  const out: [string, number][] = [];
  let y = 2026, m = 6;
  for (let i = 0; i < BOI_FETCH_RECORDS; i++) {
    out.push([`${y}-${String(m).padStart(2, "0")}`, 4.5 - i * 0.05]);
    if (--m === 0) { m = 12; y--; }
  }
  return out.reverse(); // המקור מוסר מהישן לחדש
};

// ─── שינוי בנקודות אחוז ────────────────────────────────────────

test("שינוי — נמדד בנקודות אחוז ולא באחוזים", () => {
  // 4.5% → 4.25% הוא ‎-0.25 נקודות, לא ‎-5.56%
  const pts = rateChangePts(4.25, 4.5)!;
  close(pts, -0.25);
  const wrongPercent = (4.25 / 4.5 - 1) * 100;
  assert.ok(Math.abs(wrongPercent + 5.55) < 0.02, "כך זה היה נראה באחוזים");
  assert.notEqual(Math.round(pts * 100), Math.round(wrongPercent * 100));
});

test("שינוי — עלייה, ירידה וללא שינוי", () => {
  close(rateChangePts(4.75, 4.5)!, 0.25);
  close(rateChangePts(4.25, 4.5)!, -0.25);
  assert.equal(rateChangePts(4.5, 4.5), 0);
});

test("שינוי — דיוק מלא, ללא עיגול מוקדם", () => {
  close(rateChangePts(4.123456, 4)!, 0.123456, 1e-12);
});

test("שינוי — ערך לא תקין מחזיר null ולא מספר מומצא", () => {
  assert.equal(rateChangePts(NaN, 4.5), null);
  assert.equal(rateChangePts(4.5, NaN), null);
});

// ─── סדרה והיסטוריה ────────────────────────────────────────────

test("היסטוריה — 12 תקופות מתוך 13, מהחדש לישן, לכולן שינוי", () => {
  assert.equal(BOI_HISTORY_MONTHS, 12);
  assert.equal(BOI_FETCH_RECORDS, 13);

  const h = buildBoiHistory(sdmx(thirteen()))!;
  assert.equal(h.length, 12);
  assert.equal(h[0].effectiveDate, "2026-06", "החדשה ביותר ראשונה");
  assert.equal(h[11].effectiveDate, "2025-07");
  for (const r of h) assert.notEqual(r.changePts, undefined, r.effectiveDate);
});

test("היסטוריה — ריבית שמחזיקה על אותו ערך נותנת שינוי אפס", () => {
  // ריבית מדיניות אינה משתנה בכל חודש — ערכים חוזרים הם תקינים
  const h = buildBoiHistory(
    sdmx([
      ["2026-03", 4.5],
      ["2026-04", 4.5],
      ["2026-05", 4.25],
      ["2026-06", 4.25],
    ])
  )!;
  assert.equal(h[0].effectiveDate, "2026-06");
  close(h[0].changePts!, 0, 1e-12, "יוני מול מאי — ללא שינוי");
  close(h[1].changePts!, -0.25, 1e-12, "מאי מול אפריל — הורדה");
  close(h[2].changePts!, 0, 1e-12);
  assert.equal(h[3].changePts, undefined, "לישנה ביותר אין מול מה להשוות");
});

test("היסטוריה — הפריים נגזר מכל תקופה: ריבית + 1.5", () => {
  const h = buildBoiHistory(sdmx([["2026-05", 4.5], ["2026-06", 4.25]]))!;
  assert.equal(calcPrime(h[0].rate), 5.75);
  assert.equal(calcPrime(h[1].rate), 6);
});

test("היסטוריה — תשובה ללא סדרה מחזירה null ולא נתונים מומצאים", () => {
  assert.equal(buildBoiHistory(null), null);
  assert.equal(buildBoiHistory({}), null);
  // ה-PublicApi מחזיר ערך בודד ללא סדרה — אינו היסטוריה
  assert.equal(buildBoiHistory({ interestRate: 4.5, effectiveDate: "2026-01-06" }), null);
  assert.equal(buildBoiHistory({ error: "boi down" }), null);
});

test("היסטוריה — ערך מחוץ לטווח סביר נפסל", () => {
  const h = buildBoiHistory(sdmx([["2026-05", 4.5], ["2026-06", 9999]]));
  // 9999 נפסל, ונשארת תקופה אחת בלבד
  assert.equal(h!.length, 1);
  assert.equal(h![0].rate, 4.5);
});

test("היסטוריה — יותר מ-13 תקופות נחתכות ל-12", () => {
  const many: [string, number][] = [];
  let y = 2026, m = 6;
  for (let i = 0; i < 30; i++) {
    many.push([`${y}-${String(m).padStart(2, "0")}`, 4.5 - i * 0.05]);
    if (--m === 0) { m = 12; y--; }
  }
  const h = buildBoiHistory(sdmx(many.reverse()))!;
  assert.equal(h.length, 12);
});

test("withRateChange — אינו משנה את המערך המקורי", () => {
  const series: BoiReading[] = [{ rate: 4.25 }, { rate: 4.5 }];
  const out = withRateChange(series);
  assert.equal(series[0].changePts, undefined);
  close(out[0].changePts!, -0.25);
});

// ─── בחירת הסדרה הנכונה מתוך עולם תוכן רב-סדרתי ────────────────

/**
 * תשובת SDMX עם כמה סדרות תחת אותו dataflow, כפי שמקובל בעולמות
 * התוכן של בנק ישראל. names הוא שמות ערכי המימד הראשון.
 */
const sdmxMulti = (names: string[], rows: string[], valuesPerSeries: number[][]) => ({
  data: {
    dataSets: [
      {
        series: Object.fromEntries(
          names.map((_, si) => [
            `${si}:0`,
            {
              observations: Object.fromEntries(
                valuesPerSeries[si].map((v, i) => [String(i), [v]])
              ),
            },
          ])
        ),
      },
    ],
    structures: [
      {
        dimensions: {
          series: [
            { id: "SERIES_CODE", values: names.map((n, i) => ({ id: `S${i}`, name: n })) },
            { id: "FREQ", values: [{ id: "M", name: "חודשי" }] },
          ],
          observation: [{ values: rows.map((id) => ({ id })) }],
        },
      },
    ],
  },
});

test("סדרות — כל סדרה מקבלת תווית מתוך שמות ערכי המימדים", () => {
  const p = sdmxMulti(
    ["ריבית בנק ישראל", "תשואת מק״מ לשנה"],
    ["2026-05", "2026-06"],
    [
      [4.5, 4.25],
      [4.1, 4.05],
    ]
  );
  const list = sdmxSeriesList(p);
  assert.equal(list.length, 2);
  assert.equal(list[0].label, "ריבית בנק ישראל · חודשי");
  assert.equal(list[1].label, "תשואת מק״מ לשנה · חודשי");
  assert.equal(list[0].readings[0].rate, 4.25, "החדשה ביותר ראשונה");
  assert.equal(list[0].readings[0].effectiveDate, "2026-06");
});

test("בחירה — סדרה יחידה נבחרת גם ללא תווית", () => {
  const list = sdmxSeriesList(sdmx([["2026-05", 4.5], ["2026-06", 4.25]]));
  assert.equal(list.length, 1);
  assert.equal(pickPolicyRateSeries(list)!.readings[0].rate, 4.25);
});

test("בחירה — מתוך כמה סדרות נבחרת רק זו שתוויתה מזהה ריבית בנק ישראל", () => {
  const p = sdmxMulti(
    ["תשואת מק״מ לשנה", "ריבית בנק ישראל"],
    ["2026-05", "2026-06"],
    [
      [4.1, 4.05],
      [4.5, 4.25],
    ]
  );
  const chosen = pickPolicyRateSeries(sdmxSeriesList(p))!;
  assert.equal(chosen.readings[0].rate, 4.25, "לא נבחרה סדרת המק״מ");

  const h = buildBoiHistory(p)!;
  assert.equal(h[0].rate, 4.25);
  close(h[0].changePts!, -0.25, 1e-12);
  assert.equal(parseBoi(p)!.rate, 4.25);
});

test("בחירה — כשאי אפשר להכריע לא מוצגת סדרה כלל", () => {
  // שתי סדרות ללא תווית מזהה — הצגת אחת מהן הייתה ניחוש
  const p = sdmxMulti(
    ["תשואת מק״מ לשנה", "ריבית ממוצעת על אשראי"],
    ["2026-05", "2026-06"],
    [
      [4.1, 4.05],
      [6.2, 6.1],
    ]
  );
  assert.equal(pickPolicyRateSeries(sdmxSeriesList(p)), null);
  assert.equal(buildBoiHistory(p), null, "עדיף בלי היסטוריה מאשר סדרה שגויה");
  assert.equal(parseBoi(p), null);
});

test("בחירה — שתי סדרות שנראות שתיהן כריבית המדיניות אינן מוכרעות", () => {
  const p = sdmxMulti(
    ["ריבית בנק ישראל — יומי", "ריבית בנק ישראל — חודשי"],
    ["2026-05", "2026-06"],
    [
      [4.5, 4.25],
      [4.5, 4.25],
    ]
  );
  assert.equal(pickPolicyRateSeries(sdmxSeriesList(p)), null);
});

test("סדרות — מבנה בצורת structure יחיד נתמך כמו structures", () => {
  const rows = ["2026-05", "2026-06"];
  const p = {
    data: {
      dataSets: [{ series: { "0:0": { observations: { "0": [4.5], "1": [4.25] } } } }],
      structure: {
        dimensions: {
          series: [
            { id: "SERIES_CODE", values: [{ id: "S0", name: "ריבית בנק ישראל" }] },
            { id: "FREQ", values: [{ id: "M", name: "חודשי" }] },
          ],
          observation: [{ values: rows.map((id) => ({ id })) }],
        },
      },
    },
  };
  const list = sdmxSeriesList(p);
  assert.equal(list.length, 1);
  assert.equal(list[0].label, "ריבית בנק ישראל · חודשי");
  assert.equal(list[0].readings[0].effectiveDate, "2026-06");
});

// ─── בידוד כשלים ───────────────────────────────────────────────

test("בידוד — כשל בהיסטוריה אינו נוגע בריבית הנוכחית", () => {
  // ה-PublicApi מספק את הריבית הנוכחית גם כשאין סדרה
  const single = { interestRate: 4.5, effectiveDate: "2026-01-06" };
  assert.equal(buildBoiHistory(single), null, "אין היסטוריה");
  const current = parseBoi(single);
  assert.ok(current, "הריבית הנוכחית נשארת זמינה");
  assert.equal(current!.rate, 4.5);
  assert.equal(calcPrime(current!.rate), 6, "והפריים ממשיך להיגזר");
});

test("בידוד — parseBoi ממשיך לעבוד על סדרה ומחזיר את החדשה ביותר", () => {
  const p = sdmx([["2026-05", 4.5], ["2026-06", 4.25]]);
  const current = parseBoi(p);
  assert.equal(current!.rate, 4.25);
  assert.equal(current!.effectiveDate, "2026-06");
});
