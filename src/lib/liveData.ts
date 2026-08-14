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

/**
 * כמה תצפיות למשוך מסדרת הריבית.
 * תדירות הסדרה אינה ידועה מראש, ואם היא יומית אז 13 תצפיות הן
 * פחות מחודש. 420 מכסות 13 חודשי לוח מלאים גם בתדירות יומית,
 * ואם הסדרה חודשית זה פשוט טווח ארוך יותר שנחתך ממילא.
 */
export const BOI_FETCH_OBSERVATIONS = 420;

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

/** סדרה בודדת בתוך תשובת SDMX, עם התווית שמזהה אותה */
export interface SdmxSeries {
  /** מפתח הסדרה כפי שהוא בתשובה, למשל "0:0:0" */
  key: string;
  /** שמות ערכי המימדים של הסדרה — מה שמאפשר לזהות אותה */
  label: string;
  /** התצפיות, מהחדשה לישנה */
  readings: BoiReading[];
}

/** מאתר את בלוק המבנה, בין אם הוא structures[] ובין אם structure */
function sdmxStructure(data: Record<string, Json>): Record<string, Json> | null {
  const structures = data.structures;
  if (Array.isArray(structures) && isObj(structures[0])) return structures[0];
  if (isObj(data.structure)) return data.structure;
  return null;
}

/** תוויות התקופות לפי סדר התצפיות */
function sdmxPeriods(struct: Record<string, Json> | null): string[] {
  if (!struct || !isObj(struct.dimensions)) return [];
  const obsDims = (struct.dimensions as Record<string, Json>).observation;
  if (!Array.isArray(obsDims) || !isObj(obsDims[0])) return [];
  const vals = (obsDims[0] as Record<string, Json>).values;
  if (!Array.isArray(vals)) return [];
  return vals.map((v) => {
    if (!isObj(v)) return "";
    const id = pick(v, ["id", "name", "start"]);
    return typeof id === "string" ? id : "";
  });
}

/**
 * תווית לכל סדרה: מפתח הסדרה הוא רשימת אינדקסים אל ערכי מימדי
 * הסדרה, ולכן אפשר לתרגם "0:2:1" לשמות הקודים שמאחוריו.
 */
function sdmxSeriesLabel(struct: Record<string, Json> | null, key: string): string {
  if (!struct || !isObj(struct.dimensions)) return "";
  const dims = (struct.dimensions as Record<string, Json>).series;
  if (!Array.isArray(dims)) return "";
  const parts: string[] = [];
  key.split(":").forEach((raw, di) => {
    const idx = parseInt(raw, 10);
    const dim = dims[di];
    if (!Number.isFinite(idx) || !isObj(dim)) return;
    const vals = dim.values;
    if (!Array.isArray(vals) || !isObj(vals[idx])) return;
    const name = pick(vals[idx] as Record<string, Json>, ["name", "id"]);
    if (typeof name === "string" && name) parts.push(name);
  });
  return parts.join(" · ");
}

/**
 * כל הסדרות בתשובת SDMX, כל אחת עם תוויתה ותצפיותיה מהחדשה לישנה.
 * ריבית בנק ישראל אינה מתפרסמת כערך חדש בכל חודש אלא משתנה רק
 * בהחלטת ועדה — ולכן סדרה עשויה להכיל ערכים חוזרים, וזה תקין.
 */
export function sdmxSeriesList(payload: Json): SdmxSeries[] {
  if (!isObj(payload)) return [];
  const data = isObj(payload.data) ? (payload.data as Record<string, Json>) : payload;
  const dataSets = data.dataSets;
  if (!Array.isArray(dataSets) || dataSets.length === 0) return [];
  const first = dataSets[0];
  if (!isObj(first) || !isObj(first.series)) return [];

  const struct = sdmxStructure(data);
  const periods = sdmxPeriods(struct);
  const series = first.series as Record<string, Json>;
  const out: SdmxSeries[] = [];

  for (const key of Object.keys(series)) {
    const sObj = series[key];
    if (!isObj(sObj) || !isObj(sObj.observations)) continue;
    const obs = sObj.observations as Record<string, Json>;
    const byIdx = new Map<number, BoiReading>();
    for (const oKey of Object.keys(obs)) {
      const idx = parseInt(oKey, 10);
      if (!Number.isFinite(idx)) continue;
      const arr = obs[oKey];
      const v = Array.isArray(arr) ? toNumber(arr[0]) : toNumber(arr);
      // ריבית מדיניות סבירה — ערך מחוץ לטווח אינו ריבית ונפסל
      if (v === null || v < -5 || v > 40) continue;
      byIdx.set(idx, { rate: v, effectiveDate: periods[idx] || undefined });
    }
    if (byIdx.size === 0) continue;
    out.push({
      key,
      label: sdmxSeriesLabel(struct, key),
      readings: Array.from(byIdx.entries())
        .sort((a, b) => b[0] - a[0])
        .map(([, r]) => r),
    });
  }

  return out;
}

/** עולם תוכן בקטלוג של בנק ישראל */
export interface DataflowInfo {
  id: string;
  he?: string;
  en?: string;
}

