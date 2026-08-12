"use client";

import { useMemo, useState } from "react";
import {
  KNOWLEDGE_SOURCES,
  ORIGIN_LABEL,
  searchSource,
  type KnowledgeItem,
  type KnowledgeSource,
} from "@/lib/knowledge/index.ts";
import { copyText } from "@/lib/finance";
import { useToast } from "./shared";

/**
 * מרכז הידע.
 * מבנה דו-שכבתי: רשימת מקורות ← מקור בודד (חיפוש + קטגוריות).
 * הנתונים נטענים פעם אחת בלבד — הם חלק מהבאנדל ואינם נמשכים ברשת.
 */
export default function KnowledgeCenter() {
  const [openSource, setOpenSource] = useState<string | null>(
    KNOWLEDGE_SOURCES.length === 1 ? KNOWLEDGE_SOURCES[0].id : null
  );

  const source = KNOWLEDGE_SOURCES.find((s) => s.id === openSource);

  if (!source) {
    return (
      <div className="calc-screen">
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
      </div>
    );
  }

  return (
    <SourceView
      source={source}
      onBack={KNOWLEDGE_SOURCES.length > 1 ? () => setOpenSource(null) : undefined}
    />
  );
}

// ─── מקור ידע בודד ─────────────────────────────────────────────

function SourceView({
  source,
  onBack,
}: {
  source: KnowledgeSource;
  onBack?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [openItem, setOpenItem] = useState<string | null>(null);

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
          <button
            type="button"
            className={`mini-btn${showSource ? " on" : ""}`}
            aria-expanded={showSource}
            onClick={() => setShowSource((v) => !v)}
          >
            📖 {showSource ? "הסתרת המקור" : "מקור בחוזה"}
          </button>
        </div>

        {showSource && (
          <div className="kb-quotes">
            {item.quotes.map((q, i) => (
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
