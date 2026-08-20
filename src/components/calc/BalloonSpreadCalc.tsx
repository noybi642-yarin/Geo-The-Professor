"use client";

import { useMemo, useState } from "react";
import {
  applyFeeToLoan,
  balloonSpreadByMonths,
  FEE_SPREAD_RATE,
  balloonSpreadByPayment,
  copyText,
  estimateEndDate,
  fmtMoney,
  fmtNum,
  fmtPct,
  parseNum,
  planSetupFee,
  round2,
  toInput,
  type FeeMode,
  type Settings,
} from "@/lib/finance";
import {
  ActionBar,
  NumField,
  ResultHero,
  ResultRow,
  usePersistentState,
  useToast,
} from "./shared";
import ScheduleModal from "./ScheduleModal";
import { ICON_SM, ICON_STROKE, IconBalloonSpread, IconResults, IconSchedule } from "@/components/ui/icons";

type SpreadMode = "months" | "payment";

interface SpreadForm {
  mode: SpreadMode;
  balance: string;
  rate: string;
  fee: string;
  startDate: string; // ISO (yyyy-mm-dd), אופציונלי
  months: string;
  payment: string; // התשלום החודשי הקיים (במצב "שמירה על תשלום")
  prevPayment: string; // ההחזר הקודם להשוואה (במצב "לפי חודשים")
  feeMode: FeeMode;
  feeSpreadCount: string;
}

const INITIAL: SpreadForm = {
  mode: "months",
  balance: "",
  rate: "",
  fee: "",
  startDate: "",
  months: "36",
  payment: "",
  prevPayment: "",
  feeMode: "upfront",
  feeSpreadCount: "",
};

