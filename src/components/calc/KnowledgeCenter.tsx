"use client";

import { useMemo, useState } from "react";
import {
  KNOWLEDGE_SOURCES,
  ORIGIN_LABEL,
  searchAll,
  searchSource,
  type DocTier,
  type KnowledgeItem,
  type KnowledgeSource,
} from "@/lib/knowledge/index.ts";
import { copyText } from "@/lib/finance";
import {
  ICON_MD,
  ICON_SM,
  ICON_STROKE,
  IconBack,
  IconClientDocs,
  IconContract,
  IconCopyToClient,
  IconInfo,
  IconKnowledge,
  IconOpenBanking,
  IconSearch,
  IconStar,
  type LucideIcon,
} from "@/components/ui/icons";
import { useToast } from "./shared";

/**
 * אייקון לכל מקור ולכל פריט. הנתונים עצמם אינם נוגעים בעיצוב —
 * המיפוי יושב כאן, ולכן קובצי הידע נשארים תוכן טהור.
 */
const SOURCE_ICONS: Record<string, LucideIcon> = {
  "finance-contract": IconContract,
  "client-documents": IconClientDocs,
};

const sourceIcon = (id: string): LucideIcon => SOURCE_ICONS[id] ?? IconKnowledge;

/**
 * קיצורי חיפוש. כל מונח כאן נבדק ומחזיר תוצאות מהתוכן הקיים —
 * אלה אינן קטגוריות חדשות אלא כניסות מהירות לחיפוש הרגיל.
 */
const COMMON_SEARCHES = [
  "פירעון מוקדם",
  "בנקאות פתוחה",
  "משכון",
  "עמלת הקמה",
  "ריבית פיגורים",
  "בלון",
];

