"use client";

import { useMemo, useState } from "react";
import { fmtNum, round2 } from "@/lib/finance";
import { hebrewMonth, type CpiReading } from "@/lib/liveData";
import HistoryChart, { type ChartPoint } from "./HistoryChart";

const fmtIdx = (v: number) => fmtNum(round2(v));

/** ↑ עלייה · ↓ ירידה · — ללא שינוי */
export function ChangeMark({
  pct,
  suffix,
  className = "",
}: {
  pct: number | undefined;
  suffix?: string;
  className?: string;
}) {
  if (pct === undefined) return null;
  const r = round2(pct);
  const dir = r > 0 ? "up" : r < 0 ? "down" : "flat";
  const arrow = dir === "up" ? "↑" : dir === "down" ? "↓" : "—";
  return (
    <span className={`cpi-change cpi-${dir} ${className}`.trim()}>
      <span aria-hidden>{arrow}</span> {fmtNum(Math.abs(r))}%
      {suffix ? ` ${suffix}` : ""}
    </span>
  );
}

const monthLabel = (r: CpiReading) => `${r.monthName || hebrewMonth(r.month)} ${r.year}`;

// ─── תוכן ההיסטוריה ────────────────────────────────────────────

/** גרף + קריאה חיה — משמש את עמוד ההיסטוריה */
export function CpiChartPanel({ history }: { history: CpiReading[] }) {
  const [active, setActive] = useState<number | null>(null);

  // הסדרה מגיעה מהחדש לישן; הגרף מוצג מהישן לחדש
  const chronological = useMemo(() => [...history].reverse(), [history]);
  const points: ChartPoint[] = useMemo(
    () =>
      chronological.map((r) => ({
        key: `${r.year}-${r.month}`,
        tick: `${hebrewMonth(r.month)} ${r.year}`,
        label: monthLabel(r),
        value: r.value,
        display: fmtIdx(r.value),
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
        ariaLabel={`התפתחות מדד המחירים לצרכן מ${monthLabel(chronological[0])} עד ${monthLabel(
          chronological[chronological.length - 1]
        )}`}
      />
      <div className="cpi-readout" role="status">
        {point ? (
          <>
            <b>{fmtIdx(point.value)}</b>
            <span>{monthLabel(point)}</span>
            <ChangeMark pct={point.changePct} />
          </>
        ) : (
          <span className="cpi-readout-hint">
            העבירי אצבע או סמן על הגרף לפרטי חודש
          </span>
        )}
      </div>
    </div>
  );
}

/** טבלת 12 החודשים — כל ערך נגיש גם בלי הגרף */
export function CpiHistoryTable({ history }: { history: CpiReading[] }) {
  return (
    <div className="table-wrap">
      <table className="schedule cpi-table">
        <thead>
          <tr>
            <th>חודש</th>
            <th>ערך המדד</th>
            <th>שינוי חודשי</th>
          </tr>
        </thead>
        <tbody>
          {history.map((r) => (
            <tr key={`${r.year}-${r.month}`}>
              <td>{monthLabel(r)}</td>
              <td>{fmtIdx(r.value)}</td>
              <td>
                {r.changePct === undefined ? (
                  <span className="cpi-na">—</span>
                ) : (
                  <ChangeMark pct={r.changePct} />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export { fmtIdx, monthLabel };
