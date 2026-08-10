"use client";

import { useCallback, useRef, useState } from "react";

export type SpeechRecognitionStatus = "idle" | "listening" | "error";

// The Web Speech API's `SpeechRecognition` constructor isn't part of
// TypeScript's DOM lib (still non-standard / webkit-prefixed in most
// browsers), so declare the minimal surface this hook needs. The result
// types themselves (`SpeechRecognitionResultList` etc.) already exist in
// lib.dom.d.ts and are reused here.
interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
}

interface SpeechRecognitionResultEventLike extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Wraps `getUserMedia` + an `AnalyserNode` (for visualization) + the
 * browser's `SpeechRecognition` API behind a small, reusable hook. Cleans up
 * the mic stream/audio context/recognizer on `stop()` or unmount.
 */
export function useSpeechRecognition() {
  const [status, setStatus] = useState<SpeechRecognitionStatus>("idle");
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    setAnalyser(null);
    setStatus((current) => (current === "error" ? current : "idle"));
  }, []);

  const start = useCallback(async (): Promise<void> => {
    setError(null);
    setTranscript("");

    const SpeechRecognitionCtor = getSpeechRecognitionCtor();
    if (!SpeechRecognitionCtor) {
      setStatus("error");
      setError("SpeechRecognition is not available in this webview.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      streamRef.current = stream;
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyserNode = audioCtx.createAnalyser();
      analyserNode.fftSize = 256;
      source.connect(analyserNode);
      setAnalyser(analyserNode);
    } catch (e) {
      setStatus("error");
      setError(`getUserMedia error: ${(e as Error).message}`);
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let text = "";
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      setTranscript(text);
    };
    recognition.onerror = (event) => {
      setStatus("error");
      setError(`STT error: ${event.error}`);
    };
    recognition.onend = () => stop();
    recognitionRef.current = recognition;
    recognition.start();
    setStatus("listening");
  }, [stop]);

  return { status, transcript, error, start, stop, analyser };
}
