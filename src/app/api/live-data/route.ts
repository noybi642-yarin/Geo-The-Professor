import { NextResponse } from "next/server";
import {
  BOI_FETCH_RECORDS,
  buildBoiHistory,
  buildCpiHistory,
  calcPrime,
  CPI_FETCH_RECORDS,
  parseBoi,
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
// היסטורית. הכתובות שאחריו הן מועמדות להיסטוריה בלבד — הן נוסו
// בסדר הזה, וכל כשל שלהן אינו פוגע בריבית הנוכחית.
// ⚠️ ה-dataflow שנוסה תחת BOI.STATISTICS/RATE_BOI החזיר 404;
// הכתובת הנכונה להיסטוריה טרם אותרה.
const BOI_ENDPOINTS = [
  "https://boi.org.il/PublicApi/GetInterest",
  "https://boi.org.il/PublicApi/GetInterestRates",
  "https://boi.org.il/PublicApi/GetInterestList",
  `https://edge.boi.gov.il/FusionEdgeServer/sdmx/v2/data/dataflow/BOI.STATISTICS/RATE_BOI/1.0/all?format=jsondata&lastNObservations=${BOI_FETCH_RECORDS}`,
];

const TIMEOUT_MS = 9000;

interface Attempt {
  url: string;
  status?: number;
  ok: boolean;
  error?: string;
  /** גוף התשובה — מוחזר רק במצב debug */
  body?: unknown;
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
}> {
  const attempts: Attempt[] = [];
  let rate: BoiReading | null = null;
  let history: BoiReading[] | null = null;

  for (let i = 0; i < BOI_ENDPOINTS.length; i++) {
    if (rate && history) break;
    const { json, attempt } = await fetchJson(BOI_ENDPOINTS[i], i === 0 ? TIMEOUT_MS : 4000);
    if (json === null) {
      attempts.push(attempt);
      continue;
    }
    const gotRate: BoiReading | null = rate ?? parseBoi(json);
    const gotHistory: BoiReading[] | null = history ?? buildBoiHistory(json);
    const useful = (!rate && gotRate) || (!history && gotHistory);
    attempts.push(useful ? attempt : { ...attempt, ok: false, error: "לא נמצא נתון מוכר בתשובה" });
    rate = gotRate;
    history = gotHistory;
  }

  return { rate, history, attempts };
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

  // 200 גם בכשל חלקי — הלקוח מציג את מה שהתקבל ומשלים מהמטמון המקומי
  return NextResponse.json(
    debug
      ? {
          ...data,
          _debug: {
            cpi: cpiRes.attempts,
            boi: boiRes.attempts,
          },
        }
      : data,
    {
      headers: {
        // מטמון ב-CDN של Vercel לשעה, עם הגשה מהמטמון בזמן רענון ברקע
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
}
