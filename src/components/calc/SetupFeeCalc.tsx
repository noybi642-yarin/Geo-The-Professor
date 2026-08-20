"use client";

import { useMemo, useState } from "react";
import {
  copyText,
  FEE_SPREAD_RATE,
  fmtMoney,
  fmtNum,
  fmtPct,
  parseNum,
  planSetupFee,
  round2,
  toInput,
  type FeeMode,
} from "@/lib/finance";
import { TRACKS, TRACK_ORDER, feeDescription, trackSetupFee, type TrackId } from "@/lib/tracks";
import {
  ActionBar,
  NumField,
  ResultHero,
  ResultRow,
  usePersistentState,
  useToast,
} from "./shared";
import { ICON_SM, ICON_STROKE, IconInfo, IconResults, IconSetupFee, IconStar } from "@/components/ui/icons";

interface FeeForm {
  track: TrackId;
  loan: string;
  feeOverride: string;
  months: string;
  mode: FeeMode;
  spreadCount: string;
  loanPayment: string;
}

const INITIAL: FeeForm = {
  track: "extra",
  loan: "",
  feeOverride: "",
  months: "36",
  mode: "spread",
  spreadCount: "",
  loanPayment: "",
};

/**
 * מחשבון מהיר לעמלת הקמה.
 * העמלה נגזרת מהמסלול, ופריסתה מחושבת כרכיב עצמאי בריבית 9.5% —
 * היא אינה מצורפת לקרן ההלוואה.
 */
