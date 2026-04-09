import { NextRequest, NextResponse } from "next/server";
import { getAnthropicClient, CLAUDE_MODEL, MAX_TOKENS } from "@/lib/anthropic";
import { PROFESSOR_SYSTEM_PROMPT } from "@/lib/prompts";
import { z } from "zod";

const RequestSchema = z.object({
  message: z.string().min(1).max(2000),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })).max(20).default([]),
  lang: z.enum(["en", "he"]).default("en"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, history, lang } = RequestSchema.parse(body);
    const anthropic = getAnthropicClient();

    const langInstruction = lang === "he"
      ? "\n\nIMPORTANT: The user is using the Hebrew interface. Respond ENTIRELY in Hebrew (עברית). Maintain your analytical Prof. Al-Rashid persona, use the same depth and style, but write everything in Hebrew including all analysis, bold terms, and perspective labels."
      : "";

    const messages = [
      ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user" as const, content: message },
    ];

    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: MAX_TOKENS,
      system: PROFESSOR_SYSTEM_PROMPT + langInstruction,
      messages,
    });

    const reply = response.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
    return NextResponse.json({ reply });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.errors }, { status: 400 });
    }
    console.error("Chat API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
