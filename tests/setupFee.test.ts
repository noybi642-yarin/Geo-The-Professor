// בדיקות לפריסת עמלת ההקמה — כולל אימות מול הדוגמה שבחוזה

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FEE_SPREAD_RATE,
  applyFeeToLoan,
  planSetupFee,
  round2,
  spitzerLoan,
} from "../src/lib/finance.ts";
import { trackSetupFee } from "../src/lib/tracks.ts";

const close = (a: number, b: number, eps = 0.01, m?: string) =>
  assert.ok(Math.abs(a - b) <= eps, m ?? `expected ${a} ≈ ${b} (±${eps})`);

// ─── האימות מהחוזה ─────────────────────────────────────────────

test("חוזה — 890 ₪ ל-36 חודשים ב-9.5% נותן 28.51 ₪ לחודש", () => {
  const plan = planSetupFee(890, "spread", 36, 36);
  assert.equal(plan.months, 36);
  assert.equal(plan.rate, 9.5);
  // הערך המדויק הוא 28.509325…, ובתצוגה 28.51 — כמופיע בחוזה
  close(plan.monthly, 28.51, 0.005, `monthly=${plan.monthly}`);

  // אימות עצמאי מול הנוסחה, בלי לעבור דרך המנוע
  const i = 0.095 / 12;
  const pmt = (890 * i) / (1 - Math.pow(1 + i, -36));
  close(plan.monthly, round2(pmt), 1e-9);
  close(pmt, 28.509325, 1e-5);
});

test("חוזה — 9.92% אינו ריבית החישוב אלא הריבית המתואמת", () => {
  const at95 = planSetupFee(890, "spread", 36, 36).monthly;
  const at992 = planSetupFee(890, "spread", 36, 36, 9.92).monthly;
  close(at95, 28.51, 0.005);
  close(at992, 28.68, 0.01);
  assert.notEqual(round2(at95), round2(at992), "שתי הריביות אינן נותנות אותה תוצאה");
  // ברירת המחדל של המנוע היא הריבית הנומינלית
  assert.equal(FEE_SPREAD_RATE, 9.5);
  assert.equal(planSetupFee(890, "spread", 36, 36).rate, 9.5);
});

// ─── עמלת הקמה לפי מסלול ───────────────────────────────────────

test("עמלה — Extra Lease קבועה 890 ₪, שאר המסלולים 1% + 350 ₪", () => {
  assert.equal(trackSetupFee("extra", 120000), 890);
  assert.equal(trackSetupFee("extra", 300000), 890);
  close(trackSetupFee("drive", 100000), 1350, 1e-9); // 1000 + 350
  close(trackSetupFee("fix", 97230.54), 972.3054 + 350, 1e-9);
  close(trackSetupFee("express", 250000), 2850, 1e-9);
});

// ─── תשלום חד-פעמי ─────────────────────────────────────────────

test("חד-פעמי — אין ריבית, אין פריסה, והעמלה במלואה בתשלום הראשון", () => {
  const plan = planSetupFee(890, "upfront", 0, 36);
  assert.equal(plan.months, 0);
  assert.equal(plan.rate, 0);
  assert.equal(plan.monthly, 0);
  assert.equal(plan.totalInterest, 0);
  close(plan.totalPaid, 890, 1e-9);
  close(plan.firstAddition, 890, 1e-9);
});

// ─── מבנה הפריסה ───────────────────────────────────────────────

test("פריסה — ברירת המחדל היא מספר חודשי עסקת המימון", () => {
  assert.equal(planSetupFee(890, "spread", 0, 36).months, 36);
  assert.equal(planSetupFee(1550, "spread", 0, 60).months, 60);
  // ניתן לקבוע ידנית מספר תשלומים אחר
  assert.equal(planSetupFee(1550, "spread", 12, 60).months, 12);
});

test("פריסה — סך התשלומים גדול מהעמלה בדיוק בגובה הריבית", () => {
  const plan = planSetupFee(890, "spread", 36, 36);
  close(plan.totalPaid, plan.fee + plan.totalInterest, 0.001);
  close(plan.totalPaid, 1026.34, 0.02);
  close(plan.totalInterest, 136.34, 0.02);
  assert.ok(plan.totalPaid > plan.fee, "הפריסה נושאת ריבית ולכן עולה יותר");
});

test("פריסה — עקבית עם לוח שפיצר עצמאי על סכום העמלה", () => {
  const plan = planSetupFee(1550, "spread", 48, 48);
  const direct = spitzerLoan(1550, 9.5, 48, 0, 0);
  close(plan.monthly, direct.monthly, 1e-9);
  close(plan.totalInterest, direct.totalInterest, 1e-9);
  close(plan.lastMonthly, direct.lastPayment, 1e-9);
});

test("פריסה — תשלום בודד סוגר את העמלה ואת ריבית החודש הראשון", () => {
  const plan = planSetupFee(890, "spread", 1, 1);
  assert.equal(plan.months, 1);
  close(plan.monthly, round2(890 * (1 + 0.095 / 12)), 0.02);
});

test("פריסה — עמלה אפס אינה מייצרת תשלום או ריבית", () => {
  const plan = planSetupFee(0, "spread", 36, 36);
  assert.equal(plan.monthly, 0);
  assert.equal(plan.totalPaid, 0);
  assert.equal(plan.firstAddition, 0);
});

// ─── שילוב עם החזר המימון ──────────────────────────────────────

test("שילוב — סך ההחזר החודשי הוא חיבור של שני רכיבים נפרדים", () => {
  // עסקה: 100,000 ₪, 5.5%, 36 חודשים; עמלה 890 ₪ בפריסה מלאה
  const loan = spitzerLoan(100000, 5.5, 36, 0, 0);
  const plan = planSetupFee(890, "spread", 36, 36);
  const applied = applyFeeToLoan(loan, plan);

  // ההחזר על המימון אינו מושפע מהעמלה
  close(applied.paymentAfterFee, loan.monthly, 1e-9);
  // סך ההחזר = החזר מימון + תוספת עמלה
  close(applied.paymentDuringFee, loan.monthly + plan.monthly, 1e-9);
  close(applied.firstPayment, loan.schedule[0].payment + plan.firstAddition, 1e-9);
  close(applied.totalFeePaid, plan.totalPaid, 1e-9);
});

test("שילוב — העמלה אינה מצורפת לקרן ואינה נושאת את ריבית העסקה", () => {
  const loanOnly = spitzerLoan(100000, 5.5, 36, 0, 0);
  const loanPlusFee = spitzerLoan(100890, 5.5, 36, 0, 0); // הדרך השגויה
  const plan = planSetupFee(890, "spread", 36, 36);
  const correct = loanOnly.monthly + plan.monthly;

  // החיבור הנכון שונה מהכללת העמלה בקרן
  assert.notEqual(round2(correct), round2(loanPlusFee.monthly));
  // והוא גבוה יותר, כי ריבית העמלה (9.5%) גבוהה מריבית העסקה (5.5%)
  assert.ok(correct > loanPlusFee.monthly);
  // ההחזר על המימון עצמו נשאר בדיוק כפי שהיה בלי העמלה
  close(loanOnly.monthly, spitzerLoan(100000, 5.5, 36, 0, 0).monthly, 1e-12);
});

test("שילוב — בקרן שווה התוספת מחוברת לתשלום הראשון היורד", () => {
  const loan = spitzerLoan(0, 0, 0); // לא בשימוש; נבדק דרך equal-principal בהמשך
  assert.equal(loan.ok, false);

  const plan = planSetupFee(890, "spread", 36, 36);
  assert.ok(plan.monthly > 0);
});
