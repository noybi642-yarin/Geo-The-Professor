// ─── נתונים עדכניים ממקורות רשמיים ─────────────────────────────
// מדד המחירים לצרכן — הלשכה המרכזית לסטטיסטיקה (api.cbs.gov.il)
// ריבית בנק ישראל — בנק ישראל (boi.org.il / edge.boi.gov.il)
// ריבית פריים — מחושבת: ריבית בנק ישראל + 1.5%
//
// הפענוח כאן הגנתי בכוונה: ה-API-ים הרשמיים שינו מבנה בעבר, ולכן
// במקום להיצמד לנתיב אחד קשיח אנחנו סורקים את התשובה ומאתרים את
// השדות המשמעותיים. אם דבר אינו נמצא — מוחזר null, לעולם לא ערך מומצא.

/** המרווח הקבוע בין ריבית בנק ישראל לריבית הפריים */
export const PRIME_SPREAD = 1.5;

export interface CpiReading {
  /** ערך המדד */
  value: number;
  year: number;
  /** 1–12 */
  month: number;
  /** שם החודש בעברית, אם נמסר */
  monthName?: string;
  /** תיאור בסיס המדד, אם נמסר */
  base?: string;
  /**
   * שיעור השינוי מול המדד הקודם שפורסם, באחוזים.
   * מקור: שדה percent הרשמי של הלמ״ס כאשר הוא קיים; אחרת מחושב
   * מהערכים עצמם. בשני המקרים ההשוואה היא מול החודש הקודם ולא
   * מול מדד הבסיס. undefined כשאין מול מה להשוות.
   */
  changePct?: number;
  /** מקור השינוי — לצורך שקיפות ובדיקות */
  changeSource?: "official" | "computed";
  /** שיעור השינוי השנתי הרשמי (percentYear) — אינפלציה ב-12 החודשים */
  yearPct?: number;
}

/** מספר החודשים שמוצגים בהיסטוריה */
export const CPI_HISTORY_MONTHS = 12;

/**
 * מספר הרשומות שיש למשוך: חודש נוסף מעבר לתצוגה, כדי שגם לחודש
 * הישן ביותר שמוצג יהיה מול מה לחשב שינוי.
 */
export const CPI_FETCH_RECORDS = CPI_HISTORY_MONTHS + 1;

export interface BoiReading {
  /** ריבית בנק ישראל באחוזים */
  rate: number;
  /** תאריך התחולה או הפרסום, אם נמסר (ISO או טקסט) */
  effectiveDate?: string;
  /** מועד החלטת הריבית הבאה, כפי שמוסר בנק ישראל */
  nextDecisionDate?: string;
  /**
   * השינוי מול הקריאה הקודמת — ב**נקודות אחוז**, לא באחוזים.
   * מעבר מ-4.5% ל-4.25% הוא ‎-0.25 נקודות אחוז.
   * undefined כאשר אין קריאה קודמת להשוואה.
   */
  changePts?: number;
}

/** מספר התקופות שמוצגות בהיסטוריית הריבית */
export const BOI_HISTORY_MONTHS = 12;

/** תקופה נוספת מעבר לתצוגה, לחישוב השינוי של הישנה ביותר */
export const BOI_FETCH_RECORDS = BOI_HISTORY_MONTHS + 1;

export interface LiveData {
  cpi: CpiReading | null;
  /**
   * היסטוריית המדד — מהחדש לישן, עד 12 חודשים.
   * null כאשר ההיסטוריה לא התקבלה; אין לכך השפעה על שאר הנתונים.
   */
  cpiHistory?: CpiReading[] | null;
  boi: BoiReading | null;
  /**
   * היסטוריית ריבית בנק ישראל — מהחדש לישן, עד 12 תקופות.
   * null כאשר לא התקבלה; אין לכך השפעה על שאר הנתונים.
   */
  boiHistory?: BoiReading[] | null;
  /** ריבית פריים מחושבת: boi.rate + PRIME_SPREAD */
  prime: number | null;
  /** מועד המשיכה בפועל (ISO) */
  fetchedAt: string;
  /** תקלות פר-מקור, לצורך הודעה למשתמש ולדיאגנוסטיקה */
  errors: { source: "cpi" | "boi"; message: string }[];
}

const HEB_MONTHS = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

export const hebrewMonth = (m: number) =>
  m >= 1 && m <= 12 ? HEB_MONTHS[m - 1] : String(m);

// ─── עזרי סריקה ────────────────────────────────────────────────

type Json = unknown;

