import { NextResponse } from "next/server";
import {
  BOI_FETCH_OBSERVATIONS,
  BOI_HISTORY_MONTHS,
  cacheHeaderFor,
  LIVE_CACHE_SECONDS,
  buildBoiHistory,
  buildCpiHistory,
  calcPrime,
  CPI_FETCH_RECORDS,
  parseBoi,
  parseDataflowCatalog,
  sdmxSeriesList,
  type BoiReading,
  type CpiReading,
  type LiveData,
} from "@/lib/liveData";

export const runtime = "nodejs";
// חלון המטמון מוגדר במקום אחד (liveData) ומשמש כאן גם למקטע הנתיב
// וגם למשיכות מהמקורות, כדי ששתי השכבות לא יחזיקו גילאים שונים.
export const revalidate = LIVE_CACHE_SECONDS;

/** מקורות רשמיים בלבד — ללא scraping וללא מנועי חיפוש */
// קריאה אחת מחזירה את כל ההיסטוריה הדרושה — אין קריאה לכל חודש.
// last=13 כדי שגם לחודש ה-12 המוצג יהיה מול מה לחשב שינוי.
const CPI_ENDPOINTS = [
  `https://api.cbs.gov.il/index/data/price?id=120010&format=json&download=false&last=${CPI_FETCH_RECORDS}`,
  "https://api.cbs.gov.il/index/data/price?id=120010&format=json&download=false",
  `https://api.cbs.gov.il/index/data/price_selected?id=120010&format=json&download=false&last=${CPI_FETCH_RECORDS}`,
];

// ה-PublicApi מאומת ומחזיר את הריבית הנוכחית; אחריו עולם התוכן
// BR — ״ריבית בנק ישראל״ — לסדרה ההיסטורית. כשל בשני אינו נוגע
// בראשון.
//
// שתי טעויות קודמות, שנשללו מול תשובות אמיתיות מהפרודקשן:
// · עולם התוכן: RATE_BOI אינו קיים כלל, ו-BIR הוא ״ריביות
//   וביצועים - לא לדיור״ — ריביות האשראי של הבנקים המסחריים.
//   הנכון הוא BR, לפי הקטלוג של edge.boi.gov.il.
// · צורת הכתובת: ‎/all בסוף הנתיב ו-format=jsondata החזירו 404.
//   הצורה שעובדת היא בלי מפתח סדרה ועם format=sdmx-json.
const EDGE = "https://edge.boi.gov.il/FusionEdgeServer";
const BOI_ENDPOINTS = [
  "https://boi.org.il/PublicApi/GetInterest",
  `${EDGE}/sdmx/v2/data/dataflow/BOI.STATISTICS/BR/1.0?lastNObservations=${BOI_FETCH_OBSERVATIONS}&format=sdmx-json`,
];

/**
 * קטלוג עולמות התוכן של בנק ישראל — נמשך רק במצב אבחון.
 * התשובה הגולמית ארוכה מכדי להיחתך בצורה שימושית, ולכן היא
 * מפורסרת לרשימת מזהים ושמות.
 */
const BOI_CATALOG_URL = `${EDGE}/ws/public/sdmxapi/rest/dataflow/BOI.STATISTICS/all/latest?format=sdmx-json&detail=allstubs`;

const TIMEOUT_MS = 9000;
/** הסדרה ההיסטורית אינה חוסמת את שאר הנתונים, ולכן תקציב קצר יותר */
const HISTORY_TIMEOUT_MS = 6000;

interface Attempt {
  url: string;
  status?: number;
  ok: boolean;
  error?: string;
  /** גוף התשובה — מוחזר רק במצב debug */
  body?: unknown;
}

/** תיאור סדרה שנמצאה בתשובת SDMX — לאבחון בלבד */
interface SeriesNote {
  url: string;
  key: string;
  label: string;
  count: number;
  latest?: number;
  latestPeriod?: string;
}

/**
 * fresh=true עוקף את מטמון הנתונים של Next. בלעדיו גם ריצה חדשה
 * של הנתיב עלולה לקבל תשובה ישנה מהמקור — וזו הסיבה שכפתור הרענון
 * לא רענן דבר.
 */
async function fetchJson(
  url: string,
  timeoutMs = TIMEOUT_MS,
  fresh = false
): Promise<{ json: unknown; attempt: Attempt }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json", "User-Agent": "shalom-noy-calc/1.0" },
      ...(fresh ? { cache: "no-store" as const } : { next: { revalidate } }),
    });
    const text = await res.text();
    if (!res.ok) {
      return {
        json: null,
        attempt: { url, status: res.status, ok: false, error: `HTTP ${res.status}` },
      };
    }
    try {
      const json = JSON.parse(text);
      return { json, attempt: { url, status: res.status, ok: true, body: json } };
    } catch {
      return {
        json: null,
        attempt: { url, status: res.status, ok: false, error: "התשובה אינה JSON תקין" },
      };
    }
  } catch (e) {
    const msg = e instanceof Error ? (e.name === "AbortError" ? "timeout" : e.message) : "שגיאה";
    return { json: null, attempt: { url, ok: false, error: msg } };
  } finally {
    clearTimeout(timer);
  }
}

