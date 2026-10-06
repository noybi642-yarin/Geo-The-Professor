"use client";

import { useMemo } from "react";
import {
  MONTHLY_TARGET_NOTE,
  calcMonthlyTarget,
  fmtExact,
  fmtFriendly,
  fmtPct1,
  headlineFor,
  paceEmojiFor,
  paceLabelFor,
  paceTextFor,
  subMessageFor,
  workDaysWord,
} from "@/lib/monthlyTargets";
import { formatTyped, parseNum } from "@/lib/finance";
import {
  ICON_SM,
  ICON_STROKE,
  IconClear,
  IconInfo,
  IconResults,
  IconSettings,
} from "@/components/ui/icons";
import { ResultRow, usePersistentState, useToast } from "./shared";

/**
 * המצב נשמר במכשיר, ולא מתאפס בכניסה מחדש: היעד וימי העבודה
 * מוזנים פעם בחודש, ורק ״סכום בפועל״ מתעדכן לעיתים קרובות.
 */
const STORE_KEY = "sn.monthlyTargets.v1";

const EMPTY = {
  monthlyTarget: "",
  currentAmount: "",
  totalWorkingDays: "",
  workingDaysPassed: "",
};

/** שדה מספרי. ריק נשאר ריק — אין ברירת מחדל ליעד ולביצוע. */
function NumInput({
  label,
  value,
  onChange,
  suffix,
  placeholder,
  integer,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix: string;
  placeholder?: string;
  integer?: boolean;
}) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      <div className="field-box">
        <input
          type="text"
          inputMode="numeric"
          value={value}
          placeholder={placeholder ?? "0"}
          onChange={(e) => {
            // אין סכומים שליליים ואין ימים שליליים בשום שדה כאן
            const v = formatTyped(e.target.value, false);
            onChange(integer ? v.replace(/\./g, "") : v);
          }}
        />
        <span className="field-suffix">{suffix}</span>
      </div>
    </div>
  );
}

