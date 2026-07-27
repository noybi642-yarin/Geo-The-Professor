// בדיקות אוטומטיות למנוע החישובים הפיננסי
// הרצה: npm test  (node --experimental-strip-types --test)

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  spitzerLoan,
  equalPrincipalLoan,
  cpiSpitzerLoan,
  balloonSpreadByMonths,
  balloonSpreadByPayment,
  monthlyRate,
  round2,
} from "../src/lib/finance.ts";

const close = (actual: number, expected: number, eps = 0.02, msg?: string) =>
  assert.ok(Math.abs(actual - expected) <= eps, msg ?? `expected ${actual} ≈ ${expected} (±${eps})`);

// ─── שפיצר ─────────────────────────────────────────────────────

test("שפיצר ללא בלון — ערך PMT ידוע וסגירה לאפס", () => {
  // 100,000 ₪, 6% נומינלי, 60 חודשים → PMT ידוע 1,933.28
  const r = spitzerLoan(100000, 6, 60, 0, 0);
  assert.equal(r.ok, true);
  close(r.monthly, 1933.28, 0.01);
  const last = r.schedule[r.schedule.length - 1];
  close(last.closing, 0, 1e-9, "היתרה חייבת להיסגר לאפס בדיוק");
  // זהות חשבונאית: קרן + ריבית = סך התשלומים
  close(r.totalPaid, 100000 + r.totalInterest, 0.001);
});

test("שפיצר עם בלון — היתרה נסגרת בדיוק לסכום הבלון", () => {
  const r = spitzerLoan(120000, 8.9, 60, 45000, 24.99);
  assert.equal(r.ok, true);
  close(r.monthly, 1886.99, 0.01);
  const beforeBalloon = r.schedule[r.months - 1];
  close(beforeBalloon.closing, 45000, 1e-9, "יתרת סוף התקופה חייבת להיות בדיוק הבלון");
  const balloonRow = r.schedule[r.schedule.length - 1];
  assert.equal(balloonRow.isBalloon, true);
  close(balloonRow.payment, 45000, 1e-9);
  close(r.firstPayment, r.monthly + 24.99, 0.001);
  close(r.totalPaid, 120000 + r.totalInterest + 24.99, 0.01);
});

test("שפיצר — ריבית 0%: תשלום = קרן/חודשים בדיוק, ריבית אפס", () => {
  const r = spitzerLoan(50000, 0, 50, 0, 0);
  assert.equal(r.ok, true);
  close(r.monthly, 1000, 1e-9);
  close(r.totalInterest, 0, 1e-9);
  close(r.totalPaid, 50000, 0.001);
});

test("שפיצר — בלון 0 שקול לקריאה ללא בלון", () => {
  const a = spitzerLoan(80000, 7.5, 48, 0, 0);
  const b = spitzerLoan(80000, 7.5, 48);
  close(a.monthly, b.monthly, 1e-9);
  close(a.totalInterest, b.totalInterest, 1e-9);
});

test("שפיצר — פערי עיגול: התשלום האחרון סופג אגורות והיתרה מתאפסת", () => {
  // סכום "מכוער" שמייצר שברי אגורות
  const r = spitzerLoan(137537.37, 7.35, 84, 0, 0);
  assert.equal(r.ok, true);
  const last = r.schedule[r.schedule.length - 1];
  close(last.closing, 0, 1e-9);
  // התשלום האחרון קרוב לתשלום הקבוע: עיגול התשלום לאגורות סוטה עד
  // חצי אגורה לחודש, והסטייה המצטברת נספגת בתשלום האחרון (≤ n·0.005)
  close(r.lastPayment, r.monthly, r.months * 0.005 + 0.01);
  close(r.totalPaid, 137537.37 + r.totalInterest, 0.001);
});

test("ולידציה — חודשים אפס/שלילי, ריבית שלילית, בלון גדול מההלוואה", () => {
  assert.equal(spitzerLoan(100000, 6, 0).ok, false);
  assert.equal(spitzerLoan(100000, 6, -12).ok, false);
  assert.equal(spitzerLoan(100000, -1, 60).ok, false);
  assert.equal(spitzerLoan(100000, 6, 60, 100001).ok, false);
  assert.equal(equalPrincipalLoan(100000, 6, 60, 100001).ok, false);
});

