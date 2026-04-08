"use client";

import { useState } from "react";
import BottomNav from "@/components/ui/BottomNav";
import TopBar from "@/components/ui/TopBar";
import BriefScreen from "@/components/brief/BriefScreen";
import ChatScreen from "@/components/chat/ChatScreen";
import TimelineScreen from "@/components/timeline/TimelineScreen";
import LearnScreen from "@/components/learn/LearnScreen";

export type TabId = "brief" | "chat" | "timeline" | "learn";

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("brief");
  const [pendingChatQuestion, setPendingChatQuestion] = useState<string | null>(null);

  function handleAskProfessor(question: string) {
    setPendingChatQuestion(question);
    setActiveTab("chat");
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        maxWidth: "430px",
        margin: "0 auto",
        background: "var(--bg)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <TopBar />

      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        <ScreenWrapper active={activeTab === "brief"}>
          <BriefScreen onAskProfessor={handleAskProfessor} />
        </ScreenWrapper>
        <ScreenWrapper active={activeTab === "chat"}>
          <ChatScreen
            pendingQuestion={pendingChatQuestion}
            onQuestionSent={() => setPendingChatQuestion(null)}
          />
        </ScreenWrapper>
        <ScreenWrapper active={activeTab === "timeline"}>
          <TimelineScreen onAskProfessor={handleAskProfessor} />
        </ScreenWrapper>
        <ScreenWrapper active={activeTab === "learn"}>
          <LearnScreen onAskProfessor={handleAskProfessor} />
        </ScreenWrapper>
      </div>

      <BottomNav activeTab={activeTab} onChange={setActiveTab} />
    </div>
  );
}

function ScreenWrapper({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflowY: "auto",
        paddingBottom: "0",
        opacity: active ? 1 : 0,
        pointerEvents: active ? "all" : "none",
        transform: active ? "translateX(0)" : "translateX(20px)",
        transition: "opacity 0.25s ease, transform 0.25s ease",
      }}
    >
      {children}
    </div>
  );
}
