"use client";

import { useMemo } from "react";
import {
  applyIndexChanges,
  copyText,
  fmtMoney,
  parseNum,
  type IndexChange,
  type IndexChangeKind,
} from "@/lib/finance";
import { ActionBar, NumField, ResultHero, ResultRow, usePersistentState, useToast } from "./shared";
import { ICON_SM, ICON_STROKE, IconAdd, IconBalloonSpread, IconIndex, IconInfo, IconRemove, IconResults, IconSchedule } from "@/components/ui/icons";

const INDEX_DISCLAIMER =
  "החישוב מבוסס על הנתונים שהוזנו. החיוב בפועל תלוי בתנאי הסכם המימון ובמדד הידוע במועד החיוב.";

interface Row {
  kind: IndexChangeKind;
  value: string;
}

interface IndexForm {
  baseIndex: string;
  basePayment: string;
  principal: string;
  balloon: string;
  floorAtBase: boolean;
  rows: Row[];
}

const INITIAL: IndexForm = {
  baseIndex: "",
  basePayment: "",
  principal: "",
  balloon: "",
  floorAtBase: false,
  rows: [{ kind: "value", value: "" }],
};

const KIND_LABEL: Record<IndexChangeKind, string> = {
  value: "ערך מדד חדש",
  percent: "שינוי באחוזים",
  points: "שינוי בנקודות",
};

const KIND_SUFFIX: Record<IndexChangeKind, string> = {
  value: "מדד",
  percent: "%",
  points: "נק׳",
};

// ערכי מדד ושיעורי שינוי מוצגים בדיוק גבוה יותר מסכומי כסף,
// כדי ששינוי מצטבר קטן לא ייראה כאפס
const idxFmt = new Intl.NumberFormat("he-IL", { maximumFractionDigits: 4 });
const fmtIndex = (v: number) => (Number.isFinite(v) ? idxFmt.format(v) : "—");
const fmtIndexPct = (v: number) => (Number.isFinite(v) ? `${idxFmt.format(v)}%` : "—");

