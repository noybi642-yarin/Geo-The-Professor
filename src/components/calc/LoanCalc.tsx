"use client";

import { useMemo, useState } from "react";
import {
  applyFeeToLoan,
  cpiSpitzerLoan,
  copyText,
  equalPrincipalLoan,
  fmtMoney,
  fmtNum,
  fmtPct,
  parseNum,
  planSetupFee,
  PRODUCT_INFO,
  round2,
  spitzerLoan,
  toInput,
  type FeeMode,
  type LoanSummary,
  type ProductType,
  type Settings,
} from "@/lib/finance";
import {
  TRACKS,
  TRACK_ORDER,
  balloonDescription,
  checkDeal,
  extraLeaseBalloonPct,
  feeDescription,
  maxBalloonPct,
  monthsDescription,
  trackSetupFee,
  type Mileage,
  type TrackId,
} from "@/lib/tracks";
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
  track: TrackId;
  product: ProductType | "";
  mileage: Mileage;
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
  feeOverride: string;
  feeMode: FeeMode;
  feeSpreadCount: string;
}

const INITIAL: LoanForm = {
  track: "extra",
  product: "",
  mileage: "20k",
  price: "",
  down: "",
  downUnit: "amount",
  finPct: "",
  loanOverride: "",
  rate: "",
  primeBase: "",
  primeMargin: "",
  cpi: "",
  months: "36",
  // ברירת המחדל היא Extra Lease עם קילומטראז׳ עד 20,000 ק״מ → בלון 50%
  balloon: "50",
  balloonUnit: "percent",
  feeOverride: "",
  feeMode: "upfront",
  feeSpreadCount: "12",
};

const CPI_DISCLAIMER =
  "החישוב הצמוד למדד הוא תחזית בלבד. התשלום בפועל עשוי להשתנות בהתאם לשינוי במדד המחירים לצרכן.";

/** קיצורי דרך לחודשים לפי חוקי המסלול */
function monthChips(trackId: TrackId): number[] {
  const t = TRACKS[trackId];
  if (t.discreteMonths) return t.discreteMonths;
  const out = new Set<number>();
  for (const r of t.monthsRanges) {
    for (const m of [12, 24, 30, 36, 42, 48, 54, 60]) {
      if (m >= r.min && m <= r.max) out.add(m);
    }
    out.add(r.max);
  }
  return Array.from(out).sort((a, b) => a - b);
}

/** קיצורי דרך לאחוזי מקדמה לפי חוקי המסלול */
function downChips(trackId: TrackId): number[] {
  const t = TRACKS[trackId];
  const lo = t.bdmMin ?? t.downMin;
  const hi = t.bdmMax ?? t.downMax;
  const out = new Set<number>([t.downMin, t.downMax]);
  for (const p of [7, 10, 15, 20, 25, 30, 40, 50, 60, 70, 85]) {
    if (p >= lo && p <= hi) out.add(p);
  }
  return Array.from(out).filter((p) => p > 0).sort((a, b) => a - b);
}

