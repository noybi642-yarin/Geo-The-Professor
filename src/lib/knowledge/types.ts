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

export interface KnowledgeItem {
  id: string;
  icon: string;
  title: string;
  /** תקציר בנקודות — נכתב מתוך המסמכים בלבד */
  summary: string[];
  /** הסעיפים המקוריים, לפתיחה בלחיצה */
  quotes: Quote[];
  /** מילים נוספות לחיפוש שאינן מופיעות בכותרת או בתקציר */
  keywords: string[];
  /** הערה על סתירה או נתון שדורש אימות */
  note?: string;
}

export interface KnowledgeSource {
  id: string;
  icon: string;
  title: string;
  desc: string;
  /** מאיזה מסמכים נבנה המקור */
  origins: string;
  /** הבהרה שמוצגת בראש המקור */
  disclaimer: string;
  items: KnowledgeItem[];
}

export const ORIGIN_LABEL: Record<QuoteOrigin, string> = {
  contract: "חוזה המימון",
  training: "מצגת הדרכה",
};
