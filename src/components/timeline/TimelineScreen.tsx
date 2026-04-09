"use client";

import { useState } from "react";
import { TIMELINE_EVENTS } from "@/data/timeline";

const ERAS = [
  { id: "all", label: "All" },
  { id: "founding", label: "1917–64" },
  { id: "wars", label: "1956–82" },
  { id: "oslo", label: "1987–00" },
  { id: "modern", label: "2006–23" },
];

const TYPE_COLORS: Record<string, string> = {
  war: "var(--danger)",
  diplo: "var(--teal)",
  political: "var(--blue)",
  conflict: "var(--purple)",
};

export default function TimelineScreen({
  onAskProfessor,
}: {
  onAskProfessor: (q: string) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selectedEra, setSelectedEra] = useState("all");

  const filtered =
    selectedEra === "all"
      ? TIMELINE_EVENTS
      : TIMELINE_EVENTS.filter((e) => e.era === selectedEra);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Era Filter */}
      <div
        style={{
          padding: "10px 12px",
          display: "flex",
          gap: "6px",
          overflowX: "auto",
          borderBottom: "1px solid var(--border-subtle)",
          flexShrink: 0,
        }}
      >
        {ERAS.map((era) => (
          <button
            key={era.id}
            onClick={() => setSelectedEra(era.id)}
            style={{
              whiteSpace: "nowrap",
              fontSize: "12px",
              fontWeight: selectedEra === era.id ? 700 : 400,
              padding: "5px 12px",
              borderRadius: "20px",
              border: "1px solid",
              borderColor:
                selectedEra === era.id ? "var(--gold)" : "var(--border-subtle)",
              background:
                selectedEra === era.id
                  ? "rgba(201,168,76,0.12)"
                  : "transparent",
              color:
                selectedEra === era.id ? "var(--gold)" : "var(--text-3)",
              cursor: "pointer",
            }}
          >
            {era.label}
          </button>
        ))}
      </div>

      {/* Timeline list */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px",
        }}
      >
        {filtered.map((event, i) => {
          const eventId = `${event.year}-${event.title}`;
          const isExpanded = expanded === eventId;
          const color = TYPE_COLORS[event.type] || "var(--text-3)";

          return (
            <div
              key={eventId}
              style={{ display: "flex", gap: "12px", marginBottom: "4px" }}
            >
              {/* Dot + line */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  flexShrink: 0,
                  paddingTop: "5px",
                }}
              >
                <div
                  className={`dot-${event.type}`}
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    border: "2px solid",
                    flexShrink: 0,
                  }}
                />
                {i < filtered.length - 1 && (
                  <div
                    style={{
                      width: "1px",
                      flex: 1,
                      minHeight: "24px",
                      background: "var(--border-subtle)",
                      marginTop: "4px",
                    }}
                  />
                )}
              </div>

              {/* Content */}
              <div style={{ flex: 1, paddingBottom: "16px" }}>
                <div
                  style={{ cursor: "pointer" }}
                  onClick={() => setExpanded(isExpanded ? null : eventId)}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color,
                      marginBottom: "2px",
                    }}
                  >
                    {event.year}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "8px",
                    }}
                  >
                    <h3
                      style={{
                        fontSize: "15px",
                        fontWeight: 600,
                        color: "var(--text)",
                        lineHeight: 1.3,
                      }}
                    >
                      {event.title}
                    </h3>
                    <span
                      style={{
                        fontSize: "14px",
                        color: "var(--text-3)",
                        flexShrink: 0,
                        marginTop: "1px",
                      }}
                    >
                      {isExpanded ? "−" : "+"}
                    </span>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ marginTop: "12px" }} className="animate-fade-up">
                    <p
                      style={{
                        fontSize: "13px",
                        lineHeight: 1.7,
                        color: "var(--text-2)",
                        marginBottom: "12px",
                      }}
                    >
                      {event.description}
                    </p>

                    {event.consequences && (
                      <div
                        style={{
                          padding: "10px 12px",
                          background: "var(--bg-2)",
                          borderRadius: "8px",
                          marginBottom: "12px",
                          borderLeft: `2px solid ${color}`,
                        }}
                      >
                        <div
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            color: "var(--text-3)",
                            textTransform: "uppercase",
                            letterSpacing: "0.07em",
                            marginBottom: "5px",
                          }}
                        >
                          Why It Still Matters
                        </div>
                        <p
                          style={{
                            fontSize: "13px",
                            lineHeight: 1.65,
                            color: "var(--text-2)",
                          }}
                        >
                          {event.consequences}
                        </p>
                      </div>
                    )}

                    {event.actors?.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "5px",
                          marginBottom: "12px",
                        }}
                      >
                        {event.actors.map((actor) => (
                          <span
                            key={actor}
                            style={{
                              fontSize: "11px",
                              color: "var(--text-3)",
                              background: "var(--bg-3)",
                              borderRadius: "10px",
                              padding: "2px 8px",
                              border: "1px solid var(--border-subtle)",
                            }}
                          >
                            {actor}
                          </span>
                        ))}
                      </div>
                    )}

                    <button
                      onClick={() =>
                        onAskProfessor(
                          `Tell me about the ${event.title} of ${event.year} and its relevance to today's Middle East`
                        )
                      }
                      style={{
                        fontSize: "12px",
                        color: "var(--gold)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      Ask Professor about this event →
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
