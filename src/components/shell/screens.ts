// ─── מפת המסכים והניווט ────────────────────────────────────────
// מקור אחד לשמות המסכים, לתיאורים, לאייקונים ולשיוך לקבוצת ניווט.
// סרגל הצד, הניווט התחתון, מסכי האינדקס וכותרות העמודים — כולם
// נגזרים מכאן, ולכן אין מצב שבו הם מציגים דברים שונים.
//
// כל פריט כאן מצביע על פונקציונליות קיימת. אין כאן פריטי ניווט
// דקורטיביים ואין מסכים שאינם קיימים.

import {
  IconBalloon,
  IconBalloonSpread,
  IconCalculators,
  IconCpiHistory,
  IconDeal,
  IconDownPayment,
  IconFinPct,
  IconHome,
  IconIncentives,
  IconIndex,
  IconInterest,
  IconKnowledge,
  IconRateHistory,
  IconSettings,
  IconSetupFee,
  IconSubsidy,
  IconTools,
  IconTracks,
  type LucideIcon,
} from "@/components/ui/icons";

/** מזהי המסכים שמוצגים בתוך העמוד הראשי */
export type ScreenId =
  | "home"
  | "calculators"
  | "tools"
  | "loan"
  | "subsidy"
  | "index"
  | "spread"
  | "tracks"
  | "knowledge"
  | "incentives"
  | "interest"
  | "finpct"
  | "down"
  | "balloon"
  | "setupfee";

export interface ScreenMeta {
  id: ScreenId;
  icon: LucideIcon;
  title: string;
  desc: string;
}

/** המחשבונים המרכזיים — עסקה מלאה מקצה לקצה */
export const PRIMARY_CALCS: ScreenMeta[] = [
  {
    id: "loan",
    icon: IconDeal,
    title: "בניית עסקת מימון",
    desc: "מסלול, ריבית, בלון ועמלת הקמה — עם לוח סילוקין",
  },
  {
    id: "subsidy",
    icon: IconSubsidy,
    title: "מחשבון סבסודים",
    desc: "כמה עולה לסבסד ריבית, ומה מקבלים מתקציב נתון",
  },
  {
    id: "index",
    icon: IconIndex,
    title: "עדכון תשלום לפי מדד",
    desc: "עדכון החזר לפי ערך מדד, אחוזים או נקודות",
  },
  {
    id: "spread",
    icon: IconBalloonSpread,
    title: "פריסת יתרת בלון",
    desc: "המשך תשלומים על יתרת הבלון בסוף העסקה",
  },
];

/** מחשבונים מהירים — חישוב בודד ומיידי */
export const QUICK_CALCS: ScreenMeta[] = [
  { id: "interest", icon: IconInterest, title: "מחשבון ריבית", desc: "כמה ריבית וכמה קרן ישולמו בהלוואה" },
  { id: "finpct", icon: IconFinPct, title: "אחוז מימון", desc: "אחוז המימון לפי מחיר הרכב והמקדמה" },
  { id: "down", icon: IconDownPayment, title: "מחשבון מקדמה", desc: "כמה מקדמה צריך לפי אחוז המימון" },
  { id: "balloon", icon: IconBalloon, title: "מחשבון בלון", desc: "סכום הבלון וההלוואה לאחר המקדמה" },
  { id: "setupfee", icon: IconSetupFee, title: "עמלת הקמה", desc: "חישוב העמלה ופריסתה לתשלומים בריבית 9.5%" },
];

export const ALL_CALCS: ScreenMeta[] = [...PRIMARY_CALCS, ...QUICK_CALCS];

/** מסכי מידע ועזר */
export const TOOL_SCREENS: ScreenMeta[] = [
  {
    id: "tracks",
    icon: IconTracks,
    title: "מסלולי המימון",
    desc: "Drive, Extra Lease, Fix ו-Express — טווחים ותנאים",
  },
];

/** מחשבון התמריצים — יושב לצד מרכז הידע, כי הכללים חיים שם */
export const INCENTIVE_SCREEN: ScreenMeta = {
  id: "incentives",
  icon: IconIncentives,
  title: "כמה אקבל בתמריץ?",
  desc: "מחשבון תמריצים לסוכן ולמנהל אולם — לפי מדרגות היעד",
};

export const KNOWLEDGE_SCREEN: ScreenMeta = {
  id: "knowledge",
  icon: IconKnowledge,
  title: "מרכז הידע",
  desc: "ספריית ידע מקצועית — חוזה המימון ומסמכים לפי סוג לקוח",
};

export const INDEX_SCREENS: ScreenMeta[] = [
  { id: "home", icon: IconHome, title: "ראשי", desc: "נתוני שוק, מחשבונים ומרכז הידע" },
  { id: "calculators", icon: IconCalculators, title: "מחשבונים", desc: "כל מחשבוני המימון" },
  { id: "tools", icon: IconTools, title: "כלים ל-BDM", desc: "מסלולים, היסטוריית נתונים והגדרות" },
];

