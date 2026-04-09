"use client";

import { useState, useEffect, useRef } from "react";
import { useChat } from "@/hooks/useChat";
import { useLang } from "@/lib/LangContext";

const SUGGESTED_QUESTIONS = [
  "Why does Iran support Hamas and Hezbollah?",
  "What caused the 1948 Arab-Israeli War?",
  "Explain the Abraham Accords and why they matter.",
];

export default function ChatScreen({
  pendingQuestion,
  onQuestionSent,
}: {
  pendingQuestion: string | null;
  onQuestionSent: () => void;
}) {
  const { messages, loading, sendMessage } = useChat();
  const { lang } = useLang();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (pendingQuestion) {
      sendMessage(pendingQuestion, lang);
      onQuestionSent();
    }
  }, [pendingQuestion]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSend() {
    if (!input.trim() || loading) return;
    const text = input;
    setInput("");
    await sendMessage(text, lang);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Messages area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px",
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              textAlign: "center",
              paddingTop: "32px",
              paddingBottom: "16px",
            }}
          >
            <div style={{ fontSize: "40px", marginBottom: "10px" }}>👨‍🏫</div>
            <div
              className="font-display text-gold-gradient"
              style={{ fontSize: "20px", fontWeight: 700, marginBottom: "6px" }}
            >
              Prof. Al-Rashid
            </div>
            <div
              style={{
                fontSize: "13px",
                color: "var(--text-3)",
                lineHeight: 1.6,
                maxWidth: "270px",
                margin: "0 auto 24px",
              }}
            >
              {lang === "he"
                ? "שאל אותי כל שאלה על גיאופוליטיקה של המזרח התיכון. אתן לך הקשר שרוב המדיה לא מספקת."
                : "Ask me anything about Middle East geopolitics. I'll give you the context most media doesn't."}
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                alignItems: "flex-start",
                maxWidth: "300px",
                margin: "0 auto",
              }}
            >
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q, lang)}
                  style={{
                    fontSize: "13px",
                    color: "var(--text-2)",
                    background: "var(--bg-2)",
                    border: "1px solid var(--border)",
                    borderRadius: "20px",
                    padding: "9px 16px",
                    cursor: "pointer",
                    textAlign: "left",
                    lineHeight: 1.4,
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              marginBottom: "16px",
              display: "flex",
              flexDirection: msg.role === "user" ? "row-reverse" : "row",
              gap: "8px",
              alignItems: "flex-end",
            }}
          >
            {msg.role === "assistant" && (
              <div
                style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "50%",
                  background: "var(--bg-3)",
                  border: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "15px",
                  flexShrink: 0,
                }}
              >
                👨‍🏫
              </div>
            )}
            <div
              style={{
                maxWidth: "78%",
                padding: "11px 14px",
                borderRadius:
                  msg.role === "user"
                    ? "16px 4px 16px 16px"
                    : "4px 16px 16px 16px",
                background:
                  msg.role === "user" ? "var(--gold)" : "var(--bg-2)",
                color: msg.role === "user" ? "#000" : "var(--text)",
                fontSize: "14px",
                lineHeight: 1.65,
              }}
            >
              <MessageContent content={msg.content} />
            </div>
          </div>
        ))}

        {loading && (
          <div
            style={{
              display: "flex",
              gap: "8px",
              alignItems: "flex-end",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "50%",
                background: "var(--bg-3)",
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "15px",
              }}
            >
              👨‍🏫
            </div>
            <div
              style={{
                padding: "14px 16px",
                background: "var(--bg-2)",
                borderRadius: "4px 16px 16px 16px",
                display: "flex",
                gap: "4px",
                alignItems: "center",
              }}
            >
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: "var(--text-3)",
                    animation: `bounce-dot 1s ease-in-out ${i * 0.15}s infinite`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        style={{
          padding: "10px 12px 12px",
          borderTop: "1px solid var(--border-subtle)",
          display: "flex",
          gap: "8px",
          background: "var(--bg)",
        }}
      >
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={
            lang === "he" ? "שאל את הפרופסור…" : "Ask the Professor…"
          }
          style={{
            flex: 1,
            background: "var(--bg-3)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            padding: "10px 14px",
            fontSize: "14px",
            color: "var(--text)",
            outline: "none",
          }}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          style={{
            background: "var(--gold)",
            color: "#000",
            border: "none",
            borderRadius: "10px",
            padding: "10px 16px",
            fontSize: "18px",
            fontWeight: 700,
            cursor: "pointer",
            opacity: loading || !input.trim() ? 0.4 : 1,
            transition: "opacity 0.2s",
            lineHeight: 1,
          }}
        >
          ↑
        </button>
      </div>
    </div>
  );
}

function MessageContent({ content }: { content: string }) {
  const parts = content.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i}>{part.slice(2, -2)}</strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}
