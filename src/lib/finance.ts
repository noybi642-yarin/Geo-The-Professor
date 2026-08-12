// ─── מנוע חישובים פיננסי ───────────────────────────────────────
// תומך בשלושה מוצרי מימון:
//   • ריבית פריים  — לוח סילוקין בשיטת קרן שווה
//   • ריבית קבועה — לוח שפיצר (Amortization) עם ריבית דריבית
//   • צמודת מדד   — לוח שפיצר + תחזית הצמדה לפי הנחת מדד שנתית
// וכן פריסת יתרת בלון (לפי מספר חודשים או לפי תשלום קיים).
//
// עקרון דיוק: החישובים הפנימיים מתבצעים בדיוק מלא (ללא עיגול ביניים).
// עיגול לאגורות נעשה רק על הסכום הנגבה בפועל (התשלום החודשי) ובסגירת
// התשלום האחרון, שסופג את פערי האגורות — כמקובל בחברות המימון בישראל.

export type RateMethod = "nominal" | "effective";
export type ProductType = "prime" | "fixed" | "cpi";
export type AmortMethod = "spitzer" | "equal-principal";

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
 * תשלום חודשי בלוח שפיצר עם בלון בסוף התקופה (נוסחת PMT):
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
  opening: number; // יתרת פתיחה
  payment: number;
  principal: number;
  interest: number;
  indexation?: number; // רכיב הצמדה למדד (רק במוצר צמוד)
  closing: number; // יתרת סגירה
  isBalloon?: boolean;
}

export interface LoanSummary {
  ok: boolean;
  error?: string;
  method: AmortMethod;
  months: number;
  monthly: number; // התשלום הקבוע (בשפיצר) / הראשון (בקרן שווה)
  firstPayment: number; // כולל עמלת הקמה
  lastPayment: number; // התשלום האחרון לפני הבלון
  avgPayment: number; // תשלום חודשי ממוצע (ללא בלון ועמלה)
  balloon: number;
  totalInterest: number;
  totalIndexation: number; // 0 כשאין הצמדה
  totalPaid: number; // כולל בלון ועמלת הקמה
  schedule: ScheduleRow[];
}

const EMPTY: LoanSummary = {
  ok: false,
  method: "spitzer",
  months: 0,
  monthly: 0,
  firstPayment: 0,
  lastPayment: 0,
  avgPayment: 0,
  balloon: 0,
  totalInterest: 0,
  totalIndexation: 0,
  totalPaid: 0,
  schedule: [],
};

function fail(error: string, method: AmortMethod = "spitzer"): LoanSummary {
  return { ...EMPTY, method, error };
}

/** בדיקות קלט משותפות לכל המוצרים */
function validateLoan(
  loan: number,
  annualPct: number,
  months: number,
  balloon: number,
  method: AmortMethod
): LoanSummary | null {
  if (!(loan > 0)) return fail("יש להזין סכום הלוואה", method);
  if (!(Math.round(months) > 0)) return fail("מספר החודשים חייב להיות גדול מאפס", method);
  if (annualPct < 0) return fail("לא ניתן להזין ריבית שלילית", method);
  if (balloon < 0) return fail("סכום הבלון לא יכול להיות שלילי", method);
  if (balloon > loan) return fail("סכום הבלון לא יכול להיות גדול מסכום ההלוואה", method);
  return null;
}

// ─── שפיצר (ריבית קבועה) ───────────────────────────────────────

export function spitzerLoan(
  loan: number,
  annualPct: number,
  months: number,
  balloon = 0,
  fee = 0,
  method: RateMethod = "nominal"
): LoanSummary {
  const invalid = validateLoan(loan, annualPct, months, balloon, "spitzer");
  if (invalid) return invalid;
  const n = Math.round(months);
  const i = monthlyRate(annualPct, method);
  const raw = spitzerPayment(loan, i, n, balloon);
  if (raw <= 0 && balloon < loan)
    return fail("סכום הבלון גבוה מדי ביחס להלוואה", "spitzer");

  // הסכום הנגבה בפועל מעוגל לאגורות; היתרות מנוהלות בדיוק מלא
  const M = round2(raw);
  const schedule: ScheduleRow[] = [];
  let bal = loan;
  let totalInterest = 0;
  let lastPayment = M;

  for (let m = 1; m <= n; m++) {
    const opening = bal;
    const interest = opening * i;
    let payment = M;
    let principal = M - interest;
    // התשלום האחרון סוגר את היתרה בדיוק לסכום הבלון (או לאפס),
    // וסופג את פערי העיגול של האגורות
    if (m === n) {
      principal = opening - balloon;
      payment = principal + interest;
      lastPayment = payment;
    }
    bal = opening - principal;
    totalInterest += interest;
    schedule.push({ month: m, opening, payment, principal, interest, closing: Math.max(bal, 0) });
  }

  if (balloon > 0) {
    schedule.push({
      month: n,
      opening: balloon,
      payment: balloon,
      principal: balloon,
      interest: 0,
      closing: 0,
      isBalloon: true,
    });
  }

  const regularTotal = schedule.reduce((s, r) => (r.isBalloon ? s : s + r.payment), 0);
  return {
    ok: true,
    method: "spitzer",
    months: n,
    monthly: M,
    firstPayment: schedule[0].payment + fee,
    lastPayment,
    avgPayment: regularTotal / n,
    balloon,
    totalInterest,
    totalIndexation: 0,
    totalPaid: regularTotal + balloon + fee,
    schedule,
  };
}

