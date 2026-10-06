// ─── יעדי החודש ────────────────────────────────────────────────
// מעקב אחר היעד הכספי החודשי: כמה הושג, כמה נותר, ומה הקצב
// היומי הנדרש כדי לסגור את הפער.
//
// הקובץ הוא לוגיקה טהורה: אין בו React, אין רשת ואין אחסון.
// כל מצבי הקצה נסגרים כאן, כדי שהתצוגה לעולם לא תקבל NaN,
// Infinity או מספר שלילי.

/** השם שבו פונה המסך למשתמשת */
export const BDM_NAME = "נוי";

/**
 * רוחב הטווח שנחשב ״בקצב״, בנקודות אחוז.
 *
 * בחודש של 22 ימי עבודה, יום אחד שווה כ-4.5 נקודות אחוז. סטייה
 * של פחות מנקודת אחוז אחת היא רעש ולא פיגור, ולכן היא מוצגת
 * כעמידה בקצב ולא כאזהרה.
 */
export const PACE_TOLERANCE_PTS = 1;

export type PaceState = "ahead" | "onPace" | "behind" | "unknown";

/**
 * מצב החודש. קובע את הניסוח ואת מה שמוצג:
 *   noTarget  — טרם הוזן יעד, אין מה לחשב
 *   exceeded  — הביצוע עבר את היעד
 *   reached   — הביצוע הגיע ליעד בדיוק
 *   monthOver — נגמרו ימי העבודה והיעד לא הושג
 *   running   — החודש בעיצומו
 */
export type MonthState = "noTarget" | "exceeded" | "reached" | "monthOver" | "running";

export interface MonthlyTargetInput {
  monthlyTarget: number;
  currentAmount: number;
  totalWorkingDays: number;
  workingDaysPassed: number;
}

export interface MonthlyTargetResult {
  state: MonthState;

  // ── הקלט לאחר ניקוי ── */
  monthlyTarget: number;
  currentAmount: number;
  totalWorkingDays: number;
  /** לעולם אינו גדול מסך ימי העבודה */
  workingDaysPassed: number;

  // ── נגזרות ──
  /** אחוז מהיעד. null כשאין יעד. יכול לעלות על 100. */
  actualPct: number | null;
  /** אחוז ההתקדמות שהיה מצופה לפי הימים שעברו. null כשאין ימים. */
  expectedPct: number | null;
  /** בפועל פחות מצופה, בנקודות אחוז. null כשאחד מהם חסר. */
  pacePts: number | null;
  pace: PaceState;
  /** לעולם אינו שלילי */
  remainingAmount: number;
  /** כמה מעל היעד. 0 כשלא עברנו אותו. */
  surplus: number;
  /** לעולם אינו שלילי */
  remainingDays: number;
  /** הסכום הנדרש לכל יום עבודה שנותר. null כשאין ימים או שהיעד הושג. */
  perDay: number | null;
}

// ─── עזרי ניסוח ────────────────────────────────────────────────

