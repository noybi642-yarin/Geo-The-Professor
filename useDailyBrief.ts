# GeoProfessor: Middle East

> An AI-powered "Professor of Middle East Geopolitics" — educational, addictive, and built for production.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                      Next.js 14 App                      │
│                    (App Router + RSC)                    │
├──────────────┬──────────────┬──────────────┬────────────┤
│  Daily Brief │  Chat/Prof.  │  Timeline    │   Learn    │
│  (SSR+ISR)   │  (Client)    │  (Static)    │  (Client)  │
├──────────────┴──────────────┴──────────────┴────────────┤
│                    API Routes (Edge)                     │
│  /api/chat  /api/analyze-news  /api/daily-brief          │
│  /api/quiz                                               │
├─────────────────────────────────────────────────────────┤
│              Anthropic Claude API (claude-sonnet)        │
├─────────────────────────────────────────────────────────┤
│                   Supabase (Postgres)                    │
│  daily_briefs | timeline_events | modules | quiz         │
│  lessons | user_progress | chat_sessions                │
└─────────────────────────────────────────────────────────┘
```

---

## Folder Structure

```
geoprofessor/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Fonts, metadata, viewport
│   │   ├── page.tsx                # App shell + tab routing
│   │   ├── globals.css             # CSS variables, animations
│   │   └── api/
│   │       ├── chat/route.ts       # Professor chat (streaming-ready)
│   │       ├── analyze-news/route.ts  # News analysis endpoint
│   │       ├── daily-brief/route.ts   # Brief CRUD + generation
│   │       └── quiz/route.ts       # Quiz questions + answer validation
│   ├── components/
│   │   ├── ui/
│   │   │   ├── TopBar.tsx
│   │   │   ├── BottomNav.tsx
│   │   │   ├── Tag.tsx
│   │   │   └── ActorChips.tsx
│   │   ├── brief/
│   │   │   └── BriefScreen.tsx     # Daily brief + news analyzer
│   │   ├── chat/
│   │   │   └── ChatScreen.tsx      # Professor chat interface
│   │   ├── timeline/
│   │   │   └── TimelineScreen.tsx  # Interactive timeline
│   │   └── learn/
│   │       └── LearnScreen.tsx     # Modules + quiz overlay
│   ├── data/
│   │   ├── timeline.ts             # 18 key events (1917–2023)
│   │   └── quiz.ts                 # Modules + 10 quiz questions
│   ├── hooks/
│   │   ├── useChat.ts
│   │   ├── useDailyBrief.ts
│   │   └── useUserProgress.ts      # XP system with localStorage
│   ├── lib/
│   │   ├── anthropic.ts            # Claude client singleton
│   │   ├── prompts.ts              # All AI prompts
│   │   └── supabase/
│   │       ├── client.ts           # Browser client
│   │       ├── server.ts           # Server + admin clients
│   │       └── schema.sql          # Full DB schema + RLS
│   └── types/
│       └── index.ts                # All TypeScript types
├── vercel.json                     # Cron job config
├── .env.local.example              # Env vars template
├── next.config.mjs
├── tailwind.config.ts
└── package.json
```

---

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/yourname/geoprofessor.git
cd geoprofessor
npm install
```

### 2. Set up environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
ANTHROPIC_API_KEY=sk-ant-...          # From console.anthropic.com
NEXT_PUBLIC_SUPABASE_URL=...          # From Supabase project settings
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEWS_API_KEY=...                       # Optional: from newsapi.org
CRON_SECRET=your-random-secret-here
```

### 3. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run `src/lib/supabase/schema.sql`
3. Copy your project URL and keys to `.env.local`

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deployment to Vercel

### One-command deploy

```bash
npm install -g vercel
vercel --prod
```

### Environment Variables on Vercel

Go to **Vercel Dashboard → Project → Settings → Environment Variables** and add:

| Variable | Value |
|----------|-------|
| `ANTHROPIC_API_KEY` | Your Anthropic key |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service role key |
| `NEWS_API_KEY` | Optional news API key |
| `CRON_SECRET` | Random string for cron auth |

### Cron Job (Daily Brief)

The `vercel.json` configures a cron that hits `/api/daily-brief` every day at 6am UTC to pre-generate the daily brief. On Vercel Pro, this runs automatically.

To manually trigger:
```bash
curl -X POST https://your-app.vercel.app/api/daily-brief \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## AI Prompt Design

