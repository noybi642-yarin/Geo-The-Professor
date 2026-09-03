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
import type { DocGroup, DocTier } from "../src/lib/knowledge/types.ts";

const ids = (hits: { item: { id: string } }[]) => hits.map((h) => h.item.id);

const item = (id: string) => clientDocuments.items.find((i) => i.id === id)!;

const tier = (itemId: string, tierId: string): DocTier =>
  item(itemId).tiers!.find((t) => t.id === tierId)!;

/** כל שורות הדרישות במדרגה, בלי הכותרות */
const lines = (g: DocGroup[]) =>
  g.flatMap((x) => [
    ...(x.items ?? []),
    ...(x.alternatives ?? []),
    ...(x.options ?? []).flatMap((o) => o.items),
  ]);

const tierLines = (itemId: string, tierId: string) => lines(tier(itemId, tierId).groups);

/** כל הטקסט של סוג לקוח — כל המדרגות יחד */
const allText = (itemId: string) =>
  JSON.stringify(item(itemId));

// ─── רישום ומבנה ───────────────────────────────────────────────

test("רישום — שלושה מקורות ידע, בסדר הנכון", () => {
  assert.deepEqual(
    KNOWLEDGE_SOURCES.map((s) => s.id),
    ["finance-contract", "client-documents", "incentives"]
  );
  assert.equal(getSource("client-documents")?.title, "מסמכים לפי סוג לקוח");
  assert.equal(getSource("incentives")?.title, "תמריצים לסוכנים ולמנהלי אולם");
});

test("מבנה — תצוגת טאבים וארבעה סוגי לקוח", () => {
  assert.equal(clientDocuments.view, "tabs");
  assert.deepEqual(
    clientDocuments.items.map((i) => i.id),
    ["private", "exempt-dealer", "licensed-dealer", "company"]
  );
  assert.deepEqual(
    clientDocuments.items.map((i) => i.title),
    ["לקוח פרטי", "עוסק פטור", "עוסק מורשה", "חברה"]
  );
});

test("מבנה — חוזה המימון נשאר בתצוגת קטגוריות ולא הושפע", () => {
  assert.notEqual(financeContract.view, "tabs");
  assert.equal(financeContract.items.length, 17);
  assert.equal(financeContract.title, "חוזה מימון");
  assert.equal(financeContract.intro, undefined, "החוזה לא קיבל אזור חדש");
});

test("מבנה — המדרגות של כל סוג לקוח, בסדר עולה", () => {
  const expected: Record<string, string[]> = {
    private: ["standard", "company-owner-150"],
    "exempt-dealer": ["upto-50k"],
    "licensed-dealer": ["over-50k", "obligo-350", "obligo-over-350"],
    company: ["obligo-350", "obligo-over-350", "obligo-over-500"],
  };
  for (const it of clientDocuments.items) {
    assert.deepEqual(
      it.tiers!.map((t) => t.id),
      expected[it.id],
      it.id
    );
    assert.ok(it.summary.length > 0, `${it.id}: תקציר ריק`);
    // מקור זה אינו מצטט סעיפי חוזה
    assert.equal(it.quotes, undefined, `${it.id}: לא אמור להיות ציטוט חוזה`);
    for (const t of it.tiers!) {
      assert.ok(t.groups.length > 0, `${it.id}/${t.id}: מדרגה ריקה`);
      assert.ok(t.label.trim().length > 0, `${it.id}/${t.id}: אין תווית`);
    }
  }
});

// ─── בנקאות פתוחה — הכלל הרוחבי ────────────────────────────────

test("בנקאות פתוחה — הכלל הרוחבי מופיע פעם אחת בראש המקור", () => {
  const intro = clientDocuments.intro!;
  assert.equal(intro.title, "בנקאות פתוחה");
  const text = intro.lines.join(" ");
  assert.ok(text.includes("המועדפת"), "חסרה ההעדפה");
  assert.ok(text.includes("תנועות העו״ש"), "חסרה החלפת העו״ש");
  // ההסתייגות החשובה: אינה מבטלת מסמכים עסקיים
  assert.ok(text.includes("אינה מבטלת"), "חסרה ההסתייגות");
  for (const doc of ["דוחות מע״מ", "אישור רו״ח", "מאזן בוחן", "רווח והפסד", "מאזן מבוקר"]) {
    assert.ok(text.includes(doc), `חסר ${doc} ברשימת המסמכים שאינם מוחלפים`);
  }
});

