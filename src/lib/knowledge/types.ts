// ─── מרכז הידע — טיפוסים וארכיטקטורה ───────────────────────────
// כל מקור ידע הוא קובץ נתונים נפרד שנרשם ב-index.ts.
// להוספת מקור חדש (חוזה, נוהל, מדריך מוצר, FAQ) — קובץ אחד
// ושורה אחת ברישום. אין צורך לגעת ברכיבי הממשק.

/** מקור ציטוט — מאפשר לסמן מאיזה מסמך הגיע כל פסקה */
export type QuoteOrigin = "contract" | "training";

export interface Quote {
  /** הפניה לסעיף, לדוגמה: "סעיף 7(א) לבקשת ההלוואה" */
  ref: string;
  /** הציטוט עצמו — מילה במילה מהמסמך */
  text: string;
  origin: QuoteOrigin;
}

/** אפשרות חלופית בתוך קבוצת דרישות ("אפשרות 1" / "אפשרות 2") */
export interface DocOption {
  label: string;
  /** מסומן כאפשרות המועדפת */
  preferred?: boolean;
  items: string[];
}

/** קבוצת דרישות מסמכים — לתצוגה סרוקה ומהירה */
export interface DocGroup {
  title: string;
  /** משפט הקשר קצר מעל הרשימה */
  note?: string;
  /** רשימה פשוטה, כשאין חלופות */
  items?: string[];
  /** חלופות — מוצגות עם ״או״ ביניהן */
  options?: DocOption[];
  /** הערת שוליים מתחת לקבוצה */
  footnote?: string;
}

export interface KnowledgeItem {
  id: string;
  icon: string;
  title: string;
  /** תקציר בנקודות — נכתב מתוך המסמכים בלבד */
  summary: string[];
  /**
   * הסעיפים המקוריים, לפתיחה בלחיצה.
   * אופציונלי: מקורות שאינם מבוססי חוזה (כמו דרישות מסמכים) אינם
   * מצטטים סעיף, ולכן לא מוצג אצלם כפתור ״מקור בחוזה״.
   */
  quotes?: Quote[];
  /** דרישות מובנות — מוצגות בתצוגת הטאבים */
  groups?: DocGroup[];
  /** מילים נוספות לחיפוש שאינן מופיעות בכותרת או בתקציר */
  keywords: string[];
  /** הערה על סתירה או נתון שדורש אימות */
  note?: string;
}

/**
 * אופן ההצגה של המקור:
 * categories — רשימת קטגוריות שנפתחות למסך משלהן (חוזה מימון)
 * tabs       — טאבים בראש העמוד והתוכן מיד מתחתיהם (מסמכים לפי סוג לקוח)
 */
export type SourceView = "categories" | "tabs";

export interface KnowledgeSource {
  id: string;
  icon: string;
  title: string;
  desc: string;
  /** מאיזה מסמכים נבנה המקור */
  origins: string;
  /** הבהרה שמוצגת בראש המקור */
  disclaimer: string;
  /** ברירת המחדל היא categories — כדי לא לשנות מקורות קיימים */
  view?: SourceView;
  items: KnowledgeItem[];
}

export const ORIGIN_LABEL: Record<QuoteOrigin, string> = {
  contract: "חוזה המימון",
  training: "מצגת הדרכה",
};
