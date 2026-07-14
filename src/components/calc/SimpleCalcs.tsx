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
  NumField,
  ResultHero,
  ResultRow,
  usePersistentState,
  useToast,
} from "./shared";

function useFlash(resultsId: string) {
  const [flash, setFlash] = useState(0);
  const doCalc = () => {
    setFlash((n) => n + 1);
    document.getElementById(resultsId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return { flash, doCalc };
}

// ─── 💰 מחשבון ריבית ───────────────────────────────────────────

interface InterestForm {
  loan: string;
  rate: string;
  months: string;
}

export function InterestCalc({ settings }: { settings: Settings }) {
  const [f, setF] = usePersistentState<InterestForm>("sn.calc.interest.v1", {
    loan: "",
    rate: "",
    months: "60",
  });
  const { flash, doCalc } = useFlash("interest-results");
  const notify = useToast();

  const loanN = parseNum(f.loan);
  const rateN = f.rate === "" ? settings.defaultRate : parseNum(f.rate);
  const monthsN = parseNum(f.months);

  const res = useMemo(
    () => calcLoan(loanN, rateN, monthsN, 0, 0, settings.rateMethod),
    [loanN, rateN, monthsN, settings.rateMethod]
  );

  const copy = async () => {
    if (!res.ok) return notify(res.error ?? "אין נתונים להעתקה");
    const text = [
      "💰 חישוב ריבית — שלום נוי",
      `🔹 סכום הלוואה (קרן): ${fmtMoney(loanN)}`,
      `🔹 ריבית שנתית: ${fmtPct(rateN)}`,
      `🔹 תקופה: ${fmtNum(monthsN)} חודשים`,
      `💳 החזר חודשי: ${fmtMoney(res.monthly)}`,
      `📈 סך הריבית: ${fmtMoney(res.totalInterest)}`,
      `📊 סך הכל ישולם: ${fmtMoney(res.totalPaid)}`,
    ].join("\n");
    if (await copyText(text)) notify("הועתק ✓");
  };

  return (
    <div className="calc-screen">
      <section className="panel">
        <h2 className="panel-title">💰 פרטי ההלוואה</h2>
        <div className="fields-grid">
          <NumField label="סכום הלוואה" value={f.loan} onChange={(v) => setF((p) => ({ ...p, loan: v }))} suffix="₪" />
          <NumField
            label="ריבית שנתית"
            value={f.rate}
            onChange={(v) => setF((p) => ({ ...p, rate: v }))}
            suffix="%"
            placeholder={toInput(settings.defaultRate) || "0"}
          />
          <NumField
            label="מספר חודשים"
            value={f.months}
            onChange={(v) => setF((p) => ({ ...p, months: v }))}
            suffix="חוד׳"
            chips={[12, 24, 36, 48, 60, 72, 84]}
            activeChip={monthsN}
            onChip={(c) => setF((p) => ({ ...p, months: String(c) }))}
          />
        </div>
      </section>

      <section className="panel" id="interest-results">
        <h2 className="panel-title">💙 תוצאות</h2>
        {res.ok ? (
          <>
            <ResultHero label="סך הריבית שתשולם" value={fmtMoney(res.totalInterest)} flash={flash} />
            <div className="result-list">
              <ResultRow label="החזר חודשי" value={fmtMoney(res.monthly)} />
              <ResultRow label="קרן (הסכום שנלקח)" value={fmtMoney(loanN)} />
              <ResultRow label="סך הכל ישולם" value={fmtMoney(res.totalPaid)} strong />
            </div>
          </>
        ) : (
          <div className="empty-note">{res.error ?? "הזיני נתונים ונחשב יחד 💙"}</div>
        )}
      </section>

      <ActionBar
        onCalc={doCalc}
        onCopy={copy}
        onClear={() => {
          setF({ loan: "", rate: "", months: "60" });
          notify("נוקה ✨");
        }}
      />
    </div>
  );
}

// ─── 📈 מחשבון אחוז מימון ──────────────────────────────────────

interface FinPctForm {
  price: string;
  down: string;
}

export function FinPctCalc() {
  const [f, setF] = usePersistentState<FinPctForm>("sn.calc.finpct.v1", { price: "", down: "" });
  const { flash, doCalc } = useFlash("finpct-results");
  const notify = useToast();

  const priceN = parseNum(f.price);
  const downN = parseNum(f.down);
  const ok = priceN > 0 && downN >= 0 && downN <= priceN;
  const loanN = ok ? round2(priceN - downN) : 0;
  const pctN = ok ? round2((loanN / priceN) * 100) : 0;

  const copy = async () => {
    if (!ok) return notify("אין נתונים להעתקה");
    const text = [
      "📈 אחוז מימון — שלום נוי",
      `🔹 מחיר הרכב: ${fmtMoney(priceN)}`,
      `🔹 מקדמה: ${fmtMoney(downN)}`,
      `💳 סכום ההלוואה: ${fmtMoney(loanN)}`,
      `📈 אחוז המימון: ${fmtPct(pctN)}`,
    ].join("\n");
    if (await copyText(text)) notify("הועתק ✓");
  };

  return (
    <div className="calc-screen">
      <section className="panel">
        <h2 className="panel-title">📈 פרטי העסקה</h2>
        <div className="fields-grid">
          <NumField label="מחיר הרכב" value={f.price} onChange={(v) => setF((p) => ({ ...p, price: v }))} suffix="₪" />
          <NumField label="מקדמה" value={f.down} onChange={(v) => setF((p) => ({ ...p, down: v }))} suffix="₪" />
        </div>
      </section>

      <section className="panel" id="finpct-results">
        <h2 className="panel-title">💙 תוצאות</h2>
        {ok ? (
          <>
            <ResultHero label="אחוז המימון" value={fmtPct(pctN)} flash={flash} />
            <div className="result-list">
              <ResultRow label="סכום ההלוואה" value={fmtMoney(loanN)} strong />
            </div>
          </>
        ) : (
          <div className="empty-note">
            {priceN > 0 && downN > priceN ? "המקדמה גבוהה ממחיר הרכב" : "הזיני נתונים ונחשב יחד 💙"}
          </div>
        )}
      </section>

      <ActionBar
        onCalc={doCalc}
        onCopy={copy}
        onClear={() => {
          setF({ price: "", down: "" });
          notify("נוקה ✨");
        }}
      />
    </div>
  );
}

// ─── 💵 מחשבון מקדמה ───────────────────────────────────────────

interface DownForm {
  price: string;
  finPct: string;
}

export function DownCalc({ settings }: { settings: Settings }) {
  const [f, setF] = usePersistentState<DownForm>("sn.calc.down.v1", { price: "", finPct: "" });
  const { flash, doCalc } = useFlash("down-results");
  const notify = useToast();

  const priceN = parseNum(f.price);
  const pctN = parseNum(f.finPct);
  const ok = priceN > 0 && pctN >= 0 && pctN <= 100;
  const loanN = ok ? round2((priceN * pctN) / 100) : 0;
  const downN = ok ? round2(priceN - loanN) : 0;

  const copy = async () => {
    if (!ok) return notify("אין נתונים להעתקה");
    const text = [
      "💵 חישוב מקדמה — שלום נוי",
      `🔹 מחיר הרכב: ${fmtMoney(priceN)}`,
      `🔹 אחוז מימון: ${fmtPct(pctN)}`,
      `💵 מקדמה לתשלום: ${fmtMoney(downN)}`,
      `💳 סכום ההלוואה: ${fmtMoney(loanN)}`,
    ].join("\n");
    if (await copyText(text)) notify("הועתק ✓");
  };

  return (
    <div className="calc-screen">
      <section className="panel">
        <h2 className="panel-title">💵 פרטי העסקה</h2>
        <div className="fields-grid">
          <NumField label="מחיר הרכב" value={f.price} onChange={(v) => setF((p) => ({ ...p, price: v }))} suffix="₪" />
          <NumField
            label="אחוז מימון"
            value={f.finPct}
            onChange={(v) => setF((p) => ({ ...p, finPct: v }))}
            suffix="%"
            chips={settings.commonPcts}
            chipSuffix="%"
            activeChip={pctN}
            onChip={(c) => setF((p) => ({ ...p, finPct: String(c) }))}
          />
        </div>
      </section>

      <section className="panel" id="down-results">
        <h2 className="panel-title">💙 תוצאות</h2>
        {ok ? (
          <>
            <ResultHero label="מקדמה לתשלום" value={fmtMoney(downN)} flash={flash} />
            <div className="result-list">
              <ResultRow label="סכום ההלוואה" value={fmtMoney(loanN)} strong />
            </div>
          </>
        ) : (
          <div className="empty-note">
            {priceN > 0 && pctN > 100 ? "אחוז המימון לא יכול לעלות על 100%" : "הזיני נתונים ונחשב יחד 💙"}
          </div>
        )}
      </section>

      <ActionBar
        onCalc={doCalc}
        onCopy={copy}
        onClear={() => {
          setF({ price: "", finPct: "" });
          notify("נוקה ✨");
        }}
      />
    </div>
  );
}

// ─── 📊 מחשבון בלון ────────────────────────────────────────────

interface BalloonForm {
  price: string;
  balloonPct: string;
  down: string;
}

export function BalloonCalc() {
  const [f, setF] = usePersistentState<BalloonForm>("sn.calc.balloon.v1", {
    price: "",
    balloonPct: "",
    down: "",
  });
  const { flash, doCalc } = useFlash("balloon-results");
  const notify = useToast();

  const priceN = parseNum(f.price);
  const pctN = parseNum(f.balloonPct);
  const downN = parseNum(f.down);
  const ok = priceN > 0 && pctN >= 0 && pctN <= 100 && downN >= 0 && downN <= priceN;
  const balloonN = ok ? round2((priceN * pctN) / 100) : 0;
  const loanN = ok ? round2(priceN - downN) : 0;

  const copy = async () => {
    if (!ok) return notify("אין נתונים להעתקה");
    const text = [
      "📊 חישוב בלון — שלום נוי",
      `🔹 מחיר הרכב: ${fmtMoney(priceN)}`,
      `🔹 אחוז בלון: ${fmtPct(pctN)}`,
      downN > 0 ? `🔹 מקדמה: ${fmtMoney(downN)}` : "",
      `🎈 סכום הבלון: ${fmtMoney(balloonN)}`,
      `💳 סכום ההלוואה לאחר המקדמה: ${fmtMoney(loanN)}`,
    ]
      .filter(Boolean)
      .join("\n");
    if (await copyText(text)) notify("הועתק ✓");
  };

  return (
    <div className="calc-screen">
      <section className="panel">
        <h2 className="panel-title">📊 פרטי העסקה</h2>
        <div className="fields-grid">
          <NumField label="מחיר הרכב" value={f.price} onChange={(v) => setF((p) => ({ ...p, price: v }))} suffix="₪" />
          <NumField
            label="אחוז בלון"
            value={f.balloonPct}
            onChange={(v) => setF((p) => ({ ...p, balloonPct: v }))}
            suffix="%"
            chips={[20, 30, 40, 50, 60]}
            chipSuffix="%"
            activeChip={pctN}
            onChip={(c) => setF((p) => ({ ...p, balloonPct: String(c) }))}
            hint="אחוז ממחיר הרכב"
          />
          <NumField
            label="מקדמה (לא חובה)"
            value={f.down}
            onChange={(v) => setF((p) => ({ ...p, down: v }))}
            suffix="₪"
          />
        </div>
      </section>

      <section className="panel" id="balloon-results">
        <h2 className="panel-title">💙 תוצאות</h2>
        {ok ? (
          <>
            <ResultHero label="סכום הבלון" value={fmtMoney(balloonN)} flash={flash} />
            <div className="result-list">
              <ResultRow label="סכום ההלוואה לאחר המקדמה" value={fmtMoney(loanN)} strong />
            </div>
          </>
        ) : (
          <div className="empty-note">
            {priceN > 0 && downN > priceN ? "המקדמה גבוהה ממחיר הרכב" : "הזיני נתונים ונחשב יחד 💙"}
          </div>
        )}
      </section>

      <ActionBar
        onCalc={doCalc}
        onCopy={copy}
        onClear={() => {
          setF({ price: "", balloonPct: "", down: "" });
          notify("נוקה ✨");
        }}
      />
    </div>
  );
}
