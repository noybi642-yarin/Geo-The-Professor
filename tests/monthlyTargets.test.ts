// בדיקות למסך יעדי החודש.
// כוללות את דוגמאות האיפיון, את כל מצבי הקצה, ובדיקה גורפת
// שאף מסלול אינו מחזיר NaN או Infinity.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BDM_NAME,
  PACE_TOLERANCE_PTS,
  calcMonthlyTarget,
  fmtExact,
  fmtFriendly,
  fmtPct1,
  headlineFor,
  paceEmojiFor,
  paceLabelFor,
  paceTextFor,
  subMessageFor,
  workDaysWord,
  type MonthlyTargetInput,
} from "../src/lib/monthlyTargets.ts";

/** קלט עם ברירות מחדל נוחות לבדיקה */
const inp = (o: Partial<MonthlyTargetInput> = {}): MonthlyTargetInput => ({
  monthlyTarget: 20_024_900,
  currentAmount: 4_500_000,
  totalWorkingDays: 22,
  workingDaysPassed: 7,
  ...o,
});

const run = (o: Partial<MonthlyTargetInput> = {}) => calcMonthlyTarget(inp(o));

// ═══ דוגמת האיפיון ═══════════════════════════════════════════

test("דוגמת האיפיון — כל הנגזרות", () => {
  const r = run();
  assert.equal(r.state, "running");
  assert.ok(Math.abs(r.actualPct! - 22.47) < 0.01, "22.5% מהיעד");
  assert.equal(r.remainingAmount, 15_524_900);
  assert.equal(r.remainingDays, 15);
  assert.ok(Math.abs(r.perDay! - 1_034_993.33) < 0.5);
  assert.ok(Math.abs(r.expectedPct! - 31.82) < 0.01);
  assert.ok(Math.abs(r.pacePts! - -9.35) < 0.02);
  assert.equal(r.pace, "behind");
});

test("דוגמת האיפיון — התצוגה", () => {
  const r = run();
  assert.equal(fmtPct1(r.actualPct), "22.5%");
  assert.equal(fmtExact(r.remainingAmount), "15,524,900 ₪");
  assert.equal(fmtFriendly(r.remainingAmount), "15.5 מיליון ₪");
  assert.equal(fmtFriendly(r.perDay!), "1.03 מיליון ₪");
  assert.equal(fmtExact(r.perDay!), "1,034,993 ₪");
  assert.equal(headlineFor(r), "נוי, נשארו עוד 15.5 מיליון ₪ ליעד\u00A0🎯");
  assert.equal(
    subMessageFor(r),
    "נשארו לך 15 ימי עבודה. כדי להגיע ליעד, צריך להשיג בממוצע 1.03 מיליון ₪ ביום."
  );
  assert.equal(paceLabelFor(r), "🔴 9.3% מתחת לקצב הנדרש");
});

// ═══ אחוז מהיעד ══════════════════════════════════════════════

test("אחוז מהיעד — חצי הדרך", () => {
  const r = run({ monthlyTarget: 1_000_000, currentAmount: 500_000 });
  assert.equal(r.actualPct, 50);
  assert.equal(fmtPct1(r.actualPct), "50.0%");
});

test("אחוז מהיעד — יכול לעלות על 100", () => {
  const r = run({ monthlyTarget: 1_000_000, currentAmount: 1_250_000 });
  assert.equal(r.actualPct, 125);
});

// ═══ סכום שנותר ══════════════════════════════════════════════

test("סכום שנותר — לעולם אינו שלילי", () => {
  const r = run({ monthlyTarget: 1_000_000, currentAmount: 1_800_000 });
  assert.equal(r.remainingAmount, 0, "עברנו את היעד — נותר 0 ולא מספר שלילי");
  assert.equal(r.surplus, 800_000);
});

// ═══ ימי עבודה ═══════════════════════════════════════════════

test("ימי עבודה שנותרו — חיסור פשוט", () => {
  assert.equal(run({ totalWorkingDays: 22, workingDaysPassed: 7 }).remainingDays, 15);
});

test("ימי עבודה — ימים שעברו גדולים מהסך נחתכים", () => {
  const r = run({ totalWorkingDays: 22, workingDaysPassed: 30 });
  assert.equal(r.workingDaysPassed, 22, "נחתך לסך ימי החודש");
  assert.equal(r.remainingDays, 0, "ולא מספר שלילי");
  assert.equal(r.expectedPct, 100);
});