// ─── קרן שווה (ריבית פריים) ────────────────────────────────────

export function equalPrincipalLoan(
  loan: number,
  annualPct: number,
  months: number,
  balloon = 0,
  fee = 0,
  method: RateMethod = "nominal"
): LoanSummary {
  const invalid = validateLoan(loan, annualPct, months, balloon, "equal-principal");
  if (invalid) return invalid;
  const n = Math.round(months);
  const i = monthlyRate(annualPct, method);
  const principalPerMonth = (loan - balloon) / n;

  const schedule: ScheduleRow[] = [];
  let bal = loan;
  let totalInterest = 0;

  for (let m = 1; m <= n; m++) {
    const opening = bal;
    const interest = opening * i;
    // בחודש האחרון סוגרים את הקרן במדויק עד יתרת הבלון
    const principal = m === n ? opening - balloon : principalPerMonth;
    const payment = principal + interest;
    bal = opening - principal;
    totalInterest += interest;
    schedule.push({ month: m, opening, payment, principal, interest, closing: Math.max(bal, 0) });
  }

  if (balloon > 0) {
    schedule.push({
      month: n,
      opening: balloon,
      payment: balloon,
      principal: balloon,
      interest: 0,
      closing: 0,
      isBalloon: true,
    });
  }

  const regularTotal = schedule.reduce((s, r) => (r.isBalloon ? s : s + r.payment), 0);
  return {
    ok: true,
    method: "equal-principal",
    months: n,
    monthly: schedule[0].payment,
    firstPayment: schedule[0].payment + fee,
    lastPayment: schedule[n - 1].payment,
    avgPayment: regularTotal / n,
    balloon,
    totalInterest,
    totalIndexation: 0,
    totalPaid: regularTotal + balloon + fee,
    schedule,
  };
}

// ─── צמודת מדד (שפיצר + תחזית הצמדה) ──────────────────────────

/**
 * תחזית הלוואה צמודת מדד בשיטת שפיצר.
 * המודל המקובל: בכל חודש היתרה משוערכת לפי מקדם המדד החודשי
 * c = (1+cpi)^(1/12), הריבית מחושבת על היתרה המשוערכת, והתשלום
 * הנומינלי גדל בהתאם (M·cᵏ). הבלון בסוף התקופה צמוד גם הוא.
 * זוהי תחזית בלבד — המדד בפועל אינו ידוע מראש.
 */
export function cpiSpitzerLoan(
  loan: number,
  annualPct: number,
  months: number,
  balloon = 0,
  fee = 0,
  cpiAnnualPct = 0,
  method: RateMethod = "nominal"
): LoanSummary {
  const base = spitzerLoan(loan, annualPct, months, balloon, fee, method);
  if (!base.ok) return base;
  if (cpiAnnualPct < -50) return fail("הנחת מדד לא סבירה");

  const n = base.months;
  const i = monthlyRate(annualPct, method);
  const c = Math.pow(1 + cpiAnnualPct / 100, 1 / 12); // מקדם מדד חודשי
  const M = base.monthly;

  const schedule: ScheduleRow[] = [];
  let bal = loan;
  let totalInterest = 0;
  let totalIndexation = 0;
  let lastPayment = M;

  for (let m = 1; m <= n; m++) {
    const opening = bal;
    const indexation = opening * (c - 1); // הצמדת היתרה החודשית
    const indexed = opening + indexation;
    const interest = indexed * i;
    let payment = M * Math.pow(c, m);
    let principal = payment - interest;
    if (m === n) {
      // סגירה מדויקת ליתרת הבלון הצמודה
      const indexedBalloon = balloon * Math.pow(c, n);
      principal = indexed - indexedBalloon;
      payment = principal + interest;
      lastPayment = payment;
    }
    bal = indexed - principal;
    totalInterest += interest;
    totalIndexation += indexation;
    schedule.push({
      month: m,
      opening,
      payment,
      principal,
      interest,
      indexation,
      closing: Math.max(bal, 0),
    });
  }

  const indexedBalloon = balloon * Math.pow(c, n);
  if (balloon > 0) {
    schedule.push({
      month: n,
      opening: indexedBalloon,
      payment: indexedBalloon,
      principal: indexedBalloon,
      interest: 0,
      indexation: indexedBalloon - balloon,
      closing: 0,
      isBalloon: true,
    });
  }

  const regularTotal = schedule.reduce((s, r) => (r.isBalloon ? s : s + r.payment), 0);
  const totalPaid = regularTotal + indexedBalloon + fee;
  return {
    ok: true,
    method: "spitzer",
    months: n,
    monthly: schedule[0].payment,
    firstPayment: schedule[0].payment + fee,
    lastPayment,
    avgPayment: regularTotal / n,
    balloon: indexedBalloon,
    totalInterest,
    // סך ההצמדה המשוער: ההפרש בין סך התשלומים הצמוד לבסיסי
    totalIndexation: totalPaid - base.totalPaid,
    totalPaid,
    schedule,
  };
}

