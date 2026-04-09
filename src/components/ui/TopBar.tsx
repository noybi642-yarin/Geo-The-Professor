"use client";

import { useLang } from "@/lib/LangContext";

export default function TopBar() {
  const { lang, setLang } = useLang();

  return (
    <div
      style={{
        padding: "12px 16px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid var(--border-subtle)",
        background: "var(--bg)",
        flexShrink: 0,
      }}
    >
      <div>
        <div
          className="font-display text-gold-gradient"
          style={{ fontSize: "18px", fontWeight: 700, lineHeight: 1 }}
        >
          GeoProfessor
        </div>
        <div style={{ fontSize: "11px", color: "var(--text-3)", marginTop: "2px" }}>
          Prof. Al-Rashid · Middle East
        </div>
      </div>

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
    </div>
  );
}