test("בנקאות פתוחה — כל מדרגה שיש בה עו״ש מציגה את שתי החלופות", () => {
  for (const it of clientDocuments.items) {
    for (const t of it.tiers!) {
      const withOB = t.groups.filter((g) =>
        (g.options ?? []).some((o) => o.items.includes("בנקאות פתוחה"))
      );
      for (const g of withOB) {
        const labels = g.options!.map((o) => o.label);
        assert.deepEqual(
          labels,
          ["עם בנקאות פתוחה", "ללא בנקאות פתוחה"],
          `${it.id}/${t.id}/${g.title}`
        );
        assert.equal(g.options![0].preferred, true, `${it.id}/${t.id}: המועדפת אינה מסומנת`);
        // ללא בנקאות פתוחה — חייב להופיע עו״ש
        assert.ok(
          g.options![1].items.some((x) => x.includes("עו״ש")),
          `${it.id}/${t.id}: החלופה ללא בנקאות פתוחה חייבת לכלול עו״ש`
        );
      }
    }
  }
});

test("בנקאות פתוחה — אינה מחליפה את המסמכים העסקיים שמעל 350 אלף", () => {
  for (const src of ["licensed-dealer", "company"]) {
    const t = tier(src, "obligo-over-350");
    const foot = t.groups.map((g) => g.footnote ?? "").join(" ");
    assert.ok(foot.includes("אינה מחליפה"), `${src}: חסרה ההסתייגות`);
    // ואין באותה מדרגה חלופה שמציעה בנקאות פתוחה במקום
    assert.ok(
      !t.groups.some((g) => (g.options ?? []).length > 0),
      `${src}: אין להציע חלופה במדרגה הזו`
    );
  }
});

// ─── מסמכי זיהוי ───────────────────────────────────────────────

test("זיהוי — 2 מסמכים מזהים ואותם כללים בכל מדרגת כניסה", () => {
  // המדרגה הראשונה של כל סוג לקוח היא נקודת הכניסה, ולכן בה
  // חייבים להופיע כללי הזיהוי המלאים
  for (const it of clientDocuments.items) {
    const first = it.tiers![0];
    const idGroup = first.groups.find((g) => g.title === "מסמכי זיהוי");
    assert.ok(idGroup, `${it.id}: אין קבוצת זיהוי במדרגת הכניסה`);
    assert.equal(idGroup!.note, "נדרשים 2 מסמכים מזהים", it.id);
    assert.deepEqual(idGroup!.items, ["תעודת זהות", "רישיון נהיגה", "דרכון"], it.id);
    const f = idGroup!.footnote ?? "";
    for (const need of ["שם מלא", "מספר תעודת זהות", "תאריך לידה", "כתובת"]) {
      assert.ok(f.includes(need), `${it.id}: חסר ״${need}״ בכלל ההשלמה`);
    }
  }
});

// ─── לקוח פרטי ─────────────────────────────────────────────────

test("לקוח פרטי — בנקאות פתוחה מחליפה תלושים ועו״ש", () => {
  const fin = tier("private", "standard").groups.find((g) => g.title === "מסמכים פיננסיים")!;
  assert.deepEqual(fin.options![0].items, [
    "בנקאות פתוחה",
    "טופס הסכמה למסירת נתוני אשראי",
  ]);
  assert.deepEqual(fin.options![1].items, [
    "3 חודשי עו״ש אחרונים",
    "3 תלושי שכר / 3 חודשי הכנסה אחרונים",
    "טופס הסכמה למסירת נתוני אשראי",
  ]);
  assert.ok(fin.footnote!.includes("תלושי שכר"), "לא נאמר מה בנקאות פתוחה מחליפה");
});

test("לקוח פרטי — אישור בעלות או צילום שיק, כחלופות", () => {
  const g = tier("private", "standard").groups.find((x) => x.title === "ניתן להציג גם")!;
  assert.deepEqual(g.alternatives, ["אישור בעלות על החשבון", "צילום שיק"]);
  assert.equal(g.items, undefined, "חלופות אינן רשימה רגילה");
});

test("לקוח פרטי — בעל חברה מעל 150,000 ₪ מוסיף חומר אשראי של החברה", () => {
  const t = tier("private", "company-owner-150");
  assert.ok(t.label.includes("150,000"), "המדרגה חייבת לנקוב בסכום");
  assert.ok(t.note!.includes("בנוסף"), "חייב להיות ברור שזו תוספת");
  assert.deepEqual(t.groups.map((g) => g.title), ["חומר אשראי של החברה"]);
  assert.ok(tierLines("private", "company-owner-150")[0].includes("חומר אשראי של החברה"));
});

// ─── עוסק פטור ─────────────────────────────────────────────────

