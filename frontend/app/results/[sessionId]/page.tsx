"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { EmotionJourneyChart } from "@/components/EmotionJourneyChart";
import { api, ApiError } from "@/lib/api";
import type { SessionResultsResponse } from "@/types";

const SCORE_ROWS: { key: keyof NonNullable<SessionResultsResponse["evaluation"]>; label: string }[] = [
  { key: "empathy_score", label: "Empathy" },
  { key: "communication_score", label: "Communication" },
  { key: "active_listening_score", label: "Active listening" },
  { key: "emotional_awareness_score", label: "Emotional awareness" },
  { key: "conflict_resolution_score", label: "Conflict resolution" },
];

export default function ResultsPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const [results, setResults] = useState<SessionResultsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getResults(sessionId as string)
      .then(setResults)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load results."));
  }, [sessionId]);

  if (error) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <p className="text-red-300">{error}</p>
        <button onClick={() => router.push("/")} className="focus-ring mt-4 rounded-lg border border-slate-700 px-4 py-2 text-sm">
          Back to dashboard
        </button>
      </main>
    );
  }

  if (!results) {
    return <main className="mx-auto max-w-2xl px-6 py-24 text-center text-slate-400">Loading results...</main>;
  }

  const evaluation = results.evaluation;

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <button onClick={() => router.push("/")} className="focus-ring mb-6 text-sm text-slate-400 hover:text-slate-200">
        &larr; Back to dashboard
      </button>

      <p className="text-sm font-medium uppercase tracking-wider text-brand-400">Simulation complete</p>
      <h1 className="mt-1 text-2xl font-semibold text-white">{results.scenario_title}</h1>

      {evaluation && (
        <>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="col-span-2 rounded-xl border border-brand-500/40 bg-brand-500/10 p-5 sm:col-span-1">
              <p className="text-xs text-brand-300">Overall score</p>
              <p className="mt-1 text-4xl font-semibold text-white">{evaluation.overall_score}</p>
              <p className="text-xs text-slate-400">out of 100</p>
            </div>
            {SCORE_ROWS.map((row) => (
              <div key={row.key} className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
                <p className="text-xs text-slate-500">{row.label}</p>
                <p className="mt-1 text-2xl font-semibold text-white">{evaluation[row.key]}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <p className="mb-2 text-sm font-medium text-emerald-400">Strengths</p>
              <ul className="list-inside list-disc space-y-1 text-sm text-slate-300">
                {evaluation.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <p className="mb-2 text-sm font-medium text-amber-400">Areas for improvement</p>
              <ul className="list-inside list-disc space-y-1 text-sm text-slate-300">
                {evaluation.weaknesses.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <p className="mb-2 text-sm font-medium text-slate-200">AI feedback</p>
            <p className="text-sm text-slate-300">{evaluation.feedback}</p>
          </div>
        </>
      )}

      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <p className="mb-3 text-sm font-medium text-slate-200">Emotional journey</p>
        <EmotionJourneyChart history={results.emotion_journey} />
      </div>

      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <p className="mb-3 text-sm font-medium text-slate-200">Full conversation transcript</p>
        <div className="max-h-80 space-y-3 overflow-y-auto pr-2">
          {results.transcript.map((m, i) => (
            <div key={i} className={`text-sm ${m.sender === "ai" ? "text-slate-300" : "text-brand-300"}`}>
              <span className="font-medium">{m.sender === "ai" ? "AI" : "You"}: </span>
              {m.message}
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => router.push("/")}
        className="focus-ring mt-8 w-full rounded-lg bg-brand-500 py-3 text-sm font-medium text-white transition hover:bg-brand-600"
      >
        Try another scenario
      </button>
    </main>
  );
}
