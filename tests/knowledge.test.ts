// בדיקות למרכז הידע: חיפוש, מילים דומות, שלמות הנתונים
// והגנה על פרטיות — אין להכניס פרטים מזהים של לקוח.

import { test } from "node:test";
import assert from "node:assert/strict";
import { KNOWLEDGE_SOURCES, getSource, searchSource } from "../src/lib/knowledge/index.ts";
import { financeContract } from "../src/lib/knowledge/financeContract.ts";

const ids = (hits: { item: { id: string } }[]) => hits.map((h) => h.item.id);

// ─── מבנה ורישום ───────────────────────────────────────────────

test("רישום — מקור חוזה המימון רשום וניתן לאחזור לפי מזהה", () => {
  assert.ok(KNOWLEDGE_SOURCES.length >= 1);
  assert.equal(getSource("finance-contract")?.title, "חוזה מימון");
  assert.equal(getSource("does-not-exist"), undefined);
});

test("מבנה — לכל פריט מזהה ייחודי, כותרת, תקציר וציטוט מקור", () => {
  const seen = new Set<string>();
  for (const item of financeContract.items) {
    assert.ok(item.id && !seen.has(item.id), `מזהה כפול או חסר: ${item.id}`);
    seen.add(item.id);
    assert.ok(item.title.length > 0, `${item.id}: חסרה כותרת`);
    assert.ok(item.summary.length > 0, `${item.id}: תקציר ריק`);
    assert.ok((item.quotes?.length ?? 0) > 0, `${item.id}: אין ציטוט מקור`);
    for (const q of item.quotes ?? []) {
      assert.ok(q.ref.length > 0, `${item.id}: ציטוט ללא הפניה`);
      assert.ok(q.text.length > 0, `${item.id}: ציטוט ריק`);
      assert.ok(["contract", "training"].includes(q.origin), `${item.id}: מקור לא מוכר`);
    }
  }
});

test("מבנה — כל הקטגוריות שנדרשו קיימות", () => {
  const required = [
    "general", "interest", "setup-fee", "balloon", "early-repayment",
    "late-interest", "collateral", "pledge", "insurance", "direct-debit",
    "schedule", "actual-cost", "immediate-repayment",
  ];
  const have = new Set(financeContract.items.map((i) => i.id));
  for (const r of required) assert.ok(have.has(r), `חסרה קטגוריה: ${r}`);
});

// ─── פרטיות: אין נתונים מזהים ──────────────────────────────────

test("פרטיות — אין פרטים מזהים של לקוח בשום מקום בנתונים", () => {
  const blob = JSON.stringify(financeContract);
  // שם, ת״ז, כתובת, טלפונים, דוא״ל ומספרי חשבון מהמסמך שצורף
  const forbidden = [
    "דחבש", "דינור", "012081378", "רקפת 19", "4858727",
    "039024363", "0506797878", "daniel.dachbash", "gmail",
    "60258620", "0060258620", "6222188", "122106",
  ];
  for (const f of forbidden) {
    assert.ok(!blob.includes(f), `נמצא פרט מזהה בנתונים: ${f}`);
  }
  // גם לא מספרי ת״ז בני 9 ספרות באופן כללי
  assert.ok(!/\b\d{9}\b/.test(blob.replace(/512899097/g, "")), "נמצא מספר בן 9 ספרות שאינו ח.פ החברה");
});

test("פרטיות — סכומים ספציפיים לעסקה מסומנים במפורש", () => {
  // כל ציטוט שמכיל סכום מהעסקה שבמסמך חייב לשאת סימון
  const dealSpecific = ["5.5%", "890 ש״ח", "69,450", "9.5%", "9.92%", "6.07%", "15%"];
  for (const item of financeContract.items) {
    for (const q of item.quotes ?? []) {
      const hasDealNumber = dealSpecific.some((d) => q.text.includes(d));
      if (!hasDealNumber) continue;
      // מותר גם אם מדובר בשיעור שנקבע בדין ולא בעסקה
      const isLegalRate =
        q.text.includes("המרבי על פי דין") ||
        q.text.includes("שיעור העלות המרבית") ||
        q.text.includes("ריבית בנק ישראל");
      assert.ok(
        q.text.includes("[בעסקה שבמסמך]") || isLegalRate,
        `${item.id}: ציטוט עם סכום מהעסקה ללא סימון — ${q.text.slice(0, 60)}`
      );
    }
  }
});

// ─── חיפוש ─────────────────────────────────────────────────────

test("חיפוש — שאילתה ריקה מחזירה את כל הקטגוריות בסדר המקורי", () => {
  const hits = searchSource(financeContract, "");
  assert.equal(hits.length, financeContract.items.length);
  assert.equal(hits[0].item.id, financeContract.items[0].id);
});