export default function LoanCalc({ settings }: { settings: Settings }) {
  const [f, setF] = usePersistentState<LoanForm>("sn.calc.loan.v2", INITIAL);
  const [showSchedule, setShowSchedule] = useState(false);
  const [flash, setFlash] = useState(0);
  const notify = useToast();

  const set = (patch: Partial<LoanForm>) => setF((p) => ({ ...p, ...patch }));

  const track = TRACKS[f.track] ? f.track : "extra";
  const rule = TRACKS[track];

  // סוג ריבית: אם המסלול אינו מתיר את הבחירה הנוכחית — נופלים לראשון המותר
  const requested = (f.product || settings.defaultProduct) as ProductType;
  const product: ProductType = rule.allowedProducts.includes(requested)
    ? requested
    : rule.allowedProducts[0];
  const info = PRODUCT_INFO[product];

  const priceN = parseNum(f.price);
  const downN =
    f.downUnit === "percent" ? round2((priceN * parseNum(f.down)) / 100) : parseNum(f.down);
  const overrideN = parseNum(f.loanOverride);
  const loanN = overrideN > 0 ? overrideN : Math.max(round2(priceN - downN), 0);

  // ── סנכרון מקדמה ⇄ אחוז מימון (בכיוון אחד בכל פעולה, ללא לולאות) ──
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
      patch.down = u === "percent" ? toInput(round2((downN / priceN) * 100)) : toInput(downN);
    }
    set(patch);
  };

  // ── החלפת מסלול: מתאימה תקופה, בלון וסוג ריבית לחוקי המסלול ──
  const handleTrack = (id: TrackId) => {
    if (id === track) return;
    const t = TRACKS[id];
    const patch: Partial<LoanForm> = { track: id };

    const curMonths = parseNum(f.months);
    const monthsOk = t.discreteMonths
      ? t.discreteMonths.includes(Math.round(curMonths))
      : t.monthsRanges.some((r) => curMonths >= r.min && curMonths <= r.max);
    if (!monthsOk) {
      patch.months = String(t.discreteMonths ? t.discreteMonths[0] : t.monthsRanges[0].max);
    }

    if (!t.hasBalloon) patch.balloon = "";
    else if (id === "extra") {
      patch.balloon = String(extraLeaseBalloonPct(f.mileage));
      patch.balloonUnit = "percent";
    }

    if (!t.allowedProducts.includes(requested)) patch.product = t.allowedProducts[0];
    set(patch);
  };

  const handleMileage = (m: Mileage) => {
    const patch: Partial<LoanForm> = { mileage: m };
    if (track === "extra") {
      patch.balloon = String(extraLeaseBalloonPct(m));
      patch.balloonUnit = "percent";
    }
    set(patch);
  };

  // ── ריבית ──
  const primeBaseN = f.primeBase === "" ? settings.primeBase : parseNum(f.primeBase);
  const primeMarginN = f.primeMargin === "" ? settings.primeMargin : parseNum(f.primeMargin);
  const fixedRateN = f.rate === "" ? settings.defaultRate : parseNum(f.rate);
  const rateN = product === "prime" ? primeBaseN + primeMarginN : fixedRateN;
  const cpiN = f.cpi === "" ? settings.defaultCpi : parseNum(f.cpi);
  const monthsN = parseNum(f.months);

  // ── בלון ──
  const balloonBase = priceN > 0 ? priceN : loanN;
  const balloonPctN =
    f.balloonUnit === "percent"
      ? parseNum(f.balloon)
      : balloonBase > 0
        ? (parseNum(f.balloon) / balloonBase) * 100
        : 0;
  const balloonN =
    f.balloonUnit === "percent"
      ? round2((balloonBase * parseNum(f.balloon)) / 100)
      : parseNum(f.balloon);

  // ── עמלת הקמה: מחושבת מהמסלול, ניתנת לדריסה ידנית ──
  const autoFee = round2(trackSetupFee(track, loanN));
  const feeN = f.feeOverride === "" ? autoFee : parseNum(f.feeOverride);
  const feePlan = useMemo(
    () => planSetupFee(feeN, f.feeMode, parseNum(f.feeSpreadCount), monthsN),
    [feeN, f.feeMode, f.feeSpreadCount, monthsN]
  );

  // ── בקרות קלט ──
  const downPctN = priceN > 0 ? (downN / priceN) * 100 : 0;
  const inputError =
    priceN > 0 && downN > priceN
      ? "המקדמה לא יכולה להיות גבוהה ממחיר הרכב"
      : parseNum(f.finPct) > 100
        ? "אחוז המימון לא יכול לעלות על 100%"
        : null;

  // המנוע מקבל fee=0; עמלת ההקמה מוצגת ומחושבת בנפרד
  const res: LoanSummary = useMemo(() => {
    if (product === "prime")
      return equalPrincipalLoan(loanN, rateN, monthsN, balloonN, 0, settings.rateMethod);
    return spitzerLoan(loanN, rateN, monthsN, balloonN, 0, settings.rateMethod);
  }, [product, loanN, rateN, monthsN, balloonN, settings.rateMethod]);

  const cpiRes: LoanSummary | null = useMemo(() => {
    if (product !== "cpi") return null;
    return cpiSpitzerLoan(loanN, rateN, monthsN, balloonN, 0, cpiN, settings.rateMethod);
  }, [product, loanN, rateN, monthsN, balloonN, cpiN, settings.rateMethod]);

  const ok = !inputError && res.ok;
  const errorText = inputError ?? res.error;

  const check = checkDeal(track, {
    downPct: downPctN,
    months: monthsN,
    balloonPct: balloonPctN,
    hasInputs: priceN > 0 || loanN > 0,
  });

  const feeApplied = ok ? applyFeeToLoan(res, feePlan) : null;
  const finPctN = priceN > 0 && loanN > 0 ? (loanN / priceN) * 100 : NaN;
  const totalWithFee = ok ? round2(res.totalPaid + feeN) : 0;
  const dealTotal = ok ? round2(totalWithFee + (overrideN > 0 ? 0 : downN)) : 0;
  const cpiTotalWithFee = cpiRes?.ok ? round2(cpiRes.totalPaid + feeN) : 0;
  const cpiDealTotal = cpiRes?.ok ? round2(cpiTotalWithFee + (overrideN > 0 ? 0 : downN)) : 0;
  const scheduleRes = product === "cpi" && cpiRes?.ok && cpiN !== 0 ? cpiRes : res;
  const maxBal = rule.hasBalloon ? maxBalloonPct(track, monthsN) : null;

  const copyForClient = async () => {
    if (!ok || !feeApplied) {
      notify(errorText ?? "אין נתונים להעתקה");
      return;
    }
    const lines = ["🚗 הצעת מימון — שלום נוי", "―――――――――――――――"];
    lines.push(`🔹 מסלול: ${rule.name}${rule.star ? " ⭐" : ""}`);
    lines.push(`🔹 סוג ריבית: ${info.rateLabel} | סילוקין: ${info.methodLabel}`);
    if (priceN > 0) lines.push(`🔹 מחיר הרכב: ${fmtMoney(priceN)}`);
    if (downN > 0 && overrideN <= 0)
      lines.push(
        `🔹 מקדמה: ${fmtMoney(downN)}${priceN > 0 ? ` (${fmtPct(round2(downPctN))})` : ""}`
      );
    lines.push(`🔹 סכום מימון: ${fmtMoney(loanN)}`);
    lines.push(
      product === "prime"
        ? `🔹 ריבית שנתית: ${fmtPct(rateN)} (פריים ${fmtPct(primeBaseN)} ${primeMarginN >= 0 ? "+" : "−"} ${fmtPct(Math.abs(primeMarginN))})`
        : `🔹 ריבית שנתית: ${fmtPct(rateN)}`
    );
    lines.push(`🔹 תקופה: ${fmtNum(monthsN)} חודשים`);
    lines.push("―――――――――――――――");
    if (product === "prime") {
      lines.push(`💳 תשלום ראשון: ${fmtMoney(feeApplied.firstPayment)}`);
      lines.push(`💳 תשלום חודשי ממוצע: ${fmtMoney(res.avgPayment)}`);
      lines.push(`💳 תשלום אחרון לפני הבלון: ${fmtMoney(res.lastPayment)}`);
    } else {
      lines.push(`💳 החזר חודשי: ${fmtMoney(res.monthly)}`);
      lines.push(`💰 תשלום ראשון: ${fmtMoney(feeApplied.firstPayment)}`);
      if (feePlan.months > 0) {
        lines.push(`💰 תשלום בזמן פריסת העמלה: ${fmtMoney(feeApplied.paymentDuringFee)}`);
        lines.push(`💰 תשלום לאחר סיום פריסת העמלה: ${fmtMoney(feeApplied.paymentAfterFee)}`);
      }
    }
    if (feeN > 0) lines.push(`🧾 עמלת הקמה: ${fmtMoney(feeN)}`);
    if (res.balloon > 0) lines.push(`🎈 בלון בסוף התקופה: ${fmtMoney(res.balloon)}`);
    lines.push(`📊 סך כל התשלומים: ${fmtMoney(totalWithFee)}`);
    if (product === "cpi" && cpiRes?.ok && cpiN !== 0) {
      lines.push("―――――――――――――――");
      lines.push(`📈 תחזית עם הנחת מדד ${fmtPct(cpiN)} בשנה:`);
      lines.push(`💳 תשלום ראשון משוער: ${fmtMoney(cpiRes.monthly + feePlan.firstAddition)}`);
      lines.push(`💳 תשלום אחרון משוער: ${fmtMoney(cpiRes.lastPayment)}`);
      if (cpiRes.balloon > 0) lines.push(`🎈 בלון צמוד משוער: ${fmtMoney(cpiRes.balloon)}`);
      lines.push(`📊 סך תשלומים משוער: ${fmtMoney(cpiTotalWithFee)}`);
      lines.push(`ℹ️ ${CPI_DISCLAIMER}`);
    }
    if (check.messages.length)
      lines.push("―――――――――――――――", ...check.messages.map((m) => `⚠️ ${m.text}`));
    if (await copyText(lines.join("\n"))) notify("ההצעה הועתקה ✓");
  };

  const doCalc = () => {
    setFlash((n) => n + 1);
    document.getElementById("loan-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const clear = () => {
    setF({ ...INITIAL, track: f.track, product: f.product, mileage: f.mileage });
    notify("נוקה ✨");
  };

  return (
    <div className="calc-screen">
      {/* ── מסלול המימון ── */}
      <section className="panel">
        <h2 className="panel-title">🧭 מסלול המימון</h2>
        <div className="track-tabs" role="tablist" aria-label="בחירת מסלול">
          {TRACK_ORDER.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={track === id}
              className={`track-tab${track === id ? " on" : ""}${TRACKS[id].star ? " star" : ""}`}
              onClick={() => handleTrack(id)}
            >
              {TRACKS[id].star ? "⭐ " : ""}
              {TRACKS[id].name}
            </button>
          ))}
        </div>
        <div className="track-facts">
          <span>מקדמה: <b>{rule.downMin}%–{rule.downMax}%</b></span>
          <span>תקופה: <b>{monthsDescription(track)}</b></span>
          <span>בלון: <b>{balloonDescription(track)}</b></span>
          <span>עמלת הקמה: <b>{feeDescription(track)}</b></span>
        </div>

        <div className="sub-label">סוג ריבית</div>
        <div className="prod-tabs" role="tablist" aria-label="בחירת סוג ריבית">
          {rule.allowedProducts.map((p) => (
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

        {track === "extra" && (
          <>
            <div className="sub-label">קילומטראז׳ שנתי צפוי</div>
            <div className="seg">
              <button
                type="button"
                className={f.mileage === "20k" ? "on" : ""}
                onClick={() => handleMileage("20k")}
              >
                עד 20,000 ק״מ → בלון 50%
              </button>
              <button
                type="button"
                className={f.mileage === "25k" ? "on" : ""}
                onClick={() => handleMileage("25k")}
              >
                עד 25,000 ק״מ → בלון 40%
              </button>
            </div>
          </>
        )}

        {check.messages.length > 0 && (
          <div className="alerts">
            {check.messages.map((m, i) => (
              <div key={i} className={`alert alert-${m.level}`}>
                {m.level === "bdm" ? "🔶" : "⛔"} {m.text}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── פרטי העסקה ── */}
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
            chips={f.downUnit === "percent" ? downChips(track) : undefined}
            chipSuffix="%"
            activeChip={round2(parseNum(f.down))}
            onChip={(c) => handleDown(String(c))}
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
            label="סכום מימון"
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
                hint={`ריבית כוללת: ${fmtPct(primeBaseN)} ${primeMarginN >= 0 ? "+" : "−"} ${fmtPct(Math.abs(primeMarginN))} = ${fmtPct(rateN)}`}
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
            chips={monthChips(track)}
            activeChip={monthsN}
            onChip={(c) => set({ months: String(c) })}
          />

          {rule.hasBalloon && (
            <NumField
              label="בלון / יתרת סוף תקופה"
              value={f.balloon}
              onChange={(v) => set({ balloon: v })}
              suffix={f.balloonUnit === "percent" ? "%" : "₪"}
              unit={f.balloonUnit}
              onUnitChange={(u) => set({ balloonUnit: u })}
              chips={f.balloonUnit === "percent" ? [20, 30, 40, 45, 50] : undefined}
              chipSuffix="%"
              activeChip={round2(parseNum(f.balloon))}
              onChip={(c) => set({ balloon: String(c) })}
              hint={
                maxBal !== null
                  ? `אחוז ממחיר הרכב · מרבי ל-${fmtNum(monthsN)} חוד׳: ${maxBal}%`
                  : "אחוז ממחיר הרכב"
              }
            />
          )}
        </div>
        {product === "cpi" && <div className="note">ℹ️ {CPI_DISCLAIMER}</div>}
      </section>

      {/* ── עמלת הקמה ── */}
      <section className="panel">
        <h2 className="panel-title">🧾 עמלת הקמה</h2>
        <div className="fields-grid">
          <NumField
            label="עמלת הקמה"
            value={f.feeOverride}
            onChange={(v) => set({ feeOverride: v })}
            suffix="₪"
            placeholder={toInput(autoFee) || "0"}
            hint={`לפי ${rule.name}: ${feeDescription(track)}${autoFee > 0 ? ` = ${fmtMoney(autoFee)}` : ""}`}
          />
          <div className="field">
            <div className="field-head">
              <label className="field-label">אופן תשלום העמלה</label>
            </div>
            <div className="seg seg-3">
              <button
                type="button"
                className={f.feeMode === "upfront" ? "on" : ""}
                onClick={() => set({ feeMode: "upfront" })}
              >
                חד-פעמי בתחילת העסקה
              </button>
              <button
                type="button"
                className={f.feeMode === "spread" ? "on" : ""}
                onClick={() => set({ feeMode: "spread" })}
              >
                פריסה למספר תשלומים
              </button>
              <button
                type="button"
                className={f.feeMode === "full-term" ? "on" : ""}
                onClick={() => set({ feeMode: "full-term" })}
              >
                פריסה לכל תקופת המימון
              </button>
            </div>
            <div className="field-hint">הפריסה היא ללא ריבית</div>
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
        </div>
      </section>

      {/* ── תוצאות ── */}
      <section className="panel" id="loan-results">
        <h2 className="panel-title">
          💙 תוצאות — {rule.name} · {info.label}
        </h2>
        {ok && feeApplied ? (
          <>
            <div className="meta-badges">
              <span className="badge">🧮 {info.methodLabel}</span>
              <span className="badge">📈 {info.rateLabel}</span>
              <span className="badge">💯 {fmtPct(rateN)} שנתי</span>
              <span className="badge">🗓️ {fmtNum(res.months)} תשלומים</span>
            </div>

            {product === "prime" ? (
              <ResultHero
                label="תשלום ראשון (הגבוה ביותר)"
                value={fmtMoney(feeApplied.firstPayment)}
                sub="ההחזר יורד בהדרגה מדי חודש"
                flash={flash}
              />
            ) : (
              <ResultHero
                label={product === "cpi" ? "החזר חודשי (בסיס, ללא מדד)" : "החזר חודשי"}
                value={fmtMoney(res.monthly)}
                sub={`${fmtNum(monthsN)} תשלומים${res.balloon > 0 ? " + בלון" : ""}`}
                flash={flash}
              />
            )}

            <div className="result-list">
              <ResultRow
                label="סכום המימון"
                value={fmtMoney(loanN)}
                sub={Number.isFinite(finPctN) ? `${fmtPct(round2(finPctN))} מימון` : undefined}
              />
              {product === "prime" ? (
                <>
                  <ResultRow label="החזר הלוואה — תשלום ראשון" value={fmtMoney(res.monthly)} />
                  <ResultRow label="תשלום חודשי ממוצע" value={fmtMoney(res.avgPayment)} />
                  <ResultRow label="תשלום אחרון לפני הבלון" value={fmtMoney(res.lastPayment)} />
                </>
              ) : (
                <ResultRow label="החזר הלוואה (ללא עמלה)" value={fmtMoney(res.monthly)} />
              )}

              <ResultRow
                label="עמלת הקמה"
                value={fmtMoney(feeN)}
                sub={
                  feePlan.months > 0
                    ? `פריסה ל-${fmtNum(feePlan.months)} תשלומים`
                    : "תשלום חד-פעמי"
                }
              />
              {feePlan.months > 0 && (
                <ResultRow label="רכיב עמלה חודשי" value={fmtMoney(feePlan.monthly)} />
              )}
              <ResultRow
                label="תשלום ראשון בפועל"
                value={fmtMoney(feeApplied.firstPayment)}
                strong
              />
              {feePlan.months > 1 && (
                <>
                  <ResultRow
                    label="תשלום בזמן פריסת העמלה"
                    value={fmtMoney(feeApplied.paymentDuringFee)}
                  />
                  <ResultRow
                    label="תשלום לאחר סיום פריסת העמלה"
                    value={fmtMoney(feeApplied.paymentAfterFee)}
                  />
                </>
              )}

              {res.balloon > 0 && (
                <ResultRow label="יתרת בלון בסוף התקופה" value={fmtMoney(res.balloon)} />
              )}
              <ResultRow label="סך הריבית" value={fmtMoney(res.totalInterest)} />
              <ResultRow label="סך כל התשלומים" value={fmtMoney(totalWithFee)} strong />
              <ResultRow
                label="עלות כוללת של העסקה"
                value={fmtMoney(dealTotal)}
                sub={downN > 0 && overrideN <= 0 ? "כולל מקדמה" : undefined}
                strong
              />
            </div>

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
                      value={fmtMoney(cpiRes.monthly + feePlan.firstAddition)}
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
                    <ResultRow label="סך הריבית (משוער)" value={fmtMoney(cpiRes.totalInterest)} />
                    <ResultRow label="סך ההצמדה המשוער" value={fmtMoney(cpiRes.totalIndexation)} />
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
          📅 {showSchedule ? "הסתר" : "הצג"} לוח סילוקין
        </button>
      </ActionBar>

      {showSchedule && ok && (
        <ScheduleModal
          meta={[
            { label: "מסלול", value: rule.name },
            { label: "סילוקין", value: info.methodLabel },
            { label: "מימון", value: fmtMoney(loanN) },
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
            `📅 לוח סילוקין — ${rule.name} · ${info.label}`,
            `מימון: ${fmtMoney(loanN)} | ריבית שנתית: ${fmtPct(rateN)} | תקופה: ${fmtNum(monthsN)} חודשים`,
            product === "prime"
              ? `תשלום ראשון: ${fmtMoney(feeApplied?.firstPayment ?? 0)} | ממוצע: ${fmtMoney(res.avgPayment)} | אחרון: ${fmtMoney(res.lastPayment)}`
              : `החזר חודשי: ${fmtMoney(scheduleRes.monthly)}`,
            feeN > 0 ? `עמלת הקמה: ${fmtMoney(feeN)}` : "",
            scheduleRes.balloon > 0 ? `בלון בסוף התקופה: ${fmtMoney(scheduleRes.balloon)}` : "",
            `סך הריבית: ${fmtMoney(scheduleRes.totalInterest)} | סך התשלומים: ${fmtMoney(round2(scheduleRes.totalPaid + feeN))}`,
          ]
            .filter(Boolean)
            .join("\n")}
          onClose={() => setShowSchedule(false)}
        />
      )}
    </div>
  );
}
