// ─── חוקי מסלולי המימון ────────────────────────────────────────
// כל חוקי המוצר מרוכזים כאן בלבד — אין לפזר אותם ברכיבי הממשק.

import type { AmortMethod, ProductType } from "./finance";

export type TrackId = "drive" | "extra" | "fix" | "express";

export interface MonthsRange {
  min: number;
  max: number;
  label: string;
}

export interface BalloonRule {
  months: number; // התקופה שאליה החוק מתייחס
  maxPct: number; // אחוז בלון מרבי
  note?: string;
}

export interface TrackRule {
  id: TrackId;
  name: string;
  star?: boolean;
  tagline?: string;
  /** טווח מקדמה רגיל (%) */
  downMin: number;
  downMax: number;
  /** טווח מקדמה בסמכות BDM (%) — אם קיים */
  bdmMin?: number;
  bdmMax?: number;
  monthsRanges: MonthsRange[];
  /** תקופות בדידות (Extra Lease) — אם קיים, רק אלו מותרות */
  discreteMonths?: number[];
  hasBalloon: boolean;
  balloonRules: BalloonRule[];
  /** עמלת הקמה: אחוז מסכום המימון + תוספת קבועה, או סכום קבוע */
  fee: { type: "percent-plus"; pct: number; plus: number } | { type: "flat"; amount: number };
  /** סוגי ריבית מותרים במסלול */
  allowedProducts: ProductType[];
  amortNote: string;
  audience: string;
  keyPoint: string;
}

/** עמלת הקמה סטנדרטית: 1% מסכום המימון + 350 ₪ */
const STANDARD_FEE = { type: "percent-plus", pct: 1, plus: 350 } as const;

export const TRACKS: Record<TrackId, TrackRule> = {
  extra: {
    id: "extra",
    name: "Extra Lease",
    star: true,
    tagline: "המסלול האידיאלי",
    downMin: 7,
    downMax: 30,
    monthsRanges: [{ min: 36, max: 42, label: "36 או 42 חודשים" }],
    discreteMonths: [36, 42],
    hasBalloon: true,
    balloonRules: [
      { months: 36, maxPct: 50, note: "עד 20,000 ק״מ בשנה" },
      { months: 42, maxPct: 50, note: "עד 20,000 ק״מ בשנה" },
    ],
    fee: { type: "flat", amount: 890 },
    allowedProducts: ["prime", "fixed", "cpi"],
    amortNote: "שפיצר או קרן שווה — לפי סוג הריבית",
    audience: "לקוח שרוצה החזר חודשי נמוך ומחליף רכב כל 3–3.5 שנים",
    keyPoint: "הבלון נקבע לפי הקילומטראז׳ השנתי הצפוי — 50% עד 20,000 ק״מ, 40% עד כ-25,000 ק״מ",
  },
  drive: {
    id: "drive",
    name: "Drive",
    downMin: 15,
    downMax: 50,
    bdmMin: 10,
    bdmMax: 60,
    monthsRanges: [
      { min: 12, max: 36, label: "12–36 חודשים" },
      { min: 37, max: 48, label: "37–48 חודשים" },
    ],
    hasBalloon: true,
    balloonRules: [
      { months: 36, maxPct: 45 },
      { months: 48, maxPct: 40 },
    ],
    fee: STANDARD_FEE,
    allowedProducts: ["prime", "fixed", "cpi"],
    amortNote: "שפיצר או קרן שווה — לפי סוג הריבית",
    audience: "לקוח שרוצה גמישות בתקופה ובמקדמה, עם או בלי בלון",
    keyPoint: "מקדמה של 10%–14.99% או 50.01%–60% היא בסמכות BDM ודורשת אישור",
  },
  fix: {
    id: "fix",
    name: "Fix",
    downMin: 15,
    downMax: 85,
    monthsRanges: [{ min: 12, max: 60, label: "12–60 חודשים" }],
    hasBalloon: false,
    balloonRules: [],
    fee: STANDARD_FEE,
    // המסלול מוגדר בשיטת שפיצר — ולכן ריבית פריים (קרן שווה) אינה זמינה בו
    allowedProducts: ["fixed", "cpi"],
    amortNote: "שפיצר",
    audience: "לקוח שרוצה החזר חודשי קבוע וידוע מראש, בלי יתרה בסוף",
    keyPoint: "אין בלון — הרכב מסולק במלואו בסוף התקופה",
  },
  express: {
    id: "express",
    name: "Express",
    downMin: 0,
    downMax: 85,
    // ⚠️ טווחי התקופות שנמסרו חופפים (12–24, 12–30, 12–36).
    // נשמרים כרשימה מפורשת ואין לשנותם ללא אישור.
    // TODO: יש לאמת בהמשך את החלוקה הסופית של תקופות Express.
    monthsRanges: [
      { min: 12, max: 24, label: "12–24 חודשים" },
      { min: 12, max: 30, label: "12–30 חודשים" },
      { min: 12, max: 36, label: "12–36 חודשים" },
    ],
    hasBalloon: false,
    balloonRules: [],
    fee: STANDARD_FEE,
    allowedProducts: ["prime", "fixed", "cpi"],
    amortNote: "שפיצר או קרן שווה — לפי סוג הריבית",
    audience: "עסקה מהירה לתקופה קצרה, ללא בלון",
    keyPoint: "תקופות קצרות בלבד — ההחזר החודשי גבוה יחסית",
  },
};