// ─── פריסת יתרת בלון ───────────────────────────────────────────

/** פריסת בלון לפי מספר חודשים — שפיצר ללא בלון נוסף */
export function balloonSpreadByMonths(
  balance: number,
  annualPct: number,
  months: number,
  fee = 0,
  method: RateMethod = "nominal"
): LoanSummary {
  return spitzerLoan(balance, annualPct, months, 0, fee, method);
}

export interface SpreadByPaymentResult extends LoanSummary {
  fullMonths: number; // מספר תשלומים מלאים בגובה שנבחר
}

/**
 * פריסת בלון תוך שמירה על תשלום חודשי קיים.
 * חישוב איטרטיבי חודש-אחר-חודש: ריבית על יתרת הפתיחה, הפחתת קרן,
 * עד איפוס היתרה. התשלום האחרון מותאם ליתרה המדויקת (ללא גבייה עודפת).
 */
export function balloonSpreadByPayment(
  balance: number,
  annualPct: number,
  payment: number,
  fee = 0,
  method: RateMethod = "nominal"
): SpreadByPaymentResult {
  const base = { fullMonths: 0 };
  if (!(balance > 0)) return { ...fail("יש להזין את יתרת הבלון"), ...base };
  if (annualPct < 0) return { ...fail("לא ניתן להזין ריבית שלילית"), ...base };
  if (!(payment > 0)) return { ...fail("יש להזין תשלום חודשי"), ...base };

  const i = monthlyRate(annualPct, method);
  if (payment <= balance * i) {
    return {
      ...fail(
        "התשלום החודשי שנבחר אינו מספיק לכיסוי הריבית ולכן החוב לא יקטן. יש להגדיל את התשלום החודשי."
      ),
      ...base,
    };
  }

  const schedule: ScheduleRow[] = [];
  let bal = balance;
  let totalInterest = 0;
  let m = 0;
  let lastPayment = payment;
  const MAX_MONTHS = 1200;

  while (bal > 0 && m < MAX_MONTHS) {
    m++;
    const opening = bal;
    const interest = opening * i;
    let pay = payment;
    let principal = payment - interest;
    // חודש אחרון: התשלום מותאם ליתרה המדויקת
    if (principal >= opening) {
      principal = opening;
      pay = principal + interest;
      lastPayment = pay;
    }
    bal = opening - principal;
    totalInterest += interest;
    schedule.push({ month: m, opening, payment: pay, principal, interest, closing: Math.max(bal, 0) });
  }

  if (bal > 0) {
    return {
      ...fail(
        "התשלום החודשי שנבחר אינו מספיק לכיסוי הריבית ולכן החוב לא יקטן. יש להגדיל את התשלום החודשי."
      ),
      ...base,
    };
  }

  const regularTotal = schedule.reduce((s, r) => s + r.payment, 0);
  const isPartialLast = lastPayment < payment - 0.005;
  return {
    ok: true,
    method: "spitzer",
    months: m,
    monthly: payment,
    firstPayment: schedule[0].payment + fee,
    lastPayment,
    avgPayment: regularTotal / m,
    balloon: 0,
    totalInterest,
    totalIndexation: 0,
    totalPaid: regularTotal + fee,
    schedule,
    fullMonths: isPartialLast ? m - 1 : m,
  };
}

/** מועד סיום משוער: תאריך התחלה + מספר חודשים, בעברית ("יולי 2031") */
export function estimateEndDate(months: number, startISO?: string): string {
  if (!(months > 0)) return "—";
  const start = startISO ? new Date(startISO) : new Date();
  if (isNaN(start.getTime())) return "—";
  const end = new Date(start.getFullYear(), start.getMonth() + Math.round(months), start.getDate());
  return new Intl.DateTimeFormat("he-IL", { month: "long", year: "numeric" }).format(end);
}

// ─── מנוע TVM ופותר ריבית (Rate Solver) ────────────────────────
// חישובי ערך זמן של כסף אמיתיים — ללא קירובים.
// N = מספר חודשים, I = ריבית שנתית, PV = סכום המימון,
// PMT = החזר חודשי, FV = יתרת סוף תקופה (Balloon).

