// scripts/ingest.ts (run with: npm run ingest)
import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { embedText } from "../lib/embeddings.ts";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error(
    "Missing Supabase environment variables. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY are set."
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

// Data lives under src/data/mental-skills
const DATA_DIR = path.join(process.cwd(), "src", "data", "mental-skills");

async function chunkText(text: string, chunkSize = 800, overlap = 100) {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let i = 0;

  while (i < words.length) {
    const chunk = words.slice(i, i + chunkSize).join(" ");
    chunks.push(chunk);
    i += chunkSize - overlap;
  }

  return chunks;
}

async function main() {
  const files = await fs.readdir(DATA_DIR);

  for (const file of files) {
    const fullPath = path.join(DATA_DIR, file);
    const content = await fs.readFile(fullPath, "utf8");
    const title = path.basename(file, path.extname(file));

    const chunks = await chunkText(content);

    for (const chunk of chunks) {
      const embedding = await embedText(chunk);

      const { error } = await supabase.from("mental_skills_chunks").insert({
        title,
        source: file,
        chunk,
        embedding,
      });

      if (error) {
        console.error("Insert error:", error);
      } else {
        console.log(`Inserted chunk from ${file}`);
      }
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
