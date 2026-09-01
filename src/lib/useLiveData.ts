"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LiveData } from "./liveData";

const CACHE_KEY = "sn.liveData.v1";

interface Cached {
  data: LiveData;
  savedAt: string;
}

export interface UseLiveData {
  data: LiveData | null;
  /** מועד המשיכה המוצלחת האחרונה */
  savedAt: string | null;
  /** חלק מהנתונים לא הגיעו במשיכה האחרונה */
  stale: boolean;
  loading: boolean;
  reload: () => void;
}

/**
 * משיכת הנתונים העדכניים, עם מטמון מקומי ונפילה חזרה לערך האחרון
 * שהתקבל. הלוגיקה מרוכזת כאן כדי שכרטיס הבית ועמוד ההיסטוריה
 * ישתמשו באותו מטמון בדיוק ולא ימשכו כל אחד בנפרד.
 */
export function useLiveData(): UseLiveData {
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
      cpiHistory: fresh.cpiHistory ?? prev.cpiHistory ?? null,
      boi: fresh.boi ?? prev.boi,
      boiHistory: fresh.boiHistory ?? prev.boiHistory ?? null,
      prime: fresh.prime ?? prev.prime,
      fetchedAt: fresh.fetchedAt,
      errors: fresh.errors,
    };
  }, []);

  /**
   * force=true הוא לחיצה על "רענון".
   *
   * cache:"no-store" לבדו נוגע רק במטמון הדפדפן — הבקשה עדיין
   * נוחתת על אותה כתובת ב-CDN ומקבלת את אותם בייטים שמורים. לכן
   * משיכה מאולצת מוסיפה חותמת זמן לכתובת: מפתח מטמון חדש, ולכן
   * בהכרח פנייה חדשה לשרת, שגם הוא יעקוף את המטמון שלו.
   */
  const load = useCallback(async (force = false) => {
    setLoading(true);
    let cached: Cached | null = null;
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) cached = JSON.parse(raw) as Cached;
    } catch {}

    // מציגים מיד את הנתון השמור, כדי שלא יהיה מסך ריק בזמן המשיכה
    if (cached?.data) {
      setData(cached.data);
      setSavedAt(cached.savedAt);
    }

    try {
      const url = force ? `/api/live-data?fresh=${Date.now()}` : "/api/live-data";
      const res = await fetch(url, { cache: "no-store" });
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

  return { data, savedAt, stale, loading, reload: () => void load(true) };
}

export const fmtStamp = (iso: string) => {
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
