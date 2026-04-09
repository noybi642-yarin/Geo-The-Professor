// Dedicated cron endpoint — called by Vercel cron at 6am UTC daily
// Generates today's brief and sends push notifications to subscribers.
import { NextRequest, NextResponse } from "next/server";
import { getAnthropicClient, CLAUDE_MODEL } from "@/lib/anthropic";
import { DAILY_BRIEF_PROMPT } from "@/lib/prompts";
import { createAdminClient } from "@/lib/supabase/server";
import { sendDailyBriefNotification } from "@/lib/webpush";
import { format } from "date-fns";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  // Verify Vercel cron authorization
  // Vercel automatically adds: Authorization: Bearer <CRON_SECRET>
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = format(new Date(), "yyyy-MM-dd");
    const supabase = createAdminClient();

    // Generate fresh brief for today
    const brief = await generateDailyBrief();

    // Upsert — create or replace today's brief
    const { data, error } = await supabase
      .from("daily_briefs")
      .upsert({ ...brief, date: today }, { onConflict: "date" })
      .select()
      .single();

    if (error) {
      console.error("Failed to save brief:", error);
    }

    const savedBrief = data || brief;

    // Send push notifications (non-blocking)
    sendDailyBriefNotification(savedBrief.headline).catch(console.error);

    return NextResponse.json({
      success: true,
      date: today,
      headline: savedBrief.headline,
    });
  } catch (error) {
    console.error("Cron daily brief error:", error);
    return NextResponse.json({ error: "Failed to generate brief" }, { status: 500 });
  }
}

async function generateDailyBrief() {
  const newsItems = await fetchMiddleEastNews();
  const anthropic = getAnthropicClient();

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 2000,
    messages: [{ role: "user", content: DAILY_BRIEF_PROMPT(newsItems) }],
  });

  const raw = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");

  const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  try {
    return JSON.parse(clean);
  } catch {
    return getFallbackBrief();
  }
}

async function fetchMiddleEastNews(): Promise<string> {
  const NEWS_API_KEY = process.env.NEWS_API_KEY;
  if (!NEWS_API_KEY) {
    return "No live news available. Generate a comprehensive brief based on current Middle East developments.";
  }
  try {
    const res = await fetch(
      `https://newsapi.org/v2/everything?q=Middle+East+Israel+Palestine+Iran+Gaza&language=en&sortBy=publishedAt&pageSize=10&apiKey=${NEWS_API_KEY}`
    );
    const data = await res.json();
    if (!data.articles?.length) return "No recent articles found.";
    return data.articles
      .slice(0, 8)
      .map(
        (a: { title: string; description?: string; source?: { name: string } }) =>
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
    tags: [{ label: "Conflict", type: "war" }, { label: "Diplomacy", type: "diplo" }],
    sections: [
      { type: "what", title: "What Happened Today", content: "Diplomatic channels remain active across multiple tracks." },
      { type: "why", title: "Why It Matters", content: "The regional order is under stress from multiple simultaneous crises." },
      { type: "context", title: "Historical Context", content: "The current situation reflects unresolved tensions dating back decades." },
      { type: "scenarios", title: "Possible Scenarios", content: "Multiple paths forward remain plausible.",
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
