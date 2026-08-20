"use client";

import { useId } from "react";

export interface ChartPoint {
  /** מפתח ייחודי לנקודה */
  key: string;
  /** תווית קצרה לציר (חודש) */
  tick: string;
  /** תווית מלאה לקורא המסך */
  label: string;
  value: number;
  /** ערך מעוצב, לתיאור הנגישות */
  display: string;
}

/**
 * ה-viewBox נבחר גדול יחסית בכוונה: ה-SVG נמתח לרוחב המכל, וכל
 * מה שבתוכו נמתח איתו. viewBox צר היה מגדיל את עובי הקו פי כמה
 * במסך רחב. בגודל הזה יחס ההגדלה קרוב ל-1 בדסקטופ.
 */
const W = 640;
const H = 220;
const PAD = { top: 16, right: 12, bottom: 12, left: 12 };
/** קווי רשת אופקיים — נסוגים, רק כדי לתת קנה מידה לעין */
const GRID_LINES = 4;

/**
 * גרף היסטוריה לסדרה אחת — ולכן ללא מקרא; הכותרת מזהה את הסדרה.
 * צירים דקים ונסוגים, קו 2px, ושטח פגיעה רחב בהרבה מהנקודות.
 * הערכים נגישים גם בלי הגרף — הטבלה שלצידו מציגה את כולם.
 *
 * תוויות הציר הן HTML ולא טקסט בתוך ה-SVG: טקסט בתוך SVG נמתח
 * יחד עם המכל ומאבד את גודלו, ומחוץ לו הוא נשאר בטיפוגרפיה של
 * המערכת בכל רוחב מסך.
 *
 * step: ריבית מדיניות מחזיקה על ערך קבוע וקופצת בהחלטה. קו משופע
 * היה מרמז על שינוי הדרגתי שלא קרה, ולכן היא מוצגת במדרגות.
 */
export default function HistoryChart({
  data,
  active,
  onActive,
  ariaLabel,
  step = false,
}: {
  /** מהישן לחדש — כיוון ציר הזמן בנתונים */
  data: ChartPoint[];
  active: number | null;
  onActive: (i: number | null) => void;
  ariaLabel: string;
  step?: boolean;
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
  // ציר הזמן זורם ימין←שמאל, בהתאם לכיוון הקריאה בעברית:
  // התקופה הישנה ביותר בקצה הימני, העדכנית ביותר בקצה השמאלי
  const x = (i: number) =>
    data.length === 1
      ? PAD.left + plotW / 2
      : PAD.left + plotW - (i / (data.length - 1)) * plotW;
  const y = (v: number) => PAD.top + plotH - ((v - lo) / (hi - lo)) * plotH;

  const line = data
    .map((d, i) => {
      if (i === 0) return `M${x(i)},${y(d.value)}`;
      // במדרגות: מחזיקים את הערך הקודם עד לנקודה ואז קופצים
      return step
        ? `L${x(i)},${y(data[i - 1].value)} L${x(i)},${y(d.value)}`
        : `L${x(i)},${y(d.value)}`;
    })
    .join(" ");
  const area = `${line} L${x(data.length - 1)},${PAD.top + plotH} L${x(0)},${PAD.top + plotH} Z`;

  const first = data[0];
  const last = data[data.length - 1];

  return (
    <div className="chart-frame">
      <svg
        className="cpi-chart"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={ariaLabel}
        onMouseLeave={() => onActive(null)}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand-800)" stopOpacity="0.1" />
            <stop offset="100%" stopColor="var(--brand-800)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* רשת אופקית נסוגה — קנה מידה בלי להתחרות בקו הנתונים */}
        {Array.from({ length: GRID_LINES }, (_, i) => {
          const gy = PAD.top + (plotH / GRID_LINES) * i;
          return (
            <line
              key={`g${i}`}
              x1={PAD.left}
              y1={gy}
              x2={W - PAD.right}
              y2={gy}
              className="cpi-grid"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}

        <line
          x1={PAD.left}
          y1={PAD.top + plotH}
          x2={W - PAD.right}
          y2={PAD.top + plotH}
          className="cpi-axis"
          vectorEffect="non-scaling-stroke"
        />

        <path d={area} fill={`url(#${gradId})`} />
        <path d={line} className="cpi-line" vectorEffect="non-scaling-stroke" />

        {active !== null && (
          <line
            x1={x(active)}
            y1={PAD.top}
            x2={x(active)}
            y2={PAD.top + plotH}
            className="cpi-cross"
            vectorEffect="non-scaling-stroke"
          />
        )}

        {data.map((d, i) => (
          <circle
            key={d.key}
            cx={x(i)}
            cy={y(d.value)}
            r={active === i ? 5 : 3}
            className={`cpi-dot${active === i ? " on" : ""}`}
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {/* שטח פגיעה רחב לכל נקודה — הצבעה בקירוב מספיקה */}
        {data.map((d, i) => (
          <rect
            key={`hit-${d.key}`}
            x={x(i) - plotW / data.length / 2}
            y={0}
            width={plotW / data.length}
            height={H}
            fill="transparent"
            tabIndex={0}
            role="button"
            aria-label={`${d.label}: ${d.display}`}
            onMouseEnter={() => onActive(i)}
            onFocus={() => onActive(i)}
            onBlur={() => onActive(null)}
            onTouchStart={() => onActive(i)}
          />
        ))}
      </svg>

      {/* תוויות קצה בלבד — לא מספר על כל נקודה */}
      <div className="chart-ticks" aria-hidden>
        <span>{last.tick}</span>
        <span>{first.tick}</span>
      </div>
    </div>
  );
}