test("ימי עבודה — שברים נחתכים לימים שלמים", () => {
  const r = run({ totalWorkingDays: 22.9, workingDaysPassed: 7.8 });
  assert.equal(r.totalWorkingDays, 22);
  assert.equal(r.workingDaysPassed, 7);
});

// ═══ הסכום הנדרש ליום ════════════════════════════════════════

test("נדרש ליום — חלוקת היתרה בימים שנותרו", () => {
  const r = run({ monthlyTarget: 1_000_000, currentAmount: 0, totalWorkingDays: 10, workingDaysPassed: 0 });
  assert.equal(r.perDay, 100_000);
  assert.equal(fmtFriendly(r.perDay!), "100 אלף ₪");
});

test("נדרש ליום — אין חישוב כשהיעד הושג", () => {
  const r = run({ monthlyTarget: 1_000_000, currentAmount: 1_000_000 });
  assert.equal(r.perDay, null, "אין מה להשלים");
});

test("נדרש ליום — אין חישוב כשלא נותרו ימים", () => {
  const r = run({ totalWorkingDays: 22, workingDaysPassed: 22 });
  assert.equal(r.perDay, null, "חלוקה באפס הייתה נותנת Infinity");
  assert.equal(r.state, "monthOver");
});

test("היום האחרון בחודש — כל היתרה נדרשת ביום אחד", () => {
  const r = run({
    monthlyTarget: 1_000_000,
    currentAmount: 600_000,
    totalWorkingDays: 22,
    workingDaysPassed: 21,
  });
  assert.equal(r.remainingDays, 1);
  assert.equal(r.perDay, 400_000);
  assert.equal(r.state, "running");
  assert.equal(
    subMessageFor(r),
    "נשאר לך יום עבודה אחד. כדי להגיע ליעד, צריך להשיג בממוצע 400 אלף ₪ ביום."
  );
});

// ═══ קצב ═════════════════════════════════════════════════════

test("קצב — מתחת לקצב", () => {
  const r = run({ monthlyTarget: 1_000_000, currentAmount: 200_000, totalWorkingDays: 20, workingDaysPassed: 10 });
  assert.equal(r.expectedPct, 50);
  assert.equal(r.actualPct, 20);
  assert.equal(r.pacePts, -30);
  assert.equal(r.pace, "behind");
  assert.equal(paceLabelFor(r), "🔴 30.0% מתחת לקצב הנדרש");
});

test("קצב — מעל הקצב", () => {
  const r = run({ monthlyTarget: 1_000_000, currentAmount: 700_000, totalWorkingDays: 20, workingDaysPassed: 10 });
  assert.equal(r.pacePts, 20);
  assert.equal(r.pace, "ahead");
  assert.equal(paceLabelFor(r), "🟢 20.0% מעל הקצב הנדרש");
});

test("קצב — בדיוק על הקצב", () => {
  const r = run({ monthlyTarget: 1_000_000, currentAmount: 500_000, totalWorkingDays: 20, workingDaysPassed: 10 });
  assert.equal(r.pacePts, 0);
  assert.equal(r.pace, "onPace");
  assert.equal(paceLabelFor(r), "🟡 את בקצב הנדרש");
});

test("קצב — סטייה קטנה מהסבילות נחשבת עמידה בקצב", () => {
  const r = run({ monthlyTarget: 1_000_000, currentAmount: 495_000, totalWorkingDays: 20, workingDaysPassed: 10 });
  assert.ok(Math.abs(r.pacePts!) < PACE_TOLERANCE_PTS);
  assert.equal(r.pace, "onPace");
});

test("קצב — אין נתונים כשאין יעד או אין ימים", () => {
  assert.equal(run({ monthlyTarget: 0 }).pace, "unknown");
  assert.equal(run({ totalWorkingDays: 0 }).pace, "unknown");
  assert.equal(paceLabelFor(run({ monthlyTarget: 0 })), "אין מספיק נתונים לחישוב הקצב");
});

// ═══ מצבי החודש וההודעות ═════════════════════════════════════

test("מצב — היעד הושג בדיוק", () => {
  const r = run({ monthlyTarget: 1_000_000, currentAmount: 1_000_000 });
  assert.equal(r.state, "reached");
  assert.equal(headlineFor(r), "נוי, הגעת ליעד החודשי!\u00A0🎉");
});

test("מצב — היעד נעבר", () => {
  const r = run({ monthlyTarget: 1_000_000, currentAmount: 1_420_000 });
  assert.equal(r.state, "exceeded");
  assert.equal(headlineFor(r), "נוי, עברת את היעד ב־420 אלף ₪!\u00A0🚀");
});

