"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type { ScenarioOut } from "@/types";

const DIFFICULTY_COLOR: Record<string, string> = {
  easy: "text-emerald-400 border-emerald-400/40",
  medium: "text-amber-400 border-amber-400/40",
  hard: "text-red-400 border-red-400/40",
};

export default function DashboardPage() {
  const router = useRouter();
  const [scenarios, setScenarios] = useState<ScenarioOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<"checking" | "up" | "down">("checking");
  const [llmInfo, setLlmInfo] = useState<{ provider: string; model: string } | null>(null);

  useEffect(() => {
    api
      .health()
      .then((h) => {
        setBackendStatus("up");
        setLlmInfo({ provider: h.llm_provider, model: h.llm_model });
      })
      .catch(() => setBackendStatus("down"));

    api
      .listScenarios()
      .then(setScenarios)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load scenarios."))
      .finally(() => setLoading(false));
  }, []);

  async function handleStart(scenarioId: string) {
    setStartingId(scenarioId);
    try {
      const res = await api.startSimulation(scenarioId);
      router.push(`/simulation/${res.session_id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to start simulation.");
      setStartingId(null);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <header className="mb-10 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-brand-400">Mental Gym</p>
          <h1 className="mt-1 text-3xl font-semibold text-white">
            AI-powered emotional intelligence training
          </h1>
          <p className="mt-2 max-w-2xl text-slate-400">
            Choose a scenario, put on your headset, and have a real spoken conversation with an
            AI character. Your response is analyzed for empathy, relevance, and de-escalation in
            real time, and the character reacts accordingly.
          </p>
        </div>
        <div className="shrink-0 rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3 text-right">
          <p className="text-xs text-slate-500">Backend</p>
          <p
            className={`text-sm font-medium ${
              backendStatus === "up" ? "text-emerald-400" : backendStatus === "down" ? "text-red-400" : "text-slate-400"
            }`}
          >
            {backendStatus === "checking" && "Checking..."}
            {backendStatus === "up" && "Connected"}
            {backendStatus === "down" && "Not reachable"}
          </p>
          {llmInfo && (
            <p className="mt-1 text-xs text-slate-500">
              {llmInfo.provider === "ollama" ? "AI mode" : "Demo mode"} · {llmInfo.model}
            </p>
          )}
        </div>
      </header>

      {backendStatus === "down" && (
        <div className="mb-8 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          Can&apos;t reach the backend API. Make sure the FastAPI server is running (see the README)
          and that <code className="rounded bg-slate-800 px-1">NEXT_PUBLIC_API_URL</code> points to it.
        </div>
      )}

      {error && (
        <div className="mb-8 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <section>
        <h2 className="mb-4 text-lg font-medium text-slate-200">Available scenarios</h2>
        {loading ? (
          <p className="text-slate-500">Loading scenarios...</p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {scenarios.map((s) => (
              <div
                key={s.id}
                className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-5"
              >
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-lg font-medium text-white">{s.title}</h3>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs capitalize ${
                        DIFFICULTY_COLOR[s.difficulty] ?? "text-slate-400 border-slate-600"
                      }`}
                    >
                      {s.difficulty}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400">{s.description}</p>
                  <p className="mt-3 text-xs text-slate-500">
                    Character: <span className="text-slate-300">{s.character.name}</span> ({s.character.role})
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{s.total_questions} exchanges</p>
                </div>
                <button
                  onClick={() => handleStart(s.id)}
                  disabled={startingId !== null || backendStatus === "down"}
                  className="focus-ring mt-5 w-full rounded-lg bg-brand-500 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {startingId === s.id ? "Starting..." : "Start simulation"}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
