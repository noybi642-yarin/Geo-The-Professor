// ─── תוכנית התמריצים ───────────────────────────────────────────
// כל הסכומים, המדרגות ותנאי הסף יושבים בקובץ הזה בלבד. עדכון
// התוכנית = שינוי הקבועים כאן; אין סכום כספי מפוזר ברכיבי התצוגה
// ואין כפילות בין עמוד הידע למחשבון — שניהם קוראים מכאן.
//
// הקובץ הוא לוגיקה טהורה: אין בו React, אין רשת ואין אחסון.

/** רוחב המדרגה, בנקודות אחוז. משמש גם לסוכן וגם למנהל. */
export const TIER_STEP_PTS = 2;

/**
 * סבילות להשוואות גבול.
 *
 * הפער מחושב כחיסור של שני מספרים עשרוניים, ולכן 45 − 43 עלול
 * לצאת 2.0000000000000036 ו-45.2 − 43.2 עלול לצאת 1.9999999999999998.
 * בלי סבילות, ביצוע שהוא בדיוק על הגבול היה נופל למדרגה שמתחתיו
 * בגלל ייצוג בינארי בלבד. זו אינה עיגול של הפער — הפער עצמו נשמר
 * במלוא הדיוק ומוצג כפי שהוא.
 */
const EPS = 1e-9;

/** a ≥ b, עם סבילות לשגיאת ייצוג */
const gte = (a: number, b: number) => a >= b - EPS;

// ─── תמריץ סוכן ────────────────────────────────────────────────

export type AgentTierId = "base" | "onTarget" | "above";

export interface AgentTier {
  id: AgentTierId;
  label: string;
  /** תיאור טווח הביצוע, להצגה בטבלת הידע */
  range: string;
  /** ₪ לעסקת מימון רגיל */
  regular: number;
  /** ₪ לעסקת Extra Lease */
  extra: number;
}

export const AGENT_TIERS: Record<AgentTierId, AgentTier> = {
  base: {
    id: "base",
    label: "מתחת ליעד",
    range: "כל ביצוע הנמוך מהיעד",
    regular: 125,
    extra: 175,
  },
  onTarget: {
    id: "onTarget",
    label: "עמידה ביעד",
    range: "מהיעד ועד פחות מ-2 נקודות אחוז מעליו",
    regular: 175,
    extra: 225,
  },
  above: {
    id: "above",
    label: "2 נק׳ ומעלה מעל היעד",
    range: "2 נקודות אחוז ומעלה מעל היעד",
    regular: 250,
    extra: 300,
  },
};

export const AGENT_TIER_ORDER: AgentTierId[] = ["base", "onTarget", "above"];

/** תוספת לסוכן על כל עסקה שעמדה ביעד משתנה */
export const AGENT_VARIABLE_BONUS = 100;

/** שמות יעדים משתנים נפוצים — הצעות בלבד, אפשר גם שם חופשי */
export const COMMON_VARIABLE_GOALS = ["גלגול", "דגם ספציפי", "רכב מיקוד", "אחר"];

/**
 * המדרגה לפי הפער בנקודות אחוז.
 * פער שלילי → בסיס; 0 עד מתחת ל-2 → עמידה ביעד; 2 ומעלה → הגבוהה.
 * אין רף תחתון: כל עוד לא הושג היעד, המדרגה היא הבסיס.
 */
export function agentTierFor(gapPts: number): AgentTier {
  if (gte(gapPts, TIER_STEP_PTS)) return AGENT_TIERS.above;
  if (gte(gapPts, 0)) return AGENT_TIERS.onTarget;
  return AGENT_TIERS.base;
}

// ─── תמריץ מנהל אולם ───────────────────────────────────────────

export type ManagerGroupId = "hyundai" | "mitsubishi";

export interface ManagerGroup {
  id: ManagerGroupId;
  label: string;
  /** מספר עסקאות המימון המינימלי לזכאות */
  minDeals: number;
}

export const MANAGER_GROUPS: Record<ManagerGroupId, ManagerGroup> = {
  hyundai: { id: "hyundai", label: "יונדאי / O&J", minDeals: 5 },
  mitsubishi: { id: "mitsubishi", label: "מיצובישי / אורה", minDeals: 3 },
};

export const MANAGER_GROUP_ORDER: ManagerGroupId[] = ["hyundai", "mitsubishi"];

export type ManagerTierId = "none" | "below" | "onTarget" | "above";

export interface ManagerTier {
  id: ManagerTierId;
  label: string;
  range: string;
  amount: number;
}