// ─── קרן שווה ──────────────────────────────────────────────────

test("קרן שווה ללא בלון — קרן חודשית קבועה, תשלום יורד, סגירה לאפס", () => {
  const r = equalPrincipalLoan(120000, 6, 60, 0, 0);
  assert.equal(r.ok, true);
  // קרן חודשית קבועה: 2,000
  for (const row of r.schedule) close(row.principal, 2000, 1e-9);
  // תשלום ראשון: 2,000 + 120,000·0.5% = 2,600
  close(r.monthly, 2600, 1e-9);
  // תשלום אחרון: 2,000 + 2,000·0.5% = 2,010
  close(r.lastPayment, 2010, 1e-9);
  // ריבית כוללת בקרן שווה: i·(n+1)/2·P = 0.005·61/2·2000·... => סכימה אריתמטית
  // Σ interest = i·P·(n+1)·n/2 / n ... נבדוק מול סכימה ישירה:
  const directInterest = r.schedule.reduce((s, x) => s + x.interest, 0);
  close(r.totalInterest, directInterest, 1e-9);
  close(r.totalInterest, 0.005 * (120000 + 2000) * 30, 0.01); // ממוצע יתרות · i · n
  const last = r.schedule[r.schedule.length - 1];
  close(last.closing, 0, 1e-9);
  // התשלום הראשון הוא הגבוה ביותר והתשלומים יורדים
  for (let k = 1; k < r.months; k++)
    assert.ok(r.schedule[k].payment < r.schedule[k - 1].payment + 1e-9);
});

test("קרן שווה עם בלון — קרן חודשית = (הלוואה-בלון)/חודשים, בלון בסוף", () => {
  const r = equalPrincipalLoan(150000, 7.2, 50, 50000, 24.99);
  assert.equal(r.ok, true);
  for (let k = 0; k < r.months; k++) close(r.schedule[k].principal, 2000, 1e-9);
  const beforeBalloon = r.schedule[r.months - 1];
  close(beforeBalloon.closing, 50000, 1e-9);
  const balloonRow = r.schedule[r.schedule.length - 1];
  assert.equal(balloonRow.isBalloon, true);
  close(balloonRow.payment, 50000, 1e-9);
  // תשלום ראשון: 2,000 + 150,000·0.6% = 2,900 (+ עמלה בנפרד)
  close(r.monthly, 2900, 1e-9);
  close(r.firstPayment, 2900 + 24.99, 1e-9);
  // תשלום אחרון לפני בלון: 2,000 + 52,000·0.6% = 2,312
  close(r.lastPayment, 2312, 1e-9);
  close(r.totalPaid, 150000 + r.totalInterest + 24.99, 0.001);
});

// ─── צמודת מדד ─────────────────────────────────────────────────

test("צמודת מדד — הנחת מדד 0% זהה לשפיצר רגיל", () => {
  const base = spitzerLoan(100000, 5, 60, 20000, 24.99);
  const cpi = cpiSpitzerLoan(100000, 5, 60, 20000, 24.99, 0);
  close(cpi.monthly, base.monthly, 0.001);
  close(cpi.totalInterest, base.totalInterest, 0.01);
  close(cpi.totalIndexation, 0, 0.01);
  close(cpi.totalPaid, base.totalPaid, 0.01);
  close(cpi.balloon, 20000, 0.001);
});

