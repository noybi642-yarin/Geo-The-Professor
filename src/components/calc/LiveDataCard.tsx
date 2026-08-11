"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fmtNum, fmtPct, round2 } from "@/lib/finance";
import { hebrewMonth, PRIME_SPREAD, type LiveData } from "@/lib/liveData";

const CACHE_KEY = "sn.liveData.v1";

interface Cached {
  data: LiveData;
  savedAt: string;
}

const fmtStamp = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
};

/**
 * כרטיס "נתונים עדכניים".
 * מושך מ-/api/live-data (שרת — כדי לעקוף CORS ולשמור על מקור רשמי),
 * ושומר את הקריאה האחרונה שהצליחה ב-localStorage. אם המשיכה נכשלת,
 * מוצג הנתון האחרון שהתקבל עם הודעה — לעולם לא ערך מומצא או 0.
 */
export default function LiveDataCard() {
  const [data, setData] = useState<LiveData | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /** מיזוג: כל שדה שהתקבל מתעדכן, שדה שנכשל שומר על הערך האחרון הידוע */
  const merge = useCallback((fresh: LiveData, prev: LiveData | null): LiveData => {
    if (!prev) return fresh;
    return {
      cpi: fresh.cpi ?? prev.cpi,
      boi: fresh.boi ?? prev.boi,
      prime: fresh.prime ?? prev.prime,
      fetchedAt: fresh.fetchedAt,
      errors: fresh.errors,
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    let cached: Cached | null = null;
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) cached = JSON.parse(raw) as Cached;
    } catch {}

    // מציגים מיד את הנתון השמור, כדי שהכרטיס לא יהיה ריק בזמן המשיכה
    if (cached?.data) {
      setData(cached.data);
      setSavedAt(cached.savedAt);
    }

    try {
      const res = await fetch("/api/live-data", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const fresh = (await res.json()) as LiveData;
      if (!mounted.current) return;

      const gotSomething = !!(fresh.cpi || fresh.boi);
      const merged = merge(fresh, cached?.data ?? null);
      setData(merged);

      if (gotSomething) {
        const savedStamp = fresh.fetchedAt;
        setSavedAt(savedStamp);
        try {
          localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ data: merged, savedAt: savedStamp } satisfies Cached)
          );
        } catch {}
      }
      // "לא התעדכן" = חלק מהנתונים לא הגיעו במשיכה הנוכחית
      setStale(fresh.errors.length > 0);
    } catch {
      if (!mounted.current) return;
      setStale(true);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [merge]);

  useEffect(() => {
    void load();
  }, [load]);

  const hasAny = !!(data?.cpi || data?.boi);

  return (
    <section className="panel live-card">
      <div className="live-head">
        <h2 className="panel-title" style={{ marginBottom: 0 }}>
          📡 נתונים עדכניים
        </h2>
        <button
          type="button"
          className="mini-btn"
          onClick={() => void load()}
          disabled={loading}
        >
          {loading ? "⏳ מרענן…" : "🔄 רענון נתונים"}
        </button>
      </div>

      {stale && hasAny && (
        <div className="alert alert-bdm live-stale">🔶 המידע לא התעדכן כרגע</div>
      )}

      {!hasAny ? (
        <div className="empty-note">
          {loading ? "טוען נתונים…" : "המידע לא התעדכן כרגע ואין נתון שמור להצגה"}
        </div>
      ) : (
        <>
          <div className="live-grid">
            <div className="live-item">
              <span className="live-label">מדד המחירים לצרכן</span>
              <span className="live-value">
                {data!.cpi ? fmtNum(round2(data!.cpi.value)) : "—"}
              </span>
              <span className="live-sub">
                {data!.cpi
                  ? `${data!.cpi.monthName || hebrewMonth(data!.cpi.month)} ${data!.cpi.year}`
                  : "לא זמין"}
              </span>
            </div>

            <div className="live-item">
              <span className="live-label">ריבית בנק ישראל</span>
              <span className="live-value">
                {data!.boi ? fmtPct(round2(data!.boi.rate)) : "—"}
              </span>
              <span className="live-sub">
                {data!.boi?.effectiveDate ? `מתאריך ${data!.boi.effectiveDate}` : " "}
              </span>
            </div>

            <div className="live-item live-prime">
              <span className="live-label">ריבית פריים</span>
              <span className="live-value">
                {data!.prime !== null ? fmtPct(data!.prime) : "—"}
              </span>
              <span className="live-sub">
                {data!.boi
                  ? `בנק ישראל ${fmtPct(round2(data!.boi.rate))} + ${fmtPct(PRIME_SPREAD)}`
                  : "לא זמין"}
              </span>
            </div>
          </div>

          {data!.cpi?.base && <div className="live-foot">בסיס המדד: {data!.cpi.base}</div>}
          <div className="live-foot">
            עודכן: {savedAt ? fmtStamp(savedAt) : "—"}
            {" · "}
            מקורות: הלמ״ס ובנק ישראל
          </div>
        </>
      )}
    </section>
  );
}
