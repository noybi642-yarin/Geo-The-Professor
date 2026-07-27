// בדיקות לעמלת הקמה, חוקי המסלולים וחישובי המדד

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  planSetupFee,
  applyFeeToLoan,
  applyIndexChanges,
  indexFactor,
  nextIndex,
  spitzerLoan,
  equalPrincipalLoan,
  round2,
} from "../src/lib/finance.ts";
import {
  TRACKS,
  trackSetupFee,
  maxBalloonPct,
  extraLeaseBalloonPct,
  checkDeal,
} from "../src/lib/tracks.ts";

const close = (a: number, b: number, eps = 0.01, m?: string) =>
  assert.ok(Math.abs(a - b) <= eps, m ?? `expected ${a} ≈ ${b} (±${eps})`);

// ─── עמלת הקמה ─────────────────────────────────────────────────

test("עמלת הקמה — 1% מסכום המימון + 350 ₪ (Drive / Fix / Express)", () => {
  close(trackSetupFee("drive", 120000), 1550, 1e-9); // 1200 + 350
  close(trackSetupFee("fix", 200000), 2350, 1e-9);
  close(trackSetupFee("express", 80000), 1150, 1e-9);
  // ללא סכום מימון אין עמלה
  close(trackSetupFee("drive", 0), 0, 1e-9);
});

test("עמלת הקמה — Extra Lease קבועה 890 ₪ ואינה תלויה בסכום", () => {
  close(trackSetupFee("extra", 120000), 890, 1e-9);
  close(trackSetupFee("extra", 500000), 890, 1e-9);
});

test("עמלה חד-פעמית — נוספת במלואה לתשלום הראשון בלבד", () => {
  const plan = planSetupFee(1550, "upfront", 0, 60);
  assert.equal(plan.months, 0);
  close(plan.firstAddition, 1550, 1e-9);
  close(plan.monthly, 0, 1e-9);

  const loan = spitzerLoan(120000, 8.9, 60, 0, 0);
  const applied = applyFeeToLoan(loan, plan);
  close(applied.firstPayment, loan.monthly + 1550, 0.001);
  close(applied.paymentAfterFee, loan.monthly, 0.001);
});

test("עמלה בפריסה — תוספת חודשית = עמלה/מספר תשלומים, אגורות בתשלום האחרון", () => {
  // 1,550 / 12 = 129.1666… → 129.17 לחודש, והאחרון סוגר את ההפרש
  const plan = planSetupFee(1550, "spread", 12, 60);
  assert.equal(plan.months, 12);
  close(plan.monthly, 129.17, 1e-9);
  close(plan.lastMonthly, round2(1550 - 129.17 * 11), 1e-9);
  // סך כל תשלומי העמלה שווה בדיוק לעמלה
  close(plan.monthly * 11 + plan.lastMonthly, 1550, 1e-9);

  const loan = spitzerLoan(120000, 8.9, 60, 0, 0);
  const applied = applyFeeToLoan(loan, plan);
  close(applied.paymentDuringFee, loan.monthly + 129.17, 0.001);
  close(applied.paymentAfterFee, loan.monthly, 0.001);
  assert.ok(applied.paymentDuringFee > applied.paymentAfterFee);
});

test("עמלה בפריסה לכל התקופה — נפרסת על מספר חודשי המימון", () => {
  const plan = planSetupFee(890, "full-term", 0, 36);
  assert.equal(plan.months, 36);
  close(plan.monthly, round2(890 / 36), 1e-9);
  close(plan.monthly * 35 + plan.lastMonthly, 890, 1e-9);
});

test("עמלה בפריסה — לא ניתן לפרוס ליותר חודשים מתקופת המימון", () => {
  const plan = planSetupFee(1550, "spread", 120, 48);
  assert.equal(plan.months, 48);
});

test("עמלת הקמה בקרן שווה — מחוברת לתשלום הראשון היורד", () => {
  const loan = equalPrincipalLoan(120000, 6, 60, 0, 0);
  const plan = planSetupFee(1550, "upfront", 0, 60);
  const applied = applyFeeToLoan(loan, plan);
  // התשלום הראשון בקרן שווה: 2,600 + עמלה
  close(applied.firstPayment, 2600 + 1550, 1e-9);
  close(applied.paymentAfterFee, 2600, 1e-9);
});

// ─── חוקי מסלולים ──────────────────────────────────────────────

test("Drive — מקדמה בטווח רגיל, בסמכות BDM ומחוץ לטווח", () => {
  const base = { months: 36, balloonPct: 0, hasInputs: true };
  assert.equal(checkDeal("drive", { ...base, downPct: 20 }).level, "ok");
  assert.equal(checkDeal("drive", { ...base, downPct: 15 }).level, "ok");
  assert.equal(checkDeal("drive", { ...base, downPct: 50 }).level, "ok");

  const bdmLow = checkDeal("drive", { ...base, downPct: 12 });
  assert.equal(bdmLow.level, "bdm");
  assert.equal(bdmLow.messages[0].text, "בתחום סמכות BDM.");

  const bdmHigh = checkDeal("drive", { ...base, downPct: 55 });
  assert.equal(bdmHigh.level, "bdm");

  const out = checkDeal("drive", { ...base, downPct: 5 });
  assert.equal(out.level, "out");
  assert.ok(out.messages[0].text.startsWith("חריגה מטווח המסלול"));
  assert.equal(checkDeal("drive", { ...base, downPct: 65 }).level, "out");
});