test("חיפוש — כל המונחים שבדוגמה מהאיפיון מחזירים תוצאות", () => {
  const terms = [
    "פירעון מוקדם", "ביטוח", "ריבית", "ריבית פיגורים", "עמלת הקמה",
    "תשלום סוף תקופה", "משכון", "שטר חוב", "פוליסה", "מדד",
    "עלות אשראי ממשית",
  ];
  for (const t of terms) {
    const hits = searchSource(financeContract, t);
    assert.ok(hits.length > 0, `אין תוצאות עבור: ${t}`);
  }
});

test("חיפוש — ״ביטוח״ מאתר גם פוליסה ושעבוד פוליסה (מילים דומות)", () => {
  const hits = searchSource(financeContract, "ביטוח");
  assert.ok(ids(hits).includes("insurance"), "קטגוריית ביטוח לא נמצאה");
  // הקטגוריה המדויקת מדורגת ראשונה
  assert.equal(hits[0].item.id, "insurance");

  // חיפוש הפוך: ״פוליסה״ מאתר את קטגוריית הביטוח
  assert.ok(ids(searchSource(financeContract, "פוליסה")).includes("insurance"));
  assert.ok(ids(searchSource(financeContract, "שעבוד פוליסה")).includes("insurance"));
  assert.ok(ids(searchSource(financeContract, "ביטוח מקיף")).includes("insurance"));
});

test("חיפוש — מילים נרדפות נוספות עובדות בשני הכיוונים", () => {
  assert.ok(ids(searchSource(financeContract, "טוטאלוס")).includes("insurance"));
  assert.ok(ids(searchSource(financeContract, "בלון")).includes("balloon"));
  assert.ok(ids(searchSource(financeContract, "balloon")).includes("balloon"));
  assert.ok(ids(searchSource(financeContract, "הוראת קבע")).includes("direct-debit"));
  assert.ok(ids(searchSource(financeContract, "סילוק")).includes("early-repayment"));
  assert.ok(ids(searchSource(financeContract, "הצמדה")).includes("interest"));
});

test("חיפוש — הקטגוריה המדויקת ראשונה, וסף הרלוונטיות מסנן רעש", () => {
  const hits = searchSource(financeContract, "פירעון מוקדם");
  assert.equal(hits[0].item.id, "early-repayment");
  // המונח מופיע בציטוטים של רוב הקטגוריות; הסף מונע החזרה של כולן
  assert.ok(
    hits.length < financeContract.items.length / 2,
    `החיפוש רחב מדי: ${hits.length} מתוך ${financeContract.items.length}`
  );
  // התאמה חזקה במילות מפתח נשמרת גם כשיש התאמה מדויקת בכותרת
  const ins = searchSource(financeContract, "ביטוח");
  assert.equal(ins[0].item.id, "insurance");
  assert.ok(ids(ins).includes("collateral"), "בטוחות רלוונטית ל״ביטוח״ ואינה אמורה להיחתך");
});

test("חיפוש — אינו רגיש לגרשיים ולרווחים מיותרים", () => {
  const a = searchSource(financeContract, "שטר חוב");
  const b = searchSource(financeContract, '  שטר   חוב  ');
  assert.deepEqual(ids(a), ids(b));
});

test("חיפוש — מונח שאינו קיים מחזיר רשימה ריקה", () => {
  assert.equal(searchSource(financeContract, "צוללת גרעינית").length, 0);
});

test("חיפוש — שתי מילים דורשות התאמה לשתיהן", () => {
  const hits = searchSource(financeContract, "עמלת פירעון");
  assert.ok(hits.length > 0);
  assert.ok(ids(hits).includes("early-repayment"));
});

test("חיפוש — matchedLines מחזיר את שורות התקציר שהתאימו", () => {
  const hits = searchSource(financeContract, "השתתפות עצמית");
  const hit = hits.find((h) => h.item.id === "insurance");
  assert.ok(hit);
  assert.ok(hit!.matchedLines.length > 0, "לא הוחזרו שורות תואמות להצגה");
});

// ─── סתירה מתועדת ──────────────────────────────────────────────

test("הערה — הסתירה בשיעור הריבית על פריסת העמלה מתועדת", () => {
  const fee = financeContract.items.find((i) => i.id === "setup-fee");
  assert.ok(fee?.note, "חסרה הערה על הסתירה בין המסמכים");
  assert.ok(fee!.note!.includes("9.5%") && fee!.note!.includes("7%"));
  // שני המקורות מצוטטים
  const origins = new Set((fee!.quotes ?? []).map((q) => q.origin));
  assert.ok(origins.has("contract") && origins.has("training"));
});