/** תקציר בשורה אחת של מה שהמדרגה דורשת — לתצוגה מקדימה בכרטיס */
function tierPreview(tier: DocTier | undefined): string | null {
  if (!tier) return null;
  const wanted = tier.groups.flatMap((g) => [
    ...(g.items ?? []),
    ...(g.alternatives ?? []),
    ...(g.options ?? []).flatMap((o) => o.items),
  ]);
  return wanted.length > 0 ? wanted.join(" · ") : null;
}

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
  const [jumpTier, setJumpTier] = useState<string | null>(null);

  const source = KNOWLEDGE_SOURCES.find((s) => s.id === openSource);

  // חיפוש גלובלי על כל המקורות — כדי שמונח כמו ״עוסק מורשה״
  // יגיע לתוצאה גם בלי לדעת מראש באיזה כרטיס הוא יושב
  const globalHits = useMemo(() => searchAll(KNOWLEDGE_SOURCES, homeQuery), [homeQuery]);

  const open = (sourceId: string, itemId: string, tierId?: string) => {
    setJumpTo(itemId);
    setJumpTier(tierId ?? null);
    setOpenSource(sourceId);
  };

  if (!source) {
    return (
      <div className="calc-screen">
        <section className="panel">
          <label className="kb-searchbar">
            <IconSearch size={ICON_MD} strokeWidth={ICON_STROKE} aria-hidden />
            <input
              type="search"
              className="kb-search"
              value={homeQuery}
              placeholder="חיפוש במרכז הידע"
              onChange={(e) => setHomeQuery(e.target.value)}
              aria-label="חיפוש בכל מרכז הידע"
            />
          </label>
          {!homeQuery && (
            <div className="kb-suggest">
              <span className="kb-suggest-label">חיפושים נפוצים</span>
              {COMMON_SEARCHES.map((q) => (
                <button
                  key={q}
                  type="button"
                  className="chip"
                  onClick={() => setHomeQuery(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          )}
          {homeQuery && globalHits.length === 0 && (
            <div className="kb-count">לא נמצאו תוצאות עבור ״{homeQuery}״</div>
          )}
        </section>

        {homeQuery && globalHits.length > 0
          ? globalHits.map(({ source: s, hits }) => (
              <section className="panel" key={s.id}>
                <h2 className="panel-title">
                  {(() => {
                    const SIcon = sourceIcon(s.id);
                    return <SIcon size={ICON_SM} strokeWidth={ICON_STROKE} aria-hidden />;
                  })()}
                  {s.title} · {hits.length} תוצאות
                </h2>
                <div className="kb-grid">
                  {hits.map(({ item, matchedLines, matchedTierId }, idx) => {
                    const tier = item.tiers?.find((t) => t.id === matchedTierId);
                    return (
                      <button
                        type="button"
                        key={item.id}
                        className="kb-card"
                        style={{ animationDelay: `${Math.min(idx, 12) * 30}ms` }}
                        onClick={() => open(s.id, item.id, matchedTierId)}
                      >
                        <span className="kb-card-title">{item.title}</span>
                        {/* המדרגה שאליה החיפוש מוביל — כדי שיהיה ברור מראש */}
                        {tier && <span className="kb-card-tier">{tier.label}</span>}
                        <span className="kb-card-preview">
                          {/* כשההתאמה היא במדרגה, התצוגה המקדימה באה ממנה —
                              שורת תקציר של מדרגה אחרת רק הייתה מבלבלת */}
                          {tierPreview(tier) ??
                            (matchedLines.length ? matchedLines : item.summary)[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))
          : !homeQuery && (
              <div className="sn-grid grid-fit">
                {KNOWLEDGE_SOURCES.map((s) => {
                  const SIcon = sourceIcon(s.id);
                  return (
                    <button
                      type="button"
                      key={s.id}
                      className="sn-tile"
                      onClick={() => setOpenSource(s.id)}
                    >
                      <span className="tile-icon" aria-hidden>
                        <SIcon size={ICON_MD} strokeWidth={ICON_STROKE} />
                      </span>
                      <span className="tile-body">
                        <span className="tile-title">{s.title}</span>
                        <span className="tile-desc">{s.desc}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
      </div>
    );
  }

  const back =
    KNOWLEDGE_SOURCES.length > 1
      ? () => {
          setJumpTo(null);
          setJumpTier(null);
          setOpenSource(null);
        }
      : undefined;

  if (source.view === "tabs") {
    return (
      <TabsView source={source} initialItem={jumpTo} initialTier={jumpTier} onBack={back} />
    );
  }

  return <SourceView source={source} initialItem={jumpTo} onBack={back} />;
}

// ─── מקור בתצוגת טאבים (מסמכים לפי סוג לקוח) ───────────────────

function TabsView({
  source,
  initialItem,
  initialTier,
  onBack,
}: {
  source: KnowledgeSource;
  initialItem?: string | null;
  initialTier?: string | null;
  onBack?: () => void;
}) {
  const [active, setActive] = useState(
    initialItem && source.items.some((i) => i.id === initialItem)
      ? initialItem
      : source.items[0].id
  );
  const item = source.items.find((i) => i.id === active) ?? source.items[0];

  // המדרגה נבחרת בשלב שני. חיפוש שהוביל למדרגה מסוימת פותח אותה.
  const [tierId, setTierId] = useState<string | null>(initialTier ?? null);
  const tiers = item.tiers ?? [];
  const tier = tiers.find((t) => t.id === tierId) ?? tiers[0] ?? null;
  const groups = tier ? tier.groups : item.groups ?? [];

  const notify = useToast();

  /** מעבר לסוג לקוח אחר מתחיל תמיד מהמדרגה הראשונה שלו */
  const selectItem = (id: string) => {
    setActive(id);
    setTierId(null);
  };

  const copyList = async () => {
    const heading = tier
      ? `${item.icon} ${item.title} · ${tier.label} — מסמכים נדרשים`
      : `${item.icon} ${item.title} — מסמכים נדרשים`;
    const lines: string[] = [heading];
    if (tier?.note) lines.push(tier.note);
    for (const g of groups) {
      lines.push("", `${g.title}${g.note ? ` (${g.note})` : ""}`);
      for (const x of g.items ?? []) lines.push(`• ${x}`);
      if (g.alternatives) lines.push(g.alternatives.join(" או "));
      (g.options ?? []).forEach((o, i) => {
        if (i > 0) lines.push("או");
        lines.push(`${o.label}:`);
        for (const x of o.items) lines.push(`• ${x}`);
      });
      if (g.footnote) lines.push(`— ${g.footnote}`);
    }
    if (await copyText(lines.join("\n"))) notify("הרשימה הועתקה");
  };

  return (
    <div className="calc-screen">
      {onBack && (
        <button type="button" className="btn btn-ghost kb-back" onClick={onBack}>
          <IconBack size={ICON_SM} strokeWidth={ICON_STROKE} aria-hidden />
          חזרה למרכז הידע
        </button>
      )}

      {/* כלל רוחבי — נכון לכל סוגי הלקוחות, ולכן מוצג פעם אחת */}
      {source.intro && (
        <section className="panel kb-intro">
          <h2 className="panel-title">
            <IconOpenBanking size={ICON_SM} strokeWidth={ICON_STROKE} aria-hidden />
            {source.intro.title}
          </h2>
          {source.intro.lines.map((line, i) => (
            <p className="kb-intro-line" key={i}>
              {line}
            </p>
          ))}
        </section>
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
              onClick={() => selectItem(it.id)}
            >
              {it.title}
            </button>
          ))}
        </div>

        {/* שלב שני: מדרגה. מדרגה יחידה מוצגת כהקשר, בלי בורר מיותר */}
        {tiers.length > 1 && (
          <div className="chips kb-tiers" role="tablist" aria-label="מדרגת הכנסה או אובליגו">
            {tiers.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tier?.id === t.id}
                className={`chip${tier?.id === t.id ? " on" : ""}`}
                onClick={() => setTierId(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="panel" key={`${item.id}-${tier?.id ?? "base"}`}>
        <h2 className="kb-item-title">
          {item.title}
        </h2>

        {tier && tiers.length === 1 && <div className="kb-tier-label">{tier.label}</div>}
        {tier?.note && <div className="kb-tier-note">{tier.note}</div>}

        {groups.map((g) => (
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

            {/* מסמכים חליפיים — אחד מהם מספיק */}
            {g.alternatives && (
              <div className="doc-alts">
                {g.alternatives.map((x, i) => (
                  <span className="doc-alt-wrap" key={x}>
                    {i > 0 && <span className="doc-alt-or">או</span>}
                    <span className="doc-alt">{x}</span>
                  </span>
                ))}
              </div>
            )}

            {g.options && (
              <div className="doc-options">
                {g.options.map((o, i) => (
                  <div className="doc-option-wrap" key={o.label}>
                    {i > 0 && <div className="doc-or">או</div>}
                    <div className={`doc-option${o.preferred ? " preferred" : ""}`}>
                      <div className="doc-option-label">
                        {o.label}
                        {o.preferred && (
                          <span className="doc-star" aria-hidden>
                            <IconStar size={13} strokeWidth={ICON_STROKE} />
                          </span>
                        )}
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

            {g.footnote && (
              <div className="doc-footnote">
                <IconInfo size={ICON_SM} strokeWidth={ICON_STROKE} aria-hidden />
                {g.footnote}
              </div>
            )}
          </div>
        ))}

        <div className="modal-actions kb-actions">
          <button type="button" className="mini-btn" onClick={copyList}>
            <IconCopyToClient size={ICON_SM} strokeWidth={ICON_STROKE} aria-hidden />
            העתקת הרשימה
          </button>
        </div>

        <div className="note kb-disclaimer">
          <IconInfo size={ICON_SM} strokeWidth={ICON_STROKE} aria-hidden />
          {source.disclaimer}
        </div>
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
        <label className="kb-searchbar">
          <IconSearch size={ICON_MD} strokeWidth={ICON_STROKE} aria-hidden />
          <input
            type="search"
            className="kb-search"
            value={query}
            placeholder="חיפוש בחוזה המימון"
            onChange={(e) => setQuery(e.target.value)}
            aria-label="חיפוש במרכז הידע"
          />
        </label>
        <div className="field-hint" style={{ marginTop: 10 }}>
          החיפוש מוצא גם מילים דומות — ״ביטוח״ יאתר גם ״פוליסה״ ו״שעבוד פוליסה״
        </div>
        {query && (
          <div className="kb-count">
            {hits.length > 0
              ? `${hits.length} תוצאות עבור ״${query}״`
              : `לא נמצאו תוצאות עבור ״${query}״`}
          </div>
        )}
        <div className="note kb-disclaimer">
          <IconInfo size={ICON_SM} strokeWidth={ICON_STROKE} aria-hidden />
          {source.disclaimer}
        </div>
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
                {it.title}
              </span>
              <span className="kb-card-preview">
                {(matchedLines.length ? matchedLines : it.summary)[0]}
              </span>
              {it.note && <span className="kb-flag">יש הערה לאימות</span>}
            </button>
          ))}
        </div>
      )}

      {onBack && (
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          <IconBack size={ICON_SM} strokeWidth={ICON_STROKE} aria-hidden />
          חזרה לרשימת המקורות
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
    if (await copyText(text)) notify("התקציר הועתק");
  };

  return (
    <div className="calc-screen">
      <button type="button" className="btn btn-ghost kb-back" onClick={onBack}>
        <IconBack size={ICON_SM} strokeWidth={ICON_STROKE} aria-hidden />
        חזרה לקטגוריות
      </button>

      <section className="panel">
        <h2 className="kb-item-title">
          {item.title}
        </h2>

        {item.note && (
          <div className="alert alert-bdm kb-note">
            <IconInfo size={ICON_SM} strokeWidth={ICON_STROKE} aria-hidden />
            {item.note}
          </div>
        )}

        <ul className="kb-summary">
          {item.summary.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>

        <div className="modal-actions kb-actions">
          <button type="button" className="mini-btn" onClick={copySummary}>
            <IconCopyToClient size={ICON_SM} strokeWidth={ICON_STROKE} aria-hidden />
            העתקת התקציר
          </button>
          {(item.quotes?.length ?? 0) > 0 && (
            <button
              type="button"
              className={`mini-btn${showSource ? " on" : ""}`}
              aria-expanded={showSource}
              onClick={() => setShowSource((v) => !v)}
            >
              <IconContract size={ICON_SM} strokeWidth={ICON_STROKE} aria-hidden />
              {showSource ? "הסתרת המקור" : "מקור בחוזה"}
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