/** מנסה את המקורות לפי הסדר עד שאחד מהם מחזיר נתון שניתן לפענח */
async function resolve<T>(
  urls: string[],
  parse: (json: unknown) => T | null,
  fresh = false
): Promise<{ value: T | null; attempts: Attempt[] }> {
  const attempts: Attempt[] = [];
  for (const url of urls) {
    const { json, attempt } = await fetchJson(url, TIMEOUT_MS, fresh);
    if (json !== null) {
      const value = parse(json);
      if (value) {
        attempts.push(attempt);
        return { value, attempts };
      }
      attempts.push({ ...attempt, ok: false, error: "לא נמצא נתון מוכר בתשובה" });
    } else {
      attempts.push(attempt);
    }
  }
  return { value: null, attempts };
}

/**
 * משיכת ריבית בנק ישראל וההיסטוריה שלה במעבר אחד על הכתובות.
 * כל תשובה נבדקת לשני הצרכים, כדי לא למשוך את אותה כתובת פעמיים.
 * הכתובות שאחרי הראשונה מקבלות תקציב זמן קצר יותר — הן מועמדות
 * להיסטוריה בלבד, ואין להאט בגללן את שאר הנתונים.
 */
async function resolveBoi(fresh = false): Promise<{
  rate: BoiReading | null;
  history: BoiReading[] | null;
  attempts: Attempt[];
  series: SeriesNote[];
}> {
  const attempts: Attempt[] = [];
  const series: SeriesNote[] = [];
  let rate: BoiReading | null = null;
  let history: BoiReading[] | null = null;

  for (let i = 0; i < BOI_ENDPOINTS.length; i++) {
    if (rate && history) break;
    const { json, attempt } = await fetchJson(
      BOI_ENDPOINTS[i],
      i === 0 ? TIMEOUT_MS : HISTORY_TIMEOUT_MS,
      fresh
    );
    if (json === null) {
      attempts.push(attempt);
      continue;
    }
    // תיעוד הסדרות שנמצאו — כך אפשר לראות מדוע סדרה לא נבחרה
    for (const s of sdmxSeriesList(json)) {
      series.push({
        url: BOI_ENDPOINTS[i],
        key: s.key,
        label: s.label,
        count: s.readings.length,
        latest: s.readings[0]?.rate,
        latestPeriod: s.readings[0]?.effectiveDate,
      });
    }
    const gotRate: BoiReading | null = rate ?? parseBoi(json);
    // הריבית הנוכחית מ-PublicApi כבר ידועה בשלב הזה, ומשמשת לאמת
    // איזו סדרה בעולם התוכן היא באמת ריבית בנק ישראל
    const gotHistory: BoiReading[] | null =
      history ?? buildBoiHistory(json, BOI_HISTORY_MONTHS, rate?.rate);
    const useful = (!rate && gotRate) || (!history && gotHistory);
    attempts.push(useful ? attempt : { ...attempt, ok: false, error: "לא נמצא נתון מוכר בתשובה" });
    rate = gotRate;
    history = gotHistory;
  }

  return { rate, history, attempts, series };
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const debug = params.get("debug") === "1";
  // כפתור הרענון שולח fresh עם חותמת זמן: הערך משתנה בכל לחיצה,
  // ולכן גם ל-CDN אין עותק שמור להחזיר. האבחון תמיד טרי.
  const fresh = debug || params.has("fresh");

  const [cpiRes, boiRes] = await Promise.all([
    // הסדרה נפתרת בבת אחת: הקריאה העדכנית היא האיבר הראשון בה
    resolve<CpiReading[]>(CPI_ENDPOINTS, (json) => buildCpiHistory(json), fresh),
    resolveBoi(fresh),
  ]);

  const history = cpiRes.value;
  const latest = history?.[0] ?? null;
  const boiHistory = boiRes.history;

  const errors: LiveData["errors"] = [];
  if (!latest)
    errors.push({
      source: "cpi",
      message: cpiRes.attempts.map((a) => a.error).filter(Boolean).join(" · ") || "לא זמין",
    });
  if (!boiRes.rate)
    errors.push({
      source: "boi",
      message: boiRes.attempts.map((a) => a.error).filter(Boolean).join(" · ") || "לא זמין",
    });

  const data: LiveData = {
    cpi: latest,
    // כשל בהיסטוריה אינו פוגע במדד הנוכחי, בריבית בנק ישראל או בפריים
    cpiHistory: history && history.length > 1 ? history : null,
    boi: boiRes.rate,
    // כשל בהיסטוריה אינו פוגע בריבית הנוכחית או בפריים
    boiHistory: boiHistory && boiHistory.length > 1 ? boiHistory : null,
    prime: calcPrime(boiRes.rate?.rate),
    fetchedAt: new Date().toISOString(),
    errors,
  };

  // בדיקות האבחון נמשכות רק במצב debug, ולעולם אינן מזינות נתון מוצג
  const catalog = debug
    ? await fetchJson(BOI_CATALOG_URL, 8000, true).then(({ json, attempt }) => ({
        status: attempt.status,
        error: attempt.error,
        flows: parseDataflowCatalog(json as Parameters<typeof parseDataflowCatalog>[0]),
      }))
    : null;

  // 200 גם בכשל חלקי — הלקוח מציג את מה שהתקבל ומשלים מהמטמון המקומי
  return NextResponse.json(
    debug
      ? {
          ...data,
          _debug: {
            cpi: cpiRes.attempts,
            boi: boiRes.attempts,
            boiSeries: boiRes.series,
            boiCatalog: catalog,
          },
        }
      : data,
    {
      headers: {
        // משיכה מאולצת ואבחון אינם נשמרים במטמון בשום שכבה
        "Cache-Control": cacheHeaderFor(fresh ? "fresh" : "cached"),
      },
    }
  );
}
