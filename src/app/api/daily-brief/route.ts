import { NextRequest, NextResponse } from "next/server";
import { getAnthropicClient, CLAUDE_MODEL } from "@/lib/anthropic";
import { DAILY_BRIEF_PROMPT } from "@/lib/prompts";
import { createAdminClient } from "@/lib/supabase/server";
import { format } from "date-fns";

// GET /api/daily-brief — returns today's brief (from DB or generates new)
export async function GET() {
  try {
    const today = format(new Date(), "yyyy-MM-dd");
    const supabase = createAdminClient();

    // Check if today's brief already exists
    const { data: existing } = await supabase
      .from("daily_briefs")
      .select("*")
      .eq("date", today)
      .single();

    if (existing) {
      return NextResponse.json(existing);
    }

    // Not found — generate one
    const brief = await generateDailyBrief();

    // Save to DB
    const { data: saved, error } = await supabase
      .from("daily_briefs")
      .insert({ ...brief, date: today })
      .select()
      .single();

    if (error) {
      console.error("Failed to save daily brief:", error);
      return NextResponse.json(brief); // return unsaved version
    }

    return NextResponse.json(saved);
  } catch (error) {
    console.error("Daily brief GET error:", error);
    return NextResponse.json({ error: "Failed to fetch daily brief" }, { status: 500 });
  }
}

// POST /api/daily-brief — force regenerate (protected by CRON_SECRET)
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = format(new Date(), "yyyy-MM-dd");
    const supabase = createAdminClient();
    const brief = await generateDailyBrief();

    // Upsert — replace today's brief if it exists
    const { data, error } = await supabase
      .from("daily_briefs")
      .upsert({ ...brief, date: today }, { onConflict: "date" })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, brief: data });
  } catch (error) {
    console.error("Daily brief generation error:", error);
    return NextResponse.json({ error: "Failed to generate brief" }, { status: 500 });
  }
}

async function generateDailyBrief() {
  // Fetch recent news about Middle East
  const newsItems = await fetchMiddleEastNews();

  const anthropic = getAnthropicClient();

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: DAILY_BRIEF_PROMPT(newsItems),
      },
    ],
  });

  const raw = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");

  const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  try {
    return JSON.parse(clean);
  } catch {
    // Fallback brief if parsing fails
    return getFallbackBrief();
  }
}

async function fetchMiddleEastNews(): Promise<string> {
  const NEWS_API_KEY = process.env.NEWS_API_KEY;

  if (!NEWS_API_KEY) {
    return "No live news available. Generate a comprehensive brief based on current knowledge of Middle East developments as of today.";
  }

  try {
    const res = await fetch(
      `https://newsapi.org/v2/everything?q=Middle+East+Israel+Palestine+Iran+Gaza&language=en&sortBy=publishedAt&pageSize=10&apiKey=${NEWS_API_KEY}`,
      { next: { revalidate: 3600 } }
    );
    const data = await res.json();
    if (!data.articles?.length) return "No recent articles found.";

    return data.articles
      .slice(0, 8)
      .map(
        (a: { title: string; description?: string; source?: { name: string }; publishedAt: string }) =>
          `[${a.source?.name || "Unknown"}] ${a.title}\n${a.description || ""}`
      )
      .join("\n\n");
  } catch {
    return "News fetch failed. Generate brief from current knowledge.";
  }
}

function getFallbackBrief() {
  return {
    headline: "Regional Dynamics Remain Volatile as Diplomatic Efforts Continue",
    tags: [
      { label: "Conflict", type: "war" },
      { label: "Diplomacy", type: "diplo" },
    ],
    sections: [
      {
        type: "what",
        title: "What Happened Today",
        content:
          "Diplomatic channels remain active across multiple tracks. Regional actors continue to position themselves ahead of any potential agreement framework.",
      },
      {
        type: "why",
        title: "Why It Matters",
        content:
          "The regional order is under stress from multiple simultaneous crises — each interconnected, none easily resolved without affecting the others.",
      },
      {
        type: "context",
        title: "Historical Context",
        content:
          "The current situation reflects unresolved tensions dating back decades, shaped by wars, failed agreements, and competing national interests.",
      },
      {
        type: "scenarios",
        title: "Possible Scenarios",
        content: "Multiple paths forward remain plausible.",
        scenarios: [
          { probability: 45, description: "Continued stalemate with periodic escalation", label: "high" },
          { probability: 35, description: "Limited tactical agreements without strategic resolution", label: "mid" },
          { probability: 20, description: "Breakthrough facilitated by external pressure", label: "low" },
        ],
      },
    ],
    actors: ["Regional powers", "US", "UN"],
  };
}
