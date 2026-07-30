"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MicState } from "@/types";

// Minimal typing for the non-standard Web Speech API so TS doesn't complain.
interface SpeechRecognitionEventLike extends Event {
  results: {
    [index: number]: {
      [index: number]: { transcript: string };
      isFinal: boolean;
    };
    length: number;
  };
}

export function useSpeechRecognition() {
  const [micState, setMicState] = useState<MicState>("idle");
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (typeof window !== "undefined" &&
        ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) ||
      null;

    if (!SpeechRecognition) {
      setIsSupported(false);
      setMicState("error");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      let finalText = "";
      let interimText = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript + " ";
        } else {
          interimText += result[0].transcript;
        }
      }
      if (finalText) {
        setTranscript((prev) => (prev + " " + finalText).trim());
      }
      setInterim(interimText);
    };

    recognition.onerror = (event: any) => {
      if (event.error === "not-allowed" || event.error === "permission-denied") {
        setErrorMessage("Microphone permission was denied. Please allow microphone access and try again.");
      } else if (event.error === "no-speech") {
        setErrorMessage("No speech detected. Please try again.");
      } else {
        setErrorMessage("Speech recognition failed. You can type your response instead.");
      }
      setMicState("error");
    };

    recognition.onend = () => {
      setMicState((prev) => (prev === "listening" ? "processing" : prev));
      setTimeout(() => {
        setMicState((prev) => (prev === "processing" ? "complete" : prev));
      }, 150);
    };

    recognitionRef.current = recognition;
    setMicState("ready");

    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
    };
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    setErrorMessage(null);
    setTranscript("");
    setInterim("");
    try {
      recognitionRef.current.start();
      setMicState("listening");
    } catch {
      // start() throws if already started; ignore
    }
  }, []);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    setInterim("");
    setMicState("ready");
  }, []);

  const editTranscript = useCallback((text: string) => {
    setTranscript(text);
  }, []);

  return {
    micState,
    transcript,
    interim,
    errorMessage,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
    editTranscript,
  };
}
