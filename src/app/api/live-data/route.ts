import { NextResponse } from "next/server";
import {
  calcPrime,
  parseBoi,
  parseCpi,
  type BoiReading,
  type CpiReading,
  type LiveData,
} from "@/lib/liveData";

export const runtime = "nodejs";
// הנתונים מתעדכנים אחת לחודש (מדד) ואחת לכמה שבועות (ריבית),
// ולכן שעה של cache בצד השרת היא איזון סביר בין טריות לעומס.
export const revalidate = 3600;

/** מקורות רשמיים בלבד — ללא scraping וללא מנועי חיפוש */
const CPI_ENDPOINTS = [
  "https://api.cbs.gov.il/index/data/price?id=120010&format=json&download=false&last=2",
  "https://api.cbs.gov.il/index/data/price?id=120010&format=json&download=false",
  "https://api.cbs.gov.il/index/data/price_selected?id=120010&format=json&download=false&last=2",
];

const BOI_ENDPOINTS = [
  "https://boi.org.il/PublicApi/GetInterest",
  "https://edge.boi.gov.il/FusionEdgeServer/sdmx/v2/data/dataflow/BOI.STATISTICS/RATE_BOI/1.0/all?format=jsondata&lastNObservations=1",
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

async function fetchJson(url: string): Promise<{ json: unknown; attempt: Attempt }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
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

export async function GET(request: Request) {
  const debug = new URL(request.url).searchParams.get("debug") === "1";

  const [cpiRes, boiRes] = await Promise.all([
    resolve<CpiReading>(CPI_ENDPOINTS, parseCpi),
    resolve<BoiReading>(BOI_ENDPOINTS, parseBoi),
  ]);

  const errors: LiveData["errors"] = [];
  if (!cpiRes.value)
    errors.push({
      source: "cpi",
      message: cpiRes.attempts.map((a) => a.error).filter(Boolean).join(" · ") || "לא זמין",
    });
  if (!boiRes.value)
    errors.push({
      source: "boi",
      message: boiRes.attempts.map((a) => a.error).filter(Boolean).join(" · ") || "לא זמין",
    });

  const data: LiveData = {
    cpi: cpiRes.value,
    boi: boiRes.value,
    prime: calcPrime(boiRes.value?.rate),
    fetchedAt: new Date().toISOString(),
    errors,
  };

  // 200 גם בכשל חלקי — הלקוח מציג את מה שהתקבל ומשלים מהמטמון המקומי
  return NextResponse.json(
    debug
      ? { ...data, _debug: { cpi: cpiRes.attempts, boi: boiRes.attempts } }
      : data,
    {
      headers: {
        // מטמון ב-CDN של Vercel לשעה, עם הגשה מהמטמון בזמן רענון ברקע
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
}
