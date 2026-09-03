// ─── מקור ידע: תמריצים לסוכנים ולמנהלי אולם ────────────────────
// כל הסכומים כאן נגזרים מ-src/lib/incentives.ts ואינם מוקלדים
// מחדש. עדכון התוכנית נעשה שם בלבד, והטבלאות בעמוד הזה — וגם
// המחשבון — משתנים איתו.

import {
  AGENT_TIERS,
  AGENT_TIER_ORDER,
  AGENT_VARIABLE_BONUS,
  COMMON_VARIABLE_GOALS,
  MANAGER_GROUPS,
  MANAGER_TIERS,
  MANAGER_TIER_ORDER,
  MANAGER_VARIABLE_BONUS,
  MIN_NOT_MET_NOTE,
  TIER_STEP_PTS,
  dealsWord,
  fmtIls,
  type ManagerGroupId,
} from "../incentives.ts";
import type { KnowledgeItem, KnowledgeSource } from "./types.ts";

/** דוגמת היעד המשמשת להמחשה בכל ההסברים */
const EX = 43;

const agentTiersTable = {
  head: ["מצב העמידה ביעד", "מימון רגיל", "Extra Lease"],
  rows: AGENT_TIER_ORDER.map((id) => {
    const t = AGENT_TIERS[id];
    return [t.range, `${fmtIls(t.regular)} לעסקה`, `${fmtIls(t.extra)} לעסקה`];
  }),
};

const managerTiersTable = () => ({
  head: ["מדרגת ביצוע", "תמריץ המנהל"],
  rows: [
    [MANAGER_TIERS.none.range, fmtIls(MANAGER_TIERS.none.amount)],
    ...MANAGER_TIER_ORDER.map((id) => {
      const t = MANAGER_TIERS[id];
      return [t.range, fmtIls(t.amount)];
    }),
  ],
});

/** התעריף לכל עסקת מימון — נקבע לפי המדרגה, אם הושג המינימום */
const managerDealRatesTable = {
  head: ["מדרגת ביצוע", "מימון רגיל", "Extra Lease"],
  rows: AGENT_TIER_ORDER.map((id) => {
    const t = AGENT_TIERS[id];
    return [t.range, `${fmtIls(t.regular)} לעסקה`, `${fmtIls(t.extra)} לעסקה`];
  }),
};

/** ההסבר המספרי של המדרגות, מול יעד לדוגמה */
const agentExample = [
  `ביצוע נמוך מ-${EX}%: מדרגת הבסיס`,
  `ביצוע מ-${EX}% ועד פחות מ-${EX + TIER_STEP_PTS}%: מדרגת עמידה ביעד`,
  `ביצוע של ${EX + TIER_STEP_PTS}% ומעלה: מדרגת ${TIER_STEP_PTS} נקודות אחוז מעל היעד`,
];

const managerExample = [
  `פחות מ-${EX - TIER_STEP_PTS}%: אין תמריץ רגיל`,
  `מ-${EX - TIER_STEP_PTS}% ועד פחות מ-${EX}%: ${fmtIls(MANAGER_TIERS.below.amount)}`,
  `מ-${EX}% ועד פחות מ-${EX + TIER_STEP_PTS}%: ${fmtIls(MANAGER_TIERS.onTarget.amount)}`,
  `${EX + TIER_STEP_PTS}% ומעלה: ${fmtIls(MANAGER_TIERS.above.amount)}`,
];

/** כללי המדרגות זהים לשתי קבוצות המותגים; רק המינימום שונה */
const managerRules = () => [
  `ביצוע הנמוך ביותר מ-${TIER_STEP_PTS} נקודות אחוז מתחת ליעד: ${fmtIls(MANAGER_TIERS.none.amount)}.`,
  `ביצוע החל מ-${TIER_STEP_PTS} נקודות אחוז מתחת ליעד ועד פחות מהיעד: ${fmtIls(MANAGER_TIERS.below.amount)}.`,
  `ביצוע מהיעד ועד פחות מ-${TIER_STEP_PTS} נקודות אחוז מעל היעד: ${fmtIls(MANAGER_TIERS.onTarget.amount)}.`,
  `ביצוע של ${TIER_STEP_PTS} נקודות אחוז ומעלה מעל היעד: ${fmtIls(MANAGER_TIERS.above.amount)}.`,
  "המדרגה נקבעת לפי הפער המדויק, לפני עיגול.",
];

