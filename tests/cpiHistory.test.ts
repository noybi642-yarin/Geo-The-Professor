// בדיקות להיסטוריית מדד המחירים לצרכן ולחישוב השינוי החודשי

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CPI_FETCH_RECORDS,
  CPI_HISTORY_MONTHS,
  buildCpiHistory,
  monthlyChangePct,
  parseCpi,
  parseCpiSeries,
  withMonthlyChange,
  type CpiReading,
} from "../src/lib/liveData.ts";

const close = (a: number, b: number, eps = 1e-9, m?: string) =>
  assert.ok(Math.abs(a - b) <= eps, m ?? `expected ${a} ≈ ${b}`);

/** בונה תשובה במבנה המקונן של הלמ״ס */
const payload = (rows: [number, number, number][]) => ({
  month: [
    {
      code: 120010,
      name: "המדד הכללי",
      date: rows.map(([year, month, value]) => ({
        year,
        month,
        monthDesc: `חודש ${month}`,
        currBase: { value, baseDesc: "ממוצע 2024=100" },
      })),
    },
  ],
});

/** 13 חודשים רצופים לאחור מיוני 2026 */
const thirteen = (): [number, number, number][] => {
  const out: [number, number, number][] = [];
  let y = 2026;
  let m = 6;
  for (let i = 0; i < CPI_FETCH_RECORDS; i++) {
    out.push([y, m, 100 + i * 0.4]);
    m--;
    if (m === 0) {
      m = 12;
      y--;
    }
  }
  return out;
};

// ─── חישוב השינוי ──────────────────────────────────────────────

test("שינוי — עלייה מול המדד הקודם", () => {
  // 104.8 מ-104.3 → +0.4794...%
  const pct = monthlyChangePct(104.8, 104.3)!;
  close(pct, ((104.8 / 104.3) - 1) * 100);
  assert.ok(pct > 0);
});

test("שינוי — ירידה מול המדד הקודם", () => {
  const pct = monthlyChangePct(104.5, 104.8)!;
  close(pct, ((104.5 / 104.8) - 1) * 100);
  assert.ok(pct < 0);
  // ‎-0.286...% — מעוגל בתצוגה בלבד
  close(Math.round(pct * 100) / 100, -0.29);
});

test("שינוי — ללא שינוי מחזיר אפס מדויק", () => {
  assert.equal(monthlyChangePct(104.8, 104.8), 0);
});

test("שינוי — השוואה תמיד מול הקודם ולא מול הבסיס", () => {
  // בסיס 100, קודם 110, נוכחי 121 → 10% ולא 21%
  const pct = monthlyChangePct(121, 110)!;
  close(pct, 10);
  assert.notEqual(Math.round(pct), 21);
});

test("שינוי — דיוק מלא נשמר, ללא עיגול מוקדם", () => {
  const pct = monthlyChangePct(100.123456, 100)!;
  close(pct, 0.123456, 1e-12);
});

test("שינוי — נתון קודם חסר או לא תקין מחזיר null ולא מספר מומצא", () => {
  assert.equal(monthlyChangePct(104.8, 0), null);
  assert.equal(monthlyChangePct(104.8, -3), null);
  assert.equal(monthlyChangePct(NaN, 104), null);
});

// ─── סדרה והיסטוריה ────────────────────────────────────────────

test("סדרה — מוחזרת מהחדש לישן", () => {
  const s = parseCpiSeries(payload([[2026, 4, 103], [2026, 6, 104.8], [2026, 5, 104.3]]));
  assert.deepEqual(
    s.map((r) => `${r.year}-${r.month}`),
    ["2026-6", "2026-5", "2026-4"]
  );
  assert.equal(s[0].value, 104.8);
});

test("סדרה — חוצה שנים בסדר כרונולוגי נכון", () => {
  const s = parseCpiSeries(payload([[2025, 12, 101], [2026, 1, 101.5], [2025, 11, 100.8]]));
  assert.deepEqual(
    s.map((r) => `${r.year}-${r.month}`),
    ["2026-1", "2025-12", "2025-11"]
  );
});

test("סדרה — אותו חודש אינו נספר פעמיים גם כשהוא מקונן", () => {
  const nested = {
    month: [{ date: [{ year: 2026, month: 6, value: 104.8, extra: { year: 2026, month: 6, value: 104.8 } }] }],
  };
  assert.equal(parseCpiSeries(nested).length, 1);
});

test("סדרה — parseCpi ממשיך להחזיר את הקריאה העדכנית ביותר", () => {
  const p = payload([[2026, 4, 103], [2026, 6, 104.8], [2026, 5, 104.3]]);
  const latest = parseCpi(p);
  assert.equal(latest!.year, 2026);
  assert.equal(latest!.month, 6);
  assert.equal(latest!.value, 104.8);
  assert.equal(latest!.base, "ממוצע 2024=100");
});

