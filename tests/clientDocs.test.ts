// בדיקות למקור "מסמכים לפי סוג לקוח" ולחיפוש חוצה-המקורות

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  KNOWLEDGE_SOURCES,
  getSource,
  searchAll,
  searchSource,
} from "../src/lib/knowledge/index.ts";
import { clientDocuments } from "../src/lib/knowledge/clientDocuments.ts";
import { financeContract } from "../src/lib/knowledge/financeContract.ts";

const ids = (hits: { item: { id: string } }[]) => hits.map((h) => h.item.id);
const flat = (id: string) => {
  const it = clientDocuments.items.find((i) => i.id === id)!;
  return (it.groups ?? []).flatMap((g) => [
    ...(g.items ?? []),
    ...(g.options ?? []).flatMap((o) => o.items),
  ]);
};

// ─── רישום ומבנה ───────────────────────────────────────────────

test("רישום — שני מקורות ידע בלבד, בסדר הנכון", () => {
  assert.equal(KNOWLEDGE_SOURCES.length, 2);
  assert.equal(KNOWLEDGE_SOURCES[0].id, "finance-contract");
  assert.equal(KNOWLEDGE_SOURCES[1].id, "client-documents");
  assert.equal(getSource("client-documents")?.title, "מסמכים לפי סוג לקוח");
});

test("מבנה — תצוגת טאבים, ושלושה סוגי לקוח", () => {
  assert.equal(clientDocuments.view, "tabs");
  assert.deepEqual(
    clientDocuments.items.map((i) => i.id),
    ["private", "exempt-dealer", "licensed-dealer"]
  );
  assert.deepEqual(
    clientDocuments.items.map((i) => i.title),
    ["לקוח פרטי", "עוסק פטור", "עוסק מורשה"]
  );
});

test("מבנה — חוזה המימון נשאר בתצוגת קטגוריות ולא הושפע", () => {
  // ברירת המחדל היא categories; המקור הקיים לא סומן אחרת
  assert.notEqual(financeContract.view, "tabs");
  assert.equal(financeContract.items.length, 17);
  assert.equal(financeContract.title, "חוזה מימון");
});

test("מבנה — לכל סוג לקוח יש קבוצת זיהוי וקבוצה פיננסית", () => {
  for (const item of clientDocuments.items) {
    const titles = (item.groups ?? []).map((g) => g.title);
    assert.deepEqual(titles, ["מסמכי זיהוי", "מסמכים פיננסיים"], item.id);
    assert.ok(item.summary.length > 0, `${item.id}: תקציר ריק`);
    // מקור זה אינו מצטט סעיפי חוזה
    assert.equal(item.quotes, undefined, `${item.id}: לא אמור להיות ציטוט חוזה`);
  }
});

// ─── תוכן הדרישות ──────────────────────────────────────────────

test("זיהוי — 2 מסמכים מזהים ואותם כללים לכל סוגי הלקוחות", () => {
  for (const item of clientDocuments.items) {
    const idGroup = item.groups!.find((g) => g.title === "מסמכי זיהוי")!;
    assert.equal(idGroup.note, "נדרשים 2 מסמכים מזהים", item.id);
    assert.deepEqual(idGroup.items, ["תעודת זהות", "רישיון נהיגה", "דרכון"], item.id);
    // הכלל להשלמת פרטים חסרים מופיע בכל הסוגים
    const f = idGroup.footnote ?? "";
    for (const need of ["שם מלא", "מספר תעודת זהות", "תאריך לידה", "כתובת"]) {
      assert.ok(f.includes(need), `${item.id}: חסר ״${need}״ בכלל ההשלמה`);
    }
  }
});

test("לקוח פרטי — בנקאות פתוחה מועדפת, ולחלופין תלושים ועו״ש", () => {
  const fin = clientDocuments.items[0].groups!.find((g) => g.title === "מסמכים פיננסיים")!;
  assert.equal(fin.options!.length, 2);
  assert.equal(fin.options![0].preferred, true, "אפשרות 1 חייבת להיות מסומנת כמועדפת");
  assert.deepEqual(fin.options![0].items, ["בנקאות פתוחה", "טופס הסכמה"]);
  assert.deepEqual(fin.options![1].items, [
    "3 תלושי שכר אחרונים",
    "תנועות עו״ש של 3 חודשים אחרונים",
  ]);
});

test("עוסק פטור — בנקאות פתוחה, או עו״ש עם אסמכתא מרואה חשבון", () => {
  const fin = clientDocuments.items[1].groups!.find((g) => g.title === "מסמכים פיננסיים")!;
  assert.deepEqual(fin.options![0].items, ["בנקאות פתוחה"]);
  assert.deepEqual(fin.options![1].items, ["תנועות עו״ש", "אסמכתא מרואה חשבון"]);
});

