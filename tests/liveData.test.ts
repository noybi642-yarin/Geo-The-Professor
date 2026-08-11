// בדיקות לפענוח הנתונים החיים.
// ה-API-ים הרשמיים אינם נגישים מסביבת הבדיקה, ולכן הפענוח נבדק מול
// מבני תשובה שונים — כולל וריאציות מבנה — כדי לוודא עמידות.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseCpi,
  parseBoi,
  calcPrime,
  toNumber,
  hebrewMonth,
  PRIME_SPREAD,
} from "../src/lib/liveData.ts";

// ─── ריבית פריים ───────────────────────────────────────────────

test("פריים — ריבית בנק ישראל + 1.5%", () => {
  assert.equal(PRIME_SPREAD, 1.5);
  assert.equal(calcPrime(4.5), 6);
  assert.equal(calcPrime(4.25), 5.75);
  assert.equal(calcPrime(0), 1.5);
  // דוגמת האיפיון: 6% פריים נובע מ-4.5% בנק ישראל
  assert.equal(calcPrime(4.5), 6);
});

test("פריים — ערך חסר מחזיר null ולא 0", () => {
  assert.equal(calcPrime(null), null);
  assert.equal(calcPrime(undefined), null);
  assert.equal(calcPrime(NaN), null);
});

// ─── המרת מספרים ───────────────────────────────────────────────

test("toNumber — מספרים, מחרוזות וערכים לא תקינים", () => {
  assert.equal(toNumber(4.5), 4.5);
  assert.equal(toNumber("103.5"), 103.5);
  assert.equal(toNumber("4.5%"), 4.5);
  assert.equal(toNumber("abc"), null);
  assert.equal(toNumber(null), null);
  assert.equal(toNumber(undefined), null);
});

test("hebrewMonth — שמות חודשים", () => {
  assert.equal(hebrewMonth(1), "ינואר");
  assert.equal(hebrewMonth(6), "יוני");
  assert.equal(hebrewMonth(12), "דצמבר");
});

// ─── פענוח מדד (למ״ס) ──────────────────────────────────────────

test("מדד — מבנה מקונן עם currBase, נבחר החודש המאוחר ביותר", () => {
  const payload = {
    month: [
      {
        code: 120010,
        name: "המדד הכללי",
        date: [
          { year: 2025, month: 4, monthDesc: "אפריל", currBase: { value: 102.8, baseDesc: "ממוצע 2024=100" } },
          { year: 2025, month: 6, monthDesc: "יוני", currBase: { value: 103.5, baseDesc: "ממוצע 2024=100" } },
          { year: 2025, month: 5, monthDesc: "מאי", currBase: { value: 103.1, baseDesc: "ממוצע 2024=100" } },
        ],
      },
    ],
  };
  const r = parseCpi(payload);
  assert.ok(r);
  assert.equal(r!.value, 103.5);
  assert.equal(r!.year, 2025);
  assert.equal(r!.month, 6);
  assert.equal(r!.monthName, "יוני");
  assert.equal(r!.base, "ממוצע 2024=100");
});

test("מדד — ערך ישירות בצומת, ללא currBase", () => {
  const payload = { data: [{ year: 2025, month: 7, value: 104.2 }] };
  const r = parseCpi(payload);
  assert.ok(r);
  assert.equal(r!.value, 104.2);
  assert.equal(r!.month, 7);
});

test("מדד — חוצה שנים: דצמבר קודם מול ינואר חדש", () => {
  const payload = {
    date: [
      { year: 2024, month: 12, value: 101.9 },
      { year: 2025, month: 1, value: 102.1 },
    ],
  };
  const r = parseCpi(payload);
  assert.equal(r!.year, 2025);
  assert.equal(r!.month, 1);
  assert.equal(r!.value, 102.1);
});

test("מדד — ערכים כמחרוזות מתקבלים", () => {
  const r = parseCpi({ date: [{ year: "2025", month: "3", value: "102.44" }] });
  assert.equal(r!.value, 102.44);
  assert.equal(r!.year, 2025);
});

