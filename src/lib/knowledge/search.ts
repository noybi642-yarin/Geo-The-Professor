// ─── חיפוש במרכז הידע ──────────────────────────────────────────
// חיפוש מקומי ומיידי, ללא קריאות רשת. תומך במילים דומות:
// חיפוש "ביטוח" מאתר גם "פוליסה", "ביטוח מקיף" ו"שעבוד פוליסה".

import type { DocGroup, KnowledgeItem, KnowledgeSource } from "./types.ts";

/**
 * קבוצות מילים נרדפות. כל מילה בקבוצה מרחיבה את החיפוש לכל
 * שאר המילים בה — בשני הכיוונים.
 */
const SYNONYM_GROUPS: string[][] = [
  ["ביטוח", "פוליסה", "ביטוח מקיף", "ביטוח חובה", "שעבוד פוליסה", "מקיף", "השתתפות עצמית", "שמאי", "תגמולי ביטוח"],
  ["אובדן כליל", "טוטאלוס", "total loss", "אבדן גמור", "גניבה", "אובדן"],
  ["ריבית", "שיעור ריבית", "ריבית שנתית", "ריבית קבועה", "ריבית מתואמת", "ריבית נומינלית", "ריבית דריבית"],
  ["מדד", "הצמדה", "צמוד מדד", "מדד בסיס", "מדד חדש", "הפרשי הצמדה", "מדד המחירים לצרכן"],
  ["פיגורים", "ריבית פיגורים", "איחור", "אי תשלום", "סכום שבפיגור"],
  ["עמלת הקמה", "עמלה", "דמי פתיחת תיק", "פתיחת תיק", "פריסת עמלה"],
  ["בלון", "balloon", "תשלום סוף תקופה", "סכום סוף התקופה", "יתרת סוף תקופה"],
  ["פירעון מוקדם", "סילוק", "סילוק מוקדם", "עמלת פירעון", "פירעון"],
  ["פירעון מיידי", "העמדה לפירעון", "הפרה", "עילות", "התראה"],
  ["משכון", "שעבוד", "כתב משכון", "ממשכן", "בטוחה", "בטוחות", "רשם המשכונות"],
  ["שטר חוב", "שטר", "ביטחון"],
  ["הרשאה", "הרשאה לחיוב חשבון", "הוראת קבע", "חיוב חשבון", "גבייה", "בנק"],
  ["לוח סילוקין", "לוח תשלומים", "סילוקין", "אמורטיזציה", "שפיצר", "מרכיב קרן", "מרכיב ריבית"],
  ["עלות אשראי ממשית", "עלות ממשית", "חוק אשראי הוגן", "עלות מרבית", "עלות אשראי"],
  ["רכב", "מוסך", "תחזוקה", "טיפולים", "שימוש ברכב", "מיגון", "איתוראן", "פוינטר"],
  ["הלבנת הון", "נהנה", "בעל שליטה", "מימון טרור", "שוחד"],
  ["אחריות", "ביחד ולחוד", "לווים נוספים", "ערב", "קיזוז"],
  ["טופס גילוי", "גילוי", "רשות שוק ההון", "עיקרי הפרטים"],
  ["הוצאות גבייה", "אכיפה", "הוצאה לפועל", "עיקול", "כינוס נכסים"],
  ["מוכר הרכב", "משרד הרישוי", "העברת בעלות", "רישום"],
];

