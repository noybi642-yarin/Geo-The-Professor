// src/hooks/useDailyBrief.ts
import { useState, useEffect } from "react";
import type { DailyBrief } from "@/types";

export function useDailyBrief() {
  const [brief, setBrief] = useState<DailyBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBrief() {
      try {
        const res = await fetch("/api/daily-brief");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setBrief(data);
      } catch (err) {
        setError("Failed to load daily brief");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchBrief();
  }, []);

  return { brief, loading, error };
}
