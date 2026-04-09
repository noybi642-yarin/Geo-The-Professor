export type TabId = "brief" | "chat" | "timeline" | "learn";

export interface TimelineEvent {
  id?: string;
  year: number;
  title: string;
  type: "war" | "diplo" | "political" | "conflict";
  era: "founding" | "wars" | "oslo" | "modern";
  description: string;
  actors: string[];
  consequences: string;
  related_events: string[];
}

export interface DailyBriefTag {
  label: string;
  type: string;
}

export interface DailyBriefScenario {
  probability: number;
  description: string;
  label: "high" | "mid" | "low";
}

export interface DailyBriefSection {
  type: "what" | "why" | "context" | "scenarios";
  title: string;
  content: string;
  scenarios?: DailyBriefScenario[];
}

export interface DailyBrief {
  id?: string;
  date?: string;
  headline: string;
  tags: DailyBriefTag[];
  sections: DailyBriefSection[];
  actors: string[];
}

export interface Module {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: "gold" | "teal" | "blue" | "purple";
  lesson_count: number;
  xp_reward: number;
  locked: boolean;
  unlock_requires?: string[];
}

export interface QuizQuestion {
  id?: string;
  module_id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}
