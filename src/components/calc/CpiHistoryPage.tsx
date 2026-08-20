"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { ACCENTS, DEFAULT_SETTINGS, fmtNum, round2, type Settings } from "@/lib/finance";
import { hebrewMonth } from "@/lib/liveData";
import { fmtStamp, useLiveData } from "@/lib/useLiveData";
import AppShell from "@/components/shell/AppShell";
import {
  ICON_SM,
  ICON_STROKE,
  IconCpiHistory,
  IconRefresh,
} from "@/components/ui/icons";
import { ChangeMark, CpiChartPanel, CpiHistoryTable } from "./CpiHistory";
import { PageHead } from "./shared";

const SETTINGS_KEY = "sn.settings.v1";

/** גוון הממשק נלקח מאותן הגדרות כמו שאר האפליקציה */
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
  const a = ACCENTS[accentKey] ?? ACCENTS.forest;
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
 *
 * כל המספרים כאן מגיעים מ-/api/live-data. אין ערך קבוע בקוד.
 */
export default function CpiHistoryPage() {
  const accentVars = useAccentVars();
  const { data, savedAt, loading, reload } = useLiveData();

  const history = data?.cpiHistory ?? null;
  const latest = history?.[0] ?? data?.cpi ?? null;

  return (
    <div className="sn-app" style={accentVars}>
      <AppShell
        activeHref="/cpi-history"
        title="כלים ל-BDM"
        actions={
          <button type="button" className="head-btn" onClick={reload} disabled={loading}>
            <IconRefresh size={ICON_SM} strokeWidth={ICON_STROKE} aria-hidden />
            {loading ? "מרענן…" : "רענון"}
          </button>
        }
      >
        <PageHead
          icon={IconCpiHistory}
          title="היסטוריית מדד המחירים לצרכן"
          sub="12 החודשים האחרונים לפי נתוני הלשכה המרכזית לסטטיסטיקה"
        />

        {!history || history.length === 0 ? (
          <section className="panel">
            <div className="empty-note">
              {loading ? "טוען נתונים…" : "היסטוריית המדד אינה זמינה כרגע."}
            </div>
          </section>
        ) : (
          <div className="calc-screen">
            {/* ── מדדי מפתח — רק נתונים שה-API כבר מחזיר ── */}
            <div className="kpi-grid">
              <div className="kpi kpi-primary">
                <span className="kpi-label">מדד נוכחי</span>
                <span className="kpi-value">{fmtNum(round2(latest!.value))}</span>
                <span className="kpi-sub">
                  {latest!.monthName || hebrewMonth(latest!.month)} {latest!.year}
                  {latest!.base ? ` · בסיס ${latest!.base}` : ""}
                </span>
              </div>

              <div className="kpi">
                <span className="kpi-label">שינוי חודשי</span>
                <span className="kpi-value">
                  {latest!.changePct !== undefined ? (
                    <ChangeMark pct={latest!.changePct} />
                  ) : (
                    "—"
                  )}
                </span>
                <span className="kpi-sub">מול המדד הקודם שפורסם</span>
              </div>

              <div className="kpi">
                <span className="kpi-label">שינוי שנתי</span>
                <span className="kpi-value">
                  {latest!.yearPct !== undefined
                    ? `${fmtNum(round2(latest!.yearPct))}%`
                    : "—"}
                </span>
                <span className="kpi-sub">מול החודש המקביל אשתקד</span>
              </div>
            </div>

            <section className="panel">
              <h2 className="panel-title">התפתחות המדד — 12 חודשים</h2>
              <CpiChartPanel history={history} />
            </section>

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
      </AppShell>
    </div>
  );
}
