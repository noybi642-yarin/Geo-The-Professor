"use client";

import { useId, useMemo, useState } from "react";
import { fmtNum, round2 } from "@/lib/finance";
import { hebrewMonth, type CpiReading } from "@/lib/liveData";

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

// ─── גרף קו מינימלי ────────────────────────────────────────────

const W = 320;
const H = 110;
const PAD = { top: 12, right: 30, bottom: 22, left: 30 };

/**
 * גרף קו לסדרה אחת — ולכן ללא מקרא; הכותרת מזהה את הסדרה.
 * צירים דקים ונסוגים, קו 2px, ונקודות עם שטח פגיעה רחב מהסימון.
 * הערכים נגישים גם בלי הגרף — הטבלה שמתחתיו מציגה את כולם.
 */
function CpiChart({
  data,
  active,
  onActive,
}: {
  /** מהישן לחדש — כיוון ציר הזמן בגרף */
  data: CpiReading[];
  active: number | null;
  onActive: (i: number | null) => void;
}) {
  const gradId = useId();
  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  // ריפוד אנכי כדי שהקו לא ייצמד לקצוות כשהתנועה קטנה
  const span = max - min || 1;
  const lo = min - span * 0.25;
  const hi = max + span * 0.25;

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  // ציר הזמן זורם ימין→שמאל, בהתאם לכיוון הקריאה בעברית:
  // החודש הישן ביותר בקצה הימני, העדכני ביותר בקצה השמאלי
  const x = (i: number) =>
    data.length === 1
      ? PAD.left + plotW / 2
      : PAD.left + plotW - (i / (data.length - 1)) * plotW;
  const y = (v: number) => PAD.top + plotH - ((v - lo) / (hi - lo)) * plotH;

  const line = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(d.value)}`).join(" ");
  const area = `${line} L${x(data.length - 1)},${PAD.top + plotH} L${x(0)},${PAD.top + plotH} Z`;

  const first = data[0];
  const last = data[data.length - 1];

  return (
    <svg
      className="cpi-chart"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`התפתחות מדד המחירים לצרכן מ${monthLabel(first)} עד ${monthLabel(last)}`}
      onMouseLeave={() => onActive(null)}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* ציר בסיס — קו שיער נסוג, רציף ולא מקווקו */}
      <line
        x1={PAD.left}
        y1={PAD.top + plotH}
        x2={W - PAD.right}
        y2={PAD.top + plotH}
        className="cpi-axis"
      />

      <path d={area} fill={`url(#${gradId})`} />
      <path d={line} className="cpi-line" />

      {active !== null && (
        <line x1={x(active)} y1={PAD.top} x2={x(active)} y2={PAD.top + plotH} className="cpi-cross" />
      )}

      {data.map((d, i) => (
        <circle
          key={`${d.year}-${d.month}`}
          cx={x(i)}
          cy={y(d.value)}
          r={active === i ? 4.5 : 2.5}
          className={`cpi-dot${active === i ? " on" : ""}`}
        />
      ))}

      {/* תוויות קצה בלבד — לא מספר על כל נקודה.
          עיגון middle: המשמעות שלו אינה מתהפכת תחת direction: rtl */}
      <text x={x(0) - 26} y={H - 6} className="cpi-tick" textAnchor="middle">
        {`${hebrewMonth(first.month)} ${first.year}`}
      </text>
      <text x={x(data.length - 1) + 26} y={H - 6} className="cpi-tick" textAnchor="middle">
        {`${hebrewMonth(last.month)} ${last.year}`}
      </text>

      {/* שטח פגיעה רחב לכל נקודה — הצבעה בקירוב מספיקה */}
      {data.map((d, i) => (
        <rect
          key={`hit-${d.year}-${d.month}`}
          x={x(i) - plotW / data.length / 2}
          y={0}
          width={plotW / data.length}
          height={H}
          fill="transparent"
          tabIndex={0}
          role="button"
          aria-label={`${monthLabel(d)}: ${fmtIdx(d.value)}`}
          onMouseEnter={() => onActive(i)}
          onFocus={() => onActive(i)}
          onBlur={() => onActive(null)}
          onTouchStart={() => onActive(i)}
        />
      ))}
    </svg>
  );
}

// ─── תוכן ההיסטוריה ────────────────────────────────────────────

/** גרף + קריאה חיה — משמש את עמוד ההיסטוריה */
export function CpiChartPanel({ history }: { history: CpiReading[] }) {
  const [active, setActive] = useState<number | null>(null);

  // הסדרה מגיעה מהחדש לישן; הגרף מוצג מהישן לחדש
  const chronological = useMemo(() => [...history].reverse(), [history]);
  const point = active !== null ? chronological[active] : null;

  return (
    <div className="cpi-chart-wrap">
      <CpiChart data={chronological} active={active} onActive={setActive} />
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
