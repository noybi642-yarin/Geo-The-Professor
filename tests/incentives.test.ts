// בדיקות לתוכנית התמריצים.
// כוללות את עשר בדיקות החובה שבאיפיון, ואת מקרי הקצה סביב הגבולות.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AGENT_TIERS,
  AGENT_VARIABLE_BONUS,
  MANAGER_GROUPS,
  MANAGER_TIERS,
  MANAGER_VARIABLE_BONUS,
  TIER_STEP_PTS,
  agentTierFor,
  calcAgentIncentive,
  calcManagerIncentive,
  managerDealTierFor,
  managerTierFor,
  type AgentInput,
  type ManagerInput,
} from "../src/lib/incentives.ts";

/** קלט סוכן עם ברירות מחדל נוחות לבדיקה */
const agent = (o: Partial<AgentInput>): AgentInput => ({
  target: null,
  actual: null,
  regularDeals: 0,
  extraDeals: 0,
  variableGoals: [],
  ...o,
});

const manager = (o: Partial<ManagerInput>): ManagerInput => ({
  group: "hyundai",
  target: null,
  actual: null,
  regularDeals: 0,
  extraDeals: 0,
  variableGoalReached: false,
  ...o,
});

const goal = (name: string, deals: number) => ({ id: name, name, deals });

// ═══ בדיקות החובה שבאיפיון ═══════════════════════════════════

test("בדיקה 1 — סוכן מתחת ליעד: 850 ₪", () => {
  const r = calcAgentIncentive(
    agent({ target: 43, actual: 38, regularDeals: 4, extraDeals: 2 })
  );
  assert.equal(r.ok, true);
  assert.equal(r.tier!.id, "base");
  assert.equal(r.regularAmount, 4 * 125);
  assert.equal(r.extraAmount, 2 * 175);
  assert.equal(r.total, 850);
});

test("בדיקה 2 — סוכן בעמידה ביעד: 2,275 ₪", () => {
  const r = calcAgentIncentive(
    agent({
      target: 43,
      actual: 44,
      regularDeals: 8,
      extraDeals: 3,
      variableGoals: [goal("גלגול", 2)],
    })
  );
  assert.equal(r.tier!.id, "onTarget");
  assert.equal(r.regularAmount, 8 * 175);
  assert.equal(r.extraAmount, 3 * 225);
  assert.equal(r.variableTotal, 200);
  assert.equal(r.total, 2275);
});

test("בדיקה 3 — סוכן 2 נק׳ מעל היעד: 3,400 ₪", () => {
  const r = calcAgentIncentive(
    agent({
      target: 42,
      actual: 44,
      regularDeals: 10,
      extraDeals: 2,
      variableGoals: [goal("רכב מיקוד", 3)],
    })
  );
  assert.equal(r.tier!.id, "above");
  assert.equal(r.regularAmount, 10 * 250);
  assert.equal(r.extraAmount, 2 * 300);
  assert.equal(r.variableTotal, 300);
  assert.equal(r.total, 3400);
});

test("בדיקה 4 — הצטברות יעדים משתנים: 500 ₪ תוספות", () => {
  // אותה עסקה יכולה להופיע בשתי השורות — התוספות מצטברות
  const r = calcAgentIncentive(
    agent({
      target: 43,
      actual: 43,
      regularDeals: 5,
      extraDeals: 0,
      variableGoals: [goal("גלגול", 3), goal("רכב מיקוד", 2)],
    })
  );
  assert.equal(r.variableTotal, 500);
  assert.deepEqual(r.variableLines.map((l) => l.amount), [300, 200]);
  assert.ok(r.variableLines.every((l) => !l.error));
});

test("מנהל — מעל היעד, מינימום הושג, עם יעד משתנה", () => {
  // 2,000 תמריץ מנהל + 5×250 עסקאות + 500 בונוס
  const r = calcManagerIncentive(
    manager({
      group: "hyundai",
      target: 43,
      actual: 45,
      regularDeals: 5,
      variableGoalReached: true,
    })
  );
  assert.equal(r.tier!.id, "above");
  assert.equal(r.managerAmount, 2000);
  assert.equal(r.regularAmount, 1250);
  assert.equal(r.variableBonus, 500);
  assert.equal(r.total, 3750);
});