export const MANAGER_TIERS: Record<ManagerTierId, ManagerTier> = {
  none: {
    id: "none",
    label: "מתחת לטווח התמריץ",
    range: "יותר מ-2 נקודות אחוז מתחת ליעד",
    amount: 0,
  },
  below: {
    id: "below",
    label: "עד 2 נק׳ מתחת ליעד",
    range: "מ-2 נקודות אחוז מתחת ליעד ועד פחות מהיעד",
    amount: 400,
  },
  onTarget: {
    id: "onTarget",
    label: "עמידה ביעד",
    range: "מהיעד ועד פחות מ-2 נקודות אחוז מעליו",
    amount: 1000,
  },
  above: {
    id: "above",
    label: "2 נק׳ ומעלה מעל היעד",
    range: "2 נקודות אחוז ומעלה מעל היעד",
    amount: 2000,
  },
};

/** סדר התצוגה בטבלת הידע — מהמדרגה הנמוכה לגבוהה */
export const MANAGER_TIER_ORDER: ManagerTierId[] = ["below", "onTarget", "above"];

/** בונוס למנהל בהגעה ליעד משתנה */
export const MANAGER_VARIABLE_BONUS = 500;

/** המדרגה לפי הפער בנקודות אחוז */
export function managerTierFor(gapPts: number): ManagerTier {
  if (gte(gapPts, TIER_STEP_PTS)) return MANAGER_TIERS.above;
  if (gte(gapPts, 0)) return MANAGER_TIERS.onTarget;
  if (gte(gapPts, -TIER_STEP_PTS)) return MANAGER_TIERS.below;
  return MANAGER_TIERS.none;
}

// ─── קלט ופלט ──────────────────────────────────────────────────

/** null = השדה טרם הוזן. אין ברירת מחדל ליעד ולביצוע. */
export interface AgentVariableGoal {
  id: string;
  name: string;
  /** מספר העסקאות שעמדו ביעד הזה */
  deals: number;
}

export interface AgentInput {
  target: number | null;
  actual: number | null;
  regularDeals: number;
  extraDeals: number;
  variableGoals: AgentVariableGoal[];
}

export interface VariableLineResult extends AgentVariableGoal {
  amount: number;
  /** שורה עם שגיאה אינה נכללת בסכום */
  error?: string;
}

export interface AgentResult {
  /** האם היה אפשר לקבוע מדרגה */
  ok: boolean;
  /** מה חסר, כשלא ניתן לחשב */
  message?: string;
  /** מוחזרים כדי שהתצוגה לא תצטרך לקרוא שוב את הקלט */
  target: number | null;
  actual: number | null;
  gapPts: number | null;
  tier: AgentTier | null;
  regularDeals: number;
  extraDeals: number;
  regularAmount: number;
  extraAmount: number;
  variableLines: VariableLineResult[];
  variableTotal: number;
  total: number;
  /** פירוט מילולי של החישוב, שורה לשורה */
  explanation: string[];
}

export interface ManagerInput {
  group: ManagerGroupId;
  target: number | null;
  actual: number | null;
  deals: number;
  variableGoalReached: boolean;
  variableGoalName?: string;
}

export interface ManagerResult {
  ok: boolean;
  message?: string;
  group: ManagerGroup;
  target: number | null;
  actual: number | null;
  gapPts: number | null;
  tier: ManagerTier | null;
  minDeals: number;
  deals: number;
  meetsMin: boolean;
  /** כמה עסקאות חסרות למינימום */
  dealsShort: number;
  /** התמריץ הרגיל בפועל — 0 כשלא הושג המינימום */
  baseAmount: number;
  /** בונוס משתנה ודאי */
  variableBonus: number;
  /** סך ודאי */
  certainTotal: number;
  /** בונוס שזכאותו טעונה בדיקה */
  pendingBonus: number;
  /** הסכום אם הזכאות תאושר */
  potentialTotal: number;
  needsReview: boolean;
  explanation: string[];
}

// ─── עזרי ניסוח ────────────────────────────────────────────────

const nf = new Intl.NumberFormat("he-IL", { maximumFractionDigits: 0 });
const pf = new Intl.NumberFormat("he-IL", { maximumFractionDigits: 2 });

/** סכום כספי — מפריד אלפים, בלי אגורות */
export const fmtIls = (v: number) => `${nf.format(Math.round(v))} ₪`;

/** אחוז — ספרות עשרוניות רק אם באמת יש */
export const fmtPts = (v: number) => pf.format(v);