/** מקדם היוון אנונה: [1-(1+i)^-n] / i */
export function annuityFactor(i: number, n: number): number {
  if (n <= 0) return 0;
  if (i === 0) return n;
  return (1 - Math.pow(1 + i, -n)) / i;
}

/** ערך נוכחי של סדרת תשלומים קבועים + יתרת סוף תקופה */
export function presentValue(pmt: number, i: number, n: number, fv = 0): number {
  return pmt * annuityFactor(i, n) + fv * Math.pow(1 + i, -n);
}

/** המרת ריבית חודשית חזרה לריבית שנתית */
export function annualFromMonthly(i: number, method: RateMethod = "nominal"): number {
  return method === "effective" ? (Math.pow(1 + i, 12) - 1) * 100 : i * 12 * 100;
}

/**
 * פותר ריבית חודשית מתוך PV, PMT, N ו-FV — Newton-Raphson
 * עם חסם ביסקציה שמבטיח התכנסות בכל מקרה.
 * מדויק עד 1e-12 בריבית החודשית (הרבה מתחת ל-0.01% שנתי).
 */
export function solveMonthlyRate(
  pv: number,
  pmt: number,
  n: number,
  fv = 0
): { ok: boolean; rate: number; error?: string } {
  if (!(pv > 0)) return { ok: false, rate: 0, error: "סכום המימון חייב להיות גדול מאפס" };
  if (!(n > 0)) return { ok: false, rate: 0, error: "מספר החודשים חייב להיות גדול מאפס" };
  if (!(pmt > 0)) return { ok: false, rate: 0, error: "ההחזר החודשי חייב להיות גדול מאפס" };

  // f(i) = PMT·a(i,n) + FV·(1+i)^-n − PV ; פונקציה מונוטונית יורדת ב-i
  const f = (i: number) => presentValue(pmt, i, n, fv) - pv;

  // סבילות יחסית לגודל העסקה — שארית של אגורה על מיליון היא אפס לכל דבר
  const tol = Math.max(1e-9, pv * 1e-13);

  // ריבית 0% היא הגבול העליון של ה-PV
  const f0 = f(0);
  if (Math.abs(f0) <= tol) return { ok: true, rate: 0 };
  if (f0 < 0)
    return {
      ok: false,
      rate: 0,
      error: "ההחזר החודשי נמוך מדי — אינו מסלק את המימון גם בריבית 0%",
    };

  // חיפוש חסם עליון שבו f מתהפך לשלילי (עד 100% חודשי = 1200% שנתי)
  let hi = 0.01;
  while (f(hi) > 0 && hi < 1) hi *= 2;
  if (f(hi) > 0) return { ok: false, rate: 0, error: "לא נמצאה ריבית מתאימה לנתונים שהוזנו" };

  let lo = 0;
  let i = Math.min(0.005, hi / 2); // ניחוש פתיחה: 6% שנתי

  for (let k = 0; k < 200; k++) {
    const fi = f(i);
    if (Math.abs(fi) <= tol) break;
    if (fi > 0) lo = i;
    else hi = i;
    // הבראקט נסגר עד רמת דיוק המכונה — אין טעם להמשיך
    if (hi - lo < 1e-15) {
      i = (lo + hi) / 2;
      break;
    }

    // נגזרת נומרית דו-צדדית ל-Newton, עם היצמדות לתחום החוקי
    const h = Math.max(i * 1e-7, 1e-12);
    const left = Math.max(i - h, 0);
    const d = (f(i + h) - f(left)) / (i + h - left);

    let next = d !== 0 ? i - fi / d : NaN;
    // אם Newton יצא מהבראקט או נכשל — נסוגים לביסקציה
    if (!Number.isFinite(next) || next <= lo || next >= hi) next = (lo + hi) / 2;
    i = next;
  }

  return { ok: true, rate: i };
}

// ─── מחשבון סבסודים ────────────────────────────────────────────

export interface SubsidyResult {
  ok: boolean;
  error?: string;
  /** החזר חודשי בריבית העסקה */
  dealPayment: number;
  /** החזר חודשי בריבית שהלקוח מקבל */
  customerPayment: number;
  /** ההפרש החודשי */
  monthlyDiff: number;
  /** הסבסוד הנדרש — ערך נוכחי של ההפרשים, מהוון בריבית העסקה */
  subsidy: number;
  /** סך ההפרשים לאורך התקופה, ללא היוון */
  nominalDiff: number;
  dealRate: number;
  customerRate: number;
}

/**
 * מצב 1 / מצב 3 — כמה עולה לסוכנות לסבסד את הריבית.
 *
 * הסבסוד הוא הערך הנוכחי של ההפרשים החודשיים, מהוון בריבית העסקה.
 * זהה מתמטית להפרש בין סכום המימון לבין הערך הנוכחי של תשלומי
 * הלקוח לפי ריבית העסקה:
 *   S = (PMT_deal − PMT_cust) · a(i_deal, n) = PV − PV(PMT_cust @ i_deal)
 */