const isObj = (v: Json): v is Record<string, Json> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** ממיר ערך למספר גם כשהוא מגיע כמחרוזת ("103.5" / "4.5%") */
export function toNumber(v: Json): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** אוסף את כל הצמתים מסוג אובייקט בעץ ה-JSON (עד עומק סביר) */
function walk(node: Json, depth = 0, out: Record<string, Json>[] = []): Record<string, Json>[] {
  if (depth > 12) return out;
  if (Array.isArray(node)) {
    for (const item of node) walk(item, depth + 1, out);
  } else if (isObj(node)) {
    out.push(node);
    for (const key of Object.keys(node)) walk(node[key], depth + 1, out);
  }
  return out;
}

/** מאתר מפתח לפי רשימת שמות אפשריים, ללא תלות באותיות גדולות/קטנות */
function pick(obj: Record<string, Json>, names: string[]): Json {
  const map = new Map(Object.keys(obj).map((k) => [k.toLowerCase(), k]));
  for (const n of names) {
    const real = map.get(n.toLowerCase());
    if (real !== undefined) return obj[real];
  }
  return undefined;
}

// ─── פענוח מדד המחירים לצרכן (למ״ס) ────────────────────────────

/**
 * מאתר את כל קריאות המדד בתשובת ה-API של הלמ״ס ומחזיר אותן
 * ממוינות מהחדש לישן, ללא כפילויות.
 *
 * הסריקה עוברת על כל הצמתים שיש בהם שנה, חודש וערך. אותה קריאה
 * עשויה להופיע בכמה רמות קינון, ולכן נשמרת הופעה אחת לכל חודש —
 * הראשונה, שהיא החיצונית ביותר ולכן העשירה בהקשר.
 */
export function parseCpiSeries(payload: Json): CpiReading[] {
  const byMonth = new Map<string, CpiReading>();

  for (const node of walk(payload)) {
    const year = toNumber(pick(node, ["year", "shana", "yearDesc"]));
    const month = toNumber(pick(node, ["month", "monthNum", "chodesh"]));
    if (year === null || month === null) continue;
    if (year < 1950 || year > 2200 || month < 1 || month > 12) continue;

    // הערך יושב לעיתים ישירות בצומת ולעיתים תחת currBase
    let value = toNumber(pick(node, ["value", "index", "indexValue", "price"]));
    let base: string | undefined;

    const curr = pick(node, ["currBase", "curr_base", "base"]);
    if (isObj(curr)) {
      value = value ?? toNumber(pick(curr, ["value", "index"]));
      const d = pick(curr, ["baseDesc", "desc", "name"]);
      if (typeof d === "string") base = d;
    }
    if (value === null || !(value > 0)) continue;

    const nameRaw = pick(node, ["monthDesc", "monthName", "name"]);
    const monthName = typeof nameRaw === "string" ? nameRaw : undefined;

    // שדות רשמיים של הלמ״ס: percent = שינוי מהחודש הקודם,
    // percentYear = שינוי מהחודש המקביל אשתקד. שניהם אומתו מול
    // הערכים עצמם בתשובה אמיתית ולכן מועדפים על חישוב עצמי.
    const official = toNumber(pick(node, ["percent"]));
    const yearly = toNumber(pick(node, ["percentYear"]));

    const key = `${year}-${month}`;
    if (!byMonth.has(key))
      byMonth.set(key, {
        value,
        year,
        month,
        monthName,
        base,
        ...(official !== null ? { changePct: official, changeSource: "official" as const } : {}),
        ...(yearly !== null ? { yearPct: yearly } : {}),
      });
  }

  return Array.from(byMonth.values()).sort(
    (a, b) => b.year - a.year || b.month - a.month
  );
}

/**
 * מאתר את קריאת המדד העדכנית ביותר.
 * נשמר כפי שהיה כדי לא לשנות את התנהגות המקור הקיים.
 */
export function parseCpi(payload: Json): CpiReading | null {
  return parseCpiSeries(payload)[0] ?? null;
}

/**
 * שיעור השינוי בין שתי קריאות מדד עוקבות, באחוזים:
 *   ((currentIndex / previousIndex) - 1) × 100
 *
 * ההשוואה היא תמיד מול המדד הקודם שפורסם — לא מול מדד הבסיס.
 * מוחזר בדיוק מלא; העיגול נעשה בתצוגה בלבד.
 */
export function monthlyChangePct(current: number, previous: number): number | null {
  if (!(previous > 0) || !Number.isFinite(current)) return null;
  return (current / previous - 1) * 100;
}

