"use client";

import { useMemo, useState } from "react";
import {
  KNOWLEDGE_SOURCES,
  ORIGIN_LABEL,
  searchAll,
  searchSource,
  type KnowledgeItem,
  type KnowledgeSource,
} from "@/lib/knowledge/index.ts";
import { copyText } from "@/lib/finance";
import { useToast } from "./shared";

/**
 * מרכז הידע.
 * מבנה דו-שכבתי: רשימת מקורות ← מקור בודד.
 * מקור מוצג לפי view שלו: categories (חוזה מימון) או tabs (מסמכים
 * לפי סוג לקוח). הנתונים נטענים פעם אחת — הם חלק מהבאנדל.
 */
export default function KnowledgeCenter() {
  const [openSource, setOpenSource] = useState<string | null>(
    KNOWLEDGE_SOURCES.length === 1 ? KNOWLEDGE_SOURCES[0].id : null
  );
  const [homeQuery, setHomeQuery] = useState("");
  const [jumpTo, setJumpTo] = useState<string | null>(null);

  const source = KNOWLEDGE_SOURCES.find((s) => s.id === openSource);

  // חיפוש גלובלי על כל המקורות — כדי שמונח כמו ״עוסק מורשה״
  // יגיע לתוצאה גם בלי לדעת מראש באיזה כרטיס הוא יושב
  const globalHits = useMemo(() => searchAll(KNOWLEDGE_SOURCES, homeQuery), [homeQuery]);

  const open = (sourceId: string, itemId: string) => {
    setJumpTo(itemId);
    setOpenSource(sourceId);
  };

  if (!source) {
    return (
      <div className="calc-screen">
        <section className="panel">
          <h2 className="panel-title">🔍 חיפוש מהיר</h2>
          <div className="field-box">
            <input
              type="search"
              className="kb-search"
              value={homeQuery}
              placeholder="עוסק מורשה, בנקאות פתוחה, פירעון מוקדם…"
              onChange={(e) => setHomeQuery(e.target.value)}
              aria-label="חיפוש בכל מרכז הידע"
            />
          </div>
          <div className="field-hint">החיפוש עובר על כל מקורות הידע</div>
          {homeQuery && globalHits.length === 0 && (
            <div className="kb-count">לא נמצאו תוצאות עבור ״{homeQuery}״</div>
          )}
        </section>

        {homeQuery && globalHits.length > 0
          ? globalHits.map(({ source: s, hits }) => (
              <section className="panel" key={s.id}>
                <h2 className="panel-title">
                  {s.icon} {s.title} · {hits.length} תוצאות
                </h2>
                <div className="kb-grid">
                  {hits.map(({ item, matchedLines }, idx) => (
                    <button
                      type="button"
                      key={item.id}
                      className="kb-card"
                      style={{ animationDelay: `${Math.min(idx, 12) * 30}ms` }}
                      onClick={() => open(s.id, item.id)}
                    >
                      <span className="kb-card-title">
                        {item.icon} {item.title}
                      </span>
                      <span className="kb-card-preview">
                        {(matchedLines.length ? matchedLines : item.summary)[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            ))
          : !homeQuery && (
              <div className="sn-grid">
                {KNOWLEDGE_SOURCES.map((s, idx) => (
                  <button
                    type="button"
                    key={s.id}
                    className="sn-tile"
                    style={{ animationDelay: `${idx * 45}ms` }}
                    onClick={() => setOpenSource(s.id)}
                  >
                    <span className="tile-icon">{s.icon}</span>
                    <span className="tile-title">{s.title}</span>
                    <span className="tile-desc">{s.desc}</span>
                  </button>
                ))}
              </div>
            )}
      </div>
    );
  }

  const back =
    KNOWLEDGE_SOURCES.length > 1
      ? () => {
          setJumpTo(null);
          setOpenSource(null);
        }
      : undefined;

  if (source.view === "tabs") {
    return <TabsView source={source} initialItem={jumpTo} onBack={back} />;
  }

  return <SourceView source={source} initialItem={jumpTo} onBack={back} />;
}

// ─── מקור בתצוגת טאבים (מסמכים לפי סוג לקוח) ───────────────────

function TabsView({
  source,
  initialItem,
  onBack,
}: {
  source: KnowledgeSource;
  initialItem?: string | null;
  onBack?: () => void;
}) {
  const [active, setActive] = useState(
    initialItem && source.items.some((i) => i.id === initialItem)
      ? initialItem
      : source.items[0].id
  );
  const item = source.items.find((i) => i.id === active) ?? source.items[0];
  const notify = useToast();

  const copyList = async () => {
    const lines: string[] = [`${item.icon} ${item.title} — מסמכים נדרשים`];
    for (const g of item.groups ?? []) {
      lines.push("", `${g.title}${g.note ? ` (${g.note})` : ""}`);
      for (const x of g.items ?? []) lines.push(`• ${x}`);
      (g.options ?? []).forEach((o, i) => {
        if (i > 0) lines.push("או");
        lines.push(`${o.label}:`);
        for (const x of o.items) lines.push(`• ${x}`);
      });
      if (g.footnote) lines.push(`— ${g.footnote}`);
    }
    if (await copyText(lines.join("\n"))) notify("הרשימה הועתקה ✓");
  };

  return (
    <div className="calc-screen">
      {onBack && (
        <button type="button" className="btn btn-ghost kb-back" onClick={onBack}>
          → חזרה למרכז הידע
        </button>
      )}

      <section className="panel">
        <div className="track-tabs kb-tabs" role="tablist" aria-label="סוג לקוח">
          {source.items.map((it) => (
            <button
              key={it.id}
              type="button"
              role="tab"
              aria-selected={active === it.id}
              className={`track-tab${active === it.id ? " on" : ""}`}
              onClick={() => setActive(it.id)}
            >
              {it.icon} {it.title}
            </button>
          ))}
        </div>
      </section>

      <section className="panel" key={item.id}>
        <h2 className="kb-item-title">
          {item.icon} {item.title}
        </h2>

        {(item.groups ?? []).map((g) => (
          <div className="doc-group" key={g.title}>
            <h3 className="doc-group-title">
              {g.title}
              {g.note && <span className="doc-group-note">{g.note}</span>}
            </h3>

            {g.items && (
              <ul className="doc-list">
                {g.items.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            )}

            {g.options && (
              <div className="doc-options">
                {g.options.map((o, i) => (
                  <div className="doc-option-wrap" key={o.label}>
                    {i > 0 && <div className="doc-or">או</div>}
                    <div className={`doc-option${o.preferred ? " preferred" : ""}`}>
                      <div className="doc-option-label">
                        {o.label}
                        {o.preferred && <span className="doc-star">⭐</span>}
                      </div>
                      <ul className="doc-list">
                        {o.items.map((x) => (
                          <li key={x}>{x}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {g.footnote && <div className="doc-footnote">ℹ️ {g.footnote}</div>}
          </div>
        ))}

        <div className="modal-actions kb-actions">
          <button type="button" className="mini-btn" onClick={copyList}>
            📋 העתקת הרשימה
          </button>
        </div>

        <div className="note kb-disclaimer">ℹ️ {source.disclaimer}</div>
      </section>
    </div>
  );
}

// ─── מקור ידע בודד ─────────────────────────────────────────────

function SourceView({
  source,
  initialItem,
  onBack,
}: {
  source: KnowledgeSource;
  initialItem?: string | null;
  onBack?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [openItem, setOpenItem] = useState<string | null>(
    initialItem && source.items.some((i) => i.id === initialItem) ? initialItem : null
  );

  // החיפוש מקומי ומיידי — אין קריאות רשת ואין טעינה חוזרת
  const hits = useMemo(() => searchSource(source, query), [source, query]);
  const item = openItem ? source.items.find((i) => i.id === openItem) : null;

  if (item) {
    return <ItemView source={source} item={item} onBack={() => setOpenItem(null)} />;
  }

  return (
    <div className="calc-screen">
      <section className="panel">
        <h2 className="panel-title">🔍 חיפוש מהיר</h2>
        <div className="field-box">
          <input
            type="search"
            className="kb-search"
            value={query}
            placeholder="פירעון מוקדם, ביטוח, ריבית פיגורים, בלון…"
            onChange={(e) => setQuery(e.target.value)}
            aria-label="חיפוש במרכז הידע"
          />
        </div>
        <div className="field-hint">
          החיפוש מוצא גם מילים דומות — ״ביטוח״ יאתר גם ״פוליסה״ ו״שעבוד פוליסה״
        </div>
        {query && (
          <div className="kb-count">
            {hits.length > 0
              ? `${hits.length} תוצאות עבור ״${query}״`
              : `לא נמצאו תוצאות עבור ״${query}״`}
          </div>
        )}
        <div className="note kb-disclaimer">ℹ️ {source.disclaimer}</div>
      </section>

      {hits.length > 0 && (
        <div className="kb-grid">
          {hits.map(({ item: it, matchedLines }, idx) => (
            <button
              type="button"
              key={it.id}
              className="kb-card"
              style={{ animationDelay: `${Math.min(idx, 12) * 30}ms` }}
              onClick={() => setOpenItem(it.id)}
            >
              <span className="kb-card-title">
                {it.icon} {it.title}
              </span>
              <span className="kb-card-preview">
                {(matchedLines.length ? matchedLines : it.summary)[0]}
              </span>
              {it.note && <span className="kb-flag">⚠️ יש הערה לאימות</span>}
            </button>
          ))}
        </div>
      )}

      {onBack && (
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          → חזרה לרשימת המקורות
        </button>
      )}
    </div>
  );
}

// ─── קטגוריה בודדת ─────────────────────────────────────────────

function ItemView({
  source,
  item,
  onBack,
}: {
  source: KnowledgeSource;
  item: KnowledgeItem;
  onBack: () => void;
}) {
  const [showSource, setShowSource] = useState(false);
  const notify = useToast();

  const copySummary = async () => {
    const text = [`${item.icon} ${item.title}`, ...item.summary.map((s) => `• ${s}`)].join("\n");
    if (await copyText(text)) notify("התקציר הועתק ✓");
  };

  return (
    <div className="calc-screen">
      <button type="button" className="btn btn-ghost kb-back" onClick={onBack}>
        → חזרה לקטגוריות
      </button>

      <section className="panel">
        <h2 className="kb-item-title">
          {item.icon} {item.title}
        </h2>

        {item.note && <div className="alert alert-bdm kb-note">⚠️ {item.note}</div>}

        <ul className="kb-summary">
          {item.summary.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>

        <div className="modal-actions kb-actions">
          <button type="button" className="mini-btn" onClick={copySummary}>
            📋 העתקת התקציר
          </button>
          {(item.quotes?.length ?? 0) > 0 && (
            <button
              type="button"
              className={`mini-btn${showSource ? " on" : ""}`}
              aria-expanded={showSource}
              onClick={() => setShowSource((v) => !v)}
            >
              📖 {showSource ? "הסתרת המקור" : "מקור בחוזה"}
            </button>
          )}
        </div>

        {showSource && (
          <div className="kb-quotes">
            {(item.quotes ?? []).map((q, i) => (
              <blockquote key={i} className="kb-quote">
                <div className="kb-quote-ref">
                  {q.ref}
                  <span className={`kb-origin kb-origin-${q.origin}`}>{ORIGIN_LABEL[q.origin]}</span>
                </div>
                <p>{q.text}</p>
              </blockquote>
            ))}
            <div className="kb-quote-foot">
              המקורות: {source.origins}. הנוסח המחייב הוא נוסח החוזה החתום.
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