export const TRACK_ORDER: TrackId[] = ["extra", "drive", "fix", "express"];

/** עמלת הקמה לפי המסלול */
export function trackSetupFee(trackId: TrackId, financingAmount: number): number {
  const t = TRACKS[trackId];
  if (t.fee.type === "flat") return t.fee.amount;
  return financingAmount > 0 ? (financingAmount * t.fee.pct) / 100 + t.fee.plus : 0;
}

/** תיאור עמלת ההקמה לתצוגה */
export function feeDescription(trackId: TrackId): string {
  const t = TRACKS[trackId];
  return t.fee.type === "flat"
    ? `${t.fee.amount} ₪ קבוע`
    : `${t.fee.pct}% מסכום המימון + ${t.fee.plus} ₪`;
}

/** תיאור טווח התקופות לתצוגה */
export function monthsDescription(trackId: TrackId): string {
  const t = TRACKS[trackId];
  if (t.discreteMonths) return t.discreteMonths.join(" או ") + " חודשים";
  return t.monthsRanges.map((r) => r.label).join(" / ");
}

/** תיאור הבלון לתצוגה */
export function balloonDescription(trackId: TrackId): string {
  const t = TRACKS[trackId];
  if (!t.hasBalloon) return "ללא בלון";
  if (trackId === "extra") return "50% עד 20,000 ק״מ בשנה, 40% עד כ-25,000 ק״מ";
  return t.balloonRules.map((b) => `עד ${b.maxPct}% ב-${b.months} חוד׳`).join(", ");
}

/** אחוז הבלון המרבי לתקופה נתונה (החוק הקרוב ביותר מלמעלה) */
export function maxBalloonPct(trackId: TrackId, months: number): number | null {
  const t = TRACKS[trackId];
  if (!t.hasBalloon || t.balloonRules.length === 0) return null;
  // בוחרים את החוק לתקופה הקרובה ביותר שאינה קטנה מהתקופה שנבחרה;
  // אם התקופה ארוכה מכל החוקים — נלקח החוק המחמיר ביותר
  const sorted = [...t.balloonRules].sort((a, b) => a.months - b.months);
  const match = sorted.find((r) => months <= r.months);
  return (match ?? sorted[sorted.length - 1]).maxPct;
}

/** הבלון המומלץ ב-Extra Lease לפי קילומטראז׳ שנתי צפוי */
export type Mileage = "20k" | "25k";

export function extraLeaseBalloonPct(mileage: Mileage): number {
  return mileage === "20k" ? 50 : 40;
}

// ─── בקרת תנאי העסקה מול חוקי המסלול ──────────────────────────

export type CheckLevel = "ok" | "bdm" | "out";

export interface TrackCheck {
  level: CheckLevel;
  messages: { level: Exclude<CheckLevel, "ok">; text: string }[];
}

export function checkDeal(
  trackId: TrackId,
  opts: { downPct: number; months: number; balloonPct: number; hasInputs: boolean }
): TrackCheck {
  const t = TRACKS[trackId];
  const messages: TrackCheck["messages"] = [];
  const { downPct, months, balloonPct, hasInputs } = opts;

  if (!hasInputs) return { level: "ok", messages };

  // ── מקדמה ──
  if (downPct > 0 || t.downMin > 0) {
    const inNormal = downPct >= t.downMin && downPct <= t.downMax;
    const inBdm =
      t.bdmMin !== undefined &&
      t.bdmMax !== undefined &&
      downPct >= t.bdmMin &&
      downPct <= t.bdmMax;

    if (!inNormal && inBdm) {
      messages.push({ level: "bdm", text: "בתחום סמכות BDM." });
    } else if (!inNormal && !inBdm) {
      messages.push({
        level: "out",
        text: `חריגה מטווח המסלול. מקדמה מותרת: ${t.bdmMin ?? t.downMin}%–${
          t.bdmMax ?? t.downMax
        }%`,
      });
    }
  }

  // ── תקופה ──
  if (months > 0) {
    const allowed = t.discreteMonths
      ? t.discreteMonths.includes(Math.round(months))
      : t.monthsRanges.some((r) => months >= r.min && months <= r.max);
    if (!allowed) {
      messages.push({
        level: "out",
        text: `חריגה מטווח המסלול. תקופה מותרת: ${monthsDescription(trackId)}`,
      });
    }
  }

  // ── בלון ──
  if (balloonPct > 0) {
    if (!t.hasBalloon) {
      messages.push({ level: "out", text: `חריגה מטווח המסלול. ${t.name} הוא מסלול ללא בלון.` });
    } else {
      const max = maxBalloonPct(trackId, months);
      if (max !== null && balloonPct > max + 1e-9) {
        messages.push({
          level: "out",
          text: `חריגה מטווח המסלול. בלון מרבי ל-${Math.round(months)} חודשים: ${max}%`,
        });
      }
    }
  }

  const level: CheckLevel = messages.some((m) => m.level === "out")
    ? "out"
    : messages.length > 0
      ? "bdm"
      : "ok";
  return { level, messages };
}

/** שיטת הסילוקין בפועל לפי סוג הריבית */
export function amortForProduct(product: ProductType): AmortMethod {
  return product === "prime" ? "equal-principal" : "spitzer";
}