export function subsidyCost(
  loan: number,
  dealRatePct: number,
  customerRatePct: number,
  months: number,
  balloon = 0,
  method: RateMethod = "nominal"
): SubsidyResult {
  const empty: SubsidyResult = {
    ok: false,
    dealPayment: 0,
    customerPayment: 0,
    monthlyDiff: 0,
    subsidy: 0,
    nominalDiff: 0,
    dealRate: dealRatePct,
    customerRate: customerRatePct,
  };

  if (!(loan > 0)) return { ...empty, error: "יש להזין סכום מימון" };
  const n = Math.round(months);
  if (!(n > 0)) return { ...empty, error: "מספר החודשים חייב להיות גדול מאפס" };
  if (dealRatePct < 0 || customerRatePct < 0)
    return { ...empty, error: "לא ניתן להזין ריבית שלילית" };
  if (balloon < 0 || balloon > loan)
    return { ...empty, error: "סכום הבלון לא יכול להיות גדול מסכום המימון" };

  const iDeal = monthlyRate(dealRatePct, method);
  const iCust = monthlyRate(customerRatePct, method);
  const dealPayment = spitzerPayment(loan, iDeal, n, balloon);
  const customerPayment = spitzerPayment(loan, iCust, n, balloon);
  const monthlyDiff = dealPayment - customerPayment;

  return {
    ok: true,
    dealPayment,
    customerPayment,
    monthlyDiff,
    subsidy: monthlyDiff * annuityFactor(iDeal, n),
    nominalDiff: monthlyDiff * n,
    dealRate: dealRatePct,
    customerRate: customerRatePct,
  };
}

export interface SubsidyBudgetResult extends SubsidyResult {
  /** הריבית השנתית שהלקוח יקבל אחרי הסבסוד */
  newRate: number;
}

/**
 * מצב 2 — יש תקציב סבסוד, מהי הריבית שהלקוח יקבל.
 *
 * הסוכנות מזרימה S, ולכן שווי ההלוואה עבור המממן הוא PV − S.
 * מכאן נגזר תשלום הלקוח, וממנו נפתרת הריבית באופן איטרטיבי.
 */
export function subsidyToRate(
  loan: number,
  dealRatePct: number,
  subsidy: number,
  months: number,
  balloon = 0,
  method: RateMethod = "nominal"
): SubsidyBudgetResult {
  const base = subsidyCost(loan, dealRatePct, dealRatePct, months, balloon, method);
  const empty: SubsidyBudgetResult = { ...base, ok: false, newRate: 0, subsidy: 0 };
  if (!base.ok) return { ...empty, error: base.error };

  if (subsidy < 0) return { ...empty, error: "סכום הסבסוד לא יכול להיות שלילי" };
  if (subsidy >= loan) return { ...empty, error: "סכום הסבסוד גבוה מסכום המימון" };

  const n = Math.round(months);
  const iDeal = monthlyRate(dealRatePct, method);
  const a = annuityFactor(iDeal, n);
  const v = Math.pow(1 + iDeal, -n);

  // תשלום הלקוח הנגזר מהערך הנוכחי המופחת
  const customerPayment = (loan - subsidy - balloon * v) / a;
  if (!(customerPayment > 0))
    return { ...empty, error: "הסבסוד גבוה מדי ביחס לתנאי העסקה" };

  // התשלום המינימלי האפשרי הוא בריבית 0%
  const zeroRatePayment = (loan - balloon) / n;
  if (customerPayment < zeroRatePayment - 1e-9)
    return {
      ...empty,
      error: "הסבסוד גבוה מהריבית הכוללת בעסקה — הריבית ללקוח לא יכולה לרדת מתחת ל-0%",
    };

  const solved = solveMonthlyRate(loan, customerPayment, n, balloon);
  if (!solved.ok) return { ...empty, error: solved.error };

  const newRate = annualFromMonthly(solved.rate, method);
  const full = subsidyCost(loan, dealRatePct, newRate, months, balloon, method);
  return { ...full, newRate, subsidy, ok: true };
}

// ─── עמלת הקמה ופריסתה ─────────────────────────────────────────

/**
 * הריבית השנתית הנומינלית על פריסת עמלת ההקמה, לפי חוזה המימון.
 * שימו לב: 9.92% המופיע בחוזה הוא הריבית המתואמת (המציגה ריבית
 * דריבית) ואינו הריבית שבה מחושב התשלום — החישוב נעשה ב-9.5%.
 */
export const FEE_SPREAD_RATE = 9.5;

export type FeeMode = "upfront" | "spread";

