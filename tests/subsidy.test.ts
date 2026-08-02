// בדיקות למנוע ה-TVM, פותר הריבית ומחשבון הסבסודים

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  annuityFactor,
  presentValue,
  solveMonthlyRate,
  annualFromMonthly,
  monthlyRate,
  spitzerPayment,
  subsidyCost,
  subsidyToRate,
} from "../src/lib/finance.ts";

const close = (a: number, b: number, eps = 0.01, m?: string) =>
  assert.ok(Math.abs(a - b) <= eps, m ?? `expected ${a} ≈ ${b} (±${eps})`);

// ─── יסודות TVM ────────────────────────────────────────────────

test("TVM — מקדם אנונה וערך נוכחי עקביים עם נוסחת התשלום", () => {
  const i = monthlyRate(6);
  close(annuityFactor(i, 60), (1 - Math.pow(1 + i, -60)) / i, 1e-12);
  close(annuityFactor(0, 60), 60, 1e-12); // ריבית 0%: המקדם הוא מספר החודשים

  // PV של תשלומי ההלוואה חייב להחזיר בדיוק את סכום ההלוואה
  const pmt = spitzerPayment(100000, i, 60);
  close(presentValue(pmt, i, 60), 100000, 1e-6);

  // גם עם בלון
  const pmtB = spitzerPayment(120000, i, 60, 45000);
  close(presentValue(pmtB, i, 60, 45000), 120000, 1e-6);
});

// ─── פותר הריבית ───────────────────────────────────────────────

test("Rate solver — משחזר ריבית ידועה בדיוק גבוה (ללא בלון)", () => {
  for (const annual of [0.5, 3.5, 5.5, 8.9, 12, 24]) {
    const i = monthlyRate(annual);
    const pmt = spitzerPayment(100000, i, 60);
    const r = solveMonthlyRate(100000, pmt, 60);
    assert.equal(r.ok, true);
    // דיוק הרבה מתחת ל-0.01% שנתי
    close(annualFromMonthly(r.rate), annual, 1e-7, `annual ${annual}`);
  }
});

test("Rate solver — משחזר ריבית ידועה גם עם בלון", () => {
  const i = monthlyRate(7.25);
  const pmt = spitzerPayment(150000, i, 48, 60000);
  const r = solveMonthlyRate(150000, pmt, 48, 60000);
  assert.equal(r.ok, true);
  close(annualFromMonthly(r.rate), 7.25, 1e-7);
});

test("Rate solver — ריבית 0% כשהתשלום מסלק בדיוק את הקרן", () => {
  const r = solveMonthlyRate(50000, 1000, 50);
  assert.equal(r.ok, true);
  close(r.rate, 0, 1e-9);
  close(annualFromMonthly(r.rate), 0, 1e-7);
});

test("Rate solver — תשלום שאינו מסלק את הקרן נדחה במפורש", () => {
  const r = solveMonthlyRate(100000, 500, 60); // 500×60 = 30,000 < 100,000
  assert.equal(r.ok, false);
  assert.ok(r.error!.includes("ריבית 0%"));
});

test("Rate solver — ולידציה של קלטים לא תקינים", () => {
  assert.equal(solveMonthlyRate(0, 1000, 60).ok, false);
  assert.equal(solveMonthlyRate(100000, 1000, 0).ok, false);
  assert.equal(solveMonthlyRate(100000, 0, 60).ok, false);
});

test("Rate solver — עקבי בשיטה האפקטיבית", () => {
  const i = monthlyRate(9, "effective");
  const pmt = spitzerPayment(80000, i, 36);
  const r = solveMonthlyRate(80000, pmt, 36);
  assert.equal(r.ok, true);
  close(annualFromMonthly(r.rate, "effective"), 9, 1e-7);
});

// ─── מצב 1 / 3: עלות הסבסוד ────────────────────────────────────

test("סבסוד — הדוגמה מהאיפיון: 5.5% → 3.5%, 80,000 ₪, 36 חוד׳ ≈ 2,368 ₪", () => {
  const r = subsidyCost(80000, 5.5, 3.5, 36);
  assert.equal(r.ok, true);
  close(r.dealPayment, 2415.672144, 1e-5);
  close(r.customerPayment, 2344.166378, 1e-5);
  close(r.monthlyDiff, 71.505766, 1e-5);
  // הערך הנוכחי של ההפרשים — 2,368.06 ₪, תואם ל-≈2,368 שבאיפיון
  close(r.subsidy, 2368.062, 0.01, `subsidy ${r.subsidy}`);
  close(r.nominalDiff, 2574.2076, 0.01);
});

