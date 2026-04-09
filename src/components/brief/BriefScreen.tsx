"use client";

import { useState } from "react";
import { useDailyBrief } from "@/hooks/useDailyBrief";
import Tag from "@/components/ui/Tag";
import ActorChips from "@/components/ui/ActorChips";

export default function BriefScreen({
  onAskProfessor,
}: {
  onAskProfessor: (q: string) => void;
}) {
  const { brief, loading, error } = useDailyBrief();
  const [newsInput, setNewsInput] = useState("");
  const [analysis, setAnalysis] = useState<Record<string, unknown> | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  async function analyzeNews() {
    if (!newsInput.trim()) return;
    setAnalyzing(true);
    setAnalysis(null);
    try {
      const res = await fetch("/api/analyze-news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headline: newsInput }),
      });
      const data = await res.json();
      setAnalysis(data);
    } catch {
      console.error("Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", gap: "5px" }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: "var(--gold)",
                animation: `bounce-dot 1s ease-in-out ${i * 0.15}s infinite`,
              }}
            />
          ))}
        </div>
        <div style={{ fontSize: "13px", color: "var(--text-3)" }}>
          Loading today&apos;s brief…
        </div>
      </div>
    );
  }

  if (error || !brief) {
    return (
      <div style={{ padding: "24px 16px", color: "var(--text-2)" }}>
        <p>Failed to load today&apos;s brief.</p>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: "12px",
            color: "var(--gold)",
            background: "none",
            border: "1px solid var(--gold)",
            borderRadius: "6px",
            padding: "8px 16px",
            cursor: "pointer",
            fontSize: "13px",
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px 16px 32px", overflowY: "auto", height: "100%" }}>
      {/* Tags */}
      {brief.tags?.length > 0 && (
        <div style={{ marginBottom: "10px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {brief.tags.map((tag, i) => (
            <Tag key={i} label={tag.label} type={tag.type} />
          ))}
        </div>
      )}

      {/* Headline */}
      <h1
        className="font-display"
        style={{
          fontSize: "22px",
          fontWeight: 700,
          lineHeight: 1.3,
          marginBottom: "20px",
          color: "var(--text)",
        }}
      >
        {brief.headline}
      </h1>

      {/* Sections */}
      {brief.sections?.map((section, i) => (
        <div
          key={i}
          style={{
            marginBottom: "14px",
            padding: "14px 16px",
            background: "var(--bg-2)",
            borderRadius: "10px",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div
            style={{
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: "var(--text-3)",
              textTransform: "uppercase",
              marginBottom: "8px",
            }}
          >
            {section.title}
          </div>

          <p
            style={{
              fontSize: "14px",
              lineHeight: 1.7,
              color: "var(--text-2)",
            }}
          >
            {section.content}
          </p>

          {section.type === "scenarios" && section.scenarios && (
            <div
              style={{
                marginTop: "14px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              {section.scenarios.map((s, j) => (
                <div key={j} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: 700,
                      color:
                        s.label === "high"
                          ? "var(--teal)"
                          : s.label === "mid"
                          ? "var(--gold)"
                          : "var(--text-3)",
                      minWidth: "38px",
                      flexShrink: 0,
                    }}
                  >
                    {s.probability}%
                  </div>
                  <div
                    style={{
                      fontSize: "13px",
                      color: "var(--text-2)",
                      lineHeight: 1.5,
                    }}
                  >
                    {s.description}
                  </div>
                </div>
              ))}
            </div>
          )}

          {section.type === "context" && (
            <button
              onClick={() =>
                onAskProfessor(
                  `Give me deeper context on: ${section.content.substring(0, 120)}…`
                )
              }
              style={{
                marginTop: "10px",
                fontSize: "12px",
                color: "var(--gold)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              Ask Professor for more context →
            </button>
          )}
        </div>
      ))}

      {/* Actors */}
      {brief.actors?.length > 0 && (
        <div style={{ marginBottom: "28px" }}>
          <div
            style={{
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: "var(--text-3)",
              textTransform: "uppercase",
              marginBottom: "8px",
            }}
          >
            Key Actors
          </div>
          <ActorChips actors={brief.actors} />
        </div>
      )}

      {/* News Analyzer */}
      <div
        style={{
          borderTop: "1px solid var(--border-subtle)",
          paddingTop: "22px",
        }}
      >
        <div
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: "var(--text)",
            marginBottom: "6px",
          }}
        >
          Analyze a Headline
        </div>
        <div
          style={{
            fontSize: "12px",
            color: "var(--text-3)",
            marginBottom: "12px",
          }}
        >
          Paste any news headline and Prof. Al-Rashid will decode the framing.
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <input
            value={newsInput}
            onChange={(e) => setNewsInput(e.target.value)}
            placeholder="Paste a headline…"
            style={{
              flex: 1,
              background: "var(--bg-3)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "10px 12px",
              fontSize: "13px",
              color: "var(--text)",
              outline: "none",
            }}
            onKeyDown={(e) => e.key === "Enter" && analyzeNews()}
          />
          <button
            onClick={analyzeNews}
            disabled={analyzing || !newsInput.trim()}
            style={{
              background: "var(--gold)",
              color: "#000",
              border: "none",
              borderRadius: "8px",
              padding: "10px 16px",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              opacity: analyzing || !newsInput.trim() ? 0.6 : 1,
              flexShrink: 0,
            }}
          >
            {analyzing ? "…" : "Analyze"}
          </button>
        </div>

        {analysis && (
          <div
            style={{
              marginTop: "16px",
              padding: "16px",
              background: "var(--bg-2)",
              borderRadius: "10px",
              border: "1px solid var(--border-subtle)",
            }}
          >
            {/* Bias score */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "14px",
                paddingBottom: "12px",
                borderBottom: "1px solid var(--border-subtle)",
              }}
            >
              <span
                style={{
                  fontSize: "11px",
                  color: "var(--text-3)",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Bias Score
              </span>
              <span
                style={{
                  fontSize: "20px",
                  fontWeight: 700,
                  color:
                    (analysis.bias_score as number) > 60
                      ? "var(--danger)"
                      : (analysis.bias_score as number) > 30
                      ? "var(--gold)"
                      : "var(--teal)",
                }}
              >
                {analysis.bias_score as number}/100
              </span>
            </div>

            {[
              { key: "hidden_context", label: "Hidden Context" },
              { key: "framing_bias", label: "Framing Bias" },
              { key: "long_term_implications", label: "Long-term Implications" },
              { key: "related_history", label: "Historical Parallel" },
            ].map(
              ({ key, label }) =>
                analysis[key] && (
                  <div key={key} style={{ marginBottom: "12px" }}>
                    <div
                      style={{
                        fontSize: "10px",
                        color: "var(--text-3)",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        marginBottom: "4px",
                      }}
                    >
                      {label}
                    </div>
                    <p
                      style={{
                        fontSize: "13px",
                        color: "var(--text-2)",
                        lineHeight: 1.65,
                      }}
                    >
                      {analysis[key] as string}
                    </p>
                  </div>
                )
            )}

            <button
              onClick={() =>
                onAskProfessor(
                  `I'm reading this headline: "${newsInput}". Can you give me deeper context on the key actors and historical background?`
                )
              }
              style={{
                marginTop: "4px",
                fontSize: "12px",
                color: "var(--gold)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              Ask Professor for deeper analysis →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