test("מצב — החודש הסתיים בלי שהיעד הושג", () => {
  const r = run({
    monthlyTarget: 1_000_000,
    currentAmount: 750_000,
    totalWorkingDays: 22,
    workingDaysPassed: 22,
  });
  assert.equal(r.state, "monthOver");
  assert.equal(headlineFor(r), "נוי, החודש הסתיים – נותרו 250,000 ₪ מהיעד");
  assert.equal(subMessageFor(r), "לא נותרו ימי עבודה החודש, ולכן אין קצב יומי לחישוב.");
});

test("מצב — אין יעד", () => {
  const r = run({ monthlyTarget: 0 });
  assert.equal(r.state, "noTarget");
  assert.equal(r.actualPct, null);
  assert.equal(headlineFor(r), "נוי, הזיני יעד חודשי כדי לראות את ההתקדמות");
  assert.equal(subMessageFor(r), "");
});

test("מצב — היעד הושג ועדיין נותרו ימים", () => {
  const r = run({
    monthlyTarget: 1_000_000,
    currentAmount: 1_000_000,
    totalWorkingDays: 22,
    workingDaysPassed: 10,
  });
  assert.equal(
    subMessageFor(r),
    "נשארו לך 12 ימי עבודה החודש — כל סכום נוסף הוא מעבר ליעד."
  );
});

test("ההודעה נושאת את השם נוי", () => {
  assert.equal(BDM_NAME, "נוי");
  for (const o of [{}, { monthlyTarget: 0 }, { currentAmount: 99_000_000 }]) {
    assert.ok(headlineFor(run(o)).startsWith("נוי,"));
  }
});

// ═══ קלט לא תקין ═════════════════════════════════════════════

test("קלט — ערכים שליליים מתאפסים", () => {
  const r = calcMonthlyTarget({
    monthlyTarget: -5_000,
    currentAmount: -100,
    totalWorkingDays: -3,
    workingDaysPassed: -9,
  });
  assert.equal(r.monthlyTarget, 0);
  assert.equal(r.currentAmount, 0);
  assert.equal(r.totalWorkingDays, 0);
  assert.equal(r.workingDaysPassed, 0);
  assert.equal(r.state, "noTarget");
});

test("קלט — NaN ואינסוף מתאפסים", () => {
  const r = calcMonthlyTarget({
    monthlyTarget: NaN,
    currentAmount: Infinity,
    totalWorkingDays: -Infinity,
    workingDaysPassed: NaN,
  });
  assert.equal(r.monthlyTarget, 0);
  assert.equal(r.currentAmount, 0);
  assert.equal(r.remainingAmount, 0);
  assert.equal(r.perDay, null);
});

test("קלט — הכול ריק", () => {
  const r = calcMonthlyTarget({
    monthlyTarget: 0,
    currentAmount: 0,
    totalWorkingDays: 0,
    workingDaysPassed: 0,
  });
  assert.equal(r.state, "noTarget");
  assert.equal(r.remainingDays, 0);
  assert.equal(r.perDay, null);
  assert.equal(r.actualPct, null);
  assert.equal(r.expectedPct, null);
});

// ═══ שמורה: אין NaN, Infinity או ערך שלילי בשום מסלול ════════

test("שמורה — אף צירוף קלט אינו מייצר NaN, Infinity או ערך שלילי", () => {
  const amounts = [0, -1, 1, 750_000, 1_000_000, 20_024_900, 1e12, NaN, Infinity];
  const days = [0, -1, 1, 7, 22, 31, 1000, NaN, Infinity];

  for (const monthlyTarget of amounts) {
    for (const currentAmount of amounts) {
      for (const totalWorkingDays of days) {
        for (const workingDaysPassed of days) {
          const r = calcMonthlyTarget({
            monthlyTarget,
            currentAmount,
            totalWorkingDays,
            workingDaysPassed,
          });
          const where = `${monthlyTarget}/${currentAmount}/${totalWorkingDays}/${workingDaysPassed}`;

          for (const [k, v] of Object.entries(r)) {
            if (typeof v !== "number") continue;
            assert.ok(Number.isFinite(v), `${k} סופי · ${where}`);
          }

          assert.ok(r.remainingAmount >= 0, `יתרה אי-שלילית · ${where}`);
          assert.ok(r.surplus >= 0, `עודף אי-שלילי · ${where}`);
          assert.ok(r.remainingDays >= 0, `ימים אי-שליליים · ${where}`);
          assert.ok(r.workingDaysPassed <= r.totalWorkingDays, `ימים שעברו ≤ סך · ${where}`);
          if (r.perDay !== null) {
            assert.ok(Number.isFinite(r.perDay) && r.perDay >= 0, `קצב יומי · ${where}`);
          }
          if (r.actualPct !== null) assert.ok(Number.isFinite(r.actualPct), `אחוז · ${where}`);

          // הטקסטים לעולם אינם נושאים ערך שבור
          for (const s of [headlineFor(r), subMessageFor(r), paceLabelFor(r)]) {
            assert.ok(!/NaN|Infinity|undefined|null/.test(s), `טקסט נקי · ${where} · ${s}`);
          }
        }
      }
    }
  }
});

