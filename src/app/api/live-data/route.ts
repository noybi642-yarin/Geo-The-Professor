import { NextResponse } from "next/server";
import {
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
// הנתונים מתעדכנים אחת לחודש (מדד) ואחת לכמה שבועות (ריבית),
// ולכן שעה של cache בצד השרת היא איזון סביר בין טריות לעומס.
export const revalidate = 3600;

/** מקורות רשמיים בלבד — ללא scraping וללא מנועי חיפוש */
// קריאה אחת מחזירה את כל ההיסטוריה הדרושה — אין קריאה לכל חודש.
// last=13 כדי שגם לחודש ה-12 המוצג יהיה מול מה לחשב שינוי.
const CPI_ENDPOINTS = [
  `https://api.cbs.gov.il/index/data/price?id=120010&format=json&download=false&last=${CPI_FETCH_RECORDS}`,
  "https://api.cbs.gov.il/index/data/price?id=120010&format=json&download=false",
  `https://api.cbs.gov.il/index/data/price_selected?id=120010&format=json&download=false&last=${CPI_FETCH_RECORDS}`,
];

// ה-PublicApi מאומת ומחזיר את הריבית הנוכחית, אך ללא סדרה
// היסטורית. הכתובת הנכונה להיסטוריה טרם אותרה, וכל עוד היא לא
// אותרה מוטב בלי היסטוריה מאשר עם מספר שאינו ריבית בנק ישראל.
//
// מה שנשלל עד כה, לפי תשובות אמיתיות מהפרודקשן:
// · BOI.STATISTICS/RATE_BOI — 404, ה-dataflow אינו קיים
// · BOI.STATISTICS/BIR — קיים, אבל הוא ״ריביות וביצועים - לא
//   לדיור״: ריביות האשראי של הבנקים המסחריים, לא ריבית המדיניות
const EDGE = "https://edge.boi.gov.il/FusionEdgeServer";
const BOI_ENDPOINTS = ["https://boi.org.il/PublicApi/GetInterest"];

/**
 * קטלוג עולמות התוכן של בנק ישראל — נמשך רק במצב אבחון.
 * התשובה הגולמית ארוכה מכדי להיחתך בצורה שימושית, ולכן היא
 * מפורסרת לרשימת מזהים ושמות.
 */
const BOI_CATALOG_URL = `${EDGE}/ws/public/sdmxapi/rest/dataflow/BOI.STATISTICS/all/latest?format=sdmx-json&detail=allstubs`;

/**
 * ניסויי צורת כתובת — אבחון בלבד, לעולם לא מזינים נתון מוצג.
 * נתיב המבנה מחזיר 200 בעוד נתיב הנתונים מחזיר 404, ולכן כאן
 * נבדקות צורות שונות של נתיב הנתונים מול BIR — עולם תוכן שידוע
 * שקיים. מה שמעניין הוא הסטטוס, לא התוכן.
 */
const BOI_PROBE_ENDPOINTS = [
  `${EDGE}/ws/public/sdmxapi/rest/data/BOI.STATISTICS,BIR,1.0/all/all?lastNObservations=1&format=jsondata`,
  `${EDGE}/ws/public/sdmxapi/rest/data/BIR?lastNObservations=1&format=jsondata`,
  `${EDGE}/sdmx/v2/data/dataflow/BOI.STATISTICS/BIR/1.0?lastNObservations=1&format=sdmx-json`,
  `${EDGE}/sdmx/v2/data/dataflow/BOI.STATISTICS/BIR/1.0/*?lastNObservations=1&format=sdmx-json`,
];

const TIMEOUT_MS = 9000;
/** גוף תשובת אבחון נחתך — הסטטוס הוא מה שמעניין, לא המבנה המלא */
const PROBE_BODY_CHARS = 700;

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

async function fetchJson(
  url: string,
  timeoutMs = TIMEOUT_MS
): Promise<{ json: unknown; attempt: Attempt }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json", "User-Agent": "shalom-noy-calc/1.0" },
      next: { revalidate },
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

/** משיכת טקסט גולמי קצוץ, לאבחון בלבד */
async function probe(url: string): Promise<Attempt> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "shalom-noy-calc/1.0" },
      cache: "no-store",
    });
    const text = await res.text();
    return {
      url,
      status: res.status,
      ok: res.ok,
      error: res.ok ? undefined : `HTTP ${res.status}`,
      body: text.slice(0, PROBE_BODY_CHARS),
    };
  } catch (e) {
    const msg = e instanceof Error ? (e.name === "AbortError" ? "timeout" : e.message) : "שגיאה";
    return { url, ok: false, error: msg };
  } finally {
    clearTimeout(timer);
  }
}

/** מנסה את המקורות לפי הסדר עד שאחד מהם מחזיר נתון שניתן לפענח */
async function resolve<T>(
  urls: string[],
  parse: (json: unknown) => T | null
): Promise<{ value: T | null; attempts: Attempt[] }> {
  const attempts: Attempt[] = [];
  for (const url of urls) {
    const { json, attempt } = await fetchJson(url);
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
async function resolveBoi(): Promise<{
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
    const { json, attempt } = await fetchJson(BOI_ENDPOINTS[i], i === 0 ? TIMEOUT_MS : 4000);
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
    const gotHistory: BoiReading[] | null = history ?? buildBoiHistory(json);
    const useful = (!rate && gotRate) || (!history && gotHistory);
    attempts.push(useful ? attempt : { ...attempt, ok: false, error: "לא נמצא נתון מוכר בתשובה" });
    rate = gotRate;
    history = gotHistory;
  }

  return { rate, history, attempts, series };
}

export async function GET(request: Request) {
  const debug = new URL(request.url).searchParams.get("debug") === "1";

  const [cpiRes, boiRes] = await Promise.all([
    // הסדרה נפתרת בבת אחת: הקריאה העדכנית היא האיבר הראשון בה
    resolve<CpiReading[]>(CPI_ENDPOINTS, (json) => buildCpiHistory(json)),
    resolveBoi(),
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
  const [probes, catalog] = debug
    ? await Promise.all([
        Promise.all(BOI_PROBE_ENDPOINTS.map(probe)),
        fetchJson(BOI_CATALOG_URL, 8000).then(({ json, attempt }) => ({
          status: attempt.status,
          error: attempt.error,
          flows: parseDataflowCatalog(json as Parameters<typeof parseDataflowCatalog>[0]),
        })),
      ])
    : [[], null];

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
            boiProbes: probes,
          },
        }
      : data,
    {
      headers: {
        // מטמון ב-CDN של Vercel לשעה, עם הגשה מהמטמון בזמן רענון ברקע.
        // תשובת אבחון אינה נשמרת במטמון — היא נועדה לבדיקה חוזרת מיידית.
        "Cache-Control": debug
          ? "no-store"
          : "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
}