test("היסטוריה — 12 חודשים מתוך 13 רשומות, לכולם יש שינוי", () => {
  assert.equal(CPI_HISTORY_MONTHS, 12);
  assert.equal(CPI_FETCH_RECORDS, 13);

  const h = buildCpiHistory(payload(thirteen()))!;
  assert.equal(h.length, 12, "מוצגים 12 חודשים בלבד");
  // גם לחודש ה-12 — הישן ביותר שמוצג — יש שינוי, בזכות הרשומה ה-13
  for (const r of h) {
    assert.notEqual(r.changePct, undefined, `${r.year}-${r.month} ללא שינוי מחושב`);
  }
  // סדר: מהחדש לישן
  assert.equal(h[0].month, 6);
  assert.equal(h[0].year, 2026);
  assert.equal(h[11].month, 7);
  assert.equal(h[11].year, 2025);
});

test("היסטוריה — הערכים בסדרה יורדים ולכן כל השינויים שליליים", () => {
  // הסדרה נבנית 100, 100.4, 100.8… מהחדש לישן, כלומר החדש נמוך מהקודם
  const h = buildCpiHistory(payload(thirteen()))!;
  for (const r of h) assert.ok(r.changePct! < 0, `${r.year}-${r.month}`);
});

test("היסטוריה — החישוב תואם לנוסחה על הערכים בפועל", () => {
  const rows: [number, number, number][] = [
    [2026, 6, 104.8],
    [2026, 5, 105.1],
    [2026, 4, 105.1],
    [2026, 3, 104.2],
  ];
  const h = buildCpiHistory(payload(rows))!;
  close(h[0].changePct!, ((104.8 / 105.1) - 1) * 100); // ירידה
  close(h[1].changePct!, 0); // ללא שינוי
  close(h[2].changePct!, ((105.1 / 104.2) - 1) * 100); // עלייה
  assert.equal(h[3].changePct, undefined, "לישן ביותר אין מול מה להשוות");
});

test("היסטוריה — רשומה חסרה באמצע אינה מפילה את החישוב", () => {
  // מרץ חסר: אפריל מושווה לפברואר, בלי להמציא ערך למרץ
  const rows: [number, number, number][] = [
    [2026, 4, 104.0],
    [2026, 2, 103.0],
    [2026, 1, 102.5],
  ];
  const h = buildCpiHistory(payload(rows))!;
  assert.equal(h.length, 3);
  assert.deepEqual(h.map((r) => r.month), [4, 2, 1]);
  close(h[0].changePct!, ((104 / 103) - 1) * 100);
  assert.equal(h[2].changePct, undefined);
});

test("היסטוריה — רשומה בודדת מחזירה חודש אחד ללא שינוי", () => {
  const h = buildCpiHistory(payload([[2026, 6, 104.8]]))!;
  assert.equal(h.length, 1);
  assert.equal(h[0].changePct, undefined);
});

test("היסטוריה — תשובה ריקה או שגויה מחזירה null ולא נתונים מומצאים", () => {
  assert.equal(buildCpiHistory(null), null);
  assert.equal(buildCpiHistory({}), null);
  assert.equal(buildCpiHistory({ error: "unavailable" }), null);
  assert.equal(buildCpiHistory({ month: [{ date: [] }] }), null);
});

test("היסטוריה — יותר מ-13 רשומות נחתכות ל-12 המוצגים", () => {
  const many: [number, number, number][] = [];
  let y = 2026, m = 6;
  for (let i = 0; i < 30; i++) {
    many.push([y, m, 100 + i * 0.1]);
    if (--m === 0) { m = 12; y--; }
  }
  const h = buildCpiHistory(payload(many))!;
  assert.equal(h.length, 12);
  assert.equal(h[0].month, 6);
});

test("withMonthlyChange — אינו משנה את המערך המקורי", () => {
  const series: CpiReading[] = [
    { value: 104.8, year: 2026, month: 6 },
    { value: 104.3, year: 2026, month: 5 },
  ];
  const out = withMonthlyChange(series);
  assert.equal(series[0].changePct, undefined, "המקור נשאר ללא שינוי");
  assert.notEqual(out[0].changePct, undefined);
});

// ─── בידוד כשלים ───────────────────────────────────────────────

test("בידוד — כשל בהיסטוריה אינו נוגע במדד הנוכחי", () => {
  // תשובה שממנה ניתן לחלץ חודש אחד בלבד: אין היסטוריה, אך יש מדד
  const p = payload([[2026, 6, 104.8]]);
  const latest = parseCpi(p);
  const history = buildCpiHistory(p)!;
  assert.ok(latest, "המדד הנוכחי נשאר זמין");
  assert.equal(latest!.value, 104.8);
  // הראוט מחזיר null להיסטוריה כשיש פחות משני חודשים
  assert.ok(history.length < 2, "אין מספיק נתונים להיסטוריה");
});

test("בידוד — כשל מלא במדד אינו מוגדר כשגיאה של ריבית", () => {
  // parseCpi/buildCpiHistory מחזירים null; פענוח הריבית עצמאי לחלוטין
  assert.equal(parseCpi({ error: "cbs down" }), null);
  assert.equal(buildCpiHistory({ error: "cbs down" }), null);
});
