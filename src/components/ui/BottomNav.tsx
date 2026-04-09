"use client";

import type { TabId } from "@/types";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "brief", label: "Brief", icon: "📰" },
  { id: "chat", label: "Professor", icon: "💬" },
  { id: "timeline", label: "Timeline", icon: "📅" },
  { id: "learn", label: "Learn", icon: "📚" },
];

export default function BottomNav({
  activeTab,
  onChange,
}: {
  activeTab: TabId;
  onChange: (tab: TabId) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        borderTop: "1px solid var(--border-subtle)",
        background: "var(--bg-2)",
        flexShrink: 0,
      }}
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              flex: 1,
              padding: "10px 4px 12px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "3px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: isActive ? "var(--gold)" : "var(--text-3)",
              transition: "color 0.2s ease",
            }}
          >
            <span style={{ fontSize: "20px", lineHeight: 1 }}>{tab.icon}</span>
            <span
              style={{
                fontSize: "10px",
                fontWeight: isActive ? 700 : 400,
                letterSpacing: "0.03em",
              }}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
