"use client";

import { useMemo, useState } from "react";
import { fmtNum, fmtPct, round2 } from "@/lib/finance";
import { calcPrime, PRIME_SPREAD, type BoiReading } from "@/lib/liveData";
import { ICON_STROKE, IconDown, IconFlat, IconUp } from "@/components/ui/icons";
import HistoryChart, { type ChartPoint } from "./HistoryChart";

const fmtRate = (v: number) => fmtPct(round2(v));

/**
 * שינוי הריבית ב**נקודות אחוז** — לא באחוזים.
 * אייקון וצבע יחד, כדי שהכיוון לא יסתמך על צבע בלבד.
 */
export function PtsMark({ pts, suffix }: { pts: number | undefined; suffix?: string }) {
  if (pts === undefined) return null;
  const r = round2(pts);
  const dir = r > 0 ? "up" : r < 0 ? "down" : "flat";
  const Arrow = dir === "up" ? IconUp : dir === "down" ? IconDown : IconFlat;
  return (
    <span className={`cpi-change cpi-${dir}`}>
      <Arrow size={13} strokeWidth={ICON_STROKE} aria-hidden />
      {fmtNum(Math.abs(r))} נק׳{suffix ? ` ${suffix}` : ""}
    </span>
  );
}

/** תווית התקופה כפי שהגיעה מבנק ישראל (לרוב YYYY-MM) */
export function periodLabel(r: BoiReading): string {
  const raw = r.effectiveDate;
  if (!raw) return "—";
  const m = /^(\d{4})-(\d{1,2})/.exec(raw);
  if (!m) return raw;
  const HEB = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
  const mi = parseInt(m[2], 10);
  return mi >= 1 && mi <= 12 ? `${HEB[mi - 1]} ${m[1]}` : raw;
}

const shortTick = (r: BoiReading) => {
  const raw = r.effectiveDate ?? "";
  const m = /^(\d{4})-(\d{1,2})/.exec(raw);
  return m ? `${m[2]}/${m[1]}` : raw.slice(0, 7) || "—";
};

/** גרף מדרגות + קריאה חיה */
export function BoiChartPanel({ history }: { history: BoiReading[] }) {
  const [active, setActive] = useState<number | null>(null);
  const chronological = useMemo(() => [...history].reverse(), [history]);
  const points: ChartPoint[] = useMemo(
    () =>
      chronological.map((r, i) => ({
        key: `${r.effectiveDate ?? i}-${i}`,
        tick: shortTick(r),
        label: periodLabel(r),
        value: r.rate,
        display: fmtRate(r.rate),
      })),
    [chronological]
  );
  const point = active !== null ? chronological[active] : null;

  return (
    <div className="cpi-chart-wrap">
      <HistoryChart
        data={points}
        active={active}
        onActive={setActive}
        step
        ariaLabel={`התפתחות ריבית בנק ישראל מ${periodLabel(chronological[0])} עד ${periodLabel(
          chronological[chronological.length - 1]
        )}`}
      />
      <div className="cpi-readout" role="status">
        {point ? (
          <>
            <b>{fmtRate(point.rate)}</b>
            <span>{periodLabel(point)}</span>
            <PtsMark pts={point.changePts} />
          </>
        ) : (
          <span className="cpi-readout-hint">העבירי אצבע או סמן על הגרף לפרטי תקופה</span>
        )}
      </div>
    </div>
  );
}

/** טבלת התקופות — כולל הפריים הנגזר, שהוא מה שמעניין בעסקה */
export function BoiHistoryTable({ history }: { history: BoiReading[] }) {
  return (
    <div className="table-wrap">
      <table className="schedule cpi-table boi-table">
        <thead>
          <tr>
            <th>תקופה</th>
            <th>ריבית בנק ישראל</th>
            <th>שינוי</th>
            <th>פריים</th>
          </tr>
        </thead>
        <tbody>
          {history.map((r, i) => (
            <tr key={`${r.effectiveDate ?? i}-${i}`}>
              <td>{periodLabel(r)}</td>
              <td>{fmtRate(r.rate)}</td>
              <td>
                {r.changePts === undefined ? (
                  <span className="cpi-na">—</span>
                ) : (
                  <PtsMark pts={r.changePts} />
                )}
              </td>
              <td>{calcPrime(r.rate) !== null ? fmtPct(calcPrime(r.rate)!) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export { fmtRate, PRIME_SPREAD };
