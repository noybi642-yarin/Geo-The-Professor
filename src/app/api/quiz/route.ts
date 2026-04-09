import { NextRequest, NextResponse } from "next/server";
import { QUIZ_QUESTIONS } from "@/data/quiz";
import { z } from "zod";

// GET /api/quiz?module_id=conflict-101
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const moduleId = searchParams.get("module_id");

  if (!moduleId) {
    return NextResponse.json({ error: "module_id required" }, { status: 400 });
  }

  const questions = QUIZ_QUESTIONS
    .filter((q) => q.module_id === moduleId)
    .map((q, i) => ({
      ...q,
      id: `${moduleId}-${i}`,
      // Don't send correct_index to client — validate server-side
      correct_index: undefined,
    }));

  return NextResponse.json({ questions });
}

// POST /api/quiz — validate an answer
const AnswerSchema = z.object({
  question_text: z.string(),
  selected_index: z.number().min(0).max(3),
  module_id: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question_text, selected_index, module_id } = AnswerSchema.parse(body);

    const question = QUIZ_QUESTIONS.find(
      (q) => q.module_id === module_id && q.question === question_text
    );

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    const correct = selected_index === question.correct_index;

    return NextResponse.json({
      correct,
      correct_index: question.correct_index,
      explanation: question.explanation,
      xp_earned: correct ? 20 : 0,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