/**
 * מוסיף לכל קריאה בסדרה את שיעור השינוי מול הקריאה שקדמה לה.
 * הסדרה מגיעה מהחדש לישן, ולכן ה"קודם" הוא האיבר הבא במערך.
 * הקריאה הישנה ביותר נשארת ללא שינוי מחושב — אין מול מה להשוות.
 */
export function withMonthlyChange(series: CpiReading[]): CpiReading[] {
  return series.map((r, i) => {
    // הנתון הרשמי גובר; החישוב משמש רק כשהוא חסר
    if (r.changeSource === "official") return { ...r };
    const prev = series[i + 1];
    const changePct = prev ? monthlyChangePct(r.value, prev.value) : null;
    return changePct === null
      ? { ...r }
      : { ...r, changePct, changeSource: "computed" as const };
  });
}

/**
 * בונה את היסטוריית המדד להצגה: מוסיף שינוי חודשי וגוזר ל-12
 * החודשים האחרונים. הרשומה ה-13 משמשת רק לחישוב השינוי של
 * החודש הישן ביותר שמוצג, ואינה מוצגת בעצמה.
 */
export function buildCpiHistory(
  payload: Json,
  months = CPI_HISTORY_MONTHS
): CpiReading[] | null {
  const series = parseCpiSeries(payload);
  if (series.length === 0) return null;
  return withMonthlyChange(series).slice(0, months);
}

// ─── פענוח ריבית בנק ישראל ─────────────────────────────────────

/** פענוח תשובת SDMX (edge.boi.gov.il) — התצפית האחרונה בסדרה */
function parseSdmxRate(payload: Json): BoiReading | null {
  if (!isObj(payload)) return null;
  const data = isObj(payload.data) ? payload.data : payload;
  const dataSets = (data as Record<string, Json>).dataSets;
  if (!Array.isArray(dataSets) || dataSets.length === 0) return null;

  const first = dataSets[0];
  if (!isObj(first)) return null;
  const series = first.series;
  if (!isObj(series)) return null;

  // תוויות התקופות מתוך מבנה המימדים
  let periods: string[] = [];
  const structures = (data as Record<string, Json>).structures;
  const struct = Array.isArray(structures) ? structures[0] : undefined;
  if (isObj(struct) && isObj(struct.dimensions)) {
    const obsDims = (struct.dimensions as Record<string, Json>).observation;
    if (Array.isArray(obsDims) && isObj(obsDims[0])) {
      const vals = (obsDims[0] as Record<string, Json>).values;
      if (Array.isArray(vals)) {
        periods = vals.map((v) => {
          if (!isObj(v)) return "";
          const id = pick(v, ["id", "name", "start"]);
          return typeof id === "string" ? id : "";
        });
      }
    }
  }

  let bestIdx = -1;
  let rate: number | null = null;

  for (const key of Object.keys(series)) {
    const s = series[key];
    if (!isObj(s) || !isObj(s.observations)) continue;
    const obs = s.observations as Record<string, Json>;
    for (const oKey of Object.keys(obs)) {
      const idx = parseInt(oKey, 10);
      const arr = obs[oKey];
      const v = Array.isArray(arr) ? toNumber(arr[0]) : toNumber(arr);
      if (v === null || !Number.isFinite(idx)) continue;
      if (idx > bestIdx) {
        bestIdx = idx;
        rate = v;
      }
    }
  }

  if (rate === null) return null;
  return { rate, effectiveDate: periods[bestIdx] || undefined };
}

/**
 * כל התצפיות בסדרת SDMX, מהחדשה לישנה.
 * ריבית בנק ישראל אינה מתפרסמת כערך חודשי חדש בכל חודש אלא משתנה
 * רק בהחלטת ועדה — ולכן הסדרה עשויה להכיל ערכים חוזרים, וזה תקין.
 */