// ═══ עיצוב מספרים ════════════════════════════════════════════

test("הסימון מופרד מהטקסט, כדי שהתצוגה תמקם אותו בעצמה", () => {
  const behind = run({ monthlyTarget: 1_000_000, currentAmount: 200_000, totalWorkingDays: 20, workingDaysPassed: 10 });
  assert.equal(paceEmojiFor(behind), "🔴");
  assert.equal(paceTextFor(behind), "30.0% מתחת לקצב הנדרש");
  assert.ok(!paceTextFor(behind).match(/[\u{1F300}-\u{1FAFF}]/u), "הטקסט נקי מאמוג׳י");

  const ahead = run({ monthlyTarget: 1_000_000, currentAmount: 700_000, totalWorkingDays: 20, workingDaysPassed: 10 });
  assert.equal(paceEmojiFor(ahead), "🟢");
  assert.equal(paceEmojiFor(run({ monthlyTarget: 1_000_000, currentAmount: 500_000, totalWorkingDays: 20, workingDaysPassed: 10 })), "🟡");
  assert.equal(paceEmojiFor(run({ monthlyTarget: 0 })), "", "בלי נתונים אין סימון");
  assert.equal(paceLabelFor(run({ monthlyTarget: 0 })), paceTextFor(run({ monthlyTarget: 0 })));
});

test("האמוג׳י צמוד למילה שלפניו ברווח קשיח, כדי שלא ייפול לשורה משלו", () => {
  for (const o of [{}, { currentAmount: 20_024_900 }, { currentAmount: 25_000_000 }]) {
    const h = headlineFor(run(o));
    const m = h.match(/[\u{1F300}-\u{1FAFF}]/u);
    if (m) assert.equal(h[m.index! - 1], "\u00A0", `רווח קשיח לפני האמוג׳י · ${h}`);
  }
});

test("עיצוב — סכום קריא בכל סדר גודל", () => {
  assert.equal(fmtFriendly(0), "0 ₪");
  assert.equal(fmtFriendly(640), "640 ₪");
  assert.equal(fmtFriendly(850_000), "850 אלף ₪");
  assert.equal(fmtFriendly(12_345), "12.3 אלף ₪");
  assert.equal(fmtFriendly(1_034_993), "1.03 מיליון ₪");
  assert.equal(fmtFriendly(15_524_900), "15.5 מיליון ₪");
  assert.equal(fmtFriendly(-5), "—");
  assert.equal(fmtFriendly(NaN), "—");
});

test("עיצוב — ״אלף״ מתחיל במיליון אחד בדיוק", () => {
  assert.equal(fmtFriendly(999_999), "1,000 אלף ₪");
  assert.equal(fmtFriendly(1_000_000), "1 מיליון ₪");
});

test("עיצוב — אחוז בספרה עשרונית אחת", () => {
  assert.equal(fmtPct1(22.47), "22.5%");
  assert.equal(fmtPct1(100), "100.0%");
  assert.equal(fmtPct1(0), "0.0%");
  assert.equal(fmtPct1(null), "—");
});

test("עיצוב — סכום מדויק בלי אגורות", () => {
  assert.equal(fmtExact(15_524_900), "15,524,900 ₪");
  assert.equal(fmtExact(1_034_993.33), "1,034,993 ₪");
  assert.equal(fmtExact(0), "0 ₪");
});

test("עיצוב — התאמת מין ומספר בימי עבודה", () => {
  assert.equal(workDaysWord(1), "יום עבודה אחד");
  assert.equal(workDaysWord(15), "15 ימי עבודה");
  assert.equal(workDaysWord(0), "0 ימי עבודה");
});