test("עוסק מורשה — 6 דוחות מע״מ בשתי החלופות", () => {
  const fin = clientDocuments.items[2].groups!.find((g) => g.title === "מסמכים פיננסיים")!;
  assert.deepEqual(fin.options![0].items, ["בנקאות פתוחה", "6 דוחות מע״מ"]);
  assert.deepEqual(fin.options![1].items, ["תנועות עו״ש", "6 דוחות מע״מ"]);
  // דוחות מע״מ נדרשים בכל מקרה
  assert.ok(flat("licensed-dealer").filter((x) => x.includes("מע״מ")).length === 2);
});

test("תוכן — אין דרישת תלושי שכר מעוסקים, ואין מע״מ מלקוח פרטי", () => {
  assert.ok(!flat("exempt-dealer").some((x) => x.includes("תלוש")));
  assert.ok(!flat("licensed-dealer").some((x) => x.includes("תלוש")));
  assert.ok(!flat("private").some((x) => x.includes("מע״מ")));
});

test("מידע בלבד — אין שדות סטטוס או מעקב במבנה הנתונים", () => {
  const blob = JSON.stringify(clientDocuments);
  for (const banned of ["checked", "status", "done", "missing", "checklist"]) {
    assert.ok(!blob.includes(banned), `נמצא שדה מעקב: ${banned}`);
  }
});

// ─── חיפוש בתוך המקור ──────────────────────────────────────────

test("חיפוש — כל מונחי החיפוש שבאיפיון מגיעים לתוצאה הנכונה", () => {
  const cases: [string, string][] = [
    ["עוסק מורשה", "licensed-dealer"],
    ["עוסק פטור", "exempt-dealer"],
    ["לקוח פרטי", "private"],
    ["תלושי שכר", "private"],
  ];
  for (const [q, expected] of cases) {
    const hits = searchSource(clientDocuments, q);
    assert.ok(hits.length > 0, `אין תוצאות עבור: ${q}`);
    assert.equal(hits[0].item.id, expected, `״${q}״ לא הוביל ל-${expected}`);
  }
});

test("חיפוש — מונחים משותפים מחזירים את כל סוגי הלקוחות הרלוונטיים", () => {
  // בנקאות פתוחה רלוונטית לשלושת הסוגים
  assert.equal(searchSource(clientDocuments, "בנקאות פתוחה").length, 3);
  // מע״מ רק לעוסק מורשה
  assert.deepEqual(ids(searchSource(clientDocuments, "מע״מ")), ["licensed-dealer"]);
  // רואה חשבון רק לעוסק פטור
  assert.deepEqual(ids(searchSource(clientDocuments, "רואה חשבון")), ["exempt-dealer"]);
  // תעודות מזהות רלוונטיות לכולם
  assert.equal(searchSource(clientDocuments, "תעודות מזהות").length, 3);
});

test("חיפוש — מוצא גם מונחים שמופיעים רק ברשימות הדרישות", () => {
  assert.ok(ids(searchSource(clientDocuments, "דרכון")).length === 3);
  assert.ok(ids(searchSource(clientDocuments, "רישיון נהיגה")).length === 3);
  assert.ok(ids(searchSource(clientDocuments, "אסמכתא")).includes("exempt-dealer"));
  assert.ok(ids(searchSource(clientDocuments, "טופס הסכמה")).includes("private"));
});

// ─── חיפוש חוצה-מקורות ─────────────────────────────────────────

test("חיפוש גלובלי — מונח מסוג לקוח מגיע למקור המסמכים", () => {
  const res = searchAll(KNOWLEDGE_SOURCES, "עוסק מורשה");
  assert.ok(res.length > 0);
  assert.equal(res[0].source.id, "client-documents");
  assert.equal(res[0].hits[0].item.id, "licensed-dealer");
});

test("חיפוש גלובלי — מונח מהחוזה עדיין מגיע לחוזה", () => {
  const res = searchAll(KNOWLEDGE_SOURCES, "פירעון מוקדם");
  assert.equal(res[0].source.id, "finance-contract");
  assert.equal(res[0].hits[0].item.id, "early-repayment");
});

test("חיפוש גלובלי — מונח משותף מחזיר את שני המקורות", () => {
  // ״בנקאות פתוחה״ במסמכים; ״הרשאה לחיוב״ בחוזה — נבדוק מונח בנקאי משותף
  const res = searchAll(KNOWLEDGE_SOURCES, "בנק");
  const sources = res.map((r) => r.source.id);
  assert.ok(sources.includes("client-documents"), "מקור המסמכים חסר");
  assert.ok(sources.length >= 1);
});

test("חיפוש גלובלי — שאילתה ריקה מחזירה רשימה ריקה", () => {
  assert.deepEqual(searchAll(KNOWLEDGE_SOURCES, ""), []);
  assert.deepEqual(searchAll(KNOWLEDGE_SOURCES, "   "), []);
});

test("חיפוש גלובלי — מונח שאינו קיים בשום מקור", () => {
  assert.deepEqual(searchAll(KNOWLEDGE_SOURCES, "צוללת גרעינית"), []);
});