test("צמודת מדד — מדד חיובי: תשלומים עולים, בלון צמוד, הצמדה חיובית", () => {
  const base = spitzerLoan(100000, 5, 60, 20000, 0);
  const r = cpiSpitzerLoan(100000, 5, 60, 20000, 0, 3);
  assert.equal(r.ok, true);
  const c = Math.pow(1.03, 1 / 12);
  // התשלום הראשון: M·c
  close(r.monthly, base.monthly * c, 0.01);
  // התשלומים עולים לאורך התקופה
  for (let k = 1; k < r.months; k++)
    assert.ok(r.schedule[k].payment > r.schedule[k - 1].payment - 1e-9);
  // בלון צמוד: 20,000·c^60 = 20,000·1.03^5
  close(r.balloon, 20000 * Math.pow(1.03, 5), 0.5);
  // סך ההצמדה = הפרש הסך הצמוד מהבסיסי, וחיובי
  assert.ok(r.totalIndexation > 0);
  close(r.totalPaid, base.totalPaid + r.totalIndexation, 0.01);
  // היתרה נסגרת בדיוק
  close(r.schedule[r.schedule.length - 1].closing, 0, 1e-6);
});

// ─── פריסת בלון ────────────────────────────────────────────────

test("פריסת בלון לפי מספר חודשים — שפיצר ללא בלון", () => {
  const r = balloonSpreadByMonths(45000, 8.9, 36, 24.99);
  assert.equal(r.ok, true);
  assert.equal(r.balloon, 0);
  close(r.monthly, spitzerLoan(45000, 8.9, 36, 0, 0).monthly, 1e-9);
  close(r.firstPayment, r.monthly + 24.99, 0.001);
  close(r.totalPaid, 45000 + r.totalInterest + 24.99, 0.001);
});

test("פריסת בלון לפי תשלום קיים — איטרטיבי, תשלום אחרון מותאם", () => {
  const r = balloonSpreadByPayment(125449.9, 8.9, 2306.69, 24.99);
  assert.equal(r.ok, true);
  // אימות עצמאי: סימולציה חודש-אחר-חודש
  const i = monthlyRate(8.9);
  let bal = 125449.9;
  let months = 0;
  while (bal > 0 && months < 1000) {
    months++;
    const interest = bal * i;
    const principal = Math.min(2306.69 - interest, bal);
    bal -= principal;
  }
  assert.equal(r.months, months);
  // התשלום האחרון לא גובה יותר מהיתרה + ריבית
  assert.ok(r.lastPayment <= 2306.69 + 1e-9);
  const last = r.schedule[r.schedule.length - 1];
  close(last.closing, 0, 1e-9);
  close(r.totalPaid, 125449.9 + r.totalInterest + 24.99, 0.01);
  // מספר תשלומים מלאים: אם האחרון חלקי — אחד פחות
  assert.equal(r.fullMonths, r.lastPayment < 2306.69 - 0.005 ? r.months - 1 : r.months);
});

test("פריסת בלון — תשלום שאינו מכסה את הריבית נחסם עם הודעה ברורה", () => {
  // ריבית חודשית על 100,000 ב-12% היא 1,000 — תשלום 900 לא מכסה
  const r = balloonSpreadByPayment(100000, 12, 900, 0);
  assert.equal(r.ok, false);
  assert.ok(r.error!.includes("אינו מספיק לכיסוי הריבית"));
  // גם תשלום השווה בדיוק לריבית נחסם (החוב לעולם לא יקטן)
  assert.equal(balloonSpreadByPayment(100000, 12, 1000, 0).ok, false);
  // ותשלום מעט גבוה יותר — תקין
  assert.equal(balloonSpreadByPayment(100000, 12, 1001, 0).ok, true);
});

test("פריסת בלון — ריבית 0%: חלוקה פשוטה של היתרה", () => {
  const r = balloonSpreadByPayment(10000, 0, 3000, 0);
  assert.equal(r.ok, true);
  assert.equal(r.months, 4); // 3+3+3+1
  close(r.lastPayment, 1000, 1e-9);
  close(r.totalInterest, 0, 1e-9);
  close(r.totalPaid, 10000, 1e-9);
  assert.equal(r.fullMonths, 3);
});

// ─── עקביות עיגול ──────────────────────────────────────────────

test("עיגול תצוגה — round2 מעגל לשתי ספרות בשיטה חשבונאית", () => {
  assert.equal(round2(1.005), 1.01);
  assert.equal(round2(2.675), 2.68);
  assert.equal(round2(1886.985), 1886.99);
});
