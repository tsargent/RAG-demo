// src/scripts/check-chunks.ts
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; // anon is fine for simple reads
const supabase = createClient(url, anon);

async function main() {
  const { data, error } = await supabase
    .from("mental_skills_chunks")
    .select("id, title, source")
    .limit(5);

  if (error) {
    console.error("❌ Error reading table:", error);
    return;
  }

  console.log("✅ Found rows:", data?.length);
  console.dir(data, { depth: 2 });
}

main();