### Professor Persona (`src/lib/prompts.ts`)

The `PROFESSOR_SYSTEM_PROMPT` defines Prof. Al-Rashid with:
- **Sharp analytical voice** — not neutral, not propaganda
- **Multi-perspective requirement** — always surfaces Israeli, Palestinian, Iranian, US views
- **Facts vs interpretations** — explicit flagging of contested claims
- **Historical anchoring** — connects current events to specific precedents
- **150-250 word target** — concise but substantive

### News Analysis (`NEWS_ANALYSIS_PROMPT`)

Returns structured JSON with:
- `hidden_context` — what readers don't know
- `framing_bias` — rhetorical analysis
- `bias_score` — 0-100 numeric scale
- `long_term_implications` — 6-24 month outlook

### Daily Brief (`DAILY_BRIEF_PROMPT`)

Generates a 4-section brief (What/Why/Context/Scenarios) from live news headlines, always connecting current events to historical context.

---

## Extending the App

### Add more timeline events

Edit `src/data/timeline.ts` — each event needs:
```typescript
{
  year: 1990,
  title: "Event name",
  type: "war" | "diplo" | "political" | "conflict",
  era: "founding" | "wars" | "oslo" | "modern",
  description: "...",
  actors: ["Actor1", "Actor2"],
  consequences: "...",
  related_events: ["Related 1", "Related 2"],
}
```

### Add quiz questions

Edit `src/data/quiz.ts`:
```typescript
{
  module_id: "your-module-id",
  question: "Question text?",
  options: ["A", "B", "C", "D"],
  correct_index: 1,
  explanation: "**Bold terms** for key concepts. 2-3 sentences.",
  difficulty: "easy" | "medium" | "hard",
}
```

### Add streaming to chat

The `/api/chat` route can be upgraded to streaming by switching to `anthropic.messages.stream()` and returning a `ReadableStream`. The `ChatScreen.tsx` component would then consume the stream and update the message in real-time.

---

## Data Flow

```
User asks question
       │
       ▼
ChatScreen.tsx
  → POST /api/chat
       │
       ▼
PROFESSOR_SYSTEM_PROMPT + conversation history
  → Anthropic Claude API
       │
       ▼
Formatted response with **bold**, *italic*
  → Rendered in chat bubble
  → Perspective tabs for drill-down
```

```
Cron / User visits app
       │
       ▼
GET /api/daily-brief
  → Check Supabase for today's brief
  → If missing: fetch NewsAPI headlines
  → DAILY_BRIEF_PROMPT → Claude
  → Parse JSON → Save to Supabase
  → Return to client
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS + CSS Variables |
| AI | Anthropic Claude (claude-sonnet) |
| Database | Supabase (Postgres + RLS) |
| Auth | Supabase Auth (anonymous + email) |
| Deployment | Vercel (Edge Functions + Cron) |
| News | NewsAPI.org |
| Type safety | TypeScript + Zod |

---

## Roadmap (Post-MVP)

- [ ] **Streaming chat** — token-by-token response rendering
- [ ] **Auth + sync** — progress saved to Supabase across devices
- [ ] **Push notifications** — daily brief alert
- [ ] **Audio mode** — text-to-speech for the Professor
- [ ] **Map integration** — interactive geopolitical map
- [ ] **Share cards** — shareable Professor quotes
- [ ] **Search** — semantic search across timeline + briefs
- [ ] **Offline mode** — PWA with cached timeline data
- [ ] **More regions** — Gulf states deep-dive, North Africa module
- [ ] **Admin panel** — edit briefs and timeline via Supabase Studio
