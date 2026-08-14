"use client";

import Link from "next/link";
import { fmtNum, fmtPct, round2 } from "@/lib/finance";
import { hebrewMonth, PRIME_SPREAD } from "@/lib/liveData";

const fmtDay = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
};
import { fmtStamp, useLiveData } from "@/lib/useLiveData";
import { PtsMark } from "./BoiHistory";
import { ChangeMark } from "./CpiHistory";

/**
 * כרטיס "נתונים עדכניים".
 * מושך מ-/api/live-data (שרת — כדי לעקוף CORS ולשמור על מקור רשמי),
 * ושומר את הקריאה האחרונה שהצליחה ב-localStorage. אם המשיכה נכשלת,
 * מוצג הנתון האחרון שהתקבל עם הודעה — לעולם לא ערך מומצא או 0.
 */
export default function LiveDataCard() {
  const { data, savedAt, stale, loading, reload } = useLiveData();

  const hasAny = !!(data?.cpi || data?.boi);
  // קישור להיסטוריה מוצג רק כשיש מה להציג בה
  const hasCpiHistory = (data?.cpiHistory?.length ?? 0) > 1;
  const hasBoiHistory = (data?.boiHistory?.length ?? 0) > 1;

  return (
    <section className="panel live-card">
      <div className="live-head">
        <h2 className="panel-title" style={{ marginBottom: 0 }}>
          📡 נתונים עדכניים
        </h2>
        <button
          type="button"
          className="mini-btn"
          onClick={reload}
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
            <Link
              href="/cpi-history"
              className={`live-item${hasCpiHistory ? " live-item-btn" : ""}`}
              aria-label="מעבר לעמוד היסטוריית מדד המחירים לצרכן"
              {...(hasCpiHistory ? {} : { "aria-disabled": true, tabIndex: -1 })}
            >
              <span className="live-label">
                מדד המחירים לצרכן
                {hasCpiHistory && <span className="live-more">היסטוריה ←</span>}
              </span>
              <span className="live-value">
                {data!.cpi ? fmtNum(round2(data!.cpi.value)) : "—"}
              </span>
              {data!.cpi?.changePct !== undefined ? (
                <ChangeMark pct={data!.cpi.changePct} suffix="מהמדד הקודם" />
              ) : null}
              <span className="live-sub">
                {data!.cpi
                  ? `${data!.cpi.monthName || hebrewMonth(data!.cpi.month)} ${data!.cpi.year}`
                  : "לא זמין"}
              </span>
            </Link>

            {(() => {
              const tile = (
                <>
                  <span className="live-label">
                    ריבית בנק ישראל
                    {hasBoiHistory && <span className="live-more">היסטוריה ←</span>}
                  </span>
                  <span className="live-value">
                    {data!.boi ? fmtPct(round2(data!.boi.rate)) : "—"}
                  </span>
                  {data!.boi?.changePts !== undefined ? (
                    <PtsMark pts={data!.boi.changePts} suffix="מהתקופה הקודמת" />
                  ) : null}
                  <span className="live-sub">
                    {data!.boi?.effectiveDate
                      ? `פורסם ${fmtDay(data!.boi.effectiveDate)}`
                      : " "}
                  </span>
                  {data!.boi?.nextDecisionDate && (
                    <span className="live-sub">
                      החלטה הבאה: {fmtDay(data!.boi.nextDecisionDate)}
                    </span>
                  )}
                </>
              );
              // הכרטיס הופך לקישור רק כשיש היסטוריה להציג
              return hasBoiHistory ? (
                <Link
                  href="/boi-history"
                  className="live-item live-item-btn"
                  aria-label="מעבר לעמוד היסטוריית ריבית בנק ישראל"
                >
                  {tile}
                </Link>
              ) : (
                <div className="live-item">{tile}</div>
              );
            })()}

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
