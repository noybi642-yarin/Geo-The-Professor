"use client";

import { useState } from "react";
import type { TabId } from "@/types";
import SideNav from "@/components/ui/SideNav";
import BottomNav from "@/components/ui/BottomNav";
import TopBar from "@/components/ui/TopBar";
import BriefScreen from "@/components/brief/BriefScreen";
import ChatScreen from "@/components/chat/ChatScreen";
import TimelineScreen from "@/components/timeline/TimelineScreen";
import LearnScreen from "@/components/learn/LearnScreen";

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("brief");
  const [pendingChatQuestion, setPendingChatQuestion] = useState<string | null>(null);

  function handleAskProfessor(question: string) {
    setPendingChatQuestion(question);
    setActiveTab("chat");
  }

  return (
    <div className="app-shell">
      {/* Desktop sidebar (hidden on mobile via CSS) */}
      <SideNav activeTab={activeTab} onChange={setActiveTab} />

      {/* Main content area */}
      <div className="app-main">
        {/* Mobile top bar (hidden on desktop via CSS) */}
        <div className="app-topbar">
          <TopBar />
        </div>

        {/* Screen content */}
        <div className="app-screens">
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

        {/* Mobile bottom nav (hidden on desktop via CSS) */}
        <div className="app-bottomnav">
          <BottomNav activeTab={activeTab} onChange={setActiveTab} />
        </div>
      </div>
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
