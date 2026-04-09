import type { Module, QuizQuestion } from "@/types";

export const MODULES: Module[] = [
  {
    id: "conflict-101",
    title: "The Israeli-Palestinian Conflict in 5 Steps",
    description:
      "From Balfour to October 7 — the essential arc, stripped of propaganda.",
    icon: "🗺",
    color: "gold",
    lesson_count: 5,
    xp_reward: 150,
    locked: false,
  },
  {
    id: "players",
    title: "Who Are the Main Players?",
    description:
      "Israel, Palestine, Iran, Saudi, Turkey, US, Russia — their goals, fears, and red lines.",
    icon: "🎭",
    color: "teal",
    lesson_count: 7,
    xp_reward: 200,
    locked: false,
  },
  {
    id: "iran-strategy",
    title: "Iran's Strategic Logic",
    description:
      "Why Tehran does what it does — ideology, interests, and the nuclear calculation.",
    icon: "☪",
    color: "blue",
    lesson_count: 6,
    xp_reward: 175,
    locked: false,
  },
  {
    id: "arab-spring",
    title: "The Arab Spring & Its Aftermath",
    description:
      "Why revolutions failed and what they left behind.",
    icon: "🏛",
    color: "purple",
    lesson_count: 8,
    xp_reward: 250,
    locked: true,
    unlock_requires: ["conflict-101", "players"],
  },
  {
    id: "us-middle-east",
    title: "America in the Middle East",
    description:
      "Oil, Israel, terrorism — 80 years of intervention and its consequences.",
    icon: "🦅",
    color: "gold",
    lesson_count: 6,
    xp_reward: 200,
    locked: true,
    unlock_requires: ["conflict-101"],
  },
];

