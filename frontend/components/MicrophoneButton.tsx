"use client";

import type { MicState } from "@/types";

interface MicrophoneButtonProps {
  micState: MicState;
  disabled?: boolean;
  onStart: () => void;
  onStop: () => void;
}

const STATE_LABEL: Record<MicState, string> = {
  idle: "Loading microphone...",
  ready: "Click to answer",
  listening: "Listening... click to stop",
  processing: "Processing...",
  complete: "Transcription ready",
  error: "Microphone unavailable",
};

export function MicrophoneButton({ micState, disabled, onStart, onStop }: MicrophoneButtonProps) {
  const isListening = micState === "listening";

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        disabled={disabled || micState === "idle" || micState === "error"}
        onClick={isListening ? onStop : onStart}
        aria-pressed={isListening}
        aria-label={isListening ? "Stop recording" : "Start recording your response"}
        className={`focus-ring flex h-20 w-20 items-center justify-center rounded-full border-2 text-3xl transition
          disabled:cursor-not-allowed disabled:opacity-40
          ${isListening
            ? "border-red-400 bg-red-500/20 animate-pulseSlow"
            : "border-brand-500 bg-brand-500/10 hover:bg-brand-500/20"}`}
      >
        <span aria-hidden="true">{isListening ? "\u23F9" : "\u{1F3A4}"}</span>
      </button>
      <p className="text-sm text-slate-300" role="status">
        {STATE_LABEL[micState]}
      </p>
    </div>
  );
}