/** ״2.3 נקודות אחוז״ / ״נקודת אחוז אחת״ */
export function ptsWord(abs: number): string {
  return Math.abs(abs - 1) < EPS ? "נקודת אחוז אחת" : `${fmtPts(abs)} נקודות אחוז`;
}

/** ״עסקה אחת״ / ״3 עסקאות״ */
export function dealsWord(n: number): string {
  return n === 1 ? "עסקה אחת" : `${nf.format(n)} עסקאות`;
}

/** ״חסרה עסקה אחת״ / ״חסרות 3 עסקאות״ — התאמת מין ומספר */
export function missingDealsWord(n: number): string {
  return n === 1 ? "חסרה עסקה אחת" : `חסרות ${nf.format(n)} עסקאות`;
}

/** מתאר את מיקום הביצוע מול היעד */
function gapSentence(gapPts: number): string {
  if (Math.abs(gapPts) < EPS) return "הביצוע שווה ליעד";
  return gapPts > 0
    ? `הביצוע גבוה מהיעד ב-${ptsWord(gapPts)}`
    : `הביצוע נמוך מהיעד ב-${ptsWord(-gapPts)}`;
}

export const MISSING_INPUT_MESSAGE =
  "יש להזין את יעד המימון ואת הביצוע בפועל כדי לחשב את מדרגת התמריץ.";

// ─── חישוב תמריץ הסוכן ─────────────────────────────────────────

/**
 * מספר העסקאות בשורת יעד משתנה אינו יכול לעלות על סך העסקאות
 * שהוזנו. אותה עסקה כן יכולה להופיע בכמה שורות — התוספות מצטברות —
 * ולכן הבדיקה היא מול הסך ולא מול סכום השורות.
 */
export function calcAgentIncentive(input: AgentInput): AgentResult {
  const regularDeals = Math.max(0, Math.floor(input.regularDeals || 0));
  const extraDeals = Math.max(0, Math.floor(input.extraDeals || 0));
  const totalDeals = regularDeals + extraDeals;

  const variableLines: VariableLineResult[] = input.variableGoals.map((g) => {
    const deals = Math.max(0, Math.floor(g.deals || 0));
    if (deals > totalDeals) {
      return {
        ...g,
        deals,
        amount: 0,
        error: `מספר העסקאות בשורה (${nf.format(deals)}) גבוה מסך העסקאות שהוזנו (${nf.format(totalDeals)}).`,
      };
    }
    return { ...g, deals, amount: deals * AGENT_VARIABLE_BONUS };
  });
  const variableTotal = variableLines.reduce((s, l) => s + l.amount, 0);

  const missing = input.target === null || input.actual === null;
  if (missing) {
    return {
      ok: false,
      message: MISSING_INPUT_MESSAGE,
      target: input.target,
      actual: input.actual,
      gapPts: null,
      tier: null,
      regularDeals,
      extraDeals,
      regularAmount: 0,
      extraAmount: 0,
      variableLines,
      variableTotal,
      total: 0,
      explanation: [],
    };
  }

  const gapPts = input.actual! - input.target!;
  const tier = agentTierFor(gapPts);
  const regularAmount = regularDeals * tier.regular;
  const extraAmount = extraDeals * tier.extra;
  const total = regularAmount + extraAmount + variableTotal;

  const explanation: string[] = [
    `יעד המימון: ${fmtPts(input.target!)}%`,
    `ביצוע בפועל: ${fmtPts(input.actual!)}%`,
    `${gapSentence(gapPts)} ולכן חלה מדרגת ${tier.label}.`,
  ];
  if (regularDeals > 0)
    explanation.push(
      `${dealsWord(regularDeals)} מימון רגיל × ${fmtIls(tier.regular)} = ${fmtIls(regularAmount)}`
    );
  if (extraDeals > 0)
    explanation.push(
      `${dealsWord(extraDeals)} Extra Lease × ${fmtIls(tier.extra)} = ${fmtIls(extraAmount)}`
    );
  for (const l of variableLines) {
    if (l.error || l.deals === 0) continue;
    explanation.push(
      `${l.name || "יעד משתנה"}: ${dealsWord(l.deals)} × ${fmtIls(AGENT_VARIABLE_BONUS)} = ${fmtIls(l.amount)}`
    );
  }
  explanation.push(`סך התמריץ הצפוי: ${fmtIls(total)}`);

  return {
    ok: true,
    target: input.target,
    actual: input.actual,
    gapPts,
    tier,
    regularDeals,
    extraDeals,
    regularAmount,
    extraAmount,
    variableLines,
    variableTotal,
    total,
    explanation,
  };
}