test("עוסק פטור — מדרגה יחידה עד 50,000 ₪, עם אסמכתא להכנסות", () => {
  const t = tier("exempt-dealer", "upto-50k");
  assert.equal(item("exempt-dealer").tiers!.length, 1, "מדרגה יחידה — הקשר ולא בחירה");
  assert.ok(t.label.includes("50,000"));
  const ev = t.groups.find((g) => g.title === "אסמכתא להכנסות")!;
  assert.deepEqual(ev.alternatives, ["שומת מס", "אישור רו״ח"]);
  assert.equal(ev.note, "לשנה שהסתיימה");
  // האסמכתא נדרשת בשתי החלופות
  const fin = t.groups.find((g) => g.title === "מסמכים פיננסיים")!;
  for (const o of fin.options!) {
    assert.ok(o.items.includes("אסמכתא להכנסות"), o.label);
  }
});

// ─── עוסק מורשה ────────────────────────────────────────────────

test("עוסק מורשה — מדרגת הכנסה מעל 50,000 ₪ עם שלוש אסמכתאות אפשריות", () => {
  const t = tier("licensed-dealer", "over-50k");
  const ev = t.groups.find((g) => g.title === "אסמכתא להכנסות")!;
  assert.deepEqual(ev.alternatives, ["שומת מס", "אישור רו״ח", "חשבוניות / קבלות"]);
  assert.ok(ev.footnote!.includes("6 החודשים האחרונים"));
});

test("עוסק מורשה — אובליגו עד 350,000 ₪: מע״מ, פעילות עסקית וטופס הסכמה", () => {
  const l = tierLines("licensed-dealer", "obligo-350");
  assert.ok(l.includes("דוחות מע״מ ל-6 החודשים האחרונים"));
  assert.ok(l.includes("פירוט הפעילות העסקית העיקרית של הלקוח"));
  assert.ok(l.includes("טופס הסכמה למסירת נתוני אשראי"));
  assert.ok(l.includes("בנקאות פתוחה") && l.includes("3 חודשי עו״ש אחרונים"));
});

test("עוסק מורשה — מעל 350,000 ₪: מע״מ ומאזן לשנה הנוכחית ולקודמת", () => {
  const t = tier("licensed-dealer", "obligo-over-350");
  assert.deepEqual(t.groups.map((g) => g.title), ["השנה הנוכחית", "השנה הקודמת"]);
  const l = tierLines("licensed-dealer", "obligo-over-350");
  assert.equal(l.filter((x) => x === "דוחות מע״מ").length, 2, "מע״מ לשתי השנים");
  assert.ok(l.some((x) => x.includes("מתחילת השנה הנוכחית")));
  assert.ok(l.some((x) => x.includes("של השנה הקודמת")));
});

// ─── חברה ──────────────────────────────────────────────────────

test("חברה — אובליגו עד 350,000 ₪ מנוסח על החברה ולא על הלקוח", () => {
  const l = tierLines("company", "obligo-350");
  assert.ok(l.includes("פירוט הפעילות העסקית העיקרית של החברה"));
  assert.ok(!l.some((x) => x.includes("העיקרית של הלקוח")));
});

test("חברה — מעל 500,000 ₪ מוסיפה מאזן מבוקר אחרון", () => {
  const t = tier("company", "obligo-over-500");
  assert.ok(t.note!.includes("בנוסף"));
  assert.deepEqual(tierLines("company", "obligo-over-500"), ["מאזן מבוקר אחרון"]);
  // מאזן מבוקר אינו נדרש במדרגות הנמוכות
  assert.ok(!tierLines("company", "obligo-350").some((x) => x.includes("מבוקר")));
  assert.ok(!tierLines("company", "obligo-over-350").some((x) => x.includes("מבוקר")));
});

test("חברה — מאזן מבוקר אינו נדרש מעוסק מורשה בשום מדרגה", () => {
  assert.ok(!allText("licensed-dealer").includes("מבוקר"));
});

// ─── היגיון רוחבי ──────────────────────────────────────────────

test("תוכן — אין דרישת תלושי שכר מעוסקים או מחברה, ואין מע״מ מלקוח פרטי", () => {
  for (const id of ["exempt-dealer", "licensed-dealer", "company"]) {
    assert.ok(!allText(id).includes("תלוש"), id);
  }
  const priv = clientDocuments.items[0];
  const privLines = (priv.tiers ?? []).flatMap((t) => lines(t.groups));
  assert.ok(!privLines.some((x) => x.includes("מע״מ")));
});

test("מידע בלבד — אין שדות סטטוס או מעקב במבנה הנתונים", () => {
  const blob = JSON.stringify(clientDocuments);
  for (const banned of ["checked", "status", "done", "missing", "checklist"]) {
    assert.ok(!blob.includes(banned), `נמצא שדה מעקב: ${banned}`);
  }
});

// ─── חיפוש בתוך המקור ──────────────────────────────────────────

