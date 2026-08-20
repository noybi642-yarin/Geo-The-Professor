"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  ICON_MD,
  ICON_SM,
  ICON_STROKE,
  IconCalculators,
} from "@/components/ui/icons";
import {
  BOTTOM_NAV,
  NAV_GROUPS,
  bottomNavKeyFor,
  type NavEntry,
  type ScreenId,
} from "./screens";

/**
 * מעטפת האפליקציה.
 *
 * דסקטופ — סרגל צד קבוע בצד ההתחלה (בעברית: ימין), ואזור עבודה לצידו.
 * מובייל  — ללא סרגל צד, ניווט תחתון קבוע בן ארבעה פריטים.
 *
 * המעטפת אינה יודעת דבר על תוכן המסכים; היא מקבלת ניווט ותוכן.
 * כך אותה מעטפת משמשת גם את העמוד הראשי וגם את עמודי ההיסטוריה.
 */
export default function AppShell({
  activeScreen,
  activeHref,
  onNavigate,
  onOpenSettings,
  title,
  actions,
  children,
}: {
  /** המסך הפעיל בעמוד הראשי, אם יש */
  activeScreen?: ScreenId;
  /** הנתיב הפעיל, בעמודים שהם נתיב אמיתי */
  activeHref?: string;
  /**
   * מעבר למסך בתוך העמוד הראשי. בעמודים אחרים אין פונקציה כזו,
   * ואז פריטי המסכים הופכים לקישורים לעמוד הראשי.
   */
  onNavigate?: (screen: ScreenId) => void;
  onOpenSettings?: () => void;
  /** כותרת הקשרית בסרגל העליון */
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const bottomKey = activeScreen ? bottomNavKeyFor(activeScreen) : "";

  /** פריט מסך: כפתור בעמוד הראשי, קישור בכל עמוד אחר */
  const renderEntry = (e: NavEntry) => {
    const Icon = e.icon;
    const cls = `nav-item${e.sub ? " sub" : ""}`;

    if (e.action === "settings") {
      // מוצג רק כשההגדרות באמת זמינות במסך הנוכחי
      if (!onOpenSettings) return null;
      return (
        <button key={e.key} type="button" className={cls} onClick={onOpenSettings}>
          <Icon size={ICON_SM} strokeWidth={ICON_STROKE} aria-hidden />
          {e.label}
        </button>
      );
    }

    if (e.href) {
      const on = activeHref === e.href;
      return (
        <Link
          key={e.key}
          href={e.href}
          className={`${cls}${on ? " on" : ""}`}
          aria-current={on ? "page" : undefined}
        >
          <Icon size={ICON_SM} strokeWidth={ICON_STROKE} aria-hidden />
          {e.label}
        </Link>
      );
    }

    const on = !!e.screen && activeScreen === e.screen;
    if (!onNavigate) {
      // עמוד אחר: הפריט מוביל לעמוד הראשי ופותח שם את המסך
      return (
        <Link key={e.key} href={`/?calc=${e.screen}`} className={cls}>
          <Icon size={ICON_SM} strokeWidth={ICON_STROKE} aria-hidden />
          {e.label}
        </Link>
      );
    }

    return (
      <button
        key={e.key}
        type="button"
        className={`${cls}${on ? " on" : ""}`}
        aria-current={on ? "page" : undefined}
        onClick={() => e.screen && onNavigate(e.screen)}
      >
        <Icon size={ICON_SM} strokeWidth={ICON_STROKE} aria-hidden />
        {e.label}
      </button>
    );
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="sidebar-mark" aria-hidden>
            <IconCalculators size={ICON_MD} strokeWidth={ICON_STROKE} />
          </span>
          <span className="sidebar-brand-text">
            <span className="sidebar-title">מימון רכב</span>
            <span className="sidebar-sub">סביבת עבודה ל-BDM</span>
          </span>
        </div>

        <nav className="sidebar-nav" aria-label="ניווט ראשי">
          {NAV_GROUPS.map((g) => {
            const entries = g.entries.map(renderEntry).filter(Boolean);
            if (entries.length === 0) return null;
            return (
              <div key={g.key}>
                {g.label && <div className="nav-group-label">{g.label}</div>}
                {entries}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-foot">נבנה עבור נוי</div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar-inner">
            <div className="topbar-lead">
              <h1 className="topbar-title">{title}</h1>
            </div>
            {actions && <div className="topbar-actions">{actions}</div>}
          </div>
        </header>

        <main className="workspace">
          <div className="workspace-inner">{children}</div>
        </main>
      </div>

      <nav className="bottomnav" aria-label="ניווט">
        {BOTTOM_NAV.map((b) => {
          const Icon = b.icon;
          const on = bottomKey === b.key;
          const content = (
            <>
              <Icon size={ICON_MD} strokeWidth={ICON_STROKE} aria-hidden />
              {b.label}
            </>
          );
          return onNavigate ? (
            <button
              key={b.key}
              type="button"
              className={`bottomnav-item${on ? " on" : ""}`}
              aria-current={on ? "page" : undefined}
              onClick={() => onNavigate(b.screen)}
            >
              {content}
            </button>
          ) : (
            <Link key={b.key} href={`/?calc=${b.screen}`} className="bottomnav-item">
              {content}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