export default function SetupFeeCalc() {
  const [f, setF] = usePersistentState<FeeForm>("sn.calc.fee.v1", INITIAL);
  const [flash, setFlash] = useState(0);
  const notify = useToast();

  const set = (patch: Partial<FeeForm>) => setF((p) => ({ ...p, ...patch }));

  const track = TRACKS[f.track] ? f.track : "extra";
  const rule = TRACKS[track];
  const loanN = parseNum(f.loan);
  const monthsN = parseNum(f.months);
  const loanPaymentN = parseNum(f.loanPayment);

  const autoFee = round2(trackSetupFee(track, loanN));
  const feeN = f.feeOverride === "" ? autoFee : parseNum(f.feeOverride);

  const plan = useMemo(
    () => planSetupFee(feeN, f.mode, parseNum(f.spreadCount), monthsN),
    [feeN, f.mode, f.spreadCount, monthsN]
  );

  const spread = f.mode === "spread" && plan.months > 0;
  const ok = feeN > 0 && (!spread || plan.monthly > 0);
  const totalMonthly = loanPaymentN > 0 ? round2(loanPaymentN + plan.monthly) : 0;

  const copy = async () => {
    if (!ok) {
      notify("יש להזין סכום מימון או עמלה");
      return;
    }
    const lines = [
      "🧾 עמלת הקמה — שלום נוי",
      "―――――――――――――――",
      `🔹 מסלול: ${rule.name} (${feeDescription(track)})`,
      loanN > 0 ? `🔹 סכום מימון: ${fmtMoney(loanN)}` : "",
      `🧾 עמלת הקמה: ${fmtMoney(feeN)}`,
    ].filter(Boolean);
    if (spread) {
      lines.push(
        `🔹 מספר תשלומים: ${fmtNum(plan.months)}`,
        `🔹 ריבית על הפריסה: ${fmtPct(plan.rate)}`,
        `💳 תשלום חודשי בגין עמלת ההקמה: ${fmtMoney(plan.monthly)}`
      );
      if (loanPaymentN > 0) {
        lines.push(
          "―――――――――――――――",
          `💳 החזר מימון: ${fmtMoney(loanPaymentN)}`,
          `🧾 תוספת עמלת הקמה: ${fmtMoney(plan.monthly)}`,
          `💰 סה״כ החזר חודשי: ${fmtMoney(totalMonthly)}`
        );
      }
    } else {
      lines.push("💳 תשלום חד-פעמי בתחילת העסקה");
    }
    if (await copyText(lines.join("\n"))) notify("הועתק");
  };

  return (
    <div className="calc-screen">
      <section className="panel">
        <h2 className="panel-title">
            <IconSetupFee size={ICON_SM} strokeWidth={ICON_STROKE} aria-hidden />
            חישוב עמלת ההקמה
          </h2>

        <div className="track-tabs" role="tablist" aria-label="מסלול">
          {TRACK_ORDER.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={track === id}
              className={`track-tab${track === id ? " on" : ""}${TRACKS[id].star ? " star" : ""}`}
              onClick={() => set({ track: id })}
            >
              
              {TRACKS[id].name}
            </button>
          ))}
        </div>
        <div className="track-facts">
          <span>
            עמלת הקמה: <b>{feeDescription(track)}</b>
          </span>
        </div>

        <div className="fields-grid" style={{ marginTop: 18 }}>
          <NumField
            label="סכום המימון"
            value={f.loan}
            onChange={(v) => set({ loan: v })}
            suffix="₪"
            hint={
              rule.fee.type === "flat"
                ? "ב-Extra Lease העמלה קבועה ואינה תלויה בסכום"
                : "העמלה מחושבת ממנו: 1% + 350 ₪"
            }
          />
          <NumField
            label="עמלת הקמה"
            value={f.feeOverride}
            onChange={(v) => set({ feeOverride: v })}
            suffix="₪"
            placeholder={toInput(autoFee) || "0"}
            hint="ריק = חישוב אוטומטי לפי המסלול"
          />
          <NumField
            label="מספר חודשי העסקה"
            value={f.months}
            onChange={(v) => set({ months: v })}
            suffix="חוד׳"
            chips={[12, 24, 36, 42, 48, 60]}
            activeChip={monthsN}
            onChip={(c) => set({ months: String(c) })}
          />
          <div className="field">
            <div className="field-head">
              <label className="field-label">איך תרצי לשלם את עמלת ההקמה?</label>
            </div>
            <div className="seg">
              <button
                type="button"
                className={f.mode === "upfront" ? "on" : ""}
                onClick={() => set({ mode: "upfront" })}
              >
                תשלום חד-פעמי
              </button>
              <button
                type="button"
                className={f.mode === "spread" ? "on" : ""}
                onClick={() => set({ mode: "spread" })}
              >
                פריסה לתשלומים
              </button>
            </div>
            <div className="field-hint">
              {f.mode === "spread"
                ? `ריבית שנתית נומינלית: ${fmtPct(FEE_SPREAD_RATE)}`
                : "העמלה תיגבה במלואה בתחילת העסקה"}
            </div>
          </div>

          {f.mode === "spread" && (
            <>
              <NumField
                label="מספר תשלומי פריסה"
                value={f.spreadCount}
                onChange={(v) => set({ spreadCount: v })}
                suffix="תש׳"
                placeholder={monthsN > 0 ? String(Math.round(monthsN)) : "0"}
                chips={[12, 24, 36, 48, 60]}
                activeChip={parseNum(f.spreadCount)}
                onChip={(c) => set({ spreadCount: String(c) })}
                hint="ריק = כמספר חודשי העסקה"
              />
              <NumField
                label="החזר המימון החודשי (לא חובה)"
                value={f.loanPayment}
                onChange={(v) => set({ loanPayment: v })}
                suffix="₪"
                hint="להצגת סך ההחזר החודשי"
              />
            </>
          )}
        </div>
      </section>

      <section className="panel" id="fee-results">
        <h2 className="panel-title">
            <IconResults size={ICON_SM} strokeWidth={ICON_STROKE} aria-hidden />
            תוצאות
          </h2>
        {ok ? (
          <>
            {spread ? (
              <ResultHero
                label="תשלום חודשי בגין עמלת ההקמה"
                value={fmtMoney(plan.monthly)}
                sub={`${fmtNum(plan.months)} תשלומים · ריבית ${fmtPct(plan.rate)}`}
                flash={flash}
              />
            ) : (
              <ResultHero
                label="עמלת הקמה — תשלום חד-פעמי"
                value={fmtMoney(feeN)}
                sub="נגבית בתחילת העסקה"
                flash={flash}
              />
            )}

            {spread && loanPaymentN > 0 && (
              <div className="fee-breakdown">
                <div className="fee-line">
                  <span>החזר מימון</span>
                  <b>{fmtMoney(loanPaymentN)}</b>
                </div>
                <div className="fee-line fee-plus">
                  <span>תוספת עמלת הקמה</span>
                  <b>+ {fmtMoney(plan.monthly)}</b>
                </div>
                <div className="fee-line fee-total">
                  <span>סה״כ החזר חודשי</span>
                  <b>{fmtMoney(totalMonthly)}</b>
                </div>
              </div>
            )}

            <div className="result-list">
              <ResultRow
                label="עמלת הקמה"
                value={fmtMoney(feeN)}
                sub={loanN > 0 ? feeDescription(track) : undefined}
                strong
              />
              {spread ? (
                <>
                  <ResultRow label="מספר תשלומים" value={fmtNum(plan.months)} />
                  <ResultRow label="ריבית על הפריסה" value={fmtPct(plan.rate)} />
                  <ResultRow
                    label="תשלום חודשי בגין עמלת ההקמה"
                    value={fmtMoney(plan.monthly)}
                    strong
                  />
                  <ResultRow label="סך הריבית על הפריסה" value={fmtMoney(plan.totalInterest)} />
                  <ResultRow label="סך תשלומי העמלה" value={fmtMoney(plan.totalPaid)} />
                </>
              ) : (
                <ResultRow label="אופן התשלום" value="חד-פעמי" />
              )}
            </div>

            <div className="note">
              ℹ️ עמלת ההקמה מחושבת כרכיב נפרד ואינה מצורפת לקרן ההלוואה — ריבית העסקה אינה חלה
              עליה.
            </div>
          </>
        ) : (
          <div className="empty-note">הזיני סכום מימון או עמלה ונחשב יחד 💙</div>
        )}
      </section>

      <ActionBar
        onCalc={() => {
          setFlash((n) => n + 1);
          document
            .getElementById("fee-results")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
        onCopy={copy}
        onClear={() => {
          setF({ ...INITIAL, track: f.track });
          notify("נוקה");
        }}
      />
    </div>
  );
}