test("סבסוד — זהות: PV(הפרשים) = מימון − PV(תשלומי הלקוח בריבית העסקה)", () => {
  const loan = 120000,
    n = 48,
    balloon = 40000;
  const r = subsidyCost(loan, 6.9, 4.2, n, balloon);
  assert.equal(r.ok, true);
  const iDeal = monthlyRate(6.9);
  const pvCustomer = presentValue(r.customerPayment, iDeal, n, balloon);
  close(r.subsidy, loan - pvCustomer, 1e-6);
});

test("סבסוד — ריבית זהה: אפס סבסוד", () => {
  const r = subsidyCost(80000, 5.5, 5.5, 36);
  assert.equal(r.ok, true);
  close(r.subsidy, 0, 1e-9);
  close(r.monthlyDiff, 0, 1e-9);
});

test("סבסוד — ריבית ללקוח גבוהה מריבית העסקה נותנת סבסוד שלילי", () => {
  const r = subsidyCost(80000, 3.5, 5.5, 36);
  assert.equal(r.ok, true);
  assert.ok(r.subsidy < 0);
  assert.ok(r.monthlyDiff < 0);
});

test("סבסוד — הסך הנומינלי גדול מהערך הנוכחי (היוון אמיתי, לא קירוב)", () => {
  const r = subsidyCost(80000, 5.5, 3.5, 36);
  close(r.nominalDiff, r.monthlyDiff * 36, 1e-9);
  assert.ok(r.nominalDiff > r.subsidy, "הסך הנומינלי חייב לעלות על הערך הנוכחי");
});

test("סבסוד — ולידציה: מימון אפס, חודשים אפס, ריבית שלילית, בלון גדול מדי", () => {
  assert.equal(subsidyCost(0, 5, 3, 36).ok, false);
  assert.equal(subsidyCost(80000, 5, 3, 0).ok, false);
  assert.equal(subsidyCost(80000, -1, 3, 36).ok, false);
  assert.equal(subsidyCost(80000, 5, 3, 36, 90000).ok, false);
});

// ─── מצב 2: תקציב → ריבית ──────────────────────────────────────

test("תקציב — הדוגמה מהאיפיון: 4.20% עם 1,000 ₪ סבסוד ≈ 3.37%", () => {
  const r = subsidyToRate(80000, 4.2, 1000, 36);
  assert.equal(r.ok, true);
  close(r.newRate, 3.37, 0.02, `newRate ${r.newRate}`);
});

test("תקציב — הלוך ושוב: הריבית שנפתרה מחזירה בדיוק את הסבסוד שהוזן", () => {
  for (const [loan, deal, sub, n, balloon] of [
    [80000, 4.2, 1000, 36, 0],
    [150000, 6.9, 5000, 60, 0],
    [200000, 5.5, 7500, 48, 60000],
  ] as const) {
    const r = subsidyToRate(loan, deal, sub, n, balloon);
    assert.equal(r.ok, true, `case ${loan}/${deal}/${sub}`);
    const back = subsidyCost(loan, deal, r.newRate, n, balloon);
    close(back.subsidy, sub, 0.01, `round-trip ${loan}/${deal}/${sub}`);
  }
});

test("תקציב — סבסוד אפס משאיר את ריבית העסקה", () => {
  const r = subsidyToRate(80000, 4.2, 0, 36);
  assert.equal(r.ok, true);
  close(r.newRate, 4.2, 1e-6);
});

test("תקציב — סבסוד גדול מדי נחסם בהודעה ברורה", () => {
  // סבסוד גבוה מכלל הריבית בעסקה — הריבית לא יכולה לרדת מתחת ל-0%
  const all = subsidyCost(80000, 4.2, 0, 36);
  const tooMuch = subsidyToRate(80000, 4.2, all.subsidy + 500, 36);
  assert.equal(tooMuch.ok, false);
  assert.ok(tooMuch.error!.includes("0%"));

  // סבסוד השווה בדיוק לריבית הכוללת מביא לריבית 0%
  const exact = subsidyToRate(80000, 4.2, all.subsidy, 36);
  assert.equal(exact.ok, true);
  close(exact.newRate, 0, 1e-6);
});

test("תקציב — סבסוד שלילי או גדול מהמימון נדחה", () => {
  assert.equal(subsidyToRate(80000, 4.2, -100, 36).ok, false);
  assert.equal(subsidyToRate(80000, 4.2, 80000, 36).ok, false);
});

test("תקציב — עובד גם עם בלון", () => {
  const r = subsidyToRate(150000, 7.5, 4000, 48, 50000);
  assert.equal(r.ok, true);
  assert.ok(r.newRate < 7.5 && r.newRate > 0);
  const back = subsidyCost(150000, 7.5, r.newRate, 48, 50000);
  close(back.subsidy, 4000, 0.01);
});