test("מדד — תשובה ריקה או לא רלוונטית מחזירה null, לא 0", () => {
  assert.equal(parseCpi(null), null);
  assert.equal(parseCpi({}), null);
  assert.equal(parseCpi({ message: "error" }), null);
  assert.equal(parseCpi([]), null);
  // חודש לא חוקי נפסל
  assert.equal(parseCpi({ date: [{ year: 2025, month: 13, value: 100 }] }), null);
  // ערך אפס נפסל — אינו מדד תקין
  assert.equal(parseCpi({ date: [{ year: 2025, month: 5, value: 0 }] }), null);
});

// ─── פענוח ריבית בנק ישראל ─────────────────────────────────────

test("ריבית — מבנה PublicApi שטוח", () => {
  const r = parseBoi({ interestRate: 4.5, effectiveDate: "2025-01-06T00:00:00" });
  assert.ok(r);
  assert.equal(r!.rate, 4.5);
  assert.equal(r!.effectiveDate, "2025-01-06T00:00:00");
});

test("ריבית — שמות שדות באות גדולה", () => {
  const r = parseBoi({ InterestRate: 4.25, EffectiveDate: "2025-02-24" });
  assert.equal(r!.rate, 4.25);
  assert.equal(r!.effectiveDate, "2025-02-24");
});

test("ריבית — מבנה SDMX של edge.boi.gov.il", () => {
  const payload = {
    data: {
      dataSets: [{ series: { "0:0:0": { observations: { "0": [4.5, null] } } } }],
      structures: [
        { dimensions: { observation: [{ values: [{ id: "2025-06", name: "יוני 2025" }] }] } },
      ],
    },
  };
  const r = parseBoi(payload);
  assert.ok(r);
  assert.equal(r!.rate, 4.5);
  assert.equal(r!.effectiveDate, "2025-06");
});

test("ריבית — SDMX עם כמה תצפיות: נבחרת האחרונה", () => {
  const payload = {
    data: {
      dataSets: [{ series: { "0:0": { observations: { "0": [4.75], "1": [4.5] } } } }],
      structures: [
        { dimensions: { observation: [{ values: [{ id: "2025-05" }, { id: "2025-06" }] }] } },
      ],
    },
  };
  const r = parseBoi(payload);
  assert.equal(r!.rate, 4.5);
  assert.equal(r!.effectiveDate, "2025-06");
});

test("ריבית — ערך מקונן במערך תוצאות", () => {
  const r = parseBoi({ results: [{ rate: 4.5, date: "2025-01-06" }] });
  assert.equal(r!.rate, 4.5);
});

test("ריבית — ערך מחוץ לטווח סביר נפסל (הגנה מפני שדה שגוי)", () => {
  // 12,345 אינו ריבית — כנראה מזהה או סכום
  assert.equal(parseBoi({ value: 12345 }), null);
  assert.equal(parseBoi({ rate: -99 }), null);
});

test("ריבית — תשובה ריקה מחזירה null, לא 0", () => {
  assert.equal(parseBoi(null), null);
  assert.equal(parseBoi({}), null);
  assert.equal(parseBoi({ error: "unavailable" }), null);
});

test("ריבית 0% תקינה ומובחנת מכשל", () => {
  const r = parseBoi({ interestRate: 0, effectiveDate: "2021-01-01" });
  assert.ok(r, "ריבית אפס היא נתון תקין ואינה כשל");
  assert.equal(r!.rate, 0);
  assert.equal(calcPrime(r!.rate), 1.5);
});

// ─── שרשרת מלאה ────────────────────────────────────────────────

test("שרשרת — ריבית נמשכת ופריים נגזר ממנה", () => {
  const boi = parseBoi({ interestRate: 4.5, effectiveDate: "2025-01-06" });
  const cpi = parseCpi({ date: [{ year: 2025, month: 6, value: 103.5 }] });
  assert.equal(calcPrime(boi!.rate), 6);
  assert.equal(cpi!.value, 103.5);
});

test("שרשרת — כשל בריבית משאיר פריים null, המדד עדיין נמשך", () => {
  const failed: unknown = { error: "down" };
  const boi = parseBoi(failed);
  // נגזר לפני ה-assert: אחריו TypeScript מצמצם את boi ל-null
  const rate: number | null = boi ? boi.rate : null;
  const cpi = parseCpi({ date: [{ year: 2025, month: 6, value: 103.5 }] });
  assert.equal(boi, null);
  assert.equal(calcPrime(rate), null);
  assert.ok(cpi, "כשל במקור אחד אינו פוגע בשני");
});