export default function IndexCalc() {
  const [f, setF] = usePersistentState<IndexForm>("sn.calc.index.v1", INITIAL);
  const notify = useToast();

  const set = (patch: Partial<IndexForm>) => setF((p) => ({ ...p, ...patch }));

  const baseIndexN = parseNum(f.baseIndex);
  const basePaymentN = parseNum(f.basePayment);
  const principalN = parseNum(f.principal);
  const balloonN = parseNum(f.balloon);

  const changes: IndexChange[] = useMemo(
    () =>
      f.rows
        .filter((r) => r.value.trim() !== "")
        .map((r) => ({ kind: r.kind, value: parseNum(r.value) })),
    [f.rows]
  );

  const res = useMemo(
    () =>
      applyIndexChanges(baseIndexN, basePaymentN, changes, {
        floorAtBase: f.floorAtBase,
        principal: principalN,
        balloon: balloonN,
      }),
    [baseIndexN, basePaymentN, changes, f.floorAtBase, principalN, balloonN]
  );

  const setRow = (i: number, patch: Partial<Row>) =>
    setF((p) => ({ ...p, rows: p.rows.map((r, k) => (k === i ? { ...r, ...patch } : r)) }));

  const addRow = () =>
    setF((p) => ({
      ...p,
      // שורה חדשה יורשת את סוג ההזנה של הקודמת — אין לערבב אחוזים ונקודות בטעות
      rows: [...p.rows, { kind: p.rows[p.rows.length - 1]?.kind ?? "percent", value: "" }],
    }));

  const removeRow = (i: number) =>
    setF((p) => ({ ...p, rows: p.rows.length > 1 ? p.rows.filter((_, k) => k !== i) : p.rows }));

  const multi = res.ok && res.steps.length > 1;
  const dirWord = res.direction === "up" ? "עלייה" : res.direction === "down" ? "ירידה" : "ללא שינוי";
  const dirIcon = res.direction === "up" ? "📈" : res.direction === "down" ? "📉" : "➖";

  const copyForClient = async () => {
    if (!res.ok) {
      notify(res.error ?? "אין נתונים להעתקה");
      return;
    }
    const lines = [
      "📊 עדכון תשלום לפי מדד — שלום נוי",
      "―――――――――――――――",
      `🔹 מדד בסיס: ${fmtIndex(res.baseIndex)}`,
      `🔹 מדד חדש: ${fmtIndex(res.finalIndex)}`,
      `🔹 שיעור שינוי: ${fmtIndexPct(res.cumulativePct)} (${dirWord})`,
      `🔹 מקדם הצמדה: ${res.factor.toFixed(6)}`,
      "―――――――――――――――",
      `💳 החזר קודם: ${fmtMoney(res.basePayment)}`,
      `💳 החזר מעודכן: ${fmtMoney(res.newPayment)}`,
      `${dirIcon} הפרש: ${fmtMoney(res.diff)}`,
      res.newPrincipal ? `🔹 יתרת קרן מעודכנת: ${fmtMoney(res.newPrincipal)}` : "",
      res.newBalloon ? `🎈 בלון מעודכן: ${fmtMoney(res.newBalloon)}` : "",
      "―――――――――――――――",
      `ℹ️ ${INDEX_DISCLAIMER}`,
    ].filter(Boolean);
    if (await copyText(lines.join("\n"))) notify("הועתק");
  };

  return (
    <div className="calc-screen">
      <section className="panel">
        <h2 className="panel-title">
            <IconIndex size={ICON_SM} strokeWidth={ICON_STROKE} aria-hidden />
            נתוני הבסיס
          </h2>
        <div className="fields-grid">
          <NumField
            label="מדד בסיס ביום העמדת העסקה"
            value={f.baseIndex}
            onChange={(v) => set({ baseIndex: v })}
            suffix="מדד"
          />
          <NumField
            label="החזר חודשי בסיסי"
            value={f.basePayment}
            onChange={(v) => set({ basePayment: v })}
            suffix="₪"
          />
          <NumField
            label="יתרת קרן בסיסית (לא חובה)"
            value={f.principal}
            onChange={(v) => set({ principal: v })}
            suffix="₪"
          />
          <NumField
            label="סכום בלון בסיסי (לא חובה)"
            value={f.balloon}
            onChange={(v) => set({ balloon: v })}
            suffix="₪"
          />
        </div>
      </section>

      <section className="panel">
        <h2 className="panel-title">
            <IconBalloonSpread size={ICON_SM} strokeWidth={ICON_STROKE} aria-hidden />
            שינויי מדד
          </h2>

        {f.rows.map((r, i) => (
          <div className="index-row" key={i}>
            <div className="index-row-head">
              <span className="index-row-num">
                {f.rows.length > 1 ? `חודש ${i + 1}` : "שינוי המדד"}
              </span>
              {f.rows.length > 1 && (
                <button
                  type="button"
                  className="row-remove"
                  aria-label={`הסרת שורה ${i + 1}`}
                  onClick={() => removeRow(i)}
                >
                  <IconRemove size={14} strokeWidth={ICON_STROKE} aria-hidden />
                </button>
              )}
            </div>
            <div className="seg seg-3">
              {(Object.keys(KIND_LABEL) as IndexChangeKind[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  className={r.kind === k ? "on" : ""}
                  onClick={() => setRow(i, { kind: k })}
                >
                  {KIND_LABEL[k]}
                </button>
              ))}
            </div>
            <NumField
              label={KIND_LABEL[r.kind]}
              value={r.value}
              onChange={(v) => setRow(i, { value: v })}
              suffix={KIND_SUFFIX[r.kind]}
              allowNegative={r.kind !== "value"}
              hint={
                r.kind === "points"
                  ? "נקודות מתווספות לערך המדד — אינן אחוזים"
                  : r.kind === "percent"
                    ? "לירידה יש להזין מספר שלילי, לדוגמה ‎-0.7"
                    : undefined
              }
            />
          </div>
        ))}

        <button type="button" className="mini-btn add-row" onClick={addRow}>
          ➕ הוספת שינוי מדד נוסף
        </button>

        <label className="switch-row">
          <input
            type="checkbox"
            checked={f.floorAtBase}
            onChange={(e) => set({ floorAtBase: e.target.checked })}
          />
          <span>המדד אינו יכול לרדת מתחת למדד הבסיס</span>
        </label>
        <div className="field-hint">כבוי כברירת מחדל — הפעילי רק אם כך נקבע בהסכם</div>
      </section>

      <section className="panel" id="index-results">
        <h2 className="panel-title">
            <IconResults size={ICON_SM} strokeWidth={ICON_STROKE} aria-hidden />
            תוצאות
          </h2>
        {res.ok ? (
          <>
            <ResultHero
              label="החזר חודשי מעודכן"
              value={fmtMoney(res.newPayment)}
              sub={`${dirIcon} ${dirWord} של ${fmtMoney(Math.abs(res.diff))} מול ההחזר המקורי`}
              flash={res.steps.length}
            />
            <div className="result-list">
              <ResultRow label="מדד בסיס" value={fmtIndex(res.baseIndex)} />
              <ResultRow label="מדד חדש" value={fmtIndex(res.finalIndex)} />
              <ResultRow
                label="שיעור שינוי"
                value={fmtIndexPct(res.cumulativePct)}
                sub={dirWord}
              />
              <ResultRow label="מקדם הצמדה" value={res.factor.toFixed(6)} />
              <ResultRow label="החזר קודם" value={fmtMoney(res.basePayment)} />
              <ResultRow label="החזר מעודכן" value={fmtMoney(res.newPayment)} strong />
              <ResultRow label="הפרש בשקלים" value={fmtMoney(res.diff)} strong />
              {res.newPrincipal !== undefined && (
                <ResultRow label="יתרת קרן מעודכנת" value={fmtMoney(res.newPrincipal)} />
              )}
              {res.newBalloon !== undefined && (
                <ResultRow label="סכום בלון מעודכן" value={fmtMoney(res.newBalloon)} />
              )}
            </div>

            {multi && (
              <div className="before-after">
                <h3 className="subhead">מעקב חודשי מצטבר</h3>
                <div className="table-wrap">
                  <table className="schedule">
                    <thead>
                      <tr>
                        <th>חודש</th>
                        <th>מדד קודם</th>
                        <th>שינוי</th>
                        <th>מדד חדש</th>
                        <th>מצטבר מהבסיס</th>
                        <th>החזר מעודכן</th>
                        <th>מהחודש הקודם</th>
                        <th>מההחזר המקורי</th>
                      </tr>
                    </thead>
                    <tbody>
                      {res.steps.map((s) => (
                        <tr key={s.step}>
                          <td>{s.step}</td>
                          <td>{fmtIndex(s.prevIndex)}</td>
                          <td>
                            {s.changeText}
                            {s.floored ? " (רצפה)" : ""}
                          </td>
                          <td>{fmtIndex(s.newIndex)}</td>
                          <td>{fmtIndexPct(s.cumulativePct)}</td>
                          <td>{fmtMoney(s.payment)}</td>
                          <td>{fmtMoney(s.diffFromPrev)}</td>
                          <td>{fmtMoney(s.diffFromBase)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="note">
              <IconInfo size={ICON_SM} strokeWidth={ICON_STROKE} aria-hidden />
              {INDEX_DISCLAIMER}
            </div>
          </>
        ) : (
          <div className="empty-note">{res.error ?? "הזיני נתונים כדי לחשב"}</div>
        )}
      </section>

      <ActionBar
        onCalc={() =>
          document
            .getElementById("index-results")
            ?.scrollIntoView({ behavior: "smooth", block: "start" })
        }
        onCopy={copyForClient}
        onClear={() => {
          setF({ ...INITIAL, rows: [{ kind: "value", value: "" }] });
          notify("נוקה");
        }}
      />
    </div>
  );
}