export default function BalloonSpreadCalc({ settings }: { settings: Settings }) {
  const [f, setF] = usePersistentState<SpreadForm>("sn.calc.spread.v1", INITIAL);
  const [showSchedule, setShowSchedule] = useState(false);
  const [flash, setFlash] = useState(0);
  const notify = useToast();

  const set = (patch: Partial<SpreadForm>) => setF((p) => ({ ...p, ...patch }));

  const balanceN = parseNum(f.balance);
  const rateN = f.rate === "" ? settings.spreadRate : parseNum(f.rate);
  const feeN = f.fee === "" ? settings.fee : parseNum(f.fee);
  const monthsN = parseNum(f.months);
  const paymentN = parseNum(f.payment);

  // המנוע מקבל fee=0; עמלת ההקמה מוצגת ונפרסת בנפרד
  const res = useMemo(() => {
    if (f.mode === "months")
      return {
        ...balloonSpreadByMonths(balanceN, rateN, monthsN, 0, settings.rateMethod),
        fullMonths: Math.round(monthsN),
      };
    return balloonSpreadByPayment(balanceN, rateN, paymentN, 0, settings.rateMethod);
  }, [f.mode, balanceN, rateN, monthsN, paymentN, settings.rateMethod]);

  const feePlan = useMemo(
    () => planSetupFee(feeN, f.feeMode, parseNum(f.feeSpreadCount), res.ok ? res.months : 0),
    [feeN, f.feeMode, f.feeSpreadCount, res]
  );
  const feeApplied = res.ok ? applyFeeToLoan(res, feePlan) : null;
  // כולל את ריבית פריסת העמלה, לא רק את קרן העמלה
  const totalWithFee = res.ok ? round2(res.totalPaid + feePlan.totalPaid) : 0;

  const endDate = res.ok ? estimateEndDate(res.months, f.startDate || undefined) : "—";

  // "לפני ואחרי": ההחזר הקודם — במצב תשלום זהו התשלום שנשמר; במצב חודשים שדה נפרד
  const prevPaymentN = f.mode === "payment" ? paymentN : parseNum(f.prevPayment);
  const newPaymentN = f.mode === "payment" ? paymentN : res.ok ? res.monthly : 0;
  const extraCost = res.ok ? round2(res.totalInterest + feeN) : 0;

  const summarySentence = !res.ok
    ? ""
    : f.mode === "payment"
      ? `פריסת יתרה של ${fmtMoney(balanceN)} בריבית שנתית של ${fmtPct(rateN)}, תוך שמירה על תשלום חודשי של ${fmtMoney(paymentN)}, תימשך כ־${fmtNum(res.months)} חודשים ותוסיף כ־${fmtMoney(extraCost)} בעלויות ריבית.`
      : `פריסת יתרה של ${fmtMoney(balanceN)} בריבית שנתית של ${fmtPct(rateN)} על פני ${fmtNum(res.months)} חודשים תעמיד החזר חודשי של ${fmtMoney(res.monthly)} ותוסיף כ־${fmtMoney(extraCost)} בעלויות ריבית.`;

  const copyForClient = async () => {
    if (!res.ok || !feeApplied) {
      notify(res.error ?? "אין נתונים להעתקה");
      return;
    }
    const lines = [
      "🎈 פריסת יתרת בלון — שלום נוי",
      "―――――――――――――――",
      `🔹 יתרת הבלון: ${fmtMoney(balanceN)}`,
      `🔹 ריבית שנתית: ${fmtPct(rateN)}`,
      `🔹 תקופת הפריסה: ${fmtNum(res.months)} חודשים`,
      `💳 החזר חודשי: ${fmtMoney(f.mode === "payment" ? paymentN : res.monthly)}`,
      feeN > 0 ? `🧾 עמלת הקמה: ${fmtMoney(feeN)}` : "",
      `💰 תשלום ראשון: ${fmtMoney(feeApplied.firstPayment)}`,
      feePlan.months > 1
        ? `💰 תשלום לאחר סיום פריסת העמלה: ${fmtMoney(feeApplied.paymentAfterFee)}`
        : "",
      f.mode === "payment" && res.lastPayment < paymentN - 0.005
        ? `💳 תשלום אחרון: ${fmtMoney(res.lastPayment)}`
        : "",
      `📈 סך הריבית בפריסה: ${fmtMoney(res.totalInterest)}`,
      `📊 סך התשלום הכולל: ${fmtMoney(totalWithFee)}`,
      `🗓️ מועד סיום משוער: ${endDate}`,
      "―――――――――――――――",
      summarySentence,
    ].filter(Boolean);
    if (await copyText(lines.join("\n"))) notify("ההצעה הועתקה");
  };

  const doCalc = () => {
    setFlash((n) => n + 1);
    document
      .getElementById("spread-results")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const clear = () => {
    setF({ ...INITIAL, mode: f.mode });
    notify("נוקה");
  };

  return (
    <div className="calc-screen">
      <section className="panel">
        <h2 className="panel-title">
            <IconBalloonSpread size={ICON_SM} strokeWidth={ICON_STROKE} aria-hidden />
            פרטי הפריסה
          </h2>

        <div className="prod-tabs" role="tablist" aria-label="שיטת חישוב">
          <button
            type="button"
            role="tab"
            aria-selected={f.mode === "months"}
            className={`prod-tab${f.mode === "months" ? " on" : ""}`}
            onClick={() => set({ mode: "months" })}
          >
            בחירת מספר חודשים
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={f.mode === "payment"}
            className={`prod-tab${f.mode === "payment" ? " on" : ""}`}
            onClick={() => set({ mode: "payment" })}
          >
            שמירה על התשלום הקיים
          </button>
        </div>

        <div className="fields-grid" style={{ marginTop: 16 }}>
          <NumField
            label="יתרת הבלון הנוכחית"
            value={f.balance}
            onChange={(v) => set({ balance: v })}
            suffix="₪"
          />
          <NumField
            label="ריבית שנתית חדשה"
            value={f.rate}
            onChange={(v) => set({ rate: v })}
            suffix="%"
            placeholder={toInput(settings.spreadRate) || "0"}
          />

          {f.mode === "months" ? (
            <>
              <NumField
                label="מספר חודשי פריסה"
                value={f.months}
                onChange={(v) => set({ months: v })}
                suffix="חוד׳"
                chips={[12, 24, 36, 48, 60]}
                activeChip={monthsN}
                onChip={(c) => set({ months: String(c) })}
              />
              <NumField
                label="ההחזר החודשי הקודם (להשוואה, לא חובה)"
                value={f.prevPayment}
                onChange={(v) => set({ prevPayment: v })}
                suffix="₪"
              />
            </>
          ) : (
            <NumField
              label="התשלום החודשי שהלקוח משלם כיום"
              value={f.payment}
              onChange={(v) => set({ payment: v })}
              suffix="₪"
            />
          )}

          <NumField
            label="עמלת הקמה"
            value={f.fee}
            onChange={(v) => set({ fee: v })}
            suffix="₪"
            placeholder={toInput(settings.fee) || "0"}
          />
          <div className="field">
            <div className="field-head">
              <label className="field-label">אופן תשלום העמלה</label>
            </div>
            <div className="seg">
              <button
                type="button"
                className={f.feeMode === "upfront" ? "on" : ""}
                onClick={() => set({ feeMode: "upfront" })}
              >
                חד-פעמי בתחילת הפריסה
              </button>
              <button
                type="button"
                className={f.feeMode === "spread" ? "on" : ""}
                onClick={() => set({ feeMode: "spread" })}
              >
                פריסה לתשלומים
              </button>
            </div>
            <div className="field-hint">
              {f.feeMode === "spread"
                ? `הפריסה נושאת ריבית שנתית נומינלית של ${fmtPct(FEE_SPREAD_RATE)}`
                : "העמלה תיגבה במלואה בתשלום הראשון"}
            </div>
          </div>
          {f.feeMode === "spread" && (
            <NumField
              label="מספר תשלומי פריסה"
              value={f.feeSpreadCount}
              onChange={(v) => set({ feeSpreadCount: v })}
              suffix="תש׳"
              chips={[3, 6, 12, 24]}
              activeChip={parseNum(f.feeSpreadCount)}
              onChip={(c) => set({ feeSpreadCount: String(c) })}
            />
          )}
          <div className="field">
            <div className="field-head">
              <label className="field-label">תאריך תחילת הפריסה (לא חובה)</label>
            </div>
            <div className="field-box">
              <input
                type="date"
                value={f.startDate}
                onChange={(e) => set({ startDate: e.target.value })}
              />
            </div>
            <div className="field-hint">אם לא הוזן — החישוב מהיום</div>
          </div>
        </div>
      </section>

      <section className="panel" id="spread-results">
        <h2 className="panel-title">
            <IconResults size={ICON_SM} strokeWidth={ICON_STROKE} aria-hidden />
            תוצאות
          </h2>
        {res.ok && feeApplied ? (
          <>
            <div className="meta-badges">
              <span className="badge">שפיצר</span>
              <span className="badge">{fmtPct(rateN)} שנתי</span>
              <span className="badge">{fmtNum(res.months)} תשלומים</span>
            </div>

            {f.mode === "months" ? (
              <ResultHero
                label="החזר חודשי חדש"
                value={fmtMoney(res.monthly)}
                sub={`${fmtNum(res.months)} תשלומים`}
                flash={flash}
              />
            ) : (
              <ResultHero
                label="משך הפריסה"
                value={`${fmtNum(res.months)} חודשים`}
                sub={`בתשלום של ${fmtMoney(paymentN)} בחודש`}
                flash={flash}
              />
            )}

            <div className="result-list">
              <ResultRow
                label="החזר הלוואה (ללא עמלה)"
                value={fmtMoney(f.mode === "payment" ? paymentN : res.monthly)}
              />
              {feeN > 0 && (
                <ResultRow
                  label="עמלת הקמה"
                  value={fmtMoney(feeN)}
                  sub={
                    feePlan.months > 0
                      ? `פריסה ל-${fmtNum(feePlan.months)} תשלומים`
                      : "תשלום חד-פעמי"
                  }
                />
              )}
              {feePlan.months > 0 && (
                <ResultRow label="רכיב עמלה חודשי" value={fmtMoney(feePlan.monthly)} />
              )}
              <ResultRow label="תשלום ראשון בפועל" value={fmtMoney(feeApplied.firstPayment)} strong />
              {feePlan.months > 1 && (
                <ResultRow
                  label="תשלום לאחר סיום פריסת העמלה"
                  value={fmtMoney(feeApplied.paymentAfterFee)}
                />
              )}
              {f.mode === "payment" && (
                <>
                  <ResultRow label="תשלומים מלאים" value={`${fmtNum(res.fullMonths)}`} />
                  {res.lastPayment < paymentN - 0.005 && (
                    <ResultRow label="תשלום אחרון (מותאם)" value={fmtMoney(res.lastPayment)} />
                  )}
                </>
              )}
              <ResultRow label="סך הריבית בפריסה" value={fmtMoney(res.totalInterest)} />
              <ResultRow label="סך התשלום הכולל" value={fmtMoney(totalWithFee)} strong />
              <ResultRow label="מועד סיום משוער" value={endDate} />
            </div>

            <div className="before-after">
              <h3 className="subhead">לפני ואחרי</h3>
              <div className="result-list">
                <ResultRow label="יתרת הבלון לפני הפריסה" value={fmtMoney(balanceN)} />
                {prevPaymentN > 0 && (
                  <ResultRow label="ההחזר החודשי הקודם" value={fmtMoney(prevPaymentN)} />
                )}
                <ResultRow label="ההחזר החודשי החדש" value={fmtMoney(newPaymentN)} />
                <ResultRow label="חודשים נוספים" value={`${fmtNum(res.months)}`} />
                <ResultRow label="סך הריבית הנוספת" value={fmtMoney(res.totalInterest)} />
                <ResultRow
                  label="העלות הכוללת של הארכת המימון"
                  value={fmtMoney(extraCost)}
                  sub={feeN > 0 ? "ריבית + עמלת הקמה" : undefined}
                  strong
                />
                <ResultRow label="תאריך סיום חדש" value={endDate} />
              </div>
              <div className="summary-sentence">{summarySentence}</div>
            </div>
          </>
        ) : (
          <div className="empty-note">{res.error ?? "הזיני נתונים כדי לחשב"}</div>
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
        <ScheduleModal
          meta={[
            { label: "יתרת בלון", value: fmtMoney(balanceN) },
            { label: "ריבית", value: fmtPct(rateN) },
            { label: "תקופה", value: `${fmtNum(res.months)} חוד׳` },
            { label: "סיום משוער", value: endDate },
          ]}
          schedule={res.schedule}
          summaryText={[`🎈 פריסת יתרת בלון — שלום נוי`, summarySentence].join("\n")}
          onClose={() => setShowSchedule(false)}
        />
      )}
    </div>
  );
}
