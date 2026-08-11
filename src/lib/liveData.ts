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
}

export interface BoiReading {
  /** ריבית בנק ישראל באחוזים */
  rate: number;
  /** תאריך התחולה, אם נמסר (ISO או טקסט) */
  effectiveDate?: string;
}

export interface LiveData {
  cpi: CpiReading | null;
  boi: BoiReading | null;
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
 * מאתר את קריאת המדד העדכנית ביותר בתשובת ה-API של הלמ״ס.
 * מחפש צמתים שיש בהם שנה, חודש וערך — ובוחר את המאוחר ביותר.
 */
export function parseCpi(payload: Json): CpiReading | null {
  let best: CpiReading | null = null;

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

    const candidate: CpiReading = { value, year, month, monthName, base };
    if (!best || year > best.year || (year === best.year && month > best.month)) {
      best = candidate;
    }
  }

  return best;
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
  const DATE_KEYS = [
    "effectiveDate",
    "EffectiveDate",
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

      return { rate, effectiveDate };
    }
  }

  return null;
}

/** ריבית פריים = ריבית בנק ישראל + 1.5% */
export function calcPrime(boiRate: number | null | undefined): number | null {
  if (boiRate === null || boiRate === undefined || !Number.isFinite(boiRate)) return null;
  return Math.round((boiRate + PRIME_SPREAD) * 100) / 100;
}
