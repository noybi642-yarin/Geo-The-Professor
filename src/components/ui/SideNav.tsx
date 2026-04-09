"use client";

import type { TabId } from "@/types";
import { useLang } from "@/lib/LangContext";
import NotificationBell from "@/components/ui/NotificationBell";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "brief", label: "Daily Brief", icon: "📰" },
  { id: "chat", label: "Professor", icon: "💬" },
  { id: "timeline", label: "Timeline", icon: "📅" },
  { id: "learn", label: "Learn", icon: "📚" },
];

export default function SideNav({
  activeTab,
  onChange,
}: {
  activeTab: TabId;
  onChange: (tab: TabId) => void;
}) {
  const { lang, setLang } = useLang();

  return (
    <nav className="app-sidenav">
      {/* Logo */}
      <div
        style={{
          marginBottom: "28px",
          paddingBottom: "20px",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div
          className="font-display text-gold-gradient"
          style={{ fontSize: "20px", fontWeight: 700, lineHeight: 1 }}
        >
          GeoProfessor
        </div>
        <div
          style={{ fontSize: "11px", color: "var(--text-3)", marginTop: "4px" }}
        >
          Prof. Al-Rashid · Middle East
        </div>
      </div>

      {/* Navigation items */}
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 12px",
              borderRadius: "8px",
              border: "none",
              background: isActive ? "rgba(201,168,76,0.1)" : "transparent",
              color: isActive ? "var(--gold)" : "var(--text-3)",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: isActive ? 600 : 400,
              width: "100%",
              textAlign: "left",
              transition: "all 0.2s",
            }}
          >
            <span style={{ fontSize: "18px", flexShrink: 0 }}>{tab.icon}</span>
            {tab.label}
          </button>
        );
      })}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Bottom actions */}
      <div
        style={{
          paddingTop: "20px",
          borderTop: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <button
          onClick={() => setLang(lang === "en" ? "he" : "en")}
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: "var(--text-2)",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            padding: "5px 10px",
            background: "transparent",
            cursor: "pointer",
            letterSpacing: "0.04em",
          }}
        >
          {lang === "en" ? "EN" : "HE"}
        </button>
        <NotificationBell />
      </div>
    </nav>
  );
}