/** מנרמל טקסט לחיפוש: אחיד לגרשיים, ניקוד, פסיקי אלפים ורווחים */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[֑-ׇ]/g, "") // ניקוד וטעמים
    .replace(/["'״׳`]/g, "")
    .replace(/[־–—]/g, "-")
    .replace(/(\d),(\d)/g, "$1$2") // 350,000 ו-350000 הם אותו מספר
    .replace(/\s+/g, " ")
    .trim();
}

const ONLY_DIGITS = /^\d+$/;

/**
 * התאמה של מונח בתוך טקסט.
 * טקסט רגיל נבדק כתת-מחרוזת — כך ״מע״ מאתר גם ״מע״מ״.
 * מספר, לעומת זאת, נבדק כמספר שלם: בלי זה החיפוש ״500״ היה
 * מתאים גם ל-350000, שמכיל את הרצף הזה במקרה.
 */
function matches(haystack: string, needle: string): boolean {
  if (!ONLY_DIGITS.test(needle)) return haystack.includes(needle);
  return new RegExp(`(^|\\D)${needle}(\\D|$)`).test(haystack);
}

/**
 * מרחיב מונח לכל המילים הנרדפות שלו.
 * ההרחבה דורשת התאמה מדויקת לאחת ממילות הקבוצה — הרחבה לפי
 * תת-מחרוזת גררה קבוצות לא קשורות (״פירעון״ שאב גם את ״פירעון מיידי״).
 * התאמה חלקית ממילא נתמכת בשלב ההשוואה עצמו.
 */
function expand(term: string): string[] {
  const n = normalize(term);
  const out = new Set<string>([n]);
  for (const group of SYNONYM_GROUPS) {
    const normGroup = group.map(normalize);
    if (normGroup.includes(n)) for (const g of normGroup) out.add(g);
  }
  return Array.from(out);
}

export interface SearchHit {
  item: KnowledgeItem;
  score: number;
  /** השורות בתקציר שהתאימו לחיפוש */
  matchedLines: string[];
  /**
   * המדרגה שכל מילות החיפוש נמצאו בתוכה — כדי שמונח כמו
   * ״350 אלף״ יפתח ישירות את המדרגה הנכונה ולא רק את סוג הלקוח.
   */
  matchedTierId?: string;
}

/** כל הטקסט שבקבוצת דרישות, לצורך חיפוש */
function groupText(g: DocGroup): string[] {
  return [
    normalize(g.title),
    g.note ? normalize(g.note) : "",
    g.footnote ? normalize(g.footnote) : "",
    ...(g.items ?? []).map(normalize),
    ...(g.alternatives ?? []).map(normalize),
    ...(g.options ?? []).flatMap((o) => [normalize(o.label), ...o.items.map(normalize)]),
  ];
}

/**
 * מחפש בתוך מקור ידע. שאילתה ריקה מחזירה את כל הפריטים
 * בסדר המקורי, ללא ניקוד.
 */
export function searchSource(source: KnowledgeSource, query: string): SearchHit[] {
  const q = normalize(query);
  if (!q) return source.items.map((item) => ({ item, score: 0, matchedLines: [] }));

  // כל מילה בשאילתה מורחבת בנפרד; פריט חייב להתאים לכל המילים
  const words = q.split(" ").filter(Boolean);
  const wordVariants = words.map(expand);

  const hits: SearchHit[] = [];

  for (const item of source.items) {
    const title = normalize(item.title);
    const keywords = item.keywords.map(normalize);
    const summary = item.summary.map(normalize);
    const quotes = (item.quotes ?? []).map((x) => normalize(x.text + " " + x.ref));
    const note = item.note ? normalize(item.note) : "";
    // דרישות מובנות (מסמכים לפי סוג לקוח) נסרקות ברמת מילות המפתח
    const groups = (item.groups ?? []).flatMap(groupText);
    // כל מדרגה נסרקת גם בנפרד, כדי לדעת לאיזו מהן להוביל
    const tiers = (item.tiers ?? []).map((t) => ({
      id: t.id,
      text: [
        normalize(t.label),
        t.note ? normalize(t.note) : "",
        ...(t.keywords ?? []).map(normalize),
        ...t.groups.flatMap(groupText),
      ],
    }));
    const tierText = tiers.flatMap((t) => t.text);

    let total = 0;
    let allWordsMatched = true;

    for (const variants of wordVariants) {
      let best = 0;
      for (const v of variants) {
        if (!v) continue;
        // ניקוד לפי מקום ההתאמה — כותרת שווה יותר מציטוט
        if (matches(title, v)) best = Math.max(best, 100);
        if (keywords.some((k) => matches(k, v))) best = Math.max(best, 60);
        if (summary.some((s) => matches(s, v))) best = Math.max(best, 40);
        if (groups.some((g) => matches(g, v))) best = Math.max(best, 50);
        if (tierText.some((t) => matches(t, v))) best = Math.max(best, 50);
        if (matches(note, v)) best = Math.max(best, 30);
        if (quotes.some((t) => matches(t, v))) best = Math.max(best, 20);
      }
      if (best === 0) {
        allWordsMatched = false;
        break;
      }
      total += best;
    }

    if (!allWordsMatched) continue;

    // המדרגה הראשונה שכל מילות החיפוש נמצאות בתוכה. אין כזו —
    // ההתאמה היא ברמת סוג הלקוח, והמדרגה נשארת כברירת המחדל.
    const matchedTierId = tiers.find((t) =>
      wordVariants.every((variants) =>
        variants.some((v) => v && t.text.some((line) => matches(line, v)))
      )
    )?.id;

    // השורות בתקציר שיש בהן התאמה — להצגה כתצוגה מקדימה
    const matchedLines = item.summary.filter((line) => {
      const n = normalize(line);
      return wordVariants.some((variants) => variants.some((v) => v && matches(n, v)));
    });

    hits.push({ item, score: total, matchedLines, matchedTierId });
  }

  hits.sort((a, b) => b.score - a.score);

  // סף רלוונטיות: כשיש התאמה חזקה בכותרת או במילות המפתח, אין טעם
  // להציג קטגוריות שהמונח מופיע בהן רק בתוך ציטוט. בלי הסינון הזה
  // מונח נפוץ כמו "פירעון מוקדם" היה מחזיר כמעט את כל הקטגוריות.
  if (hits.length > 1) {
    const cutoff = hits[0].score * 0.4;
    return hits.filter((h) => h.score >= cutoff);
  }
  return hits;
}

export interface SourceHits {
  source: KnowledgeSource;
  hits: SearchHit[];
}

/**
 * חיפוש בכל מקורות הידע יחד.
 * מחזיר רק מקורות שיש בהם תוצאות, ממוין לפי ההתאמה הטובה ביותר
 * בכל מקור. שאילתה ריקה מחזירה רשימה ריקה — במצב הזה מוצגים
 * כרטיסי המקורות במקום תוצאות חיפוש.
 */
export function searchAll(sources: KnowledgeSource[], query: string): SourceHits[] {
  if (!normalize(query)) return [];
  return sources
    .map((source) => ({ source, hits: searchSource(source, query) }))
    .filter((r) => r.hits.length > 0)
    .sort((a, b) => b.hits[0].score - a.hits[0].score);
}