test("מנהל — מיצובישי/אורה מתחת ליעד, מינימום הושג", () => {
  // 400 תמריץ מנהל + 3×125 (מתחת ליעד → תעריף בסיס)
  const r = calcManagerIncentive(
    manager({ group: "mitsubishi", target: 43, actual: 42, regularDeals: 3 })
  );
  assert.equal(r.tier!.id, "below");
  assert.equal(r.meetsMin, true, "3 עסקאות הן המינימום במיצובישי");
  assert.equal(r.managerAmount, 400);
  assert.equal(r.regularRate, 125, "מתחת ליעד — תעריף הבסיס גם כשהמינימום הושג");
  assert.equal(r.total, 775);
});

test("מנהל — אי-עמידה במינימום אינה מאפסת את תמריץ המנהל", () => {
  // זה היה הבאג: הסכום כולו אופס. עכשיו רק התעריף לעסקה נשאר בסיסי.
  const r = calcManagerIncentive(
    manager({ group: "hyundai", target: 43, actual: 45, regularDeals: 4 })
  );
  assert.equal(r.meetsMin, false);
  assert.equal(r.dealsShort, 1);
  assert.equal(r.managerAmount, 2000, "תמריץ המנהל נשאר על כנו");
  assert.equal(r.regularRate, 125, "התעריף לעסקה נשאר בסיסי");
  assert.equal(r.total, 2500);
  assert.ok(
    r.explanation.some((l) => l.includes("תמריץ המנהל אינו מתאפס")),
    "ההסבר חייב לומר במפורש שהתמריץ אינו מתאפס"
  );
});

test("מנהל — ביצוע נמוך ביותר מ-2 נק׳: תמריץ המנהל 0, אך העסקאות משולמות", () => {
  const r = calcManagerIncentive(
    manager({ group: "mitsubishi", target: 43, actual: 40.9, regularDeals: 5 })
  );
  assert.equal(r.tier!.id, "none");
  assert.equal(r.managerAmount, 0);
  assert.equal(r.regularAmount, 5 * 125, "תמריץ העסקאות אינו תלוי במדרגת המנהל");
  assert.equal(r.total, 625);
});

test("בדיקה 10 — שדה יעד ריק: אין חישוב ואין הנחת 43%", () => {
  const a = calcAgentIncentive(agent({ target: null, actual: 44, regularDeals: 8 }));
  assert.equal(a.ok, false);
  assert.equal(a.tier, null);
  assert.equal(a.gapPts, null);
  assert.equal(a.total, 0);
  assert.match(a.message!, /יש להזין את יעד המימון/);

  const m = calcManagerIncentive(manager({ target: null, actual: 45, regularDeals: 9 }));
  assert.equal(m.ok, false);
  assert.equal(m.tier, null);
  assert.equal(m.total, 0);
});

// ═══ גבולות המדרגות ══════════════════════════════════════════

test("גבול סוכן — ביצוע שווה ליעד נכנס לעמידה ביעד", () => {
  assert.equal(agentTierFor(0).id, "onTarget");
  const r = calcAgentIncentive(agent({ target: 43, actual: 43, regularDeals: 1 }));
  assert.equal(r.total, 175);
});

test("גבול סוכן — בדיוק 2 נק׳ מעל היעד נכנס למדרגה הגבוהה", () => {
  assert.equal(agentTierFor(TIER_STEP_PTS).id, "above");
  // גם כשהחיסור העשרוני אינו יוצא 2 בדיוק
  assert.equal(agentTierFor(45.2 - 43.2).id, "above");
  assert.equal(agentTierFor(45 - 43).id, "above");
});

test("גבול סוכן — מעט מתחת ל-2 נק׳ נשאר בעמידה ביעד", () => {
  assert.equal(agentTierFor(1.99).id, "onTarget");
  assert.equal(agentTierFor(-0.01).id, "base");
});

test("גבול מנהל — בדיוק 2 נק׳ מתחת ליעד מזכה ב-400 ₪", () => {
  assert.equal(managerTierFor(-TIER_STEP_PTS).id, "below");
  assert.equal(managerTierFor(41 - 43).id, "below");
  // מתחת לכך — אין תמריץ
  assert.equal(managerTierFor(-2.01).id, "none");
});

