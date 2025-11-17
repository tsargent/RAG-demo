# Mental Skills Coach — RAG Demo

Educational demo of a Retrieval-Augmented Generation (RAG) app that answers questions about evidence-based mental skills (e.g., box breathing, grounding, body scan). It retrieves relevant chunks from curated Markdown content stored in a Supabase Postgres database (with pgvector), then asks an LLM to answer strictly using those sources.

> Important: This is for educational purposes only. It is not medical advice. If you’re in crisis, contact local emergency services or a crisis hotline.

## What This Demo Shows

- RAG flow end-to-end using Supabase + pgvector for similarity search.
- Ingestion of Markdown content into a vectorized table.
- A minimal Next.js UI that chats with an API route.
- OpenAI models for embeddings and generation.

## High-Level Architecture

- Data: Markdown files under `src/data/mental-skills/*.md`.
- Embeddings: OpenAI `text-embedding-3-small`.
- Vector store: Supabase Postgres + `pgvector` with an RPC for similarity search.
- Orchestration: `answerQuestion()` in `src/lib/rag.ts` embeds the query, retrieves top matches, and calls an LLM (`gpt-4.1-mini`).
- API: `POST /api/rag-query` accepts `{ question: string }`, returns `{ answer, sources }`.
- UI: `src/app/page.tsx` sends questions and renders answers with sources.

## Prerequisites

- Node 18+ and npm
- A Supabase project with pgvector enabled
- OpenAI API key

## Environment Variables

Create `./.env.local` with the following (replace values with your own):

```bash
# Supabase (project settings → API)
NEXT_PUBLIC_SUPABASE_URL="https://YOUR-PROJECT.ref.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="YOUR-ANON-KEY"
# Service key is required for ingestion (server-side writes)
SUPABASE_SERVICE_KEY="YOUR-SERVICE-ROLE-KEY"

# OpenAI
OPENAI_API_KEY="sk-..."
```

If you prefer, you can also put these into a plain `.env` file for the scripts; the app uses `.env.local` by default.

## Supabase Setup (SQL)

Run these SQL statements in Supabase SQL Editor. Adjust dimensions if you change the embedding model.

```sql
-- 1) Extensions (pgvector)
create extension if not exists vector;

-- 2) Table for chunks
create table if not exists mental_skills_chunks (
  id uuid primary key default gen_random_uuid(),
  title text,
  source text,
  chunk text,
  embedding vector(1536) -- text-embedding-3-small dimension
);

-- 3) Optional: vector index for faster ANN search
create index if not exists mental_skills_chunks_embedding_idx
  on mental_skills_chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- 4) RLS (recommended)
alter table mental_skills_chunks enable row level security;

-- Allow public/anon to read chunks (UI and API read via anon key)
create policy if not exists "Allow read for anon" on mental_skills_chunks
  for select using (true);

-- 5) Similarity search RPC (cosine distance)
create or replace function match_mental_skills_chunks(
  query_embedding vector(1536),
  match_count int default 5
)
returns table (
  id uuid,
  title text,
  source text,
  chunk text,
  similarity float
)
language sql stable as $$
  select
    m.id,
    m.title,
    m.source,
    m.chunk,
    1 - (m.embedding <=> query_embedding) as similarity
  from mental_skills_chunks m
  order by m.embedding <=> query_embedding
  limit match_count;
$$;

-- Allow anon to execute the RPC
grant execute on function match_mental_skills_chunks(vector(1536), int) to anon;
```

## Install & Run

```bash
# Install deps
npm install

# Ingest content (reads Markdown, chunks, embeds, and inserts)
npm run ingest

# Optional: verify DB connectivity and a sample read
npm run db:test-read

# Start the UI
npm run dev
```

Then open <http://localhost:3000> and try questions like:

- “How can I use box breathing to manage anxiety?”
- “What is a grounding exercise?”

## Data Sources

Markdown files live here:

- `src/data/mental-skills/body-scan.md`
- `src/data/mental-skills/box-breathing.md`
- `src/data/mental-skills/grounding-54321.md`
- `src/data/mental-skills/stop.md`
- `src/data/mental-skills/urge-surfing.md`

The ingestion script will chunk these and upsert them into `mental_skills_chunks` with embeddings.

## Key Code Paths

- `src/lib/db.ts`: Supabase client (anon key for reads in app).
- `src/lib/embeddings.ts`: Embedding helper using OpenAI `text-embedding-3-small`.
- `src/lib/rag.ts`: `answerQuestion()` → embed query → Supabase RPC → call `gpt-4.1-mini` with retrieved context.
- `src/app/api/rag-query/route.ts`: API to handle `POST` questions.
- `src/app/page.tsx`: Minimal chat-style UI showing answers and sources.
- `src/scripts/ingest.ts`: Offline ingestion using `SUPABASE_SERVICE_KEY`.
- `src/scripts/test-read.ts`: Quick connectivity/read test.

## API Usage

Local example:

```bash
curl -s -X POST http://localhost:3000/api/rag-query \
  -H 'Content-Type: application/json' \
  -d '{"question":"How do I use box breathing?"}'
```

Returns JSON like:

```json
{
  "answer": "...model-generated text grounded in sources...",
  "sources": [
    { "id": "...", "title": "box-breathing", "source": "box-breathing.md", "chunk": "...", "similarity": 0.87 }
  ]
}
```

## Model & Safety Notes

- Embeddings: `text-embedding-3-small` (1536-dim)
- Chat: `gpt-4.1-mini`
- The system prompt confines responses to provided context and reminds users this isn’t medical advice. Out-of-scope questions should receive a gentle deferral.

## Troubleshooting

- “Vector search failed: function match_mental_skills_chunks does not exist”
  - Ensure you created the RPC and granted execute to `anon`.
- “column embedding is of type vector(1536) but expression is …”
  - Confirm the embedding model dimensions match your table definition.
- No sources returned
  - Verify rows exist in `mental_skills_chunks` and that `npm run ingest` succeeded.
- Auth/RLS issues
  - Reads use the anon key. Inserts require the service role key. With RLS enabled, service role bypasses policies; anon needs a `select` policy.

## License / Use

This is a demo intended for learning and experimentation. Use responsibly and at your own risk.
