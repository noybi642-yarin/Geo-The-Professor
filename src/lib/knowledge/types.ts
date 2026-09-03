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

/**
 * טבלה קצרה בתוך קבוצה — למדרגות ולסכומים, שנקראים הרבה יותר טוב
 * בשורות ועמודות מאשר ברשימה.
 */
export interface DocTable {
  head: string[];
  rows: string[][];
}

/** קבוצת דרישות מסמכים — לתצוגה סרוקה ומהירה */
export interface DocGroup {
  title: string;
  /** משפט הקשר קצר מעל הרשימה */
  note?: string;
  /** רשימה פשוטה, כשאין חלופות */
  items?: string[];
  /**
   * מסמכים חליפיים שאחד מהם מספיק — מוצגים בשורה אחת עם ״או״
   * ביניהם. שונה מ-options, שמציג בלוקים שלמים זה מול זה.
   */
  alternatives?: string[];
  /** טבלת מדרגות או סכומים */
  table?: DocTable;
  /** חלופות — מוצגות עם ״או״ ביניהן */
  options?: DocOption[];
  /** הערת שוליים מתחת לקבוצה */
  footnote?: string;
}

/**
 * מדרגת הכנסה או אובליגו בתוך סוג לקוח.
 * הדרישות משתנות לפי גובה האובליגו, ולכן הן נבחרות בשלב שני —
 * אחרי בחירת סוג הלקוח — במקום להעמיס את כולן על המסך בבת אחת.
 */
export interface DocTier {
  id: string;
  /** תווית המדרגה, למשל ״אובליגו מעל 350,000 ₪״ */
  label: string;
  /** משפט הקשר קצר מתחת לבורר המדרגות */
  note?: string;
  groups: DocGroup[];
  /** מונחי חיפוש שמובילים ישירות למדרגה הזו */
  keywords?: string[];
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
  /**
   * מדרגות הכנסה/אובליגו. כשיש יותר ממדרגה אחת מוצג בורר;
   * כשיש אחת בלבד תוויתה מוצגת כהקשר, בלי לבקש בחירה.
   */
  tiers?: DocTier[];
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
  /** כלל רוחבי שנכון לכל הפריטים — מוצג פעם אחת בראש המקור */
  intro?: { title: string; lines: string[] };
  /** ברירת המחדל היא categories — כדי לא לשנות מקורות קיימים */
  view?: SourceView;
  items: KnowledgeItem[];
}

export const ORIGIN_LABEL: Record<QuoteOrigin, string> = {
  contract: "חוזה המימון",
  training: "מצגת הדרכה",
};