const intFmt = new Intl.NumberFormat("he-IL", { maximumFractionDigits: 0 });
const pctFmt = new Intl.NumberFormat("he-IL", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/**
 * שלוש ספרות משמעותיות. כך 15,524,900 הופך ל-15.5 מיליון
 * ו-1,034,993 הופך ל-1.03 מיליון — בשני המקרים רמת הדיוק
 * מתאימה לגודל המספר, בלי אפסים מיותרים ובלי דיוק מדומה.
 */
const sigFmt = new Intl.NumberFormat("he-IL", { maximumSignificantDigits: 3 });

/** סכום מדויק, בלי אגורות: ״15,524,900 ₪״ */
export const fmtExact = (v: number): string =>
  Number.isFinite(v) ? `${intFmt.format(Math.round(v))} ₪` : "—";

/** סכום קריא: ״15.5 מיליון ₪״ / ״850 אלף ₪״ / ״640 ₪״ */
export function fmtFriendly(v: number): string {
  if (!Number.isFinite(v) || v < 0) return "—";
  if (v >= 1e6) return `${sigFmt.format(v / 1e6)} מיליון ₪`;
  if (v >= 1e3) return `${sigFmt.format(v / 1e3)} אלף ₪`;
  return `${intFmt.format(Math.round(v))} ₪`;
}

/** אחוז בספרה עשרונית אחת: ״22.5%״ */
export const fmtPct1 = (v: number | null): string =>
  v === null || !Number.isFinite(v) ? "—" : `${pctFmt.format(v)}%`;

/** ״יום עבודה אחד״ / ״15 ימי עבודה״ */
export function workDaysWord(n: number): string {
  return n === 1 ? "יום עבודה אחד" : `${intFmt.format(n)} ימי עבודה`;
}

// ─── ניקוי קלט ─────────────────────────────────────────────────

/** כל ערך לא תקין, שלילי או אינסופי הופך ל-0 */
const clean = (v: number): number => (Number.isFinite(v) && v > 0 ? v : 0);

// ─── החישוב ────────────────────────────────────────────────────

export function calcMonthlyTarget(input: MonthlyTargetInput): MonthlyTargetResult {
  const monthlyTarget = clean(input.monthlyTarget);
  const currentAmount = clean(input.currentAmount);
  const totalWorkingDays = Math.floor(clean(input.totalWorkingDays));

  // ימי עבודה שעברו אינם יכולים לעלות על סך ימי החודש. חיתוך כאן
  // מונע ימים שנותרו שליליים בהמשך.
  const workingDaysPassed = Math.min(
    Math.floor(clean(input.workingDaysPassed)),
    totalWorkingDays
  );

  const hasTarget = monthlyTarget > 0;
  const remainingAmount = Math.max(0, monthlyTarget - currentAmount);
  const surplus = hasTarget ? Math.max(0, currentAmount - monthlyTarget) : 0;
  const remainingDays = Math.max(0, totalWorkingDays - workingDaysPassed);

  const actualPct = hasTarget ? (currentAmount / monthlyTarget) * 100 : null;
  const expectedPct =
    totalWorkingDays > 0 ? (workingDaysPassed / totalWorkingDays) * 100 : null;

  const pacePts =
    actualPct !== null && expectedPct !== null ? actualPct - expectedPct : null;

  const pace: PaceState =
    pacePts === null
      ? "unknown"
      : pacePts > PACE_TOLERANCE_PTS
        ? "ahead"
        : pacePts < -PACE_TOLERANCE_PTS
          ? "behind"
          : "onPace";

  const reached = hasTarget && currentAmount >= monthlyTarget;

  // אין קצב יומי כשאין מה להשלים או כשלא נותרו ימים — במקום
  // חלוקה באפס שתיתן Infinity.
  const perDay = !reached && remainingDays > 0 ? remainingAmount / remainingDays : null;

  const state: MonthState = !hasTarget
    ? "noTarget"
    : surplus > 0
      ? "exceeded"
      : reached
        ? "reached"
        : remainingDays === 0
          ? "monthOver"
          : "running";

  return {
    state,
    monthlyTarget,
    currentAmount,
    totalWorkingDays,
    workingDaysPassed,
    actualPct,
    expectedPct,
    pacePts,
    pace,
    remainingAmount,
    surplus,
    remainingDays,
    perDay,
  };
}

// ─── ההודעה האישית ─────────────────────────────────────────────

/**
 * רווח קשיח לפני האמוג׳י. בלעדיו האמוג׳י נשבר לשורה משלו
 * במסך צר, והמשפט נראה קטוע.
 */
const NB = " ";

/** המשפט הראשי, שמשתנה עם כל שינוי בקלט */
export function headlineFor(r: MonthlyTargetResult): string {
  switch (r.state) {
    case "noTarget":
      return `${BDM_NAME}, הזיני יעד חודשי כדי לראות את ההתקדמות`;
    case "exceeded":
      return `${BDM_NAME}, עברת את היעד ב־${fmtFriendly(r.surplus)}!${NB}🚀`;
    case "reached":
      return `${BDM_NAME}, הגעת ליעד החודשי!${NB}🎉`;
    case "monthOver":
      return `${BDM_NAME}, החודש הסתיים – נותרו ${fmtExact(r.remainingAmount)} מהיעד`;
    default:
      return `${BDM_NAME}, נשארו עוד ${fmtFriendly(r.remainingAmount)} ליעד${NB}🎯`;
  }
}

/** שורת ההסבר שמתחת למשפט הראשי */
export function subMessageFor(r: MonthlyTargetResult): string {
  if (r.state === "noTarget") return "";

  if (r.state === "monthOver")
    return "לא נותרו ימי עבודה החודש, ולכן אין קצב יומי לחישוב.";

  if (r.state === "reached" || r.state === "exceeded") {
    return r.remainingDays > 0
      ? `נשארו לך ${workDaysWord(r.remainingDays)} החודש — כל סכום נוסף הוא מעבר ליעד.`
      : "החודש הסתיים והיעד הושג.";
  }

  const days =
    r.remainingDays === 1
      ? "נשאר לך יום עבודה אחד."
      : `נשארו לך ${workDaysWord(r.remainingDays)}.`;

  return `${days} כדי להגיע ליעד, צריך להשיג בממוצע ${fmtFriendly(r.perDay ?? 0)} ביום.`;
}

/**
 * סימון המצב מול הקצב.
 *
 * האמוג׳י מופרד מהטקסט כדי שהתצוגה תוכל להציב אותו כאלמנט נפרד:
 * ב-RTL, אמוג׳י בתחילת מחרוזת הוא תו ניטרלי שמיקומו תלוי באלגוריתם
 * הדו-כיווניות, ואילו אלמנט נפרד בתוך flex יושב תמיד בצד הנכון.
 */
export function paceEmojiFor(r: MonthlyTargetResult): string {
  if (r.pace === "behind") return "🔴";
  if (r.pace === "ahead") return "🟢";
  if (r.pace === "onPace") return "🟡";
  return "";
}

/** תיאור המצב מול הקצב, בלי הסימון */
export function paceTextFor(r: MonthlyTargetResult): string {
  if (r.pace === "unknown" || r.pacePts === null) return "אין מספיק נתונים לחישוב הקצב";
  if (r.pace === "behind") return `${fmtPct1(-r.pacePts)} מתחת לקצב הנדרש`;
  if (r.pace === "ahead") return `${fmtPct1(r.pacePts)} מעל הקצב הנדרש`;
  return "את בקצב הנדרש";
}

/** הסימון והטקסט יחד — לשורת התוצאה ולהעתקה */
export function paceLabelFor(r: MonthlyTargetResult): string {
  const emoji = paceEmojiFor(r);
  return emoji ? `${emoji} ${paceTextFor(r)}` : paceTextFor(r);
}

export const MONTHLY_TARGET_NOTE =
  "הנתונים נשמרים במכשיר שלך בלבד ואינם נשלחים לשום מקום. היעד והביצוע מוזנים ידנית ואינם מתעדכנים ממערכת חיצונית.";