test("גבול מנהל — כל ארבע המדרגות לפי היעד 43%", () => {
  const at = (actual: number) => managerTierFor(actual - 43).amount;
  assert.equal(at(40.9), 0);
  assert.equal(at(41), 400);
  assert.equal(at(42.9), 400);
  assert.equal(at(43), 1000);
  assert.equal(at(44.9), 1000);
  assert.equal(at(45), 2000);
});

test("הפער אינו מעוגל לפני קביעת המדרגה", () => {
  // 1.6 היה מתעגל ל-2 ומזכה במדרגה הגבוהה — אסור
  const r = calcAgentIncentive(agent({ target: 42.4, actual: 44, regularDeals: 1 }));
  assert.equal(r.tier!.id, "onTarget");
  assert.ok(Math.abs(r.gapPts! - 1.6) < 1e-9);
});

// ═══ יעדים משתנים ════════════════════════════════════════════

test("יעד משתנה — סוכן ללא יעדים משתנים", () => {
  const r = calcAgentIncentive(agent({ target: 43, actual: 44, regularDeals: 4 }));
  assert.equal(r.variableTotal, 0);
  assert.deepEqual(r.variableLines, []);
  assert.equal(r.total, 700);
});

test("יעד משתנה — שורה שחורגת מסך העסקאות נפסלת ואינה נכללת", () => {
  const r = calcAgentIncentive(
    agent({
      target: 43,
      actual: 44,
      regularDeals: 3,
      extraDeals: 1, // סך 4
      variableGoals: [goal("גלגול", 2), goal("רכב מיקוד", 9)],
    })
  );
  assert.equal(r.variableLines[0].error, undefined);
  assert.ok(r.variableLines[1].error, "שורה עם 9 עסקאות מתוך 4 חייבת להיפסל");
  assert.equal(r.variableTotal, 200, "רק השורה התקינה נספרת");
  assert.equal(r.total, 3 * 175 + 1 * 225 + 200);
});

test("יעד משתנה — שורה השווה בדיוק לסך העסקאות תקינה", () => {
  const r = calcAgentIncentive(
    agent({ target: 43, actual: 44, regularDeals: 2, extraDeals: 2, variableGoals: [goal("גלגול", 4)] })
  );
  assert.equal(r.variableLines[0].error, undefined);
  assert.equal(r.variableTotal, 400);
});

test("יעד משתנה — התוספת היא 100 ₪ לעסקה, מהמקור המרכזי", () => {
  const r = calcAgentIncentive(
    agent({ target: 43, actual: 43, regularDeals: 10, variableGoals: [goal("גלגול", 7)] })
  );
  assert.equal(r.variableTotal, 7 * AGENT_VARIABLE_BONUS);
});

// ═══ קלט לא תקין ═════════════════════════════════════════════

test("קלט — עסקאות שליליות מתאפסות ואינן גורעות", () => {
  const r = calcAgentIncentive(
    agent({ target: 43, actual: 44, regularDeals: -5, extraDeals: -2 })
  );
  assert.equal(r.regularDeals, 0);
  assert.equal(r.extraDeals, 0);
  assert.equal(r.total, 0);
});

test("קלט — אפס עסקאות נותן אפס ולא שגיאה", () => {
  const r = calcAgentIncentive(agent({ target: 43, actual: 50, regularDeals: 0, extraDeals: 0 }));
  assert.equal(r.ok, true);
  assert.equal(r.tier!.id, "above");
  assert.equal(r.total, 0);
});

test("קלט — ביצוע ריק ויעד קיים: עדיין אין חישוב", () => {
  const r = calcAgentIncentive(agent({ target: 43, actual: null, regularDeals: 8 }));
  assert.equal(r.ok, false);
  assert.equal(r.total, 0);
});

test("קלט — מנהל עם אפס עסקאות מקבל את תמריץ המנהל בלבד", () => {
  const r = calcManagerIncentive(manager({ target: 43, actual: 45, regularDeals: 0 }));
  assert.equal(r.meetsMin, false);
  assert.equal(r.dealsShort, 5);
  assert.equal(r.dealsAmount, 0);
  assert.equal(r.total, 2000, "רכיב הביצוע עומד בפני עצמו");
});

