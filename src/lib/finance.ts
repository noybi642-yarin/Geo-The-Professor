// ─── מנוע חישובים פיננסי ───────────────────────────────────────
// לוח שפיצר (Amortization) עם ריבית דריבית ותמיכה מלאה בהלוואת בלון,
// כולל טיפול נכון בעיגולי אגורות — כמקובל בחברות המימון בישראל.

export type RateMethod = "nominal" | "effective";

export function round2(v: number): number {
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

/**
 * המרת ריבית שנתית לריבית חודשית.
 * nominal   – ריבית נומינלית: שנתי / 12 (המקובל בחברות מימון רכב)
 * effective – ריבית אפקטיבית: (1+r)^(1/12) - 1
 */
export function monthlyRate(annualPct: number, method: RateMethod = "nominal"): number {
  if (!annualPct) return 0;
  const r = annualPct / 100;
  return method === "effective" ? Math.pow(1 + r, 1 / 12) - 1 : r / 12;
}

/**
 * תשלום חודשי בלוח שפיצר עם בלון בסוף התקופה:
 * L = M · [1-(1+i)^-n]/i + B·(1+i)^-n
 */
export function spitzerPayment(loan: number, i: number, n: number, balloon = 0): number {
  if (n <= 0 || loan <= 0) return 0;
  if (i === 0) return (loan - balloon) / n;
  const q = Math.pow(1 + i, -n);
  return ((loan - balloon * q) * i) / (1 - q);
}

export interface ScheduleRow {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
  isBalloon?: boolean;
}

export interface LoanResult {
  ok: boolean;
  error?: string;
  monthly: number;
  firstPayment: number;
  balloon: number;
  totalInterest: number;
  totalPaid: number; // כולל בלון ועמלת הקמה
  schedule: ScheduleRow[];
}

const EMPTY_RESULT: LoanResult = {
  ok: false,
  monthly: 0,
  firstPayment: 0,
  balloon: 0,
  totalInterest: 0,
  totalPaid: 0,
  schedule: [],
};

export function calcLoan(
  loan: number,
  annualPct: number,
  months: number,
  balloon = 0,
  fee = 0,
  method: RateMethod = "nominal"
): LoanResult {
  if (!(loan > 0)) return { ...EMPTY_RESULT, error: "יש להזין סכום הלוואה" };
  const n = Math.round(months);
  if (!(n > 0)) return { ...EMPTY_RESULT, error: "יש להזין מספר חודשים" };
  if (balloon < 0 || annualPct < 0) return { ...EMPTY_RESULT, error: "ערכים לא תקינים" };

  const i = monthlyRate(annualPct, method);
  const raw = spitzerPayment(loan, i, n, balloon);
  if (raw <= 0) return { ...EMPTY_RESULT, error: "סכום הבלון גבוה מדי ביחס להלוואה" };

  const M = round2(raw);
  const schedule: ScheduleRow[] = [];
  let bal = loan;
  let totalInterest = 0;

  for (let m = 1; m <= n; m++) {
    const interest = round2(bal * i);
    let principal = round2(M - interest);
    let payment = M;
    // התשלום האחרון סופג את הפרש עיגולי האגורות, כך שהיתרה נסגרת
    // בדיוק לאפס (או בדיוק לסכום הבלון שסוכם)
    if (m === n) {
      principal = round2(bal - (balloon > 0 ? round2(balloon) : 0));
      payment = round2(principal + interest);
    }
    bal = round2(bal - principal);
    totalInterest = round2(totalInterest + interest);
    schedule.push({ month: m, payment, principal, interest, balance: Math.max(bal, 0) });
  }

  let balloonFinal = 0;
  if (balloon > 0) {
    balloonFinal = round2(balloon);
    schedule.push({
      month: n,
      payment: balloonFinal,
      principal: balloonFinal,
      interest: 0,
      balance: 0,
      isBalloon: true,
    });
  }

  const totalPaid = round2(schedule.reduce((s, r) => s + r.payment, 0) + fee);
  return {
    ok: true,
    monthly: M,
    firstPayment: round2(schedule[0].payment + fee),
    balloon: balloonFinal,
    totalInterest,
    totalPaid,
    schedule,
  };
}

// ─── עיצוב מספרים ──────────────────────────────────────────────

const moneyFmt = new Intl.NumberFormat("he-IL", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const numFmt = new Intl.NumberFormat("he-IL", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export const fmtMoney = (v: number) =>
  Number.isFinite(v) ? `${moneyFmt.format(round2(v))} ₪` : "—";

export const fmtPct = (v: number) => (Number.isFinite(v) ? `${numFmt.format(v)}%` : "—");

export const fmtNum = (v: number) => (Number.isFinite(v) ? numFmt.format(v) : "—");

export function parseNum(s: string | number): number {
  if (typeof s === "number") return Number.isFinite(s) ? s : 0;
  if (!s) return 0;
  const n = parseFloat(s.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** עיצוב חי של קלט מספרי: פסיקי אלפים, נקודה אחת, עד 2 ספרות אחרי הנקודה */
export function formatTyped(raw: string): string {
  let s = String(raw).replace(/[^\d.]/g, "");
  const firstDot = s.indexOf(".");
  if (firstDot !== -1) {
    s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, "");
  }
  const parts = s.split(".");
  let int = parts[0].replace(/^0+(?=\d)/, "");
  const dec = parts.length > 1 ? parts[1].slice(0, 2) : undefined;
  int = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return dec !== undefined ? `${int}.${dec}` : int;
}

/** המרת מספר למחרוזת קלט מעוצבת */
export function toInput(v: number): string {
  if (!Number.isFinite(v) || v === 0) return "";
  return formatTyped(String(round2(v)));
}

// ─── הגדרות ────────────────────────────────────────────────────

export interface Settings {
  fee: number;
  defaultRate: number;
  rateMethod: RateMethod;
  accent: string;
  commonPcts: number[];
}

export const DEFAULT_SETTINGS: Settings = {
  fee: 24.99,
  defaultRate: 8.9,
  rateMethod: "nominal",
  accent: "blue",
  commonPcts: [50, 60, 70, 80, 90, 100],
};

export const ACCENTS: Record<
  string,
  { name: string; accent: string; dark: string; soft: string; ring: string }
> = {
  blue: { name: "כחול", accent: "#2563eb", dark: "#0b2a5e", soft: "#e8f0fe", ring: "rgba(37,99,235,.18)" },
  sky: { name: "תכלת", accent: "#0284c7", dark: "#0c3b57", soft: "#e0f2fe", ring: "rgba(2,132,199,.18)" },
  teal: { name: "טורקיז", accent: "#0d9488", dark: "#0f3d38", soft: "#d9f3f0", ring: "rgba(13,148,136,.18)" },
  violet: { name: "סגול", accent: "#7c3aed", dark: "#2e1065", soft: "#ede9fe", ring: "rgba(124,58,237,.18)" },
  rose: { name: "ורוד", accent: "#e11d48", dark: "#4c0519", soft: "#ffe4e6", ring: "rgba(225,29,72,.18)" },
};

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}