/** כללי המינימום — ההשפעה היחידה שלו היא על התעריף לעסקה */
const minimumRules = (group: ManagerGroupId) => [
  `מינימום העסקאות בקבוצה זו: ${dealsWord(MANAGER_GROUPS[group].minDeals)} מימון.`,
  "סך העסקאות לבדיקת המינימום = מימון רגיל + Extra Lease.",
  "המינימום אינו תנאי לקבלת תמריץ המנהל שלפי הביצוע.",
  "הושג המינימום — התעריף לעסקה נקבע לפי מדרגת הביצוע.",
  `לא הושג המינימום — התעריף נשאר הבסיסי: ${fmtIls(AGENT_TIERS.base.regular)} למימון רגיל ו-${fmtIls(AGENT_TIERS.base.extra)} ל-Extra Lease.`,
];

const managerItem = (group: ManagerGroupId, id: string): KnowledgeItem => {
  const g = MANAGER_GROUPS[group];
  return {
    id,
    icon: "",
    title: `מנהל אולם — ${g.label}`,
    summary: [
      "תמריץ המנהל מורכב משני רכיבים מצטברים: תמריץ לפי הביצוע מול היעד, ותמריץ לכל עסקת מימון.",
      `תמריץ הביצוע הוא סכום כולל: ${fmtIls(MANAGER_TIERS.below.amount)} מתחת ליעד, ${fmtIls(MANAGER_TIERS.onTarget.amount)} בעמידה ביעד, ${fmtIls(MANAGER_TIERS.above.amount)} מ-${TIER_STEP_PTS} נקודות אחוז מעל היעד.`,
      `מינימום העסקאות בקבוצה זו הוא ${dealsWord(g.minDeals)}. הוא אינו מאפס את תמריץ המנהל — הוא קובע רק את התעריף לכל עסקה.`,
      `בונוס יעד משתנה: ${fmtIls(MANAGER_VARIABLE_BONUS)}.`,
    ],
    groups: [
      {
        title: "א׳ · תמריץ לפי הביצוע מול היעד",
        note: "סכום כולל, לא לעסקה",
        table: managerTiersTable(),
      },
      { title: "כללי המדרגות", items: managerRules() },
      {
        title: "ב׳ · מינימום עסקאות",
        note: dealsWord(g.minDeals),
        items: minimumRules(group),
        footnote: MIN_NOT_MET_NOTE,
      },
      {
        title: "ג׳ · תמריץ לכל עסקת מימון",
        note: "כשהמינימום הושג",
        table: managerDealRatesTable,
      },
      {
        title: "ד׳ · הסכום הכולל",
        items: [
          "תמריץ המנהל לפי מדרגת הביצוע",
          "+ תמריץ עסקאות מימון רגיל",
          "+ תמריץ עסקאות Extra Lease",
          "+ בונוס יעד משתנה, אם הושג",
        ],
      },
      {
        title: `דוגמה — יעד ${EX}%, ביצוע 65.9%, ${dealsWord(4)} מימון רגיל`,
        items: [
          `הפער מהיעד: 22.9 נקודות אחוז — תמריץ מנהל ${fmtIls(MANAGER_TIERS.above.amount)}.`,
          `המינימום הוא ${dealsWord(g.minDeals)} ובוצעו ${dealsWord(4)}, ולכן התעריף נשאר בסיסי: ${fmtIls(AGENT_TIERS.base.regular)}.`,
          `תמריץ עסקאות: 4 × ${fmtIls(AGENT_TIERS.base.regular)} = ${fmtIls(500)}.`,
          `סך התמריץ: ${fmtIls(MANAGER_TIERS.above.amount + 500)}.`,
        ],
      },
    ],
    keywords: [
      "מנהל אולם", "מנהל", g.label, group === "hyundai" ? "יונדאי" : "מיצובישי",
      group === "hyundai" ? "O&J" : "אורה",
      "מינימום עסקאות", `${g.minDeals} עסקאות`, "תעריף בסיסי",
      "400", "1000", "2000", "מדרגה", "תמריץ מנהל", "פר עסקה",
    ],
  };
};