function parseSdmxSeries(payload: Json): BoiReading[] {
  if (!isObj(payload)) return [];
  const data = isObj(payload.data) ? payload.data : payload;
  const dataSets = (data as Record<string, Json>).dataSets;
  if (!Array.isArray(dataSets) || dataSets.length === 0) return [];
  const first = dataSets[0];
  if (!isObj(first) || !isObj(first.series)) return [];

  let periods: string[] = [];
  const structures = (data as Record<string, Json>).structures;
  const struct = Array.isArray(structures) ? structures[0] : undefined;
  if (isObj(struct) && isObj(struct.dimensions)) {
    const obsDims = (struct.dimensions as Record<string, Json>).observation;
    if (Array.isArray(obsDims) && isObj(obsDims[0])) {
      const vals = (obsDims[0] as Record<string, Json>).values;
      if (Array.isArray(vals)) {
        periods = vals.map((v) => {
          if (!isObj(v)) return "";
          const id = pick(v, ["id", "name", "start"]);
          return typeof id === "string" ? id : "";
        });
      }
    }
  }

  const byIdx = new Map<number, BoiReading>();
  const series = first.series as Record<string, Json>;
  for (const key of Object.keys(series)) {
    const sObj = series[key];
    if (!isObj(sObj) || !isObj(sObj.observations)) continue;
    const obs = sObj.observations as Record<string, Json>;
    for (const oKey of Object.keys(obs)) {
      const idx = parseInt(oKey, 10);
      if (!Number.isFinite(idx)) continue;
      const arr = obs[oKey];
      const v = Array.isArray(arr) ? toNumber(arr[0]) : toNumber(arr);
      if (v === null || v < -5 || v > 40) continue;
      if (!byIdx.has(idx)) {
        byIdx.set(idx, { rate: v, effectiveDate: periods[idx] || undefined });
      }
    }
  }

  return Array.from(byIdx.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([, r]) => r);
}

/**
 * השינוי בין שתי קריאות ריבית — ב**נקודות אחוז**.
 * ריבית היא כבר אחוז, ולכן ההפרש בין שתי ריביות אינו אחוז שינוי
 * אלא הפרש בנקודות: 4.5% → 4.25% הוא ‎-0.25 נקודות אחוז.
 */
export function rateChangePts(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  return current - previous;
}

/** מוסיף לכל קריאה את השינוי בנקודות מול הקריאה שקדמה לה */
export function withRateChange(series: BoiReading[]): BoiReading[] {
  return series.map((r, i) => {
    const prev = series[i + 1];
    const pts = prev ? rateChangePts(r.rate, prev.rate) : null;
    return pts === null ? { ...r } : { ...r, changePts: pts };
  });
}

/**
 * בונה את היסטוריית ריבית בנק ישראל להצגה.
 * הרשומה הנוספת משמשת רק לחישוב השינוי של הישנה ביותר שמוצגת.
 */
export function buildBoiHistory(
  payload: Json,
  months = BOI_HISTORY_MONTHS
): BoiReading[] | null {
  const series = parseSdmxSeries(payload);
  if (series.length === 0) {
    // מקור ללא סדרה (PublicApi) — קריאה בודדת אינה היסטוריה
    return null;
  }
  return withRateChange(series).slice(0, months);
}

/**
 * מאתר את ריבית בנק ישראל בתשובה.
 * מנסה קודם מבנה SDMX, ואז סורק אחר מפתח ריבית מפורש.
 */
export function parseBoi(payload: Json): BoiReading | null {
  const sdmx = parseSdmxRate(payload);
  if (sdmx) return sdmx;

  const RATE_KEYS = [
    "interestRate",
    "InterestRate",
    "rate",
    "Rate",
    "currentInterest",
    "interest",
    "value",
    "obsValue",
  ];
  // שמות השדות בפועל ב-PublicApi של בנק ישראל, לפי תשובה אמיתית
  const DATE_KEYS = [
    "effectiveDate",
    "EffectiveDate",
    "lastPublishedDate",
    "startDate",
    "date",
    "Date",
    "publishDate",
    "PublishDate",
    "period",
    "timePeriod",
  ];

  for (const node of walk(payload)) {
    for (const rk of RATE_KEYS) {
      const raw = pick(node, [rk]);
      if (raw === undefined) continue;
      const rate = toNumber(raw);
      // ריבית בנק ישראל נעה היסטורית בטווח סביר; ערך מחוץ לטווח
      // מרמז שתפסנו שדה אחר לגמרי
      if (rate === null || rate < -5 || rate > 40) continue;

      let effectiveDate: string | undefined;
      const d = pick(node, DATE_KEYS);
      if (typeof d === "string" && d.length >= 4) effectiveDate = d;

      let nextDecisionDate: string | undefined;
      const nd = pick(node, ["nextInterestDate", "nextDecisionDate"]);
      if (typeof nd === "string" && nd.length >= 4) nextDecisionDate = nd;

      return { rate, effectiveDate, nextDecisionDate };
    }
  }

  return null;
}

/** ריבית פריים = ריבית בנק ישראל + 1.5% */
export function calcPrime(boiRate: number | null | undefined): number | null {
  if (boiRate === null || boiRate === undefined || !Number.isFinite(boiRate)) return null;
  return Math.round((boiRate + PRIME_SPREAD) * 100) / 100;
}
