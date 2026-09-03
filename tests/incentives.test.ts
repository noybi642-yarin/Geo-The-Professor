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
  deals: 0,
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

test("בדיקה 5 — מנהל יונדאי/O&J מעל היעד עם יעד משתנה: 2,500 ₪", () => {
  const r = calcManagerIncentive(
    manager({ group: "hyundai", target: 43, actual: 45, deals: 5, variableGoalReached: true })
  );
  assert.equal(r.tier!.id, "above");
  assert.equal(r.baseAmount, 2000);
  assert.equal(r.variableBonus, 500);
  assert.equal(r.certainTotal, 2500);
  assert.equal(r.pendingBonus, 0);
  assert.equal(r.needsReview, false);
});

test("בדיקה 6 — מנהל מיצובישי/אורה מתחת ליעד: 400 ₪", () => {
  const r = calcManagerIncentive(
    manager({ group: "mitsubishi", target: 43, actual: 42, deals: 3 })
  );
  assert.equal(r.tier!.id, "below");
  assert.equal(r.meetsMin, true, "3 עסקאות הן המינימום במיצובישי");
  assert.equal(r.certainTotal, 400);
});

test("בדיקה 7 — אי-עמידה במינימום העסקאות", () => {
  const r = calcManagerIncentive(
    manager({ group: "hyundai", target: 43, actual: 45, deals: 4 })
  );
  assert.equal(r.tier!.id, "above", "המדרגה נקבעת גם כשאין זכאות");
  assert.equal(r.meetsMin, false);
  assert.equal(r.dealsShort, 1, "חסרה עסקה אחת");
  assert.equal(r.baseAmount, 0);
  assert.equal(r.certainTotal, 0);
  assert.ok(
    r.explanation.some((l) => l.includes("חסרה עסקה אחת")),
    "הניסוח חייב להתאים במין ובמספר"
  );
});

test("בדיקה 8 — יעד משתנה ללא מינימום עסקאות", () => {
  const r = calcManagerIncentive(
    manager({ group: "hyundai", target: 43, actual: 45, deals: 4, variableGoalReached: true })
  );
  assert.equal(r.certainTotal, 0, "התמריץ הוודאי אפס");
  assert.equal(r.variableBonus, 0, "הבונוס אינו נכנס לוודאי");
  assert.equal(r.pendingBonus, 500);
  assert.equal(r.potentialTotal, 500);
  assert.equal(r.needsReview, true);
});

test("בדיקה 9 — ביצוע נמוך ביותר מ-2 נק׳ מהיעד: 0 ₪", () => {
  const r = calcManagerIncentive(
    manager({ group: "mitsubishi", target: 43, actual: 40.9, deals: 5 })
  );
  assert.equal(r.tier!.id, "none");
  assert.equal(r.certainTotal, 0);
});

test("בדיקה 10 — שדה יעד ריק: אין חישוב ואין הנחת 43%", () => {
  const a = calcAgentIncentive(agent({ target: null, actual: 44, regularDeals: 8 }));
  assert.equal(a.ok, false);
  assert.equal(a.tier, null);
  assert.equal(a.gapPts, null);
  assert.equal(a.total, 0);
  assert.match(a.message!, /יש להזין את יעד המימון/);

  const m = calcManagerIncentive(manager({ target: null, actual: 45, deals: 9 }));
  assert.equal(m.ok, false);
  assert.equal(m.tier, null);
  assert.equal(m.certainTotal, 0);
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

test("קלט — מנהל עם אפס עסקאות אינו זכאי", () => {
  const r = calcManagerIncentive(manager({ target: 43, actual: 45, deals: 0 }));
  assert.equal(r.meetsMin, false);
  assert.equal(r.dealsShort, 5);
  assert.equal(r.certainTotal, 0);
});

test("קלט — ערכים עשרוניים ביעד ובביצוע נתמכים", () => {
  const r = calcManagerIncentive(
    manager({ group: "hyundai", target: 42, actual: 44.3, deals: 6, variableGoalReached: true })
  );
  assert.ok(Math.abs(r.gapPts! - 2.3) < 1e-9);
  assert.equal(r.tier!.id, "above");
  assert.equal(r.certainTotal, 2500);
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