test("קלט — ערכים עשרוניים ביעד ובביצוע נתמכים", () => {
  const r = calcManagerIncentive(
    manager({
      group: "hyundai",
      target: 42,
      actual: 44.3,
      regularDeals: 6,
      variableGoalReached: true,
    })
  );
  assert.ok(Math.abs(r.gapPts! - 2.3) < 1e-9);
  assert.equal(r.tier!.id, "above");
  // 2,000 + 6×250 + 500
  assert.equal(r.total, 4000);
  assert.ok(r.explanation.some((l) => l.includes("2.3")));
});

// ═══ שלמות מקור הנתונים ══════════════════════════════════════

test("מקור הנתונים — הסכומים תואמים את תוכנית התמריצים", () => {
  assert.deepEqual(
    [AGENT_TIERS.base.regular, AGENT_TIERS.onTarget.regular, AGENT_TIERS.above.regular],
    [125, 175, 250]
  );
  assert.deepEqual(
    [AGENT_TIERS.base.extra, AGENT_TIERS.onTarget.extra, AGENT_TIERS.above.extra],
    [175, 225, 300]
  );
  assert.equal(AGENT_VARIABLE_BONUS, 100);
  assert.deepEqual(
    [MANAGER_TIERS.below.amount, MANAGER_TIERS.onTarget.amount, MANAGER_TIERS.above.amount],
    [400, 1000, 2000]
  );
  assert.equal(MANAGER_VARIABLE_BONUS, 500);
  assert.equal(MANAGER_GROUPS.hyundai.minDeals, 5);
  assert.equal(MANAGER_GROUPS.mitsubishi.minDeals, 3);
});

test("מקור הנתונים — Extra Lease משתלם יותר בכל מדרגה", () => {
  for (const t of Object.values(AGENT_TIERS)) {
    assert.ok(t.extra > t.regular, `${t.label}: Extra Lease אמור להיות גבוה יותר`);
  }
});

test("מקור הנתונים — המדרגות עולות ולא יורדות", () => {
  assert.ok(AGENT_TIERS.base.regular < AGENT_TIERS.onTarget.regular);
  assert.ok(AGENT_TIERS.onTarget.regular < AGENT_TIERS.above.regular);
  assert.ok(MANAGER_TIERS.below.amount < MANAGER_TIERS.onTarget.amount);
  assert.ok(MANAGER_TIERS.onTarget.amount < MANAGER_TIERS.above.amount);
});

// ═══ תמריץ מנהל: שני רכיבים מצטברים ══════════════════════════
// המינימום משפיע רק על התעריף לעסקה, ולא מאפס את תמריץ המנהל.

test("דוגמה מרכזית — 65.9% מול יעד 43%, 4 עסקאות: 2,500 ₪", () => {
  const r = calcManagerIncentive(
    manager({ group: "hyundai", target: 43, actual: 65.9, regularDeals: 4, extraDeals: 0 })
  );
  assert.ok(Math.abs(r.gapPts! - 22.9) < 1e-9, "פער של 22.9 נקודות אחוז");
  assert.equal(r.managerAmount, 2000, "תמריץ מנהל");
  assert.equal(r.meetsMin, false, "4 מתוך 5 — המינימום לא הושג");
  assert.equal(r.regularRate, 125, "ולכן התעריף נשאר בסיסי");
  assert.equal(r.dealsAmount, 500, "4 × 125");
  assert.equal(r.variableBonus, 0);
  assert.equal(r.total, 2500);
});

test("דוגמה מרכזית — אין רכיב נוסף שלא הוגדר", () => {
  // בפועל התקבל 2,650 ₪, אך מקור 150 ₪ הנוספים אינו ידוע ולכן
  // אינו חלק מהלוגיקה. הבדיקה מוודאת שלא נוסף רכיב מומצא.
  const r = calcManagerIncentive(
    manager({ group: "hyundai", target: 43, actual: 65.9, regularDeals: 4 })
  );
  assert.equal(r.managerAmount + r.dealsAmount + r.variableBonus, r.total);
  assert.notEqual(r.total, 2650);
});

test("בדיקה 1 — יונדאי/O&J, מינימום הושג ו-2 נק׳ מעל היעד: 3,250 ₪", () => {
  const r = calcManagerIncentive(
    manager({ group: "hyundai", target: 43, actual: 45, regularDeals: 5 })
  );
  assert.equal(r.managerAmount, 2000);
  assert.equal(r.meetsMin, true);
  assert.equal(r.regularRate, 250, "המינימום הושג — התעריף עולה עם המדרגה");
  assert.equal(r.dealsAmount, 1250);
  assert.equal(r.total, 3250);
});

