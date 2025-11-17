// src/scripts/test-read.ts
import "dotenv/config";

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(url, anon);

async function main() {
  console.log("🔍 Testing read...");

  const { data, error } = await supabase
    .from("mental_skills_chunks")
    .select("*")
    .limit(1);

  if (error) {
    console.error("❌ Read failed:", error);
    return;
  }

  console.log("✅ Read succeeded:", data);
}

main();
