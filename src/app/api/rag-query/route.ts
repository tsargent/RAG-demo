// app/api/rag-query/route.ts
import { NextRequest, NextResponse } from "next/server";
import { answerQuestion } from "@/lib/rag";

export async function POST(req: NextRequest) {
  const { question } = await req.json();

  if (!question || typeof question !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid 'question'" },
      { status: 400 }
    );
  }

  const result = await answerQuestion(question);

  return NextResponse.json(result);
}