// ─── חישוב תמריץ המנהל ─────────────────────────────────────────

/**
 * התמריץ למנהל הוא סכום כולל ואינו מוכפל במספר העסקאות.
 *
 * כשלא הושג מינימום העסקאות אך כן הושג יעד משתנה, הבונוס אינו
 * נכנס לסכום הוודאי: לא ידוע בוודאות אם הוא מגיע במצב הזה, ולכן
 * הוא מוצג בנפרד כסכום שזכאותו טעונה בדיקה.
 */
export function calcManagerIncentive(input: ManagerInput): ManagerResult {
  const group = MANAGER_GROUPS[input.group] ?? MANAGER_GROUPS.hyundai;
  const deals = Math.max(0, Math.floor(input.deals || 0));
  const minDeals = group.minDeals;
  const meetsMin = deals >= minDeals;
  const dealsShort = Math.max(0, minDeals - deals);

  const base = {
    group,
    target: input.target,
    actual: input.actual,
    minDeals,
    deals,
    meetsMin,
    dealsShort,
  };

  if (input.target === null || input.actual === null) {
    return {
      ...base,
      ok: false,
      message: MISSING_INPUT_MESSAGE,
      gapPts: null,
      tier: null,
      baseAmount: 0,
      variableBonus: 0,
      certainTotal: 0,
      pendingBonus: 0,
      potentialTotal: 0,
      needsReview: false,
      explanation: [],
    };
  }

  const gapPts = input.actual - input.target;
  const tier = managerTierFor(gapPts);

  const baseAmount = meetsMin ? tier.amount : 0;
  const variableBonus = meetsMin && input.variableGoalReached ? MANAGER_VARIABLE_BONUS : 0;
  const certainTotal = baseAmount + variableBonus;
  const pendingBonus = !meetsMin && input.variableGoalReached ? MANAGER_VARIABLE_BONUS : 0;
  const potentialTotal = certainTotal + pendingBonus;

  const goalName = input.variableGoalName?.trim();
  const explanation: string[] = [
    `קבוצת מותגים: ${group.label}`,
    `יעד המימון: ${fmtPts(input.target)}%`,
    `ביצוע בפועל: ${fmtPts(input.actual)}%`,
    tier.id === "none"
      ? `${gapSentence(gapPts)} — יותר מ-${TIER_STEP_PTS} נקודות אחוז מתחת ליעד, ולכן אין תמריץ רגיל.`
      : `${gapSentence(gapPts)} ולכן מדרגת התמריץ היא ${fmtIls(tier.amount)}.`,
  ];

  if (meetsMin) {
    explanation.push(`הושג מינימום של ${dealsWord(minDeals)} מימון.`);
  } else {
    explanation.push(
      `לא הושג מינימום העסקאות הנדרש: הוזנו ${dealsWord(deals)} מתוך ${dealsWord(minDeals)} — ${missingDealsWord(dealsShort)}.`
    );
  }

  if (variableBonus > 0) {
    explanation.push(
      `בונוס יעד משתנה${goalName ? ` (${goalName})` : ""}: ${fmtIls(variableBonus)}`
    );
  }
  if (pendingBonus > 0) {
    explanation.push(
      `בונוס משתנה אפשרי${goalName ? ` (${goalName})` : ""}: ${fmtIls(pendingBonus)} — הזכאות טעונה בדיקה.`
    );
  }

  explanation.push(`סך התמריץ הוודאי: ${fmtIls(certainTotal)}`);
  if (pendingBonus > 0) {
    explanation.push(`סכום אפשרי לאחר אישור הזכאות: ${fmtIls(potentialTotal)}`);
  }

  return {
    ...base,
    ok: true,
    gapPts,
    tier,
    baseAmount,
    variableBonus,
    certainTotal,
    pendingBonus,
    potentialTotal,
    needsReview: pendingBonus > 0,
    explanation,
  };
}

export const PENDING_BONUS_NOTE =
  "הזכאות לבונוס המשתנה ללא עמידה במינימום העסקאות דורשת בדיקה.";

export const INCENTIVE_FOOTNOTE =
  "החישוב מבוסס על נתוני התמריצים שהוזנו במרכז הידע. במקרה של שינוי בתוכנית התמריצים, יש לפעול לפי הנוהל המעודכן של החברה.";