export const QUIZ_QUESTIONS: Omit<QuizQuestion, "id">[] = [
  // conflict-101 module
  {
    module_id: "conflict-101",
    question:
      "The 1948 war is called al-Nakba by Palestinians. What does al-Nakba mean?",
    options: ["The Revolution", "The Catastrophe", "The Beginning", "The Resistance"],
    correct_index: 1,
    explanation:
      "**Al-Nakba** (النكبة) means 'The Catastrophe.' It refers to the displacement of approximately 700,000 Palestinians during the 1948 war — an event central to Palestinian national identity and, critically, still politically unresolved. The right of return for refugees remains one of the hardest issues in any negotiation.",
    difficulty: "easy",
  },
  {
    module_id: "conflict-101",
    question:
      "The Oslo Accords (1993) established which governing body for Palestinians?",
    options: [
      "Hamas",
      "The Arab League",
      "The Palestinian Authority",
      "The PLO Executive Committee",
    ],
    correct_index: 2,
    explanation:
      "Oslo created the **Palestinian Authority (PA)** as a transitional self-governing body. Critically, it deferred final status issues — borders, Jerusalem, refugees — without resolving them. This structural delay, combined with continued settlement expansion, is widely seen as Oslo's fatal flaw.",
    difficulty: "easy",
  },
  {
    module_id: "conflict-101",
    question:
      "What did Israel capture in the 1967 Six-Day War that remains contested today?",
    options: [
      "Sinai Peninsula only",
      "The Suez Canal",
      "West Bank, Gaza, Golan Heights, and Sinai",
      "Lebanon",
    ],
    correct_index: 2,
    explanation:
      "In six days, Israel captured **Sinai** (returned to Egypt in 1982), **Gaza**, the **West Bank**, and the **Golan Heights**. This created the occupation framework that defines the conflict today. UN Resolution 242's demand to withdraw from 'occupied territories' is still contested — partly because the English text lacks a definite article.",
    difficulty: "medium",
  },
  {
    module_id: "conflict-101",
    question:
      "Which event directly led to the 1973 Arab oil embargo against Western nations?",
    options: [
      "Camp David Accords",
      "US military arms airlift to Israel during the Yom Kippur War",
      "Israeli settlement expansion",
      "PLO attacks in Europe",
    ],
    correct_index: 1,
    explanation:
      "OPEC's Arab members imposed an oil embargo after the **US airlifted weapons to Israel** during the Yom Kippur War. This quadrupled oil prices globally, demonstrating for the first time that oil could be used as geopolitical leverage. The economic shock reshaped global energy policy and accelerated the search for alternatives to Arab oil.",
    difficulty: "medium",
  },
  {
    module_id: "conflict-101",
    question:
      "The 2020 Abraham Accords normalized relations between Israel and which countries?",
    options: [
      "Saudi Arabia and Iran",
      "UAE, Bahrain, Sudan, and Morocco",
      "Egypt and Jordan (renewed)",
      "Turkey and Qatar",
    ],
    correct_index: 1,
    explanation:
      "The **Abraham Accords** brought UAE, Bahrain, Sudan, and Morocco into normalization with Israel — but crucially without any Palestinian concessions. This marked a strategic realignment: Arab governments choosing anti-Iran security cooperation over Palestinian solidarity. Saudi normalization appeared next but was derailed by October 7, 2023.",
    difficulty: "medium",
  },

  // players module
  {
    module_id: "players",
    question:
      "Iran's support for Hamas, Hezbollah, and the Houthis is part of what strategic concept?",
    options: [
      "The Green Crescent",
      "The Axis of Resistance",
      "The Islamic Alliance",
      "Pan-Arab Unity",
    ],
    correct_index: 1,
    explanation:
      "Tehran calls this network the **Axis of Resistance** (محور المقاومة). It's Iran's strategy of projecting power through proxy forces — keeping adversaries busy on multiple fronts without direct confrontation. The strategic logic: if Israel or the US attacks Iran, they face retaliation from multiple directions simultaneously.",
    difficulty: "medium",
  },
  {
    module_id: "players",
    question: "Which country controls the Strait of Hormuz — through which 20% of global oil passes?",
    options: ["Saudi Arabia", "UAE", "Iran", "Oman"],
    correct_index: 2,
    explanation:
      "**Iran** controls the northern shore of the Strait of Hormuz, giving it the ability to threaten closure in any military confrontation. This geographic fact is central to Iran's deterrence strategy — the threat of disrupting global oil markets is a powerful card that constrains how aggressively adversaries can act.",
    difficulty: "easy",
  },
  {
    module_id: "players",
    question: "Saudi Arabia and Iran represent a rivalry along what primary fault line?",
    options: [
      "Democratic vs authoritarian governance",
      "Sunni vs Shia Islam and regional hegemony",
      "Oil-rich vs oil-poor states",
      "Pro-Western vs anti-Western alignment",
    ],
    correct_index: 1,
    explanation:
      "The Saudi-Iran rivalry operates on **Sunni-Shia religious lines** and competition for regional hegemony — but religion is as much instrument as cause. Both states fund proxies, support competing factions, and frame conflicts in sectarian terms when it serves their interests. The 2023 China-brokered Saudi-Iran normalization deal introduced a new variable.",
    difficulty: "medium",
  },

  // iran-strategy module
  {
    module_id: "iran-strategy",
    question:
      "Iran's 1979 revolution transformed foreign policy 180 degrees. What was the Shah's foreign policy orientation?",
    options: [
      "Strongly anti-Western and Islamist",
      "Pro-Soviet and socialist",
      "Pro-US and secular modernizing",
      "Pan-Arab nationalist",
    ],
    correct_index: 2,
    explanation:
      "The Shah maintained close ties with the **US and Israel**, allowing American military bases and intelligence cooperation. The revolution's complete reversal — 'Death to America, Death to Israel' — was a fundamental shock to regional security architecture that the US still hasn't fully processed. Iran went from pillar of US strategy to its primary adversary.",
    difficulty: "easy",
  },
  {
    module_id: "iran-strategy",
    question:
      "Why did Iran invest heavily in developing long-range ballistic missiles?",
    options: [
      "To threaten Europe and extract economic concessions",
      "As a deterrent given its lack of a modern air force",
      "To export to allies for profit",
      "To comply with UN resolutions on conventional forces",
    ],
    correct_index: 1,
    explanation:
      "After the 1980-88 Iran-Iraq War, Iran's air force was decimated and it couldn't rebuild due to sanctions. **Ballistic missiles** became the asymmetric answer: cheap to produce domestically, impossible to sanction away, and capable of reaching Israel, US bases, and Gulf capitals. This is deterrence through precision threat rather than military parity.",
    difficulty: "hard",
  },
];
