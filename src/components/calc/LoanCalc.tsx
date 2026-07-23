"use client";

import { useMemo, useState } from "react";
import {
  cpiSpitzerLoan,
  copyText,
  equalPrincipalLoan,
  fmtMoney,
  fmtNum,
  fmtPct,
  parseNum,
  PRODUCT_INFO,
  round2,
  spitzerLoan,
  toInput,
  type LoanSummary,
  type ProductType,
  type Settings,
} from "@/lib/finance";
import {
  ActionBar,
  NumField,
  ResultHero,
  ResultRow,
  usePersistentState,
  useToast,
  type Unit,
} from "./shared";
import ScheduleModal from "./ScheduleModal";

interface LoanForm {
  product: ProductType | "";
  price: string;
  down: string;
  downUnit: Unit;
  finPct: string;
  loanOverride: string;
  rate: string;
  primeBase: string;
  primeMargin: string;
  cpi: string;
  months: string;
  balloon: string;
  balloonUnit: Unit;
  fee: string;
}

const INITIAL: LoanForm = {
  product: "",
  price: "",
  down: "",
  downUnit: "amount",
  finPct: "",
  loanOverride: "",
  rate: "",
  primeBase: "",
  primeMargin: "",
  cpi: "",
  months: "60",
  balloon: "",
  balloonUnit: "percent",
  fee: "",
};

const MONTH_CHIPS = [12, 24, 36, 48, 60, 72, 84, 100];
const CPI_DISCLAIMER =
  "החישוב הצמוד למדד הוא תחזית בלבד. התשלום בפועל עשוי להשתנות בהתאם לשינוי במדד המחירים לצרכן.";

