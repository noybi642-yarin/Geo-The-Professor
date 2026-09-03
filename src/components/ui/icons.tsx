// ─── מערכת האייקונים ───────────────────────────────────────────
// מקור אחד לכל האייקונים בממשק. Lucide בלבד — אין ערבוב של
// ספריות ואין אמוג׳ים בתפקיד אייקון.
//
// האייקונים מיוצאים תחת שמות סמנטיים ולא תחת שמות Lucide, כדי
// שהחלפה של אייקון בעתיד תהיה בקובץ הזה בלבד.

import {
  Activity,
  ArrowRight,
  BadgePercent,
  Banknote,
  BookOpen,
  Building2,
  Calculator,
  ChevronDown,
  ChevronLeft,
  CircleHelp,
  ClipboardCopy,
  Coins,
  Copy,
  FileText,
  Home,
  Info,
  Layers,
  LineChart,
  Minus,
  Percent,
  Plus,
  Printer,
  Receipt,
  RefreshCw,
  Repeat2,
  Scale,
  Search,
  Settings,
  Sparkles,
  Table2,
  TrendingDown,
  TrendingUp,
  Trophy,
  Truck,
  Unlock,
  User,
  Wallet,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";

export type { LucideIcon };

/** ניווט ראשי */
export const IconHome = Home;
export const IconCalculators = Calculator;
export const IconKnowledge = BookOpen;
export const IconTools = Wrench;

/** מחשבונים */
export const IconDeal = Truck;
export const IconSubsidy = BadgePercent;
export const IconIndex = Activity;
export const IconBalloonSpread = Repeat2;
export const IconInterest = Coins;
export const IconFinPct = Percent;
export const IconDownPayment = Wallet;
export const IconBalloon = Scale;
export const IconSetupFee = Receipt;

/** כלים ומידע */
export const IconTracks = Layers;
export const IconCpiHistory = LineChart;
export const IconRateHistory = TrendingUp;
export const IconSettings = Settings;
export const IconLiveData = Activity;
export const IconSchedule = Table2;
export const IconContract = FileText;
export const IconClientDocs = User;
export const IconCompany = Building2;
export const IconMoney = Banknote;
export const IconResults = Banknote;
export const IconOpenBanking = Unlock;
export const IconStar = Sparkles;
export const IconIncentives = Trophy;

/** פעולות ומצבים */
export const IconBack = ArrowRight;
export const IconForward = ChevronLeft;
export const IconExpand = ChevronDown;
export const IconRefresh = RefreshCw;
export const IconSearch = Search;
export const IconCopy = Copy;
export const IconCopyToClient = ClipboardCopy;
export const IconClear = Sparkles;
export const IconPrint = Printer;
export const IconClose = X;
export const IconHelp = CircleHelp;
export const IconInfo = Info;
export const IconUp = TrendingUp;
export const IconDown = TrendingDown;
export const IconFlat = Minus;
export const IconAdd = Plus;
export const IconRemove = X;

/**
 * גדלים אחידים. הממשק משתמש בשלושה בלבד — כך שכל האייקונים
 * יושבים על אותו קנה מידה ואותו משקל קו.
 */
export const ICON_SM = 15;
export const ICON_MD = 18;
export const ICON_LG = 22;

/** עובי קו אחיד לכל האייקונים בממשק */
export const ICON_STROKE = 1.75;
