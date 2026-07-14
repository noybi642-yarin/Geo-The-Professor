"use client";

import { useMemo, useState } from "react";
import {
  calcLoan,
  copyText,
  fmtMoney,
  fmtNum,
  fmtPct,
  parseNum,
  round2,
  toInput,
  type Settings,
} from "@/lib/finance";
import {
  ActionBar,
  Modal,
  NumField,
  ResultHero,
  ResultRow,
  usePersistentState,
  useToast,
  type Unit,
} from "./shared";

interface LoanForm {
  price: string;
  down: string;
  downUnit: Unit;
  finPct: string;
  loanOverride: string;
  rate: string;
  months: string;
  balloon: string;
  balloonUnit: Unit;
  fee: string;
}

const INITIAL: LoanForm = {
  price: "",
  down: "",
  downUnit: "amount",
  finPct: "",
  loanOverride: "",
  rate: "",
  months: "60",
  balloon: "",
  balloonUnit: "percent",
  fee: "",
};

const MONTH_CHIPS = [12, 24, 36, 48, 60, 72, 84, 100];

export default function LoanCalc({ settings }: { settings: Settings }) {
  const [f, setF] = usePersistentState<LoanForm>("sn.calc.loan.v1", INITIAL);
  const [showSchedule, setShowSchedule] = useState(false);
  const [flash, setFlash] = useState(0);
  const notify = useToast();

  const set = (patch: Partial<LoanForm>) => setF((p) => ({ ...p, ...patch }));

  const priceN = parseNum(f.price);

  // מקדמה בש"ח בפועל
  const downN =
    f.downUnit === "percent" ? round2((priceN * parseNum(f.down)) / 100) : parseNum(f.down);

  // סכום הלוואה: קלט ידני גובר על מחיר הרכב
  const overrideN = parseNum(f.loanOverride);
  const loanN = overrideN > 0 ? overrideN : Math.max(round2(priceN - downN), 0);

  // סנכרון דו-כיווני בין מקדמה לאחוז מימון
  const handleDown = (v: string) => {
    const patch: Partial<LoanForm> = { down: v };
    if (priceN > 0) {
      const dn = f.downUnit === "percent" ? (priceN * parseNum(v)) / 100 : parseNum(v);
      const pct = ((priceN - dn) / priceN) * 100;
      patch.finPct = pct > 0 && pct <= 100 ? toInput(round2(pct)) : "";
    }
    set(patch);
  };

  const handleFinPct = (v: string) => {
    const patch: Partial<LoanForm> = { finPct: v };
    const pct = parseNum(v);
    if (priceN > 0 && pct >= 0 && pct <= 100) {
      patch.down =
        f.downUnit === "percent"
          ? toInput(round2(100 - pct))
          : toInput(round2(priceN * (1 - pct / 100)));
    }
    set(patch);
  };

  const handlePrice = (v: string) => {
    const patch: Partial<LoanForm> = { price: v };
    const pN = parseNum(v);
    if (pN > 0 && f.down) {
      const dn = f.downUnit === "percent" ? (pN * parseNum(f.down)) / 100 : parseNum(f.down);
      const pct = ((pN - dn) / pN) * 100;
      patch.finPct = pct > 0 && pct <= 100 ? toInput(round2(pct)) : "";
    }
    set(patch);
  };

  const handleDownUnit = (u: Unit) => {
    if (u === f.downUnit) return;
    const patch: Partial<LoanForm> = { downUnit: u };
    if (priceN > 0 && f.down) {
      patch.down =
        u === "percent"
          ? toInput(round2((downN / priceN) * 100))
          : toInput(downN);
    }
    set(patch);
  };

  const rateN = f.rate === "" ? settings.defaultRate : parseNum(f.rate);
  const monthsN = parseNum(f.months);
  const feeN = f.fee === "" ? settings.fee : parseNum(f.fee);

  // בלון: אחוז מחושב ממחיר הרכב (ואם אין מחיר — מסכום ההלוואה)
  const balloonBase = priceN > 0 ? priceN : loanN;
  const balloonN =
    f.balloonUnit === "percent"
      ? round2((balloonBase * parseNum(f.balloon)) / 100)
      : parseNum(f.balloon);

  const res = useMemo(
    () => calcLoan(loanN, rateN, monthsN, balloonN, feeN, settings.rateMethod),
    [loanN, rateN, monthsN, balloonN, feeN, settings.rateMethod]
  );

  const finPctN = priceN > 0 && loanN > 0 ? (loanN / priceN) * 100 : NaN;
  const dealTotal = res.ok ? round2(res.totalPaid + (overrideN > 0 ? 0 : downN)) : 0;

  const copyForClient = async () => {
    if (!res.ok) {
      notify(res.error ?? "אין נתונים להעתקה");
      return;
    }
    const lines = ["🚗 הצעת מימון — שלום נוי", "―――――――――――――――"];
    if (priceN > 0) lines.push(`🔹 מחיר הרכב: ${fmtMoney(priceN)}`);
    if (downN > 0 && overrideN <= 0)
      lines.push(`🔹 מקדמה: ${fmtMoney(downN)}${priceN > 0 ? ` (${fmtPct(round2((downN / priceN) * 100))})` : ""}`);
    lines.push(`🔹 סכום מימון: ${fmtMoney(loanN)}`);
    lines.push(`🔹 ריבית שנתית: ${fmtPct(rateN)}`);
    lines.push(`🔹 תקופה: ${fmtNum(monthsN)} חודשים`);
    lines.push("―――――――――――――――");
    lines.push(`💳 החזר חודשי: ${fmtMoney(res.monthly)}`);
    if (feeN > 0) lines.push(`💰 תשלום ראשון (כולל עמלת הקמה): ${fmtMoney(res.firstPayment)}`);
    if (res.balloon > 0) lines.push(`🎈 בלון בסוף התקופה: ${fmtMoney(res.balloon)}`);
    lines.push(`📊 סך כל התשלומים: ${fmtMoney(res.totalPaid)}`);
    if (await copyText(lines.join("\n"))) notify("ההצעה הועתקה ✓");
  };

  const doCalc = () => {
    setFlash((n) => n + 1);
    document.getElementById("loan-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const clear = () => {
    setF({ ...INITIAL });
    notify("נוקה ✨");
  };

  return (
    <div className="calc-screen">
      <section className="panel">
        <h2 className="panel-title">🚗 פרטי העסקה</h2>
        <div className="fields-grid">
          <NumField label="מחיר הרכב" value={f.price} onChange={handlePrice} suffix="₪" />
          <NumField
            label="מקדמה"
            value={f.down}
            onChange={handleDown}
            suffix={f.downUnit === "percent" ? "%" : "₪"}
            unit={f.downUnit}
            onUnitChange={handleDownUnit}
          />
          <NumField
            label="אחוז מימון"
            value={f.finPct}
            onChange={handleFinPct}
            suffix="%"
            chips={settings.commonPcts}
            chipSuffix="%"
            activeChip={round2(parseNum(f.finPct))}
            onChip={(c) => handleFinPct(String(c))}
          />
          <NumField
            label="סכום הלוואה"
            value={f.loanOverride}
            onChange={(v) => set({ loanOverride: v })}
            suffix="₪"
            placeholder={loanN > 0 && overrideN <= 0 ? toInput(loanN) : "0"}
            hint="אם הוזן — יתעלם ממחיר הרכב והמקדמה"
          />
          <NumField
            label="ריבית שנתית"
            value={f.rate}
            onChange={(v) => set({ rate: v })}
            suffix="%"
            placeholder={toInput(settings.defaultRate) || "0"}
          />
          <NumField
            label="מספר חודשים"
            value={f.months}
            onChange={(v) => set({ months: v })}
            suffix="חוד׳"
            chips={MONTH_CHIPS}
            activeChip={monthsN}
            onChip={(c) => set({ months: String(c) })}
          />
          <NumField
            label="בלון / יתרת סוף תקופה"
            value={f.balloon}
            onChange={(v) => set({ balloon: v })}
            suffix={f.balloonUnit === "percent" ? "%" : "₪"}
            unit={f.balloonUnit}
            onUnitChange={(u) => set({ balloonUnit: u })}
            hint={f.balloonUnit === "percent" ? "אחוז ממחיר הרכב" : undefined}
          />
          <NumField
            label="עמלת הקמה"
            value={f.fee}
            onChange={(v) => set({ fee: v })}
            suffix="₪"
            placeholder={toInput(settings.fee) || "0"}
          />
        </div>
      </section>

      <section className="panel" id="loan-results">
        <h2 className="panel-title">💙 תוצאות</h2>
        {res.ok ? (
          <>
            <ResultHero
              label="החזר חודשי"
              value={fmtMoney(res.monthly)}
              sub={`${fmtNum(monthsN)} תשלומים${res.balloon > 0 ? " + בלון" : ""}`}
              flash={flash}
            />
            <div className="result-list">
              <ResultRow
                label="סכום ההלוואה"
                value={fmtMoney(loanN)}
                sub={Number.isFinite(finPctN) ? `${fmtPct(round2(finPctN))} מימון` : undefined}
              />
              <ResultRow
                label="תשלום ראשון (כולל עמלת הקמה)"
                value={fmtMoney(res.firstPayment)}
              />
              <ResultRow label="תשלום חודשי רגיל" value={fmtMoney(res.monthly)} />
              {res.balloon > 0 && (
                <ResultRow label="יתרת בלון בסוף התקופה" value={fmtMoney(res.balloon)} />
              )}
              <ResultRow label="סך הריבית" value={fmtMoney(res.totalInterest)} />
              <ResultRow label="סך כל התשלומים" value={fmtMoney(res.totalPaid)} strong />
              <ResultRow
                label="עלות כוללת של העסקה"
                value={fmtMoney(dealTotal)}
                sub={downN > 0 && overrideN <= 0 ? "כולל מקדמה" : undefined}
                strong
              />
            </div>
          </>
        ) : (
          <div className="empty-note">{res.error ?? "הזיני נתונים ונחשב יחד 💙"}</div>
        )}
      </section>

      <ActionBar onCalc={doCalc} onCopy={copyForClient} onClear={clear}>
        <button
          type="button"
          className="btn btn-dark"
          disabled={!res.ok}
          onClick={() => setShowSchedule(true)}
        >
          📅 הצג לוח סילוקין
        </button>
      </ActionBar>

      {showSchedule && res.ok && (
        <Modal title="📅 לוח סילוקין" onClose={() => setShowSchedule(false)} wide>
          <div className="schedule-meta">
            <span>הלוואה: <b>{fmtMoney(loanN)}</b></span>
            <span>ריבית: <b>{fmtPct(rateN)}</b></span>
            <span>תקופה: <b>{fmtNum(monthsN)} חוד׳</b></span>
          </div>
          <div className="table-wrap">
            <table className="schedule">
              <thead>
                <tr>
                  <th>חודש</th>
                  <th>תשלום</th>
                  <th>קרן</th>
                  <th>ריבית</th>
                  <th>יתרת הלוואה</th>
                </tr>
              </thead>
              <tbody>
                {res.schedule.map((r, idx) => (
                  <tr key={idx} className={r.isBalloon ? "balloon-row" : undefined}>
                    <td>{r.isBalloon ? "🎈 בלון" : r.month}</td>
                    <td>{fmtMoney(r.payment)}</td>
                    <td>{fmtMoney(r.principal)}</td>
                    <td>{fmtMoney(r.interest)}</td>
                    <td>{fmtMoney(r.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </div>
  );
}