test("בדיקה 2 — יונדאי/O&J, המינימום לא הושג ובעמידה ביעד: 1,500 ₪", () => {
  const r = calcManagerIncentive(
    manager({ group: "hyundai", target: 43, actual: 44, regularDeals: 4 })
  );
  assert.equal(r.managerAmount, 1000, "תמריץ המנהל לפי המדרגה, בלי קשר למינימום");
  assert.equal(r.meetsMin, false);
  assert.equal(r.regularRate, 125);
  assert.equal(r.dealsAmount, 500);
  assert.equal(r.total, 1500);
});

test("בדיקה 3 — מיצובישי/אורה, המינימום הושג ובעמידה ביעד: 1,575 ₪", () => {
  const r = calcManagerIncentive(
    manager({ group: "mitsubishi", target: 43, actual: 44, regularDeals: 2, extraDeals: 1 })
  );
  assert.equal(r.totalDeals, 3, "רגיל + Extra Lease יחד");
  assert.equal(r.meetsMin, true);
  assert.equal(r.managerAmount, 1000);
  assert.equal(r.regularAmount, 350, "2 × 175");
  assert.equal(r.extraAmount, 225, "1 × 225");
  assert.equal(r.total, 1575);
});

test("בדיקה 4 — מיצובישי/אורה, המינימום לא הושג: 2,300 ₪", () => {
  const r = calcManagerIncentive(
    manager({ group: "mitsubishi", target: 43, actual: 45, regularDeals: 1, extraDeals: 1 })
  );
  assert.equal(r.totalDeals, 2);
  assert.equal(r.meetsMin, false, "2 מתוך 3");
  assert.equal(r.managerAmount, 2000);
  assert.equal(r.regularAmount, 125);
  assert.equal(r.extraAmount, 175);
  assert.equal(r.total, 2300);
});

test("בדיקה 5 — הדוגמה המרכזית עם יעד משתנה: 3,000 ₪", () => {
  const r = calcManagerIncentive(
    manager({
      group: "hyundai",
      target: 43,
      actual: 65.9,
      regularDeals: 4,
      variableGoalReached: true,
    })
  );
  assert.equal(r.managerAmount, 2000);
  assert.equal(r.dealsAmount, 500);
  assert.equal(r.variableBonus, 500);
  assert.equal(r.total, 3000);
});

test("מנהל — הבונוס המשתנה אינו מותנה עוד במינימום העסקאות", () => {
  // שינוי מכוון מול הכלל הקודם, לפי בדיקה 5
  const withMin = calcManagerIncentive(
    manager({ target: 43, actual: 45, regularDeals: 5, variableGoalReached: true })
  );
  const withoutMin = calcManagerIncentive(
    manager({ target: 43, actual: 45, regularDeals: 4, variableGoalReached: true })
  );
  assert.equal(withMin.variableBonus, 500);
  assert.equal(withoutMin.variableBonus, 500, "הבונוס ניתן גם בלי מינימום");
});

test("מנהל — סך התמריץ הוא בדיוק סכום שלושת הרכיבים", () => {
  for (const actual of [40, 41.5, 43, 44.9, 45, 60]) {
    for (const regularDeals of [0, 1, 4, 5, 9]) {
      for (const variableGoalReached of [false, true]) {
        const r = calcManagerIncentive(
          manager({ target: 43, actual, regularDeals, extraDeals: 2, variableGoalReached })
        );
        assert.equal(
          r.total,
          r.managerAmount + r.regularAmount + r.extraAmount + r.variableBonus,
          `${actual}% · ${regularDeals} עסקאות`
        );
      }
    }
  }
});

test("מנהל — התעריף לעסקה זהה לטבלת הסוכן", () => {
  // התעריפים נקראים ממקור אחד; אם התוכנית תפריד ביניהם, זו הבדיקה שתיפול
  assert.equal(managerDealTierFor(0, true).regular, AGENT_TIERS.onTarget.regular);
  assert.equal(managerDealTierFor(3, true).extra, AGENT_TIERS.above.extra);
  assert.equal(managerDealTierFor(-5, true).regular, AGENT_TIERS.base.regular);
  // בלי מינימום — תמיד הבסיס, גם כשהביצוע מצוין
  assert.equal(managerDealTierFor(20, false).id, "base");
});