const items: KnowledgeItem[] = [
  // ─── סוכן ───────────────────────────────────────────────
  {
    id: "agent",
    icon: "",
    title: "תמריץ סוכן",
    summary: [
      "התמריץ לסוכן מחושב עבור כל עסקת מימון, לפי סוג העסקה ולפי מדרגת העמידה ביעד.",
      `מדרגת הבסיס: ${fmtIls(AGENT_TIERS.base.regular)} למימון רגיל ו-${fmtIls(AGENT_TIERS.base.extra)} ל-Extra Lease. אין רף תחתון.`,
      `עמידה ביעד: ${fmtIls(AGENT_TIERS.onTarget.regular)} ו-${fmtIls(AGENT_TIERS.onTarget.extra)}. מ-${TIER_STEP_PTS} נקודות אחוז מעל היעד: ${fmtIls(AGENT_TIERS.above.regular)} ו-${fmtIls(AGENT_TIERS.above.extra)}.`,
      `תוספת של ${fmtIls(AGENT_VARIABLE_BONUS)} לכל עסקה שעמדה ביעד משתנה. התוספות מצטברות באותה עסקה.`,
    ],
    groups: [
      {
        title: "מדרגות התמריץ",
        note: "לכל עסקה",
        table: agentTiersTable,
      },
      {
        title: "כללי המדרגות",
        items: [
          "אם הביצוע בפועל נמוך מהיעד — הסוכן מקבל את תמריץ הבסיס.",
          `אין רף תחתון לתמריץ הבסיס: כל עוד לא הושג היעד, התמריץ הוא ${fmtIls(AGENT_TIERS.base.regular)} למימון רגיל ו-${fmtIls(AGENT_TIERS.base.extra)} ל-Extra Lease.`,
          `אם הביצוע שווה ליעד או גבוה ממנו, אך נמוך מ-${TIER_STEP_PTS} נקודות אחוז מעליו — מדרגת העמידה ביעד.`,
          `אם הביצוע גבוה מהיעד ב-${TIER_STEP_PTS} נקודות אחוז ומעלה — המדרגה הגבוהה.`,
          `יש להתייחס ל-${TIER_STEP_PTS}% כאל ${TIER_STEP_PTS} נקודות אחוז ולא כאל גידול יחסי.`,
        ],
      },
      {
        title: `דוגמה — יעד ${EX}%`,
        items: agentExample,
      },
      {
        title: "יעדים משתנים נפוצים",
        note: "אפשר גם שם חופשי",
        items: COMMON_VARIABLE_GOALS.filter((g) => g !== "אחר"),
      },
      {
        title: "תוספת בגין יעד משתנה",
        note: `${fmtIls(AGENT_VARIABLE_BONUS)} לעסקה`,
        items: [
          `הסוכן מקבל תוספת של ${fmtIls(AGENT_VARIABLE_BONUS)} עבור כל עסקה שעומדת ביעד משתנה.`,
          "התוספות מצטברות: עסקה שעמדה בשני יעדים משתנים מזכה בשתי תוספות.",
          `כל יעד משתנה מחושב בנפרד: מספר העסקאות שעמדו בו × ${fmtIls(AGENT_VARIABLE_BONUS)}.`,
        ],
        footnote:
          `לדוגמה: עסקה שעמדה ביעד גלגול בלבד — ${fmtIls(AGENT_VARIABLE_BONUS)}; עסקה שעמדה גם בגלגול וגם ברכב מיקוד — ${fmtIls(AGENT_VARIABLE_BONUS * 2)}; עסקה שעמדה בשלושה יעדים — ${fmtIls(AGENT_VARIABLE_BONUS * 3)}.`,
      },
    ],
    keywords: [
      "סוכן", "תמריץ סוכן", "מימון רגיל", "Extra Lease", "אקסטרה ליס",
      "יעד משתנה", "גלגול", "רכב מיקוד", "דגם ספציפי",
      "125", "175", "225", "250", "300", "100", "מדרגה", "עמידה ביעד",
    ],
  },

  // ─── מנהלי אולם ─────────────────────────────────────────
  managerItem("hyundai", "manager-hyundai"),
  managerItem("mitsubishi", "manager-mitsubishi"),

  // ─── בונוס משתנה למנהל ──────────────────────────────────
  {
    id: "manager-variable",
    icon: "",
    title: "בונוס משתנה למנהל אולם",
    summary: [
      `מנהל אולם מקבל תוספת של ${fmtIls(MANAGER_VARIABLE_BONUS)} בהגעה ליעד משתנה, כגון משפך או Extra Lease.`,
      "הבונוס מתווסף לתמריץ המנהל ולתמריץ העסקאות כאחד.",
      "הבונוס אינו מותנה בעמידה במינימום העסקאות.",
    ],
    groups: [
      {
        title: "הכלל",
        items: [
          `הושג יעד משתנה: מתווספים ${fmtIls(MANAGER_VARIABLE_BONUS)} לסך התמריץ.`,
          "הבונוס ניתן בין אם הושג מינימום העסקאות ובין אם לא.",
        ],
      },
      {
        title: "יעדים משתנים אפשריים",
        items: ["משפך", "Extra Lease", "יעד משתנה אחר"],
      },
    ],
    keywords: [
      "בונוס משתנה", "יעד משתנה", "משפך", "Extra Lease", "500",
      "מנהל אולם",
    ],
  },
];

export const incentives: KnowledgeSource = {
  id: "incentives",
  icon: "",
  title: "תמריצים לסוכנים ולמנהלי אולם",
  desc: "מדרגות התמריץ, תנאי המינימום והבונוסים המשתנים — עם מחשבון",
  origins: "תוכנית התמריצים כפי שנמסרה",
  disclaimer:
    "מידע בלבד. במקרה של שינוי בתוכנית התמריצים, יש לפעול לפי הנוהל המעודכן של החברה.",
  view: "tabs",
  items,
};