export interface FeePlan {
  fee: number;
  mode: FeeMode;
  /** מספר תשלומי הפריסה (0 = תשלום חד-פעמי) */
  months: number;
  /** הריבית השנתית הנומינלית על הפריסה (0 בתשלום חד-פעמי) */
  rate: number;
  /** התשלום החודשי בגין העמלה — PMT, מעוגל לאגורות בתצוגה בלבד */
  monthly: number;
  /** התשלום האחרון — סופג את פערי האגורות של הפריסה */
  lastMonthly: number;
  /** סך הריבית על הפריסה */
  totalInterest: number;
  /** סך כל תשלומי העמלה (קרן + ריבית) */
  totalPaid: number;
  /** התוספת בתשלום הראשון (העמלה המלאה בתשלום חד-פעמי) */
  firstAddition: number;
}

/**
 * פריסת עמלת ההקמה.
 *
 * העמלה אינה מצורפת לקרן ההלוואה ואינה נושאת את ריבית העסקה. היא
 * נפרסת כרכיב עצמאי לפי נוסחת PMT בריבית של 9.5% שנתי נומינלי:
 *   i   = 9.5% / 12
 *   PMT = fee · i / (1 - (1+i)^-n)
 *
 * החישוב מתבצע בדיוק מלא; העיגול לאגורות הוא של הסכום הנגבה בלבד,
 * והתשלום האחרון סוגר את פער העיגול המצטבר.
 *
 * spreadCount ריק או אפס → ברירת המחדל היא מספר חודשי עסקת המימון.
 */
export function planSetupFee(
  fee: number,
  mode: FeeMode,
  spreadCount: number,
  loanMonths: number,
  ratePct: number = FEE_SPREAD_RATE,
  method: RateMethod = "nominal"
): FeePlan {
  const safeFee = fee > 0 ? fee : 0;
  if (safeFee === 0 || mode === "upfront") {
    return {
      fee: safeFee,
      mode: "upfront",
      months: 0,
      rate: 0,
      monthly: 0,
      lastMonthly: 0,
      totalInterest: 0,
      totalPaid: safeFee,
      firstAddition: safeFee,
    };
  }

  // ברירת המחדל: פריסה לכל תקופת המימון
  const requested = Math.round(spreadCount || 0) || Math.round(loanMonths) || 0;
  const n = Math.max(1, requested);

  // פריסת העמלה היא הלוואת שפיצר עצמאית בריבית שלה
  const spread = spitzerLoan(safeFee, ratePct, n, 0, 0, method);
  if (!spread.ok) {
    return {
      fee: safeFee,
      mode: "spread",
      months: n,
      rate: ratePct,
      monthly: 0,
      lastMonthly: 0,
      totalInterest: 0,
      totalPaid: safeFee,
      firstAddition: 0,
    };
  }

  return {
    fee: safeFee,
    mode: "spread",
    months: n,
    rate: ratePct,
    monthly: spread.monthly,
    lastMonthly: spread.lastPayment,
    totalInterest: spread.totalInterest,
    totalPaid: spread.totalPaid,
    firstAddition: spread.schedule[0].payment,
  };
}

export interface FeeApplied {
  /** התשלום הראשון בפועל: החזר הלוואה + רכיב עמלה */
  firstPayment: number;
  /** התשלום בפועל בזמן פריסת העמלה (חודש שוטף) */
  paymentDuringFee: number;
  /** התשלום לאחר שהעמלה סיימה להיפרס */
  paymentAfterFee: number;
  /** סך העמלה (קרן בלבד) */
  totalFee: number;
  /** סך כל תשלומי העמלה, כולל ריבית הפריסה */
  totalFeePaid: number;
}

/** שילוב תוכנית העמלה עם תוצאת ההלוואה — להצגה נפרדת בממשק */
export function applyFeeToLoan(loan: LoanSummary, plan: FeePlan): FeeApplied {
  // firstPayment של המנוע כבר כולל fee=0, ולכן מחושב כאן מחדש
  const loanFirst = loan.schedule.length ? loan.schedule[0].payment : 0;
  const loanRegular = loan.method === "equal-principal" ? loanFirst : loan.monthly;
  return {
    firstPayment: loanFirst + plan.firstAddition,
    paymentDuringFee: plan.months > 0 ? loanRegular + plan.monthly : loanRegular,
    paymentAfterFee: loanRegular,
    totalFee: plan.fee,
    totalFeePaid: plan.totalPaid,
  };
}

// ─── חישובי מדד ────────────────────────────────────────────────

export type IndexChangeKind = "value" | "percent" | "points";

export interface IndexChange {
  kind: IndexChangeKind;
  /** ערך מדד חדש / שינוי באחוזים / שינוי בנקודות */
  value: number;
  label?: string;
}

/** מקדם הצמדה: מדד חדש / מדד בסיס */
export function indexFactor(baseIndex: number, newIndex: number): number {
  if (!(baseIndex > 0)) return 1;
  return newIndex / baseIndex;
}

/** המדד החדש הנובע משינוי בודד מתוך מדד קודם */
export function nextIndex(prevIndex: number, change: IndexChange): number {
  switch (change.kind) {
    case "value":
      return change.value;
    case "percent":
      return prevIndex * (1 + change.value / 100);
    case "points":
      return prevIndex + change.value;
  }
}

