"use client";

import { useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

type Source = {
  id: string;
  title: string;
  source: string;
  chunk: string;
  similarity: number;
};

export default function HomePage() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sources, setSources] = useState<Source[]>([]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;

    const newMessages = [...messages, { role: "user", content: question }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await fetch("/api/rag-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      const data = await res.json();

      setMessages([
        ...newMessages,
        { role: "assistant", content: data.answer ?? "No answer." },
      ]);

      setSources(data.sources ?? []);
    } finally {
      setLoading(false);
      setQuestion("");
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-3xl space-y-4">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">
            Mental Skills Coach (RAG Demo)
          </h1>
          <p className="text-sm text-slate-400">
            Educational only. Not medical advice. If you’re in crisis, contact
            your local emergency services or crisis hotline.
          </p>
        </header>

        <div className="border border-slate-800 rounded-xl p-4 h-[420px] overflow-y-auto bg-slate-900">
          {messages.length === 0 && (
            <p className="text-slate-500 text-sm">
              Ask things like “How can I use box breathing to manage anxiety?”
              or “What is a grounding exercise?”
            </p>
          )}

          {messages.map((m, idx) => (
            <div key={idx} className="mb-3">
              <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">
                {m.role === "user" ? "You" : "Coach"}
              </div>
              <div className="rounded-lg bg-slate-800/80 px-3 py-2 text-sm">
                {m.content}
              </div>
            </div>
          ))}

          {sources.length > 0 && (
            <div className="mt-4 border border-slate-800 rounded-xl p-3 bg-slate-900/80">
              <div className="text-xs font-semibold text-slate-400 mb-2">
                Sources used for the last answer
              </div>
              <ul className="space-y-2">
                {sources.map((s) => (
                  <li key={s.id} className="text-xs text-slate-300">
                    <div className="font-semibold text-slate-200">
                      {s.title}{" "}
                      <span className="text-slate-500">({s.source})</span>
                    </div>
                    <div className="text-slate-400 line-clamp-3">{s.chunk}</div>
                    <div className="text-[10px] text-slate-500 mt-1">
                      similarity: {s.similarity.toFixed(3)}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {loading && (
            <div className="text-sm text-slate-400 mt-2">Thinking…</div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-sky-500"
            placeholder="Ask about a coping skill, breathing exercise, or grounding technique…"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg px-4 py-2 text-sm font-medium bg-sky-500 disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </main>
  );
}
