"use client";

import { useState } from "react";
import { MODULES, QUIZ_QUESTIONS } from "@/data/quiz";
import { useUserProgress } from "@/hooks/useUserProgress";
import type { QuizQuestion } from "@/types";

const COLOR_MAP: Record<string, string> = {
  gold: "var(--gold)",
  teal: "var(--teal)",
  blue: "var(--blue)",
  purple: "var(--purple)",
};

interface QuizState {
  questions: Omit<QuizQuestion, "id">[];
  current: number;
  selected: number | null;
  result: {
    correct: boolean;
    explanation: string;
    correct_index: number;
    xp_earned: number;
  } | null;
  score: number;
  done: boolean;
}

export default function LearnScreen({
  onAskProfessor,
}: {
  onAskProfessor: (q: string) => void;
}) {
  const { xp, addXP } = useUserProgress();
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [quizState, setQuizState] = useState<QuizState | null>(null);

  function startQuiz(moduleId: string) {
    const questions = QUIZ_QUESTIONS.filter((q) => q.module_id === moduleId);
    setActiveModule(moduleId);
    setQuizState({
      questions,
      current: 0,
      selected: null,
      result: null,
      score: 0,
      done: false,
    });
  }

  async function submitAnswer(selectedIndex: number) {
    if (!quizState || quizState.result !== null) return;

    const q = quizState.questions[quizState.current];
    setQuizState((prev) => (prev ? { ...prev, selected: selectedIndex } : null));

    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question_text: q.question,
          selected_index: selectedIndex,
          module_id: q.module_id,
        }),
      });
      const data = await res.json();

      if (data.correct && data.xp_earned) {
        addXP(data.xp_earned);
      }

      setQuizState((prev) =>
        prev
          ? {
              ...prev,
              result: data,
              score: prev.score + (data.correct ? 1 : 0),
            }
          : null
      );
    } catch {
      console.error("Quiz submission failed");
    }
  }

  function nextQuestion() {
    if (!quizState) return;
    if (quizState.current + 1 >= quizState.questions.length) {
      setQuizState((prev) => (prev ? { ...prev, done: true } : null));
    } else {
      setQuizState((prev) =>
        prev
          ? {
              ...prev,
              current: prev.current + 1,
              selected: null,
              result: null,
            }
          : null
      );
    }
  }

  function exitQuiz() {
    setQuizState(null);
    setActiveModule(null);
  }

  // Quiz done screen
  if (quizState?.done) {
    const total = quizState.questions.length;
    const score = quizState.score;
    return (
      <div
        style={{
          padding: "32px 20px",
          textAlign: "center",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ fontSize: "52px", marginBottom: "16px" }}>
          {score === total ? "🏆" : score >= total / 2 ? "🎓" : "📖"}
        </div>
        <h2
          className="font-display"
          style={{
            fontSize: "26px",
            fontWeight: 700,
            color: "var(--text)",
            marginBottom: "8px",
          }}
        >
          {score}/{total} Correct
        </h2>
        <p style={{ fontSize: "14px", color: "var(--text-2)", marginBottom: "28px" }}>
          +{score * 20} XP earned
        </p>
        <button
          onClick={exitQuiz}
          style={{
            background: "var(--gold)",
            color: "#000",
            border: "none",
            borderRadius: "10px",
            padding: "14px 28px",
            fontSize: "15px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Back to Modules
        </button>
      </div>
    );
  }

  // Quiz question screen
  if (quizState && activeModule) {
    const q = quizState.questions[quizState.current];
    const total = quizState.questions.length;

    return (
      <div
        style={{
          padding: "16px",
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <button
            onClick={exitQuiz}
            style={{
              fontSize: "13px",
              color: "var(--text-3)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            ← Back
          </button>
          <span style={{ fontSize: "13px", color: "var(--text-3)" }}>
            {quizState.current + 1} / {total}
          </span>
        </div>

        {/* Progress bar */}
        <div
          style={{
            height: "3px",
            background: "var(--bg-3)",
            borderRadius: "2px",
            marginBottom: "24px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${((quizState.current + 1) / total) * 100}%`,
              background: "var(--gold)",
              borderRadius: "2px",
              transition: "width 0.3s ease",
            }}
          />
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {/* Question */}
          <h3
            style={{
              fontSize: "17px",
              fontWeight: 600,
              color: "var(--text)",
              lineHeight: 1.5,
              marginBottom: "24px",
            }}
          >
            {q.question}
          </h3>

          {/* Options */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {q.options.map((option, i) => {
              let bg = "var(--bg-2)";
              let borderColor = "var(--border)";
              let color = "var(--text)";

              if (quizState.result) {
                if (i === quizState.result.correct_index) {
                  bg = "rgba(61, 214, 192, 0.12)";
                  borderColor = "var(--teal)";
                  color = "var(--teal)";
                } else if (
                  i === quizState.selected &&
                  !quizState.result.correct
                ) {
                  bg = "rgba(224, 90, 78, 0.12)";
                  borderColor = "var(--danger)";
                  color = "var(--danger)";
                }
              } else if (quizState.selected === i) {
                bg = "rgba(201, 168, 76, 0.1)";
                borderColor = "var(--gold)";
              }

              return (
                <button
                  key={i}
                  onClick={() => submitAnswer(i)}
                  disabled={quizState.result !== null}
                  style={{
                    padding: "13px 16px",
                    background: bg,
                    border: `1px solid ${borderColor}`,
                    borderRadius: "10px",
                    color,
                    fontSize: "14px",
                    textAlign: "left",
                    cursor: quizState.result !== null ? "default" : "pointer",
                    transition: "all 0.2s",
                    display: "flex",
                    gap: "10px",
                    alignItems: "flex-start",
                  }}
                >
                  <span
                    style={{
                      fontWeight: 700,
                      color: "var(--text-3)",
                      flexShrink: 0,
                      minWidth: "16px",
                    }}
                  >
                    {String.fromCharCode(65 + i)}.
                  </span>
                  <span>{option}</span>
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {quizState.result && (
            <div
              style={{
                marginTop: "16px",
                padding: "14px 16px",
                background: "var(--bg-2)",
                borderRadius: "10px",
                border: "1px solid var(--border-subtle)",
              }}
              className="animate-fade-up"
            >
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  marginBottom: "8px",
                  color: quizState.result.correct
                    ? "var(--teal)"
                    : "var(--danger)",
                }}
              >
                {quizState.result.correct ? "✓ Correct!" : "✗ Not quite"}
              </div>
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--text-2)",
                  lineHeight: 1.7,
                }}
                dangerouslySetInnerHTML={{
                  __html: quizState.result.explanation.replace(
                    /\*\*([^*]+)\*\*/g,
                    "<strong>$1</strong>"
                  ),
                }}
              />
              <button
                onClick={() =>
                  onAskProfessor(
                    `I just learned about: "${q.question}". Can you give me deeper context on this topic?`
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
            </div>
          )}
        </div>

        {quizState.result && (
          <button
            onClick={nextQuestion}
            style={{
              background: "var(--gold)",
              color: "#000",
              border: "none",
              borderRadius: "10px",
              padding: "14px",
              fontSize: "15px",
              fontWeight: 700,
              cursor: "pointer",
              width: "100%",
              marginTop: "16px",
              flexShrink: 0,
            }}
          >
            {quizState.current + 1 >= total ? "See Results" : "Next Question"}
          </button>
        )}
      </div>
    );
  }

  // Module list
  return (
    <div style={{ padding: "20px 16px 32px", overflowY: "auto", height: "100%" }}>
      {/* XP display */}
      <div
        style={{
          marginBottom: "20px",
          padding: "14px 16px",
          background: "var(--bg-2)",
          borderRadius: "12px",
          border: "1px solid var(--border-subtle)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "11px",
              color: "var(--text-3)",
              textTransform: "uppercase",
              fontWeight: 700,
              letterSpacing: "0.07em",
              marginBottom: "4px",
            }}
          >
            Your Progress
          </div>
          <div
            style={{
              fontSize: "24px",
              fontWeight: 700,
              color: "var(--gold)",
              lineHeight: 1,
            }}
          >
            {xp} XP
          </div>
        </div>
        <div style={{ fontSize: "30px" }}>🏆</div>
      </div>

      <h2
        className="font-display"
        style={{
          fontSize: "18px",
          fontWeight: 700,
          color: "var(--text)",
          marginBottom: "14px",
        }}
      >
        Modules
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {MODULES.map((module) => {
          const color = COLOR_MAP[module.color] || "var(--gold)";
          const isLocked = module.locked;

          return (
            <div
              key={module.id}
              onClick={() => !isLocked && startQuiz(module.id)}
              style={{
                padding: "14px 16px",
                background: "var(--bg-2)",
                border: `1px solid ${isLocked ? "var(--border-subtle)" : "var(--border)"}`,
                borderRadius: "12px",
                cursor: isLocked ? "default" : "pointer",
                opacity: isLocked ? 0.5 : 1,
                display: "flex",
                gap: "14px",
                alignItems: "flex-start",
                transition: "border-color 0.2s",
              }}
            >
              <div
                style={{
                  fontSize: "26px",
                  width: "44px",
                  height: "44px",
                  background: "var(--bg-3)",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {module.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: "15px",
                    fontWeight: 600,
                    color: isLocked ? "var(--text-3)" : "var(--text)",
                    lineHeight: 1.3,
                    marginBottom: "4px",
                  }}
                >
                  {module.title}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--text-3)",
                    lineHeight: 1.5,
                    marginBottom: "8px",
                  }}
                >
                  {module.description}
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    fontSize: "12px",
                    color: "var(--text-3)",
                  }}
                >
                  <span>{module.lesson_count} lessons</span>
                  <span style={{ color: isLocked ? "var(--text-3)" : color }}>
                    {isLocked ? "🔒 Locked" : `+${module.xp_reward} XP`}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
