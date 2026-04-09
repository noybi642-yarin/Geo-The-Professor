import { NextRequest, NextResponse } from "next/server";
import { getAnthropicClient, CLAUDE_MODEL } from "@/lib/anthropic";
import { NEWS_ANALYSIS_PROMPT } from "@/lib/prompts";
import { z } from "zod";

const RequestSchema = z.object({
  headline: z.string().min(5).max(2000),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { headline } = RequestSchema.parse(body);

    const anthropic = getAnthropicClient();

    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 600,
      messages: [
        {
          role: "user",
          content: NEWS_ANALYSIS_PROMPT(headline),
        },
      ],
    });

    const raw = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    // Strip possible markdown fences
    const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI response", raw: clean },
        { status: 500 }
      );
    }

    // Validate and sanitize
    return NextResponse.json({
      headline,
      hidden_context: parsed.hidden_context || "",
      framing_bias: parsed.framing_bias || "",
      bias_score: Math.max(0, Math.min(100, Number(parsed.bias_score) || 50)),
      long_term_implications: parsed.long_term_implications || "",
      key_actors: Array.isArray(parsed.key_actors) ? parsed.key_actors : [],
      related_history: parsed.related_history || "",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    console.error("Analyze news error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
