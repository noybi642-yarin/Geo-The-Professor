"use client";

import { useMemo, useState } from "react";
import {
  AGENT_VARIABLE_BONUS,
  COMMON_VARIABLE_GOALS,
  INCENTIVE_FOOTNOTE,
  MANAGER_GROUPS,
  MANAGER_GROUP_ORDER,
  MANAGER_VARIABLE_BONUS,
  MIN_NOT_MET_NOTE,
  PENDING_BONUS_NOTE,
  calcAgentIncentive,
  calcManagerIncentive,
  dealsWord,
  missingDealsWord,
  fmtIls,
  fmtPts,
  ptsWord,
  type ManagerGroupId,
} from "@/lib/incentives";
import { copyText, formatTyped, parseNum } from "@/lib/finance";
import {
  ICON_SM,
  ICON_STROKE,
  IconAdd,
  IconClear,
  IconCopyToClient,
  IconInfo,
  IconRemove,
  IconResults,
  IconSubsidy,
  IconDeal,
} from "@/components/ui/icons";
import { useToast } from "./shared";

type Role = "agent" | "manager";

interface GoalRow {
  id: string;
  name: string;
  deals: string;
}

const newRow = (): GoalRow => ({
  id: `g${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
  name: "",
  deals: "",
});

/**
 * המחשבון אינו שומר דבר: הוא כלי עבודה, והמצב מתאפס בכל כניסה.
 * זו הסיבה ש-useState כאן ולא usePersistentState כמו בשאר
 * המחשבונים — ובמיוחד כדי שיעד המימון לא ייטען מערך קודם.
 */
const EMPTY = {
  target: "",
  actual: "",
  regularDeals: "",
  extraDeals: "",
  managerGoalReached: false,
  managerGoalName: "",
};

/**
 * שדה מספרי. ריק נשאר ריק — אין ברירת מחדל ליעד ולביצוע, ולכן
 * "" מתורגם ל-null ולא ל-0.
 */
function NumInput({
  label,
  value,
  onChange,
  suffix,
  placeholder,
  hint,
  integer,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix: string;
  placeholder?: string;
  hint?: string;
  integer?: boolean;
}) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      <div className="field-box">
        <input
          type="text"
          inputMode={integer ? "numeric" : "decimal"}
          value={value}
          placeholder={placeholder ?? "0"}
          onChange={(e) => {
            // אין מספרים שליליים בשום שדה כאן
            const v = formatTyped(e.target.value, false);
            onChange(integer ? v.replace(/\./g, "") : v);
          }}
        />
        <span className="field-suffix">{suffix}</span>
      </div>
      {hint && <div className="field-hint">{hint}</div>}
    </div>
  );
}

/** ריק → null, כדי שהחישוב יידע להימנע במקום להניח אפס */
const toNullable = (s: string): number | null => (s.trim() === "" ? null : parseNum(s));

export default function IncentiveCalc() {
  const [role, setRole] = useState<Role>("agent");
  const [group, setGroup] = useState<ManagerGroupId>("hyundai");
  const [f, setF] = useState({ ...EMPTY });
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const notify = useToast();

  const set = (patch: Partial<typeof EMPTY>) => setF((p) => ({ ...p, ...patch }));

  const reset = () => {
    setF({ ...EMPTY });
    setGoals([]);
    notify("החישוב אופס");
  };

  const agent = useMemo(
    () =>
      calcAgentIncentive({
        target: toNullable(f.target),
        actual: toNullable(f.actual),
        regularDeals: parseNum(f.regularDeals),
        extraDeals: parseNum(f.extraDeals),
        variableGoals: goals.map((g) => ({
          id: g.id,
          name: g.name.trim(),
          deals: parseNum(g.deals),
        })),
      }),
    [f.target, f.actual, f.regularDeals, f.extraDeals, goals]
  );

  const manager = useMemo(
    () =>
      calcManagerIncentive({
        group,
        target: toNullable(f.target),
        actual: toNullable(f.actual),
        regularDeals: parseNum(f.regularDeals),
        extraDeals: parseNum(f.extraDeals),
        variableGoalReached: f.managerGoalReached,
        variableGoalName: f.managerGoalName,
      }),
    [
      group,
      f.target,
      f.actual,
      f.regularDeals,
      f.extraDeals,
      f.managerGoalReached,
      f.managerGoalName,
    ]
  );

  const res = role === "agent" ? agent : manager;

  const copy = async () => {
    const title = role === "agent" ? "תמריץ סוכן" : "תמריץ מנהל אולם";
    const lines = [title, "―――――――――――――――", ...res.explanation];
    if (await copyText(lines.join("\n"))) notify("הפירוט הועתק");
  };

  return (
    <div className="calc-screen">
      {/* ── מי מחשב ── */}
      <section className="panel">
        <h2 className="panel-title">
          <IconSubsidy size={ICON_SM} strokeWidth={ICON_STROKE} aria-hidden />
          למי מחשבים?
        </h2>
        <div className="mode-tabs">
          <button
            type="button"
            className={`mode-tab${role === "agent" ? " on" : ""}`}
            aria-pressed={role === "agent"}
            onClick={() => setRole("agent")}
          >
            <span className="mode-icon" aria-hidden>
              <IconDeal size={20} strokeWidth={ICON_STROKE} />
            </span>
            <span className="mode-label">סוכן</span>
          </button>
          <button
            type="button"
            className={`mode-tab${role === "manager" ? " on" : ""}`}
            aria-pressed={role === "manager"}
            onClick={() => setRole("manager")}
          >
            <span className="mode-icon" aria-hidden>
              <IconResults size={20} strokeWidth={ICON_STROKE} />
            </span>
            <span className="mode-label">מנהל אולם</span>
          </button>
        </div>
        <div className="mode-desc">
          {role === "agent"
            ? "התמריץ מחושב לכל עסקה, לפי מדרגת העמידה ביעד, בתוספת יעדים משתנים."
            : "שני רכיבים מצטברים: תמריץ לפי הביצוע מול היעד, ותמריץ לכל עסקת מימון. המינימום קובע רק את התעריף לעסקה."}
        </div>
      </section>

      {/* ── קלט ── */}
      <section className="panel">
        <h2 className="panel-title">
          <IconDeal size={ICON_SM} strokeWidth={ICON_STROKE} aria-hidden />
          נתוני התקופה
        </h2>

        {role === "manager" && (
          <div className="field" style={{ marginBottom: 16 }}>
            <label className="field-label">קבוצת מותגים</label>
            <div className="seg">
              {MANAGER_GROUP_ORDER.map((id) => (
                <button
                  key={id}
                  type="button"
                  className={group === id ? "on" : ""}
                  onClick={() => setGroup(id)}
                >
                  {MANAGER_GROUPS[id].label}
                </button>
              ))}
            </div>
            <div className="field-hint">
              מינימום לזכאות: {dealsWord(MANAGER_GROUPS[group].minDeals)} מימון
            </div>
          </div>
        )}

        <div className="fields-grid">
          <NumInput
            label="יעד המימון"
            value={f.target}
            onChange={(v) => set({ target: v })}
            suffix="%"
            placeholder="לדוגמה: 43"
          />
          <NumInput
            label="אחוז המימון בפועל"
            value={f.actual}
            onChange={(v) => set({ actual: v })}
            suffix="%"
            placeholder="לדוגמה: 44.3"
          />
          <NumInput
            label="עסקאות מימון רגיל"
            value={f.regularDeals}
            onChange={(v) => set({ regularDeals: v })}
            suffix="עסקאות"
            integer
          />
          <NumInput
            label="עסקאות Extra Lease"
            value={f.extraDeals}
            onChange={(v) => set({ extraDeals: v })}
            suffix="עסקאות"
            integer
          />
        </div>

        {role === "manager" && (
          <div style={{ marginTop: 16 }}>
            <label className="switch-row">
              <input
                type="checkbox"
                checked={f.managerGoalReached}
                onChange={(e) => set({ managerGoalReached: e.target.checked })}
              />
              הושג יעד משתנה ({fmtIls(MANAGER_VARIABLE_BONUS)})
            </label>
            {f.managerGoalReached && (
              <div className="field" style={{ marginTop: 12 }}>
                <label className="field-label">תיאור היעד המשתנה (לא חובה)</label>
                <div className="field-box">
                  <input
                    type="text"
                    value={f.managerGoalName}
                    placeholder="לדוגמה: משפך, Extra Lease"
                    onChange={(e) => set({ managerGoalName: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── יעדים משתנים לסוכן ── */}
      {role === "agent" && (
        <section className="panel">
          <h2 className="panel-title">
            <IconAdd size={ICON_SM} strokeWidth={ICON_STROKE} aria-hidden />
            תוספות בגין יעדים משתנים
          </h2>

          {goals.length === 0 && (
            <div className="field-hint" style={{ marginBottom: 12 }}>
              {fmtIls(AGENT_VARIABLE_BONUS)} לכל עסקה שעמדה ביעד משתנה. אותה עסקה יכולה
              להופיע בכמה יעדים — התוספות מצטברות.
            </div>
          )}

          {goals.map((g, i) => {
            const line = agent.variableLines.find((l) => l.id === g.id);
            return (
              <div className="index-row" key={g.id}>
                <div className="index-row-head">
                  <span className="index-row-num">יעד משתנה {i + 1}</span>
                  <button
                    type="button"
                    className="row-remove"
                    aria-label={`מחיקת יעד משתנה ${i + 1}`}
                    onClick={() => setGoals((p) => p.filter((x) => x.id !== g.id))}
                  >
                    <IconRemove size={14} strokeWidth={ICON_STROKE} aria-hidden />
                  </button>
                </div>
                <div className="fields-grid">
                  <div className="field">
                    <label className="field-label">שם היעד</label>
                    <div className="field-box">
                      <input
                        type="text"
                        list="incentive-goal-names"
                        value={g.name}
                        placeholder="לדוגמה: גלגול"
                        onChange={(e) =>
                          setGoals((p) =>
                            p.map((x) => (x.id === g.id ? { ...x, name: e.target.value } : x))
                          )
                        }
                      />
                    </div>
                  </div>
                  <NumInput
                    label="עסקאות שעמדו ביעד"
                    value={g.deals}
                    onChange={(v) =>
                      setGoals((p) => p.map((x) => (x.id === g.id ? { ...x, deals: v } : x)))
                    }
                    suffix="עסקאות"
                    integer
                  />
                </div>
                {line?.error ? (
                  <div className="alert alert-out">
                    <IconInfo size={ICON_SM} strokeWidth={ICON_STROKE} aria-hidden />
                    {line.error}
                  </div>
                ) : (
                  line &&
                  line.deals > 0 && (
                    <div className="field-hint">
                      {dealsWord(line.deals)} × {fmtIls(AGENT_VARIABLE_BONUS)} ={" "}
                      <b>{fmtIls(line.amount)}</b>
                    </div>
                  )
                )}
              </div>
            );
          })}

          <datalist id="incentive-goal-names">
            {COMMON_VARIABLE_GOALS.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>

          <button
            type="button"
            className="btn btn-ghost add-row"
            onClick={() => setGoals((p) => [...p, newRow()])}
          >
            <IconAdd size={ICON_SM} strokeWidth={ICON_STROKE} aria-hidden />
            הוספת יעד משתנה נוסף
          </button>
        </section>
      )}

      {/* ── תוצאה ── */}
      <section className="panel">
        <h2 className="panel-title">
          <IconResults size={ICON_SM} strokeWidth={ICON_STROKE} aria-hidden />
          התמריץ הצפוי
        </h2>

        {!res.ok ? (
          <div className="empty-note">{res.message}</div>
        ) : role === "agent" ? (
          <AgentResultView res={agent} />
        ) : (
          <ManagerResultView res={manager} />
        )}

        {res.ok && (
          <>
            <div className="cpi-forecast">
              <h3 className="subhead">פירוט החישוב</h3>
              <ul className="kb-summary">
                {res.explanation.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            </div>

            <div className="actions" style={{ marginTop: 16 }}>
              <button type="button" className="btn btn-success" onClick={copy}>
                <IconCopyToClient size={ICON_SM} strokeWidth={ICON_STROKE} aria-hidden />
                העתקת הפירוט
              </button>
              <button type="button" className="btn btn-ghost" onClick={reset}>
                <IconClear size={ICON_SM} strokeWidth={ICON_STROKE} aria-hidden />
                איפוס חישוב
              </button>
            </div>
          </>
        )}

        {!res.ok && (
          <div className="actions" style={{ marginTop: 16 }}>
            <button type="button" className="btn btn-ghost" onClick={reset}>
              <IconClear size={ICON_SM} strokeWidth={ICON_STROKE} aria-hidden />
              איפוס חישוב
            </button>
          </div>
        )}

        <div className="note">
          <IconInfo size={ICON_SM} strokeWidth={ICON_STROKE} aria-hidden />
          {INCENTIVE_FOOTNOTE}
        </div>
      </section>
    </div>
  );
}

// ─── תצוגת תוצאה: סוכן ─────────────────────────────────────────

function GapBadges({ target, actual, gapPts, tierLabel }: {
  target: number; actual: number; gapPts: number; tierLabel: string;
}) {
  return (
    <div className="meta-badges">
      <span className="badge">יעד {fmtPts(target)}%</span>
      <span className="badge">בפועל {fmtPts(actual)}%</span>
      <span className="badge">
        {gapPts === 0 ? "על היעד" : `${gapPts > 0 ? "+" : "−"}${ptsWord(Math.abs(gapPts))}`}
      </span>
      <span className="badge tier-badge">{tierLabel}</span>
    </div>
  );
}

function AgentResultView({ res }: { res: ReturnType<typeof calcAgentIncentive> }) {
  return (
    <>
      <GapBadges
        target={res.target!}
        actual={res.actual!}
        gapPts={res.gapPts!}
        tierLabel={res.tier!.label}
      />
      <div className="result-hero">
        <span className="hero-label">סך התמריץ הצפוי</span>
        <span className="hero-value">{fmtIls(res.total)}</span>
        <span className="hero-sub">מדרגת {res.tier!.label}</span>
      </div>

      <div className="result-list">
        <ResultLine
          label={`תמריץ מימון רגיל (${dealsWord(res.regularDeals)})`}
          value={fmtIls(res.regularAmount)}
        />
        <ResultLine
          label={`תמריץ Extra Lease (${dealsWord(res.extraDeals)})`}
          value={fmtIls(res.extraAmount)}
        />
        {res.variableLines
          .filter((l) => !l.error && l.deals > 0)
          .map((l) => (
            <ResultLine
              key={l.id}
              label={`${l.name || "יעד משתנה"} — ${dealsWord(l.deals)}`}
              value={fmtIls(l.amount)}
            />
          ))}
        {/* שורת הסיכום מיותרת כשיש שורה אחת בלבד — היא זהה לה */}
        {res.variableLines.filter((l) => !l.error && l.deals > 0).length > 1 && (
          <ResultLine label="סך התוספות המשתנות" value={fmtIls(res.variableTotal)} />
        )}
        <ResultLine label="סך התמריץ הצפוי" value={fmtIls(res.total)} strong />
      </div>
    </>
  );
}

// ─── תצוגת תוצאה: מנהל ─────────────────────────────────────────

function ManagerResultView({ res }: { res: ReturnType<typeof calcManagerIncentive> }) {
  return (
    <>
      <div className="meta-badges">
        <span className="badge">{res.group.label}</span>
        <span className="badge">יעד {fmtPts(res.target!)}%</span>
        <span className="badge">בפועל {fmtPts(res.actual!)}%</span>
        <span className="badge">
          {res.gapPts === 0
            ? "על היעד"
            : `${res.gapPts! > 0 ? "+" : "−"}${ptsWord(Math.abs(res.gapPts!))}`}
        </span>
        <span className="badge tier-badge">{res.tier!.label}</span>
      </div>

      {/* המינימום אינו מאפס דבר — ההודעה מסבירה בדיוק מה כן השתנה */}
      {!res.meetsMin && (
        <div className="alert alert-bdm" style={{ marginBottom: 14 }}>
          <IconInfo size={ICON_SM} strokeWidth={ICON_STROKE} aria-hidden />
          <span>
            {MIN_NOT_MET_NOTE} הוזנו {dealsWord(res.totalDeals)} מתוך{" "}
            {dealsWord(res.minDeals)}, {missingDealsWord(res.dealsShort)}.
          </span>
        </div>
      )}

      <div className="result-hero">
        <span className="hero-label">
          {res.needsReview ? "התמריץ הוודאי" : "סך התמריץ הצפוי"}
        </span>
        <span className="hero-value">{fmtIls(res.certainTotal)}</span>
        <span className="hero-sub">
          תמריץ מנהל {fmtIls(res.managerAmount)} · עסקאות {fmtIls(res.dealsAmount)}
          {res.variableBonus > 0 ? ` · בונוס ${fmtIls(res.variableBonus)}` : ""}
        </span>
      </div>

      {/* הבונוס אינו נשלל — הוא פשוט אינו ודאי, ולכן מוצג בנפרד */}
      {res.needsReview && (
        <div className="alert alert-bdm" style={{ marginTop: 14, marginBottom: 4 }}>
          <IconInfo size={ICON_SM} strokeWidth={ICON_STROKE} aria-hidden />
          <span>
            בונוס משתנה אפשרי: <b>{fmtIls(res.pendingBonus)}</b>. סכום אפשרי לאחר אישור
            זכאות: <b>{fmtIls(res.potentialTotal)}</b>. {PENDING_BONUS_NOTE}
          </span>
        </div>
      )}

      <h3 className="subhead">עסקאות ותעריף</h3>
      <div className="result-list">
        <ResultLine
          label="מינימום עסקאות נדרש"
          value={dealsWord(res.minDeals)}
        />
        <ResultLine
          label="סך עסקאות המימון"
          value={`${res.totalDeals} (רגיל ${res.regularDeals} · Extra Lease ${res.extraDeals})`}
        />
        <ResultLine
          label="עמידה במינימום"
          value={res.meetsMin ? "כן" : "לא"}
          good={res.meetsMin}
        />
        <ResultLine
          label="תעריף למימון רגיל"
          value={fmtIls(res.regularRate)}
        />
        <ResultLine label="תעריף ל-Extra Lease" value={fmtIls(res.extraRate)} />
      </div>

      <h3 className="subhead" style={{ marginTop: 18 }}>
        רכיבי התמריץ
      </h3>
      <div className="result-list">
        <ResultLine
          label={`תמריץ מנהל — ${res.tier!.label}`}
          value={fmtIls(res.managerAmount)}
        />
        <ResultLine
          label={`תמריץ מימון רגיל (${dealsWord(res.regularDeals)})`}
          value={fmtIls(res.regularAmount)}
        />
        <ResultLine
          label={`תמריץ Extra Lease (${dealsWord(res.extraDeals)})`}
          value={fmtIls(res.extraAmount)}
        />
        <ResultLine label="בונוס יעד משתנה" value={fmtIls(res.variableBonus)} />
        <ResultLine
          label={res.needsReview ? "תמריץ ודאי" : "סך התמריץ הצפוי"}
          value={fmtIls(res.certainTotal)}
          strong
        />
        {res.needsReview && (
          <>
            <ResultLine label="בונוס משתנה אפשרי" value={fmtIls(res.pendingBonus)} />
            <ResultLine
              label="סכום אפשרי לאחר אישור זכאות"
              value={fmtIls(res.potentialTotal)}
              strong
            />
          </>
        )}
      </div>
    </>
  );
}

function ResultLine({
  label,
  value,
  strong,
  good,
}: {
  label: string;
  value: string;
  strong?: boolean;
  good?: boolean;
}) {
  return (
    <div className={`result-row${strong ? " strong" : ""}${good ? " good" : ""}`}>
      <span className="result-label">{label}</span>
      <span className="result-value">{value}</span>
    </div>
  );
}
