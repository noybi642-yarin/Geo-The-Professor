"use client";

import { useMemo, useState } from "react";
import {
  copyText,
  fmtMoney,
  fmtNum,
  fmtPct,
  parseNum,
  round2,
  subsidyCost,
  subsidyToRate,
  toInput,
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

/**
 * מצבי המחשבון.
 * cost ו-target הם אותו חישוב TVM בדיוק — הם נבדלים רק בשדות
 * שמוצגים ובאופן ההצגה: cost הוא המסך המלא, target הוא מסך מהיר
 * לשימוש מול סוכן.
 */
type Mode = "cost" | "budget" | "target";

interface SubsidyForm {
  mode: Mode;
  price: string;
  loan: string;
  months: string;
  dealRate: string;
  customerRate: string;
  budget: string;
  balloon: string;
}

const INITIAL: SubsidyForm = {
  mode: "cost",
  price: "",
  loan: "",
  months: "36",
  dealRate: "",
  customerRate: "",
  budget: "",
  balloon: "",
};

const TIPS = {
  price: "מחיר הרכב המלא. אינו משתתף בחישוב הסבסוד — משמש כרקע לעסקה ולהעתקה ללקוח.",
  loan: "הסכום שהלקוח ממן בפועל, אחרי המקדמה. זהו ה-PV בחישוב הפיננסי.",
  months: "מספר התשלומים החודשיים בעסקה. זהו ה-N בחישוב הפיננסי.",
  dealRate: "הריבית השנתית שהמממן דורש בעסקה — זו נקודת המוצא לפני הסבסוד.",
  customerRate: "הריבית השנתית שהלקוח בפועל ישלם, אחרי שהסוכנות מסבסדת.",
  budget: "סכום הסבסוד שהחטיבה העמידה לרשותך. המחשבון יגזור ממנו את הריבית שהלקוח יקבל.",
  balloon: "יתרת סוף תקופה, אם קיימת בעסקה. משפיעה על ההחזר החודשי ולכן גם על הסבסוד.",
} as const;

const MODES: { id: Mode; icon: string; label: string; desc: string }[] = [
  {
    id: "cost",
    icon: "🟢",
    label: "כמה זה עולה לי?",
    desc: "ריבית עסקה מול הריבית שהלקוח מקבל → עלות הסבסוד",
  },
  {
    id: "budget",
    icon: "🔵",
    label: "יש לי תקציב",
    desc: "תקציב סבסוד נתון → הריבית שהלקוח יקבל",
  },
  {
    id: "target",
    icon: "🎯",
    label: "יש לי ריבית יעד",
    desc: "ריבית יעד → כמה סבסוד צריך (מהיר)",
  },
];

export default function SubsidyCalc({ settings }: { settings: Settings }) {
  const [f, setF] = usePersistentState<SubsidyForm>("sn.calc.subsidy.v1", INITIAL);
  const [flash, setFlash] = useState(0);
  const notify = useToast();

  const set = (patch: Partial<SubsidyForm>) => setF((p) => ({ ...p, ...patch }));

  const priceN = parseNum(f.price);
  const loanN = parseNum(f.loan);
  const monthsN = parseNum(f.months);
  const dealRateN = f.dealRate === "" ? settings.defaultRate : parseNum(f.dealRate);
  const customerRateN = parseNum(f.customerRate);
  const budgetN = parseNum(f.budget);
  const balloonN = parseNum(f.balloon);

  const isBudget = f.mode === "budget";

  const res = useMemo(() => {
    if (isBudget)
      return subsidyToRate(loanN, dealRateN, budgetN, monthsN, balloonN, settings.rateMethod);
    return {
      ...subsidyCost(loanN, dealRateN, customerRateN, monthsN, balloonN, settings.rateMethod),
      newRate: customerRateN,
    };
  }, [
    isBudget,
    loanN,
    dealRateN,
    customerRateN,
    budgetN,
    monthsN,
    balloonN,
    settings.rateMethod,
  ]);

  const effectiveCustomerRate = isBudget ? res.newRate : customerRateN;
  const rateSaving = round2(dealRateN - effectiveCustomerRate);

  const copyForClient = async () => {
    if (!res.ok) {
      notify(res.error ?? "אין נתונים להעתקה");
      return;
    }
    const lines = [
      "🤑 חישוב סבסוד — שלום נוי",
      "―――――――――――――――",
      priceN > 0 ? `🔹 מחיר הרכב: ${fmtMoney(priceN)}` : "",
      `🔹 סכום המימון: ${fmtMoney(loanN)}`,
      `🔹 תקופה: ${fmtNum(monthsN)} חודשים`,
      balloonN > 0 ? `🔹 בלון: ${fmtMoney(balloonN)}` : "",
      `🔹 ריבית העסקה: ${fmtPct(dealRateN)}`,
      `🔹 ריבית ללקוח: ${fmtPct(round2(effectiveCustomerRate))}`,
      "―――――――――――――――",
      `💳 החזר בריבית העסקה: ${fmtMoney(res.dealPayment)}`,
      `💳 החזר בריבית ללקוח: ${fmtMoney(res.customerPayment)}`,
      `📉 הפרש חודשי: ${fmtMoney(res.monthlyDiff)}`,
      `🤑 עלות הסבסוד לסוכנות: ${fmtMoney(res.subsidy)}`,
      `📊 סך ההפרשים לאורך התקופה: ${fmtMoney(res.nominalDiff)}`,
    ].filter(Boolean);
    if (await copyText(lines.join("\n"))) notify("החישוב הועתק ✓");
  };

  const doCalc = () => {
    setFlash((n) => n + 1);
    document
      .getElementById("subsidy-results")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const clear = () => {
    setF({ ...INITIAL, mode: f.mode });
    notify("נוקה ✨");
  };

  const activeMode = MODES.find((m) => m.id === f.mode)!;

  return (
    <div className="calc-screen">
      {/* ── בחירת מצב ── */}
      <section className="panel">
        <h2 className="panel-title">🤑 מה את צריכה לחשב?</h2>
        <div className="mode-tabs" role="tablist" aria-label="מצב החישוב">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={f.mode === m.id}
              className={`mode-tab mode-${m.id}${f.mode === m.id ? " on" : ""}`}
              onClick={() => set({ mode: m.id })}
            >
              <span className="mode-icon">{m.icon}</span>
              <span className="mode-label">{m.label}</span>
            </button>
          ))}
        </div>
        <div className="mode-desc">{activeMode.desc}</div>
      </section>

      {/* ── שדות ── */}
      <section className="panel">
        <h2 className="panel-title">📋 פרטי העסקה</h2>
        <div className="fields-grid">
          {/* במצב היעד המהיר לא מציגים את מחיר הרכב */}
          {f.mode !== "target" && (
            <NumField
              label="מחיר הרכב"
              value={f.price}
              onChange={(v) => set({ price: v })}
              suffix="₪"
              tip={TIPS.price}
            />
          )}
          <NumField
            label="סכום המימון"
            value={f.loan}
            onChange={(v) => set({ loan: v })}
            suffix="₪"
            tip={TIPS.loan}
          />
          <NumField
            label="מספר חודשים"
            value={f.months}
            onChange={(v) => set({ months: v })}
            suffix="חוד׳"
            chips={[12, 24, 36, 48, 60]}
            activeChip={monthsN}
            onChip={(c) => set({ months: String(c) })}
            tip={TIPS.months}
          />
          <NumField
            label="ריבית העסקה"
            value={f.dealRate}
            onChange={(v) => set({ dealRate: v })}
            suffix="%"
            placeholder={toInput(settings.defaultRate) || "0"}
            tip={TIPS.dealRate}
          />

          {isBudget ? (
            <NumField
              label="סכום הסבסוד"
              value={f.budget}
              onChange={(v) => set({ budget: v })}
              suffix="₪"
              tip={TIPS.budget}
            />
          ) : (
            <NumField
              label={f.mode === "target" ? "ריבית יעד ללקוח" : "ריבית שהלקוח יקבל"}
              value={f.customerRate}
              onChange={(v) => set({ customerRate: v })}
              suffix="%"
              tip={TIPS.customerRate}
            />
          )}

          {f.mode !== "target" && (
            <NumField
              label="בלון / יתרת סוף תקופה (לא חובה)"
              value={f.balloon}
              onChange={(v) => set({ balloon: v })}
              suffix="₪"
              tip={TIPS.balloon}
            />
          )}
        </div>
      </section>

      {/* ── תוצאות ── */}
      <section className="panel" id="subsidy-results">
        <h2 className="panel-title">💙 תוצאות</h2>
        {res.ok ? (
          <>
            <div className="meta-badges">
              <span className="badge">💯 עסקה {fmtPct(dealRateN)}</span>
              <span className="badge">🎯 ללקוח {fmtPct(round2(effectiveCustomerRate))}</span>
              <span className="badge">🗓️ {fmtNum(monthsN)} תשלומים</span>
              {rateSaving > 0 && <span className="badge">📉 ‎-{fmtPct(rateSaving)}</span>}
            </div>

            {isBudget ? (
              <ResultHero
                label="🎯 הריבית החדשה"
                value={fmtPct(round2(res.newRate))}
                sub={`בסבסוד של ${fmtMoney(budgetN)} — ירידה של ${fmtPct(rateSaving)}`}
                flash={flash}
              />
            ) : (
              <ResultHero
                label="💰 עלות הסבסוד"
                value={fmtMoney(res.subsidy)}
                sub={`להורדת הריבית מ-${fmtPct(dealRateN)} ל-${fmtPct(round2(effectiveCustomerRate))}`}
                flash={flash}
              />
            )}

            {res.subsidy < 0 && (
              <div className="alert alert-bdm">
                🔶 הריבית ללקוח גבוהה מריבית העסקה — אין כאן סבסוד אלא תוספת.
              </div>
            )}

            <div className="result-list">
              <ResultRow label="ההחזר החודשי בריבית העסקה" value={fmtMoney(res.dealPayment)} />
              <ResultRow
                label="ההחזר החודשי בריבית ללקוח"
                value={fmtMoney(res.customerPayment)}
              />
              <ResultRow
                label="ההפרש החודשי"
                value={fmtMoney(res.monthlyDiff)}
                sub="כמה הלקוח חוסך בחודש"
              />
              {isBudget ? (
                <ResultRow
                  label="הריבית שהלקוח יקבל"
                  value={fmtPct(round2(res.newRate))}
                  strong
                />
              ) : (
                <ResultRow
                  label="הסבסוד הכולל הנדרש"
                  value={fmtMoney(res.subsidy)}
                  sub="ערך נוכחי, מהוון בריבית העסקה"
                  strong
                />
              )}
              <ResultRow
                label="סך ההפרשים לאורך התקופה"
                value={fmtMoney(res.nominalDiff)}
                sub="ללא היוון"
              />
              {isBudget && (
                <ResultRow
                  label="בדיקה: הסבסוד שנדרש לריבית שהתקבלה"
                  value={fmtMoney(res.subsidy)}
                />
              )}
            </div>
          </>
        ) : (
          <div className="empty-note">{res.error ?? "הזיני נתונים ונחשב יחד 💙"}</div>
        )}
      </section>

      <ActionBar onCalc={doCalc} onCopy={copyForClient} onClear={clear} />
    </div>
  );
}