export default function LoanCalc({ settings }: { settings: Settings }) {
  const [f, setF] = usePersistentState<LoanForm>("sn.calc.loan.v1", INITIAL);
  const [showSchedule, setShowSchedule] = useState(false);
  const [flash, setFlash] = useState(0);
  const notify = useToast();

  const set = (patch: Partial<LoanForm>) => setF((p) => ({ ...p, ...patch }));

  const product: ProductType = f.product || settings.defaultProduct;
  const info = PRODUCT_INFO[product];

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
        u === "percent" ? toInput(round2((downN / priceN) * 100)) : toInput(downN);
    }
    set(patch);
  };

  // ריבית לפי מוצר
  const primeBaseN = f.primeBase === "" ? settings.primeBase : parseNum(f.primeBase);
  const primeMarginN = f.primeMargin === "" ? settings.primeMargin : parseNum(f.primeMargin);
  const fixedRateN = f.rate === "" ? settings.defaultRate : parseNum(f.rate);
  const rateN = product === "prime" ? primeBaseN + primeMarginN : fixedRateN;

  const cpiN = f.cpi === "" ? settings.defaultCpi : parseNum(f.cpi);
  const monthsN = parseNum(f.months);
  const feeN = f.fee === "" ? settings.fee : parseNum(f.fee);

  // בלון: אחוז מחושב ממחיר הרכב (ואם אין מחיר — מסכום ההלוואה)
  const balloonBase = priceN > 0 ? priceN : loanN;
  const balloonN =
    f.balloonUnit === "percent"
      ? round2((balloonBase * parseNum(f.balloon)) / 100)
      : parseNum(f.balloon);

  // בקרת קלט מעבר למנוע
  const inputError =
    priceN > 0 && downN > priceN
      ? "המקדמה לא יכולה להיות גדולה ממחיר הרכב"
      : parseNum(f.finPct) > 100
        ? "אחוז המימון לא יכול לעלות על 100%"
        : null;

  const res: LoanSummary = useMemo(() => {
    if (product === "prime")
      return equalPrincipalLoan(loanN, rateN, monthsN, balloonN, feeN, settings.rateMethod);
    return spitzerLoan(loanN, rateN, monthsN, balloonN, feeN, settings.rateMethod);
  }, [product, loanN, rateN, monthsN, balloonN, feeN, settings.rateMethod]);

  // תחזית צמודת מדד (בנוסף לתוצאה הבסיסית)
  const cpiRes: LoanSummary | null = useMemo(() => {
    if (product !== "cpi") return null;
    return cpiSpitzerLoan(loanN, rateN, monthsN, balloonN, feeN, cpiN, settings.rateMethod);
  }, [product, loanN, rateN, monthsN, balloonN, feeN, cpiN, settings.rateMethod]);

  const ok = !inputError && res.ok;
  const errorText = inputError ?? res.error;

  const finPctN = priceN > 0 && loanN > 0 ? (loanN / priceN) * 100 : NaN;
  const dealTotal = ok ? round2(res.totalPaid + (overrideN > 0 ? 0 : downN)) : 0;
  const cpiDealTotal =
    cpiRes?.ok ? round2(cpiRes.totalPaid + (overrideN > 0 ? 0 : downN)) : 0;

  const scheduleRes = product === "cpi" && cpiRes?.ok && cpiN !== 0 ? cpiRes : res;

  const copyForClient = async () => {
    if (!ok) {
      notify(errorText ?? "אין נתונים להעתקה");
      return;
    }
    const lines = ["🚗 הצעת מימון — שלום נוי", "―――――――――――――――"];
    lines.push(`🔹 מסלול: ${info.label}`);
    if (priceN > 0) lines.push(`🔹 מחיר הרכב: ${fmtMoney(priceN)}`);
    if (downN > 0 && overrideN <= 0)
      lines.push(
        `🔹 מקדמה: ${fmtMoney(downN)}${priceN > 0 ? ` (${fmtPct(round2((downN / priceN) * 100))})` : ""}`
      );
    lines.push(`🔹 סכום מימון: ${fmtMoney(loanN)}`);
    if (product === "prime")
      lines.push(`🔹 ריבית שנתית: ${fmtPct(rateN)} (פריים ${fmtPct(primeBaseN)} ${primeMarginN >= 0 ? "+" : "−"} ${fmtPct(Math.abs(primeMarginN))})`);
    else lines.push(`🔹 ריבית שנתית: ${fmtPct(rateN)}`);
    lines.push(`🔹 תקופה: ${fmtNum(monthsN)} חודשים`);
    lines.push("―――――――――――――――");
    if (product === "prime") {
      lines.push(`💳 תשלום ראשון: ${fmtMoney(res.firstPayment)}`);
      lines.push(`💳 תשלום חודשי ממוצע: ${fmtMoney(res.avgPayment)}`);
      lines.push(`💳 תשלום אחרון לפני הבלון: ${fmtMoney(res.lastPayment)}`);
    } else {
      lines.push(`💳 החזר חודשי: ${fmtMoney(res.monthly)}`);
      if (feeN > 0) lines.push(`💰 תשלום ראשון (כולל עמלת הקמה): ${fmtMoney(res.firstPayment)}`);
    }
    if (res.balloon > 0) lines.push(`🎈 בלון בסוף התקופה: ${fmtMoney(res.balloon)}`);
    lines.push(`📊 סך כל התשלומים: ${fmtMoney(res.totalPaid)}`);
    if (product === "cpi" && cpiRes?.ok && cpiN !== 0) {
      lines.push("―――――――――――――――");
      lines.push(`📈 תחזית עם הנחת מדד ${fmtPct(cpiN)} בשנה:`);
      lines.push(`💳 תשלום ראשון משוער: ${fmtMoney(cpiRes.firstPayment)}`);
      lines.push(`💳 תשלום אחרון משוער: ${fmtMoney(cpiRes.lastPayment)}`);
      if (cpiRes.balloon > 0) lines.push(`🎈 בלון צמוד משוער: ${fmtMoney(cpiRes.balloon)}`);
      lines.push(`📊 סך תשלומים משוער: ${fmtMoney(cpiRes.totalPaid)}`);
      lines.push(`ℹ️ ${CPI_DISCLAIMER}`);
    }
    if (await copyText(lines.join("\n"))) notify("ההצעה הועתקה ✓");
  };

  const doCalc = () => {
    setFlash((n) => n + 1);
    document.getElementById("loan-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const clear = () => {
    setF({ ...INITIAL, product: f.product });
    notify("נוקה ✨");
  };

  const badges = (r: LoanSummary) => (
    <div className="meta-badges">
      <span className="badge">🧮 {info.methodLabel}</span>
      <span className="badge">📈 {info.rateLabel}</span>
      <span className="badge">💯 {fmtPct(rateN)} שנתי</span>
      <span className="badge">🗓️ {fmtNum(r.months)} תשלומים</span>
    </div>
  );

  return (
    <div className="calc-screen">
      <section className="panel">
        <h2 className="panel-title">🧭 מוצר המימון</h2>
        <div className="prod-tabs" role="tablist" aria-label="בחירת מוצר מימון">
          {(Object.keys(PRODUCT_INFO) as ProductType[]).map((p) => (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={product === p}
              className={`prod-tab${product === p ? " on" : ""}`}
              onClick={() => set({ product: p })}
            >
              {PRODUCT_INFO[p].label}
            </button>
          ))}
        </div>
      </section>

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

          {product === "prime" ? (
            <>
              <NumField
                label="ריבית פריים בסיסית"
                value={f.primeBase}
                onChange={(v) => set({ primeBase: v })}
                suffix="%"
                placeholder={toInput(settings.primeBase) || "0"}
              />
              <NumField
                label="מרווח מהפריים"
                value={f.primeMargin}
                onChange={(v) => set({ primeMargin: v })}
                suffix="%"
                allowNegative
                placeholder={toInput(settings.primeMargin) || "0"}
                chips={[-0.5, 0, 0.5, 1]}
                chipSuffix="%"
                activeChip={primeMarginN}
                onChip={(c) => set({ primeMargin: toInput(c) || "0" })}
                hint={`ריבית כוללת: פריים ${fmtPct(primeBaseN)} ${primeMarginN >= 0 ? "+" : "−"} ${fmtPct(Math.abs(primeMarginN))} = ${fmtPct(rateN)}`}
              />
            </>
          ) : (
            <NumField
              label="ריבית שנתית"
              value={f.rate}
              onChange={(v) => set({ rate: v })}
              suffix="%"
              placeholder={toInput(settings.defaultRate) || "0"}
            />
          )}

          {product === "cpi" && (
            <NumField
              label="הנחת מדד שנתית משוערת"
              value={f.cpi}
              onChange={(v) => set({ cpi: v })}
              suffix="%"
              placeholder={toInput(settings.defaultCpi) || "0"}
              chips={[0, 1, 2, 3]}
              chipSuffix="%"
              activeChip={cpiN}
              onChip={(c) => set({ cpi: String(c) })}
            />
          )}

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
        {product === "cpi" && <div className="note">ℹ️ {CPI_DISCLAIMER}</div>}
      </section>

      <section className="panel" id="loan-results">
        <h2 className="panel-title">💙 תוצאות — {info.label}</h2>
        {ok ? (
          <>
            {badges(res)}

            {product === "prime" ? (
              <>
                <ResultHero
                  label="תשלום ראשון (הגבוה ביותר)"
                  value={fmtMoney(res.monthly)}
                  sub="ההחזר יורד בהדרגה מדי חודש"
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
                  <ResultRow label="תשלום חודשי ממוצע" value={fmtMoney(res.avgPayment)} />
                  <ResultRow label="תשלום אחרון לפני הבלון" value={fmtMoney(res.lastPayment)} />
                  {res.balloon > 0 && (
                    <ResultRow label="סכום הבלון" value={fmtMoney(res.balloon)} />
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
              <>
                <ResultHero
                  label={product === "cpi" ? "החזר חודשי (בסיס, ללא מדד)" : "החזר חודשי"}
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
            )}

            {product === "cpi" && cpiRes?.ok && (
              <div className="cpi-forecast">
                <h3 className="subhead">📈 תחזית עם הנחת מדד {fmtPct(cpiN)} בשנה</h3>
                {cpiN === 0 ? (
                  <div className="field-hint">
                    הנחת המדד היא 0% — התחזית זהה לתוצאה הבסיסית שלמעלה.
                  </div>
                ) : (
                  <div className="result-list">
                    <ResultRow
                      label="תשלום חודשי ראשון (משוער)"
                      value={fmtMoney(cpiRes.firstPayment)}
                    />
                    <ResultRow
                      label="תשלום חודשי ממוצע בהמשך התקופה"
                      value={fmtMoney(cpiRes.avgPayment)}
                    />
                    <ResultRow label="תשלום אחרון (משוער)" value={fmtMoney(cpiRes.lastPayment)} />
                    {cpiRes.balloon > 0 && (
                      <ResultRow
                        label="יתרת בלון צמודה (משוערת)"
                        value={fmtMoney(cpiRes.balloon)}
                      />
                    )}
                    <ResultRow label="סך ההצמדה המשוער" value={fmtMoney(cpiRes.totalIndexation)} />
                    <ResultRow label="סך הריבית (משוער)" value={fmtMoney(cpiRes.totalInterest)} />
                    <ResultRow
                      label="עלות כוללת משוערת"
                      value={fmtMoney(cpiDealTotal)}
                      sub={downN > 0 && overrideN <= 0 ? "כולל מקדמה" : undefined}
                      strong
                    />
                  </div>
                )}
                <div className="note">ℹ️ {CPI_DISCLAIMER}</div>
              </div>
            )}
          </>
        ) : (
          <div className="empty-note">{errorText ?? "הזיני נתונים ונחשב יחד 💙"}</div>
        )}
      </section>

      <ActionBar onCalc={doCalc} onCopy={copyForClient} onClear={clear}>
        <button
          type="button"
          className="btn btn-dark"
          disabled={!ok}
          onClick={() => setShowSchedule(true)}
        >
          📅 הצג לוח סילוקין
        </button>
      </ActionBar>

      {showSchedule && ok && (
        <ScheduleModal
          meta={[
            { label: "מסלול", value: info.label },
            { label: "הלוואה", value: fmtMoney(loanN) },
            { label: "ריבית", value: fmtPct(rateN) },
            { label: "תקופה", value: `${fmtNum(monthsN)} חוד׳` },
            ...(product === "cpi" && cpiN !== 0
              ? [{ label: "הנחת מדד", value: `${fmtPct(cpiN)} בשנה` }]
              : []),
          ]}
          schedule={scheduleRes.schedule}
          withIndexation={product === "cpi" && cpiN !== 0}
          note={product === "cpi" && cpiN !== 0 ? `ℹ️ ${CPI_DISCLAIMER}` : undefined}
          summaryText={[
            `📅 לוח סילוקין — ${info.label}`,
            `הלוואה: ${fmtMoney(loanN)} | ריבית שנתית: ${fmtPct(rateN)} | תקופה: ${fmtNum(monthsN)} חודשים`,
            product === "prime"
              ? `תשלום ראשון: ${fmtMoney(res.firstPayment)} | ממוצע: ${fmtMoney(res.avgPayment)} | אחרון: ${fmtMoney(res.lastPayment)}`
              : `החזר חודשי: ${fmtMoney(scheduleRes.monthly)}`,
            scheduleRes.balloon > 0 ? `בלון בסוף התקופה: ${fmtMoney(scheduleRes.balloon)}` : "",
            `סך הריבית: ${fmtMoney(scheduleRes.totalInterest)} | סך התשלומים: ${fmtMoney(scheduleRes.totalPaid)}`,
          ]
            .filter(Boolean)
            .join("\n")}
          onClose={() => setShowSchedule(false)}
        />
      )}
    </div>
  );
}
