"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { ACCENTS, DEFAULT_SETTINGS, fmtPct, round2, type Settings } from "@/lib/finance";
import { calcPrime, PRIME_SPREAD } from "@/lib/liveData";
import { fmtStamp, useLiveData } from "@/lib/useLiveData";
import AppShell from "@/components/shell/AppShell";
import { ICON_SM, ICON_STROKE, IconRateHistory, IconRefresh } from "@/components/ui/icons";
import { BoiChartPanel, BoiHistoryTable, PtsMark, periodLabel } from "./BoiHistory";
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
 * עמוד היסטוריית ריבית בנק ישראל — עמוד מלא ונקי.
 * משתמש באותו hook של הנתונים העדכניים, ולכן באותו מטמון ו-fallback.
 *
 * כל המספרים כאן מגיעים מ-/api/live-data. אין ערך קבוע בקוד.
 */
export default function BoiHistoryPage() {
  const accentVars = useAccentVars();
  const { data, savedAt, loading, reload } = useLiveData();

  const history = data?.boiHistory ?? null;
  const latest = history?.[0] ?? data?.boi ?? null;
  const prime = latest ? calcPrime(latest.rate) : null;

  return (
    <div className="sn-app" style={accentVars}>
      <AppShell
        activeHref="/boi-history"
        title="כלים ל-BDM"
        actions={
          <button type="button" className="head-btn" onClick={reload} disabled={loading}>
            <IconRefresh size={ICON_SM} strokeWidth={ICON_STROKE} aria-hidden />
            {loading ? "מרענן…" : "רענון"}
          </button>
        }
      >
        <PageHead
          icon={IconRateHistory}
          title="היסטוריית ריבית בנק ישראל"
          sub="12 התקופות האחרונות והפריים הנגזר מהן, לפי נתוני בנק ישראל"
        />

        {!history || history.length === 0 ? (
          <section className="panel">
            <div className="empty-note">
              {loading ? "טוען נתונים…" : "היסטוריית הריבית אינה זמינה כרגע."}
            </div>
          </section>
        ) : (
          <div className="calc-screen">
            {/* ── מדדי מפתח — רק נתונים שה-API כבר מחזיר ── */}
            <div className="kpi-grid">
              <div className="kpi kpi-primary">
                <span className="kpi-label">ריבית בנק ישראל</span>
                <span className="kpi-value">{fmtPct(round2(latest!.rate))}</span>
                <span className="kpi-sub">{periodLabel(latest!)}</span>
              </div>

              <div className="kpi">
                <span className="kpi-label">שינוי אחרון</span>
                <span className="kpi-value">
                  {latest!.changePts !== undefined ? (
                    <PtsMark pts={latest!.changePts} />
                  ) : (
                    "—"
                  )}
                </span>
                <span className="kpi-sub">מול התקופה הקודמת, בנקודות אחוז</span>
              </div>

              <div className="kpi">
                <span className="kpi-label">ריבית פריים</span>
                <span className="kpi-value">{prime !== null ? fmtPct(prime) : "—"}</span>
                <span className="kpi-sub">
                  ריבית בנק ישראל + {fmtPct(PRIME_SPREAD)}
                </span>
              </div>
            </div>

            <section className="panel">
              <h2 className="panel-title">התפתחות הריבית — 12 תקופות</h2>
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
      </AppShell>
    </div>
  );
}