export interface IndexStep {
  step: number;
  prevIndex: number;
  changeText: string;
  newIndex: number;
  /** שינוי מצטבר מול מדד הבסיס, באחוזים */
  cumulativePct: number;
  factor: number;
  payment: number;
  /** הפרש מהחודש הקודם */
  diffFromPrev: number;
  /** הפרש מההחזר המקורי */
  diffFromBase: number;
  /** האם הופעלה רצפת מדד הבסיס בשלב הזה */
  floored?: boolean;
}

export interface IndexResult {
  ok: boolean;
  error?: string;
  baseIndex: number;
  finalIndex: number;
  factor: number;
  cumulativePct: number;
  basePayment: number;
  newPayment: number;
  diff: number;
  direction: "up" | "down" | "same";
  newPrincipal?: number;
  newBalloon?: number;
  steps: IndexStep[];
}

const changeText = (c: IndexChange): string => {
  if (c.kind === "value") return `מדד חדש: ${round2(c.value)}`;
  if (c.kind === "percent")
    return `${c.value >= 0 ? "עלייה" : "ירידה"} של ${Math.abs(round2(c.value))}%`;
  return `${c.value >= 0 ? "עלייה" : "ירידה"} של ${Math.abs(round2(c.value))} נק׳`;
};

/**
 * עדכון החזר לפי שינויי מדד — בודד או מצטבר.
 * floorAtBase: מתג אופציונלי שמונע ירידת המדד מתחת למדד הבסיס.
 * אין מנגנון רצפה כברירת מחדל.
 */
export function applyIndexChanges(
  baseIndex: number,
  basePayment: number,
  changes: IndexChange[],
  opts: { floorAtBase?: boolean; principal?: number; balloon?: number } = {}
): IndexResult {
  const empty: IndexResult = {
    ok: false,
    baseIndex,
    finalIndex: baseIndex,
    factor: 1,
    cumulativePct: 0,
    basePayment,
    newPayment: basePayment,
    diff: 0,
    direction: "same",
    steps: [],
  };

  if (!(baseIndex > 0)) return { ...empty, error: "יש להזין מדד בסיס גדול מאפס" };
  if (!(basePayment > 0)) return { ...empty, error: "יש להזין החזר חודשי בסיסי" };
  const valid = changes.filter((c) => Number.isFinite(c.value));
  if (valid.length === 0) return { ...empty, error: "יש להזין לפחות שינוי מדד אחד" };

  const steps: IndexStep[] = [];
  let idx = baseIndex;
  let prevPayment = basePayment;

  for (let k = 0; k < valid.length; k++) {
    const c = valid[k];
    const prevIndex = idx;
    const next = nextIndex(prevIndex, c);
    if (!Number.isFinite(next) || next <= 0)
      return { ...empty, error: "ערכי המדד שהוזנו אינם תקינים" };

    // מסלול המדד עצמו נשמר תמיד אמיתי; הרצפה מוחלת על מקדם ההצמדה
    // בלבד — כך ירידה זמנית אינה מאפסת את נקודת ההתחלה של העליות הבאות
    idx = next;
    const floored = !!opts.floorAtBase && idx < baseIndex;
    const factor = indexFactor(baseIndex, floored ? baseIndex : idx);
    const payment = basePayment * factor;
    steps.push({
      step: k + 1,
      prevIndex,
      changeText: changeText(c),
      newIndex: idx,
      cumulativePct: (factor - 1) * 100,
      factor,
      payment,
      diffFromPrev: payment - prevPayment,
      diffFromBase: payment - basePayment,
      floored,
    });
    prevPayment = payment;
  }

  const flooredFinal = !!opts.floorAtBase && idx < baseIndex;
  const factor = indexFactor(baseIndex, flooredFinal ? baseIndex : idx);
  const newPayment = basePayment * factor;
  const diff = newPayment - basePayment;
  return {
    ok: true,
    baseIndex,
    finalIndex: idx,
    factor,
    cumulativePct: (factor - 1) * 100,
    basePayment,
    newPayment,
    diff,
    direction: Math.abs(diff) < 0.005 ? "same" : diff > 0 ? "up" : "down",
    newPrincipal: opts.principal && opts.principal > 0 ? opts.principal * factor : undefined,
    newBalloon: opts.balloon && opts.balloon > 0 ? opts.balloon * factor : undefined,
    steps,
  };
}

// ─── תאימות לאחור: החתימה הישנה של calcLoan ────────────────────

export interface LoanResult extends LoanSummary {}