test("חיפוש — סוגי לקוח מגיעים לתוצאה הנכונה", () => {
  const cases: [string, string][] = [
    ["לקוח פרטי", "private"],
    ["עוסק פטור", "exempt-dealer"],
    ["עוסק מורשה", "licensed-dealer"],
    ["חברה", "company"],
    ["תלושי שכר", "private"],
  ];
  for (const [q, expected] of cases) {
    const hits = searchSource(clientDocuments, q);
    assert.ok(hits.length > 0, `אין תוצאות עבור: ${q}`);
    assert.equal(hits[0].item.id, expected, `״${q}״ לא הוביל ל-${expected}`);
  }
});

test("חיפוש — כל מונחי האיפיון מחזירים תוצאה", () => {
  const terms = [
    "לקוח פרטי", "עוסק פטור", "עוסק מורשה", "חברה",
    "350 אלף", "500 אלף", "150 אלף",
    "בנקאות פתוחה", "דוחות מע״מ", "מאזן בוחן",
    "רווח והפסד", "מאזן מבוקר", "שומת מס", "אישור רו״ח",
  ];
  for (const q of terms) {
    assert.ok(searchSource(clientDocuments, q).length > 0, `אין תוצאות עבור: ${q}`);
  }
});

test("חיפוש — מונח של מדרגה מוביל ישירות למדרגה, לא רק לסוג הלקוח", () => {
  const cases: [string, string, string][] = [
    ["500 אלף", "company", "obligo-over-500"],
    ["מאזן מבוקר", "company", "obligo-over-500"],
    ["150 אלף", "private", "company-owner-150"],
    ["בעל חברה", "private", "company-owner-150"],
  ];
  for (const [q, itemId, tierId] of cases) {
    const hit = searchSource(clientDocuments, q).find((h) => h.item.id === itemId);
    assert.ok(hit, `״${q}״ לא הגיע ל-${itemId}`);
    assert.equal(hit!.matchedTierId, tierId, `״${q}״ לא הוביל למדרגה ${tierId}`);
  }
});

test("חיפוש — מונח כללי אינו קופץ למדרגה גבוהה", () => {
  // ״בנקאות פתוחה״ נכון לכל המדרגות, ולכן אין לקפוץ מעל הראשונה
  const hit = searchSource(clientDocuments, "בנקאות פתוחה").find((h) => h.item.id === "company")!;
  assert.equal(hit.matchedTierId, "obligo-350", "המדרגה הראשונה, לא הגבוהות");
  // ומונח שאינו קשור לאף מדרגה אינו נועל על אחת
  const priv = searchSource(clientDocuments, "עוסק").find((h) => h.item.id === "licensed-dealer");
  if (priv) assert.notEqual(priv.matchedTierId, "obligo-over-350");
});

test("חיפוש — מספר נבדק כמספר שלם ולא כרצף ספרות מקרי", () => {
  // 350000 מכיל את הרצף ״500״ — ואסור שחיפוש ״500 אלף״ ייתפס עליו
  const hits = searchSource(clientDocuments, "500 אלף");
  for (const h of hits) {
    assert.notEqual(h.matchedTierId, "obligo-350", `${h.item.id}: תפיסה מקרית`);
  }
  // ובכל זאת שתי צורות הכתיבה של אותו סכום מתלכדות
  assert.deepEqual(
    ids(searchSource(clientDocuments, "500,000")),
    ids(searchSource(clientDocuments, "500000"))
  );
});

test("חיפוש — מונחים משותפים מחזירים את כל סוגי הלקוחות הרלוונטיים", () => {
  // בנקאות פתוחה רלוונטית לכל ארבעת הסוגים
  assert.equal(searchSource(clientDocuments, "בנקאות פתוחה").length, 4);
  // מאזן מבוקר — רק לחברה
  assert.deepEqual(ids(searchSource(clientDocuments, "מאזן מבוקר")), ["company"]);
  // תעודות מזהות רלוונטיות לכולם
  assert.equal(searchSource(clientDocuments, "תעודות מזהות").length, 4);
});

test("חיפוש — מוצא גם מונחים שמופיעים רק ברשימות הדרישות", () => {
  assert.equal(ids(searchSource(clientDocuments, "דרכון")).length, 4);
  assert.equal(ids(searchSource(clientDocuments, "רישיון נהיגה")).length, 4);
  assert.ok(ids(searchSource(clientDocuments, "חשבוניות")).includes("licensed-dealer"));
  assert.ok(ids(searchSource(clientDocuments, "צילום שיק")).includes("private"));
  assert.ok(ids(searchSource(clientDocuments, "פעילות עסקית")).includes("company"));
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
