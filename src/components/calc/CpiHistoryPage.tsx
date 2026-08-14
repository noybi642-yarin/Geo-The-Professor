"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { ACCENTS, DEFAULT_SETTINGS, fmtNum, round2, type Settings } from "@/lib/finance";
import { hebrewMonth } from "@/lib/liveData";
import { fmtStamp, useLiveData } from "@/lib/useLiveData";
import { ChangeMark, CpiChartPanel, CpiHistoryTable } from "./CpiHistory";

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
 * עמוד היסטוריית המדד — עמוד מלא ונקי, לא שכבה מעל הדשבורד.
 * משתמש באותו hook של הנתונים העדכניים, ולכן באותו מטמון ו-fallback.
 */
export default function CpiHistoryPage() {
  const accentVars = useAccentVars();
  const { data, savedAt, loading, reload } = useLiveData();

  const history = data?.cpiHistory ?? null;
  const latest = history?.[0] ?? data?.cpi ?? null;

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
          <h1 className="sn-title">📈 היסטוריית מדד המחירים לצרכן</h1>
          <p className="sn-subtitle">12 החודשים האחרונים</p>
        </div>
      </header>

      <main className="sn-container">
        {!history || history.length === 0 ? (
          <section className="panel">
            <div className="empty-note">
              {loading ? "טוען נתונים…" : "היסטוריית המדד אינה זמינה כרגע."}
            </div>
          </section>
        ) : (
          <div className="calc-screen">
            {/* ── כרטיס סיכום ── */}
            <section className="panel cpi-summary">
              <div className="cpi-summary-main">
                <span className="cpi-summary-label">המדד האחרון</span>
                <span className="cpi-summary-value">{fmtNum(round2(latest!.value))}</span>
                {latest!.changePct !== undefined && (
                  <ChangeMark pct={latest!.changePct} suffix="מהמדד הקודם" />
                )}
              </div>
              <div className="cpi-summary-side">
                <span className="cpi-summary-label">חודש הפרסום</span>
                <b>
                  {latest!.monthName || hebrewMonth(latest!.month)} {latest!.year}
                </b>
                {latest!.yearPct !== undefined && (
                  <span className="cpi-summary-base">
                    שינוי שנתי: {fmtNum(round2(latest!.yearPct))}%
                  </span>
                )}
                {latest!.base && <span className="cpi-summary-base">בסיס: {latest!.base}</span>}
              </div>
            </section>

            {/* ── גרף ── */}
            <section className="panel">
              <h2 className="panel-title">התפתחות המדד</h2>
              <CpiChartPanel history={history} />
            </section>

            {/* ── טבלה ── */}
            <section className="panel">
              <h2 className="panel-title">פירוט חודשי</h2>
              <CpiHistoryTable history={history} />
              <div className="cpi-foot">
                השינוי החודשי מול המדד הקודם שפורסם, לא מול מדד הבסיס. השינוי השנתי מול
                החודש המקביל אשתקד. מקור: הלשכה המרכזית לסטטיסטיקה.
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
