// lib/rag.ts
import { supabase } from "./db";
import OpenAI from "openai";
import { embedText } from "./embeddings";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function answerQuestion(question: string) {
  // 1. Embed query
  const queryEmbedding = await embedText(question);

  // 2. Vector search in Supabase
  const { data: matches, error } = await supabase.rpc(
    "match_mental_skills_chunks",
    {
      query_embedding: queryEmbedding,
      match_count: 5,
    }
  );

  console.log("🔎 RPC error:", error);
  console.log("🔎 RPC matches:", matches);

  if (error) {
    throw new Error(`Vector search failed: ${error.message}`);
  }

  const contextText =
    matches
      ?.map(
        (m: any) =>
          `Title: ${m.title}\nSource: ${m.source}\nContent: ${m.chunk}`
      )
      .join("\n\n") ?? "";

  const systemPrompt = `
You are a careful mental skills coach. Use only the provided context from evidence-based resources.
Do NOT give medical diagnoses or treatment plans.
If the question is out of scope or requires a professional, say so and suggest the user talk to a licensed clinician.

Context:
${contextText}
  `.trim();

  // 3. Call the chat model with retrieved context
  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: question },
    ],
  });

  return {
    answer: completion.choices[0]?.message?.content ?? "",
    sources: matches ?? [],
  };
}
