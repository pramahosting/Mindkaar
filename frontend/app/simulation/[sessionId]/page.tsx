"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { MicrophoneButton } from "@/components/MicrophoneButton";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { api, ApiError } from "@/lib/api";
import type { EmotionOut, ScenarioOut, SimulationState, TranscriptMessage } from "@/types";

export default function SimulationPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();

  const [scenario, setScenario] = useState<ScenarioOut | null>(null);
  const [state, setState] = useState<SimulationState>("idle");
  const [currentQuestion, setCurrentQuestion] = useState<string>("");
  const [emotion, setEmotion] = useState<EmotionOut | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(1);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [reviewText, setReviewText] = useState("");
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [relevanceWarning, setRelevanceWarning] = useState<string | null>(null);
  const [mode, setMode] = useState<string>("demo");

  const {
    micState,
    transcript: liveTranscript,
    interim,
    errorMessage: micError,
    isSupported: micSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition();

  const { speak, isSpeaking, isMuted, toggleMute, replay, isSupported: ttsSupported } = useSpeechSynthesis();

  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    (async () => {
      try {
        const session = await api.getSession(sessionId as string);
        setScenario(session.scenario);
        setEmotion(session.emotion);
        setQuestionIndex(session.question_index);
        setTotalQuestions(session.total_questions);
        setMode(session.mode);
        setTranscript(session.transcript);

        if (session.status === "completed") {
          router.replace(`/results/${sessionId}`);
          return;
        }

        const question = session.current_question || session.scenario.opening_line;
        setCurrentQuestion(question);
        setState("ai_speaking");
        speak(question);
        setTimeout(() => setState("waiting_for_user"), 300);
      } catch (e) {
        setErrorBanner(e instanceof ApiError ? e.message : "Failed to load this simulation session.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    if (micState === "listening") setState("listening");
    if (micState === "complete") {
      setReviewText((liveTranscript || "").trim());
      setState("user_review");
    }
    if (micState === "error" && micError) {
      setErrorBanner(micError);
    }
  }, [micState, liveTranscript, micError]);

  function handleStartListening() {
    setErrorBanner(null);
    setRelevanceWarning(null);
    resetTranscript();
    startListening();
  }

  async function handleSubmit() {
    const text = reviewText.trim();
    if (!text) {
      setErrorBanner("Please say or type a response before submitting.");
      return;
    }
    setState("submitting");
    setErrorBanner(null);
    setRelevanceWarning(null);

    try {
      setState("ai_analyzing");
      const res = await api.respond(sessionId as string, text);

      setTranscript((prev) => [
        ...prev,
        { sender: "user", message: text, timestamp: new Date().toISOString() },
        { sender: "ai", message: res.character_response, emotion: res.emotion.primary_emotion, timestamp: new Date().toISOString() },
      ]);
      setEmotion(res.emotion);
      setMode(res.mode);
      setQuestionIndex(res.question_index);
      setTotalQuestions(res.total_questions);

      if (!res.is_relevant) {
        setRelevanceWarning(
          "Your response does not appear to address the current question. The character noticed too - take another look at what was asked and try again."
        );
      }

      setReviewText("");
      resetTranscript();

      if (!res.should_continue || !res.next_question) {
        setState("ai_speaking");
        speak(res.character_response);
        setTimeout(async () => {
          try {
            await api.completeSimulation(sessionId as string);
          } finally {
            router.push(`/results/${sessionId}`);
          }
        }, 1200);
        return;
      }

      setCurrentQuestion(res.next_question);
      setState("ai_speaking");
      speak(`${res.character_response} ${res.next_question}`);
      setTimeout(() => setState("waiting_for_user"), 300);
    } catch (e) {
      setErrorBanner(e instanceof ApiError ? e.message : "Something went wrong processing your response.");
      setState("waiting_for_user");
    }
  }

  if (errorBanner && !scenario) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <p className="text-red-300">{errorBanner}</p>
        <button onClick={() => router.push("/")} className="focus-ring mt-4 rounded-lg border border-slate-700 px-4 py-2 text-sm">
          Back to dashboard
        </button>
      </main>
    );
  }

  if (!scenario || !emotion) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-24 text-center text-slate-400">
        Loading simulation...
      </main>
    );
  }

  const isAiSpeaking = state === "ai_speaking" && isSpeaking;
  const micDisabled = state === "ai_speaking" || state === "submitting" || state === "ai_analyzing";

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <button onClick={() => router.push("/")} className="focus-ring text-sm text-slate-400 hover:text-slate-200">
          &larr; Exit simulation
        </button>
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400">
            {mode === "ollama" ? "AI mode" : "Demo mode"}
          </span>
          {ttsSupported && (
            <button onClick={toggleMute} className="focus-ring rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800">
              {isMuted ? "Unmute voice" : "Mute voice"}
            </button>
          )}
          <button onClick={replay} className="focus-ring rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800">
            Replay
          </button>
        </div>
      </div>

      {errorBanner && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {errorBanner}
        </div>
      )}
      {relevanceWarning && (
        <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          {relevanceWarning}
        </div>
      )}
      {!micSupported && (
        <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          Your browser doesn&apos;t support speech recognition. You can still type your response below.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* LEFT: avatar + AI dialogue */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium text-white">{scenario.character.name}</h2>
              <p className="text-xs text-slate-500">{scenario.character.role}</p>
            </div>
          </div>
          <div className="flex justify-center py-4">
            <Avatar primaryEmotion={emotion.primary_emotion} intensity={emotion.intensity} isSpeaking={isAiSpeaking} />
          </div>
          <div className="mt-4 rounded-lg bg-slate-800/60 p-4 text-slate-200">
            &ldquo;{currentQuestion}&rdquo;
          </div>
        </section>

        {/* RIGHT: scenario info + response area */}
        <section className="flex flex-col gap-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <p className="text-xs uppercase tracking-wide text-brand-400">Scenario</p>
            <h3 className="text-lg font-medium text-white">{scenario.title}</h3>
            <p className="mt-1 text-sm text-slate-400">{scenario.objective}</p>
            <p className="mt-3 text-xs text-slate-500">
              Question {Math.min(questionIndex + 1, totalQuestions)} of {totalQuestions}
            </p>
            <div className="mt-1 h-1.5 w-full rounded-full bg-slate-800">
              <div
                className="h-1.5 rounded-full bg-brand-500 transition-all"
                style={{ width: `${(Math.min(questionIndex + 1, totalQuestions) / totalQuestions) * 100}%` }}
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <p className="mb-3 text-sm font-medium text-slate-200">Your response</p>
            <div className="flex flex-col items-center gap-4">
              <MicrophoneButton
                micState={micSupported ? micState : "error"}
                disabled={micDisabled}
                onStart={handleStartListening}
                onStop={stopListening}
              />

              {micState === "listening" && (
                <p className="text-sm italic text-slate-400">{interim || "Listening..."}</p>
              )}

              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="You said: your transcribed response will appear here (or type it directly)"
                rows={3}
                disabled={micDisabled}
                className="focus-ring w-full rounded-lg border border-slate-700 bg-slate-800/60 p-3 text-sm text-slate-100 placeholder:text-slate-500 disabled:opacity-60"
              />

              <button
                onClick={handleSubmit}
                disabled={micDisabled || !reviewText.trim() || state === "listening"}
                className="focus-ring w-full rounded-lg bg-brand-500 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {state === "ai_analyzing" ? "Analyzing..." : "Submit response"}
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* BOTTOM: transcript */}
      <section className="mt-6 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <p className="mb-3 text-sm font-medium text-slate-200">Conversation transcript</p>
        <div className="max-h-64 space-y-3 overflow-y-auto pr-2">
          {transcript.map((m, i) => (
            <div key={i} className={`text-sm ${m.sender === "ai" ? "text-slate-300" : "text-brand-300"}`}>
              <span className="font-medium">{m.sender === "ai" ? scenario.character.name : "You"}: </span>
              {m.message}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