test("Drive — בלון מרבי: 45% ב-36 חוד׳, 40% ב-48 חוד׳", () => {
  assert.equal(maxBalloonPct("drive", 36), 45);
  assert.equal(maxBalloonPct("drive", 48), 40);
  const ok36 = checkDeal("drive", { downPct: 20, months: 36, balloonPct: 45, hasInputs: true });
  assert.equal(ok36.level, "ok");
  const bad36 = checkDeal("drive", { downPct: 20, months: 36, balloonPct: 50, hasInputs: true });
  assert.equal(bad36.level, "out");
  const bad48 = checkDeal("drive", { downPct: 20, months: 48, balloonPct: 45, hasInputs: true });
  assert.equal(bad48.level, "out");
});

test("Drive — תקופה מחוץ ל-12–48 חודשים היא חריגה", () => {
  assert.equal(checkDeal("drive", { downPct: 20, months: 60, balloonPct: 0, hasInputs: true }).level, "out");
  assert.equal(checkDeal("drive", { downPct: 20, months: 48, balloonPct: 0, hasInputs: true }).level, "ok");
});

test("Extra Lease — מקדמה 7%–30%, תקופות 36/42 בלבד, בלון לפי קילומטראז׳", () => {
  assert.equal(TRACKS.extra.star, true);
  assert.equal(checkDeal("extra", { downPct: 7, months: 36, balloonPct: 50, hasInputs: true }).level, "ok");
  assert.equal(checkDeal("extra", { downPct: 30, months: 42, balloonPct: 40, hasInputs: true }).level, "ok");
  assert.equal(checkDeal("extra", { downPct: 5, months: 36, balloonPct: 0, hasInputs: true }).level, "out");
  // 48 חודשים אינו מותר במסלול
  assert.equal(checkDeal("extra", { downPct: 10, months: 48, balloonPct: 0, hasInputs: true }).level, "out");
  assert.equal(extraLeaseBalloonPct("20k"), 50);
  assert.equal(extraLeaseBalloonPct("25k"), 40);
});

test("Fix ו-Express — מסלולים ללא בלון; בלון כלשהו הוא חריגה", () => {
  assert.equal(TRACKS.fix.hasBalloon, false);
  assert.equal(TRACKS.express.hasBalloon, false);
  assert.equal(checkDeal("fix", { downPct: 20, months: 60, balloonPct: 10, hasInputs: true }).level, "out");
  assert.equal(checkDeal("fix", { downPct: 20, months: 60, balloonPct: 0, hasInputs: true }).level, "ok");
  // Fix מוגדר בשיטת שפיצר בלבד
  assert.deepEqual(TRACKS.fix.allowedProducts, ["fixed", "cpi"]);
  // Express: התקופה המרבית לפי הרשימה היא 36 חודשים
  assert.equal(checkDeal("express", { downPct: 20, months: 36, balloonPct: 0, hasInputs: true }).level, "ok");
  assert.equal(checkDeal("express", { downPct: 20, months: 48, balloonPct: 0, hasInputs: true }).level, "out");
});

test("בקרה אינה פועלת לפני שהוזנו נתונים", () => {
  assert.equal(checkDeal("drive", { downPct: 0, months: 0, balloonPct: 0, hasInputs: false }).level, "ok");
});

// ─── חישובי מדד ────────────────────────────────────────────────

test("מדד — מקדם הצמדה לפי ערך מדד חדש, והחזר מעודכן", () => {
  // מדד בסיס 100, מדד חדש 102 → מקדם 1.02
  close(indexFactor(100, 102), 1.02, 1e-12);
  const r = applyIndexChanges(100, 2000, [{ kind: "value", value: 102 }]);
  assert.equal(r.ok, true);
  close(r.factor, 1.02, 1e-12);
  close(r.newPayment, 2040, 1e-9);
  close(r.diff, 40, 1e-9);
  close(r.cumulativePct, 2, 1e-9);
  assert.equal(r.direction, "up");
});

test("מדד — שינוי באחוזים (עלייה וירידה)", () => {
  const up = applyIndexChanges(100, 2000, [{ kind: "percent", value: 1.5 }]);
  close(up.finalIndex, 101.5, 1e-9);
  close(up.newPayment, 2030, 1e-9);
  assert.equal(up.direction, "up");

  const down = applyIndexChanges(100, 2000, [{ kind: "percent", value: -0.7 }]);
  close(down.finalIndex, 99.3, 1e-9);
  close(down.newPayment, 1986, 1e-9);
  close(down.diff, -14, 1e-9);
  assert.equal(down.direction, "down");
});