export default function MonthlyTargetsCalc() {
  const [f, setF] = usePersistentState(STORE_KEY, EMPTY);
  const notify = useToast();

  const set = (patch: Partial<typeof EMPTY>) =>
    setF((p) => ({ ...p, ...patch }));

  const r = useMemo(
    () =>
      calcMonthlyTarget({
        monthlyTarget: parseNum(f.monthlyTarget),
        currentAmount: parseNum(f.currentAmount),
        totalWorkingDays: parseNum(f.totalWorkingDays),
        workingDaysPassed: parseNum(f.workingDaysPassed),
      }),
    [f.monthlyTarget, f.currentAmount, f.totalWorkingDays, f.workingDaysPassed],
  );

  const hasData = r.state !== "noTarget";

  // רוחב הפס נעצר ב-100% גם כשהביצוע עבר את היעד, כדי שהפס
  // לא יגלוש. המספר עצמו ממשיך להציג את האחוז האמיתי.
  const fillPct = Math.min(100, Math.max(0, r.actualPct ?? 0));
  const markPct = Math.min(100, Math.max(0, r.expectedPct ?? 0));

  return (
    <div className="calc-screen">
      {/* ── נתוני החודש ── */}
      <section className="panel">
        <h2 className="panel-title">
          <IconSettings size={ICON_SM} strokeWidth={ICON_STROKE} aria-hidden />
          נתוני החודש
        </h2>

        <div className="mt-fields">
          <NumInput
            label="יעד כספי חודשי"
            value={f.monthlyTarget}
            onChange={(v) => set({ monthlyTarget: v })}
            suffix="₪"
            placeholder="20,024,900"
          />
          <NumInput
            label="סכום בפועל עד כה"
            value={f.currentAmount}
            onChange={(v) => set({ currentAmount: v })}
            suffix="₪"
            placeholder="4,500,000"
          />
          <NumInput
            label="ימי עבודה בחודש"
            value={f.totalWorkingDays}
            onChange={(v) => set({ totalWorkingDays: v })}
            suffix="ימים"
            placeholder="22"
            integer
          />
          <NumInput
            label="ימי עבודה שעברו"
            value={f.workingDaysPassed}
            onChange={(v) => set({ workingDaysPassed: v })}
            suffix="ימים"
            placeholder="7"
            integer
          />
        </div>

        <div className="field-hint" style={{ marginTop: 12 }}>
          הנתונים נשמרים במכשיר. בכל כניסה אפשר לעדכן רק את ״סכום בפועל עד כה״,
          והחישוב מתעדכן מיד.
        </div>
      </section>

      {/*
        לוח המחוונים. הכרטיס הכהה עומד בפני עצמו ולא בתוך פאנל:
        כך הוא נשאר הדבר הדומיננטי במסך, ובמובייל כל המידע החשוב
        נכנס למסך אחד בלי גלילה.
      */}
      <div className={`mt-hero${hasData ? "" : " empty"}`}>
        {hasData ? (
          <>
            <div className="mt-pct-row">
              <span className="mt-pct">{fmtPct1(r.actualPct)}</span>
              <span className="mt-pct-label">מהיעד</span>
            </div>

            <div
              className="mt-bar"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(r.actualPct ?? 0)}
              aria-label="התקדמות מול היעד החודשי"
            >
              <span className="mt-bar-fill" style={{ width: `${fillPct}%` }} />
              {/* סימון הקצב הנדרש — איפה היינו אמורים להיות היום */}
              {r.expectedPct !== null && (
                <span
                  className="mt-bar-mark"
                  style={{ insetInlineStart: `${markPct}%` }}
                  aria-hidden
                />
              )}
            </div>

            <div className="mt-bar-foot">
              <span>
                ביצוע {fmtExact(r.currentAmount)} מתוך{" "}
                {fmtExact(r.monthlyTarget)}
              </span>
              {r.expectedPct !== null && (
                <span className="mt-bar-expected">
                  הקצב הנדרש היום: {fmtPct1(r.expectedPct)}
                </span>
              )}
            </div>

            <p className="mt-headline">{headlineFor(r)}</p>
            <p className="mt-sub">{subMessageFor(r)}</p>

            <span className={`mt-pace pace-${r.pace}`}>
              {paceEmojiFor(r) && (
                <span className="mt-pace-mark" aria-hidden>
                  {paceEmojiFor(r)}
                </span>
              )}
              <span>{paceTextFor(r)}</span>
            </span>
          </>
        ) : (
          <>
            <p className="mt-headline">{headlineFor(r)}</p>
            <p className="mt-sub">
              הזיני את היעד הכספי, הסכום שהושג עד כה ואת ימי העבודה — והמסך יחשב
              את הפער, את הקצב היומי הנדרש ואת המצב מול הקצב.
            </p>
          </>
        )}
      </div>

      {hasData && (
        <section className="panel">
          <h2 className="panel-title">
            <IconResults size={ICON_SM} strokeWidth={ICON_STROKE} aria-hidden />
            פירוט החודש
          </h2>
          <div className="result-list">
            <ResultRow label="יעד חודשי" value={fmtExact(r.monthlyTarget)} />
            <ResultRow label="ביצוע בפועל" value={fmtExact(r.currentAmount)} />
            {r.state === "exceeded" ? (
              <ResultRow label="מעל היעד" value={fmtExact(r.surplus)} good />
            ) : r.remainingAmount === 0 ? (
              <ResultRow label="נותר ליעד" value="היעד הושג 🎉" good />
            ) : (
              <ResultRow
                label="נותר ליעד"
                value={fmtFriendly(r.remainingAmount)}
                sub={fmtExact(r.remainingAmount)}
              />
            )}
            <ResultRow
              label="ימי עבודה שנותרו"
              value={workDaysWord(r.remainingDays)}
            />
            {r.perDay !== null ? (
              <ResultRow
                label="נדרש ליום"
                value={fmtFriendly(r.perDay)}
                sub={fmtExact(r.perDay)}
                strong
              />
            ) : (
              <ResultRow
                label="נדרש ליום"
                value={
                  r.state === "monthOver"
                    ? "החודש הסתיים"
                    : "אין צורך בסכום נוסף"
                }
                good={r.state !== "monthOver"}
              />
            )}
            <ResultRow label="מצב ביחס לקצב" value={paceLabelFor(r)} />
          </div>

          <div className="actions" style={{ marginTop: 16 }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setF({ ...EMPTY });
                notify("נתוני החודש אופסו");
              }}
            >
              <IconClear size={ICON_SM} strokeWidth={ICON_STROKE} aria-hidden />
              איפוס החודש
            </button>
          </div>

          <div className="note">
            <IconInfo size={ICON_SM} strokeWidth={ICON_STROKE} aria-hidden />
            {MONTHLY_TARGET_NOTE}
          </div>
        </section>
      )}
    </div>
  );
}
