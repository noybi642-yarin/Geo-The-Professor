"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { ACCENTS, DEFAULT_SETTINGS, fmtPct, round2, type Settings } from "@/lib/finance";
import { calcPrime, PRIME_SPREAD } from "@/lib/liveData";
import { fmtStamp, useLiveData } from "@/lib/useLiveData";
import { BoiChartPanel, BoiHistoryTable, PtsMark, periodLabel } from "./BoiHistory";

const SETTINGS_KEY = "sn.settings.v1";

/** צבע המבטא נלקח מאותן הגדרות כמו שאר האפליקציה */
function useAccentVars(): CSSProperties {
  const [accentKey, setAccentKey] = useState(DEFAULT_SETTINGS.accent);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const s = JSON.parse(raw) as Partial<Settings>;
        if (s.accent && ACCENTS[s.accent]) setAccentKey(s.accent);
      }
    } catch {}
  }, []);
  const a = ACCENTS[accentKey] ?? ACCENTS.blue;
  return {
    "--accent": a.accent,
    "--accent-dark": a.dark,
    "--accent-soft": a.soft,
    "--accent-ring": a.ring,
  } as CSSProperties;
}

/**
 * עמוד היסטוריית ריבית בנק ישראל — עמוד מלא ונקי.
 * משתמש באותו hook של הנתונים העדכניים, ולכן באותו מטמון ו-fallback.
 */
export default function BoiHistoryPage() {
  const accentVars = useAccentVars();
  const { data, savedAt, loading, reload } = useLiveData();

  const history = data?.boiHistory ?? null;
  const latest = history?.[0] ?? data?.boi ?? null;
  const prime = latest ? calcPrime(latest.rate) : null;

  return (
    <div className="sn-app cpi-page" style={accentVars}>
      <header className="sn-header">
        <div className="sn-header-inner">
          <div className="sn-header-row">
            <Link href="/" className="head-btn" aria-label="חזרה למסך הבית">
              → חזרה
            </Link>
            <button
              type="button"
              className="head-btn"
              onClick={reload}
              disabled={loading}
              aria-label="רענון נתונים"
            >
              {loading ? "⏳" : "🔄"}
            </button>
          </div>
          <h1 className="sn-title">🏦 היסטוריית ריבית בנק ישראל</h1>
          <p className="sn-subtitle">12 התקופות האחרונות</p>
        </div>
      </header>

      <main className="sn-container">
        {!history || history.length === 0 ? (
          <section className="panel">
            <div className="empty-note">
              {loading ? "טוען נתונים…" : "היסטוריית הריבית אינה זמינה כרגע."}
            </div>
          </section>
        ) : (
          <div className="calc-screen">
            <section className="panel cpi-summary">
              <div className="cpi-summary-main">
                <span className="cpi-summary-label">הריבית האחרונה</span>
                <span className="cpi-summary-value">{fmtPct(round2(latest!.rate))}</span>
                {latest!.changePts !== undefined && (
                  <PtsMark pts={latest!.changePts} suffix="מהתקופה הקודמת" />
                )}
              </div>
              <div className="cpi-summary-side">
                <span className="cpi-summary-label">תקופה</span>
                <b>{periodLabel(latest!)}</b>
                {prime !== null && (
                  <span className="cpi-summary-base">
                    פריים {fmtPct(prime)} (+{fmtPct(PRIME_SPREAD)})
                  </span>
                )}
              </div>
            </section>

            <section className="panel">
              <h2 className="panel-title">התפתחות הריבית</h2>
              <BoiChartPanel history={history} />
              <div className="field-hint" style={{ marginTop: 10 }}>
                הגרף מוצג במדרגות: ריבית בנק ישראל מחזיקה על ערך קבוע ומשתנה רק בהחלטה.
              </div>
            </section>

            <section className="panel">
              <h2 className="panel-title">פירוט תקופות</h2>
              <BoiHistoryTable history={history} />
              <div className="cpi-foot">
                השינוי מוצג בנקודות אחוז, לא באחוזים. הפריים מחושב: ריבית בנק ישראל +{" "}
                {fmtPct(PRIME_SPREAD)}. מקור: בנק ישראל.
                {savedAt ? ` · עודכן: ${fmtStamp(savedAt)}` : ""}
              </div>
            </section>
          </div>
        )}
      </main>

      <footer className="sn-footer">נבנה באהבה עבור נוי 💙</footer>
    </div>
  );
}