test("מדד — שינוי בנקודות מוסיף לערך המדד ואינו מתערבב עם אחוזים", () => {
  const r = applyIndexChanges(100.5, 2000, [{ kind: "points", value: 0.5 }]);
  close(r.finalIndex, 101, 1e-9);
  close(r.factor, 101 / 100.5, 1e-12);
  close(r.newPayment, 2000 * (101 / 100.5), 1e-9);
  // נקודות ≠ אחוזים: אותו ערך מספרי נותן תוצאה שונה
  const pct = applyIndexChanges(100.5, 2000, [{ kind: "percent", value: 0.5 }]);
  assert.notEqual(round2(r.newPayment), round2(pct.newPayment));
  assert.equal(nextIndex(100.5, { kind: "points", value: 0.5 }), 101);
});

test("מדד — שינויים מצטברים לאורך חודשים", () => {
  // ירידה 0.7%, עלייה 0.5%, עלייה 0.2%
  const r = applyIndexChanges(100, 2000, [
    { kind: "percent", value: -0.7 },
    { kind: "percent", value: 0.5 },
    { kind: "percent", value: 0.2 },
  ]);
  assert.equal(r.ok, true);
  assert.equal(r.steps.length, 3);
  const expected = 100 * 0.993 * 1.005 * 1.002;
  close(r.finalIndex, expected, 1e-9);
  close(r.newPayment, 2000 * (expected / 100), 1e-9);

  // שלב 1: ירידה מול הבסיס
  close(r.steps[0].newIndex, 99.3, 1e-9);
  close(r.steps[0].diffFromBase, -14, 1e-9);
  close(r.steps[0].diffFromPrev, -14, 1e-9);
  // שלב 2: עלייה מול השלב הקודם, אך עדיין מתחת לבסיס
  assert.ok(r.steps[1].diffFromPrev > 0);
  assert.ok(r.steps[1].diffFromBase < 0);
  // שלב 3: עלייה נוספת — ועדיין מעט מתחת לבסיס, כי שינויי מדד
  // מוכפלים זה בזה: ירידה של 0.7% אינה מתקזזת ב-0.5%+0.2%
  assert.ok(r.steps[2].diffFromPrev > 0);
  assert.ok(r.steps[2].diffFromBase < 0);
  close(r.steps[2].newIndex, 99.9961, 0.0001);
  // עקביות: ההפרש המצטבר שווה לסכום ההפרשים החודשיים
  const sumPrev = r.steps.reduce((s, x) => s + x.diffFromPrev, 0);
  close(sumPrev, r.diff, 1e-9);
});

test("מדד — רצפת מדד בסיס פועלת רק כשמופעלת במפורש", () => {
  const changes = [{ kind: "percent" as const, value: -2 }];
  const noFloor = applyIndexChanges(100, 2000, changes);
  close(noFloor.newPayment, 1960, 1e-9);
  assert.equal(noFloor.steps[0].floored, false);

  const withFloor = applyIndexChanges(100, 2000, changes, { floorAtBase: true });
  close(withFloor.newPayment, 2000, 1e-9);
  assert.equal(withFloor.steps[0].floored, true);
  assert.equal(withFloor.direction, "same");
  // מסלול המדד עצמו נשמר אמיתי גם כשהרצפה פעילה
  close(withFloor.finalIndex, 98, 1e-9);
});

test("מדד — הרצפה אינה מאפסת את מסלול המדד לעליות הבאות", () => {
  // ירידה של 2% ואז עלייה של 1%: המדד האמיתי הוא 98 → 98.98,
  // עדיין מתחת לבסיס — ולכן ההחזר נשאר על הרצפה ואינו עולה מעליה
  const r = applyIndexChanges(
    100,
    2000,
    [
      { kind: "percent", value: -2 },
      { kind: "percent", value: 1 },
    ],
    { floorAtBase: true }
  );
  close(r.finalIndex, 98.98, 1e-9);
  close(r.newPayment, 2000, 1e-9);
  assert.equal(r.steps[1].floored, true);

  // כשהמדד חוזר מעל הבסיס — ההצמדה מחושבת מהמדד האמיתי
  const back = applyIndexChanges(
    100,
    2000,
    [
      { kind: "percent", value: -2 },
      { kind: "percent", value: 5 },
    ],
    { floorAtBase: true }
  );
  close(back.finalIndex, 102.9, 1e-9);
  close(back.newPayment, 2058, 1e-9);
  assert.equal(back.steps[1].floored, false);
});

test("מדד — עדכון יתרת קרן וסכום בלון באותו מקדם", () => {
  const r = applyIndexChanges(100, 2000, [{ kind: "value", value: 105 }], {
    principal: 80000,
    balloon: 40000,
  });
  close(r.newPrincipal!, 84000, 1e-9);
  close(r.newBalloon!, 42000, 1e-9);
});

test("מדד — ולידציה: מדד בסיס אפס, החזר אפס, ללא שינויים", () => {
  assert.equal(applyIndexChanges(0, 2000, [{ kind: "percent", value: 1 }]).ok, false);
  assert.equal(applyIndexChanges(100, 0, [{ kind: "percent", value: 1 }]).ok, false);
  assert.equal(applyIndexChanges(100, 2000, []).ok, false);
});