export const SCREENS: ScreenMeta[] = [
  ...INDEX_SCREENS,
  ...ALL_CALCS,
  ...TOOL_SCREENS,
  KNOWLEDGE_SCREEN,
  INCENTIVE_SCREEN,
];

export const getScreen = (id: ScreenId): ScreenMeta =>
  SCREENS.find((s) => s.id === id) ?? INDEX_SCREENS[0];

/** עמודים אמיתיים בנתיב נפרד — לא מסכים בתוך העמוד הראשי */
export interface RouteMeta {
  href: string;
  icon: LucideIcon;
  title: string;
  desc: string;
}

export const DATA_ROUTES: RouteMeta[] = [
  {
    href: "/cpi-history",
    icon: IconCpiHistory,
    title: "היסטוריית מדד המחירים לצרכן",
    desc: "12 החודשים האחרונים, לפי נתוני הלמ״ס",
  },
  {
    href: "/boi-history",
    icon: IconRateHistory,
    title: "היסטוריית ריבית בנק ישראל",
    desc: "12 התקופות האחרונות והפריים הנגזר",
  },
];

/**
 * מבנה סרגל הצד. פריט הוא אחד משניים:
 * screen — מסך בתוך העמוד הראשי
 * href   — נתיב אמיתי
 * action — פעולה קיימת בממשק (כרגע: פתיחת ההגדרות)
 */
export interface NavEntry {
  key: string;
  label: string;
  icon: LucideIcon;
  screen?: ScreenId;
  href?: string;
  action?: "settings";
  sub?: boolean;
}

export interface NavGroup {
  key: string;
  label?: string;
  entries: NavEntry[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    key: "main",
    entries: [{ key: "home", label: "ראשי", icon: IconHome, screen: "home" }],
  },
  {
    key: "calcs",
    label: "מחשבונים",
    entries: PRIMARY_CALCS.map((c) => ({
      key: c.id,
      label: c.title,
      icon: c.icon,
      screen: c.id,
    })),
  },
  {
    key: "quick",
    label: "מחשבונים מהירים",
    entries: QUICK_CALCS.map((c) => ({
      key: c.id,
      label: c.title,
      icon: c.icon,
      screen: c.id,
    })),
  },
  {
    key: "knowledge",
    label: "ידע מקצועי",
    entries: [
      {
        key: "knowledge",
        label: KNOWLEDGE_SCREEN.title,
        icon: KNOWLEDGE_SCREEN.icon,
        screen: "knowledge",
      },
      {
        key: "incentives",
        label: "מחשבון תמריצים",
        icon: INCENTIVE_SCREEN.icon,
        screen: "incentives",
      },
    ],
  },
  {
    key: "tools",
    label: "כלים ל-BDM",
    entries: [
      { key: "tracks", label: "מסלולי המימון", icon: IconTracks, screen: "tracks" },
      { key: "cpi", label: "היסטוריית מדד", icon: IconCpiHistory, href: "/cpi-history" },
      { key: "boi", label: "היסטוריית ריבית", icon: IconRateHistory, href: "/boi-history" },
      { key: "settings", label: "הגדרות", icon: IconSettings, action: "settings" },
    ],
  },
];

/** ארבעת פריטי הניווט התחתון במובייל */
export const BOTTOM_NAV: { key: string; label: string; icon: LucideIcon; screen: ScreenId }[] = [
  { key: "home", label: "ראשי", icon: IconHome, screen: "home" },
  { key: "calculators", label: "מחשבונים", icon: IconCalculators, screen: "calculators" },
  { key: "knowledge", label: "ידע", icon: IconKnowledge, screen: "knowledge" },
  { key: "tools", label: "כלים", icon: IconTools, screen: "tools" },
];

/** לאיזה פריט בניווט התחתון שייך כל מסך */
export function bottomNavKeyFor(screen: ScreenId): string {
  if (screen === "knowledge" || screen === "incentives") return "knowledge";
  if (ALL_CALCS.some((c) => c.id === screen) || screen === "calculators") return "calculators";
  if (TOOL_SCREENS.some((t) => t.id === screen) || screen === "tools") return "tools";
  return "home";
}

/** שם הקבוצה שאליה שייך המסך — מוצג בסרגל העליון כהקשר ניווט */
export function sectionLabelFor(screen: ScreenId): string {
  if (screen === "home") return "ראשי";
  if (screen === "knowledge" || screen === "incentives") return "ידע מקצועי";
  if (QUICK_CALCS.some((c) => c.id === screen)) return "מחשבונים מהירים";
  if (PRIMARY_CALCS.some((c) => c.id === screen) || screen === "calculators")
    return "מחשבונים";
  return "כלים ל-BDM";
}