/**
 * מפרסר את קטלוג עולמות התוכן של בנק ישראל לרשימה קומפקטית.
 * התשובה הגולמית ארוכה מאוד ונחתכת באבחון; כאן נשמרים רק המזהה
 * והשמות — מה שדרוש כדי לזהות איזה עולם תוכן מחזיק את הריבית.
 */
export function parseDataflowCatalog(payload: Json): DataflowInfo[] {
  if (!isObj(payload)) return [];
  const data = isObj(payload.data) ? (payload.data as Record<string, Json>) : payload;
  const flows = data.dataflows;
  if (!Array.isArray(flows)) return [];
  const out: DataflowInfo[] = [];
  for (const f of flows) {
    if (!isObj(f) || typeof f.id !== "string") continue;
    const names = isObj(f.names) ? (f.names as Record<string, Json>) : null;
    const he = names && typeof names.he === "string" ? names.he : undefined;
    const en =
      names && typeof names.en === "string"
        ? names.en
        : typeof f.name === "string"
          ? f.name
          : undefined;
    out.push({ id: f.id, he, en });
  }
  return out;
}

/** מילות זיהוי של סדרת ריבית המדיניות, בעברית ובאנגלית */
const POLICY_RATE_TOKENS = [
  "ריבית בנק ישראל",
  "ריבית מוניטרית",
  "ריבית המדיניות",
  "bank of israel interest",
  "boi interest",
  "policy rate",
  "monetary rate",
];

const same = (a: number, b: number) => Math.abs(a - b) < 1e-9;

/**
 * בוחר את סדרת ריבית המדיניות מתוך התשובה.
 *
 * knownRate היא הריבית הנוכחית שכבר התקבלה מ-PublicApi. כשהיא
 * ידועה אפשר לצמצם לסדרה שהתצפית האחרונה שלה מסכימה איתה — זהו
 * אימות מול מקור רשמי שני, לא ניחוש.
 *
 * אחריה מנסים זיהוי לפי התווית. אם כל מה שנותר מסכים על אותה
 * ריבית נוכחית, אין על מה להתלבט — זו אותה ריבית בתדירויות שונות.
 * כשנשארה אי-בהירות אמיתית מוחזר null במקום סדרה שאולי שגויה.
 */
export function pickPolicyRateSeries(
  list: SdmxSeries[],
  knownRate?: number
): SdmxSeries | null {
  if (list.length === 0) return null;
  if (list.length === 1) return list[0];

  let pool = list;
  if (knownRate !== undefined && Number.isFinite(knownRate)) {
    const verified = list.filter((s) => s.readings[0] && same(s.readings[0].rate, knownRate));
    if (verified.length === 1) return verified[0];
    if (verified.length > 1) pool = verified;
  }

  const matches = pool.filter((s) => {
    const l = s.label.toLowerCase();
    return POLICY_RATE_TOKENS.some((t) => l.includes(t));
  });
  if (matches.length === 1) return matches[0];

  const head = pool[0]?.readings[0]?.rate;
  if (head !== undefined && pool.every((s) => s.readings[0] && same(s.readings[0].rate, head))) {
    return pool[0];
  }
  return null;
}

/** פענוח תשובת SDMX (edge.boi.gov.il) — התצפית האחרונה בסדרה */
function parseSdmxRate(payload: Json): BoiReading | null {
  const chosen = pickPolicyRateSeries(sdmxSeriesList(payload));
  if (!chosen || chosen.readings.length === 0) return null;
  const latest = chosen.readings[0];
  return { rate: latest.rate, effectiveDate: latest.effectiveDate };
}

function parseSdmxSeries(payload: Json, knownRate?: number): BoiReading[] {
  const chosen = pickPolicyRateSeries(sdmxSeriesList(payload), knownRate);
  return chosen ? chosen.readings : [];
}

/** מפתח החודש מתוך תווית התקופה, כשהיא בצורת YYYY-MM */
function monthKey(d?: string): string | null {
  const m = /^(\d{4})-(\d{2})/.exec(d ?? "");
  return m ? `${m[1]}-${m[2]}` : null;
}

/**
 * מצמצם את הסדרה לקריאה אחת לחודש — האחרונה שפורסמה בו.
 * ריבית המדיניות עשויה להתפרסם בתדירות יומית, ואז 12 תצפיות הן
 * פחות מחצי חודש ואינן היסטוריה. כשלא ניתן לזהות חודש מהתווית,
 * הסדרה נשארת כמות שהיא ולא ממציאים לה מבנה.
 */
function collapseToMonthly(series: BoiReading[]): BoiReading[] {
  const seen = new Set<string>();
  const out: BoiReading[] = [];
  for (const r of series) {
    const k = monthKey(r.effectiveDate);
    if (k === null) return series;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
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
  months = BOI_HISTORY_MONTHS,
  knownRate?: number
): BoiReading[] | null {
  const series = parseSdmxSeries(payload, knownRate);
  if (series.length === 0) {
    // מקור ללא סדרה (PublicApi) — קריאה בודדת אינה היסטוריה
    return null;
  }
  return withRateChange(collapseToMonthly(series)).slice(0, months);
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