export function calcLoan(
  loan: number,
  annualPct: number,
  months: number,
  balloon = 0,
  fee = 0,
  method: RateMethod = "nominal"
): LoanResult {
  return spitzerLoan(loan, annualPct, months, balloon, fee, method);
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

export const fmtPct = (v: number) => (Number.isFinite(v) ? `${numFmt.format(round2(v))}%` : "—");

export const fmtNum = (v: number) => (Number.isFinite(v) ? numFmt.format(v) : "—");

export function parseNum(s: string | number): number {
  if (typeof s === "number") return Number.isFinite(s) ? s : 0;
  if (!s) return 0;
  const n = parseFloat(s.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** עיצוב חי של קלט מספרי: פסיקי אלפים, נקודה אחת, עד 2 ספרות אחרי הנקודה */
export function formatTyped(raw: string, allowNegative = false): string {
  const neg = allowNegative && String(raw).trimStart().startsWith("-") ? "-" : "";
  let s = String(raw).replace(/[^\d.]/g, "");
  const firstDot = s.indexOf(".");
  if (firstDot !== -1) {
    s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, "");
  }
  const parts = s.split(".");
  let int = parts[0].replace(/^0+(?=\d)/, "");
  const dec = parts.length > 1 ? parts[1].slice(0, 2) : undefined;
  int = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return neg + (dec !== undefined ? `${int}.${dec}` : int);
}

/** המרת מספר למחרוזת קלט מעוצבת */
export function toInput(v: number): string {
  if (!Number.isFinite(v) || v === 0) return "";
  return formatTyped(String(round2(v)), v < 0);
}

// ─── ייצוא לוח סילוקין ─────────────────────────────────────────

export interface ScheduleColumn {
  key: "month" | "opening" | "payment" | "principal" | "interest" | "indexation" | "closing";
  label: string;
}

export function scheduleColumns(withIndexation: boolean): ScheduleColumn[] {
  const cols: ScheduleColumn[] = [
    { key: "month", label: "חודש" },
    { key: "opening", label: "יתרת פתיחה" },
    { key: "payment", label: "תשלום חודשי" },
    { key: "principal", label: "קרן" },
    { key: "interest", label: "ריבית" },
  ];
  if (withIndexation) cols.push({ key: "indexation", label: "הצמדה" });
  cols.push({ key: "closing", label: "יתרת סגירה" });
  return cols;
}

/** יצירת CSV של לוח הסילוקין (עם BOM לתמיכה בעברית באקסל) */
export function scheduleToCsv(schedule: ScheduleRow[], withIndexation: boolean): string {
  const cols = scheduleColumns(withIndexation);
  const header = cols.map((c) => c.label).join(",");
  const lines = schedule.map((r) =>
    cols
      .map((c) => {
        if (c.key === "month") return r.isBalloon ? "בלון" : String(r.month);
        const v = r[c.key];
        return v === undefined ? "" : String(round2(v));
      })
      .join(",")
  );
  const totals = schedule.reduce(
    (t, r) => ({
      payment: t.payment + r.payment,
      principal: t.principal + r.principal,
      interest: t.interest + r.interest,
      indexation: t.indexation + (r.indexation ?? 0),
    }),
    { payment: 0, principal: 0, interest: 0, indexation: 0 }
  );
  const summary = cols
    .map((c) => {
      if (c.key === "month") return "סהכ";
      if (c.key === "opening" || c.key === "closing") return "";
      return String(round2(totals[c.key]));
    })
    .join(",");
  return "\uFEFF" + [header, ...lines, summary].join("\r\n");
}

// ─── הגדרות ────────────────────────────────────────────────────

export interface Settings {
  fee: number;
  defaultRate: number;
  rateMethod: RateMethod;
  accent: string;
  commonPcts: number[];
  // מוצרי מימון
  defaultProduct: ProductType;
  primeBase: number; // ריבית הפריים הבסיסית
  primeMargin: number; // מרווח מהפריים (יכול להיות שלילי)
  defaultCpi: number; // הנחת מדד שנתית ברירת מחדל
  spreadRate: number; // ריבית ברירת מחדל לפריסת בלון
}

export const DEFAULT_SETTINGS: Settings = {
  fee: 24.99,
  defaultRate: 8.9,
  rateMethod: "nominal",
  accent: "blue",
  commonPcts: [50, 60, 70, 80, 90, 100],
  defaultProduct: "fixed",
  primeBase: 6,
  primeMargin: 0.5,
  defaultCpi: 0,
  spreadRate: 8.9,
};

export const PRODUCT_INFO: Record<
  ProductType,
  { label: string; short: string; rateLabel: string; methodLabel: string }
> = {
  prime: {
    label: "פריים — קרן שווה",
    short: "פריים",
    rateLabel: "ריבית פריים",
    methodLabel: "קרן שווה",
  },
  fixed: {
    label: "קבועה — שפיצר",
    short: "קבועה",
    rateLabel: "ריבית קבועה",
    methodLabel: "שפיצר",
  },
  cpi: {
    label: "צמודת מדד — שפיצר",
    short: "צמודת מדד",
    rateLabel: "ריבית צמודת מדד",
    methodLabel: "שפיצר",
  },
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
