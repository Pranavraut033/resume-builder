"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { GenerateOptions, KokoroTTS } from "kokoro-js";

export type KokoroTTSStatus =
  | "idle"
  | "loading"
  | "generating"
  | "playing"
  | "error";

export interface KokoroVoiceOption {
  id: string;
  name: string;
  language: string;
  gender: string;
}

type KokoroVoiceId = NonNullable<GenerateOptions["voice"]>;

const KOKORO_MODEL_ID = "onnx-community/Kokoro-82M-ONNX";

/**
 * Module-scope model cache, deliberately not a per-hook ref: the setup screen
 * preloads the ~86MB model on mount precisely so the interview itself doesn't
 * pay that cost, but the setup component unmounts before the session
 * component mounts its own `useKokoroTTS()`. A ref would throw the preloaded
 * instance away and force a second (multi-second) ONNX session build right
 * when the first question is due, so the promise is shared across every hook
 * instance instead.
 */
let sharedModel: Promise<KokoroTTS> | null = null;
let sharedModelReady = false;

/**
 * WKWebView (Tauri on macOS) lacks native `ReadableStream[Symbol.asyncIterator]`
 * (added in Safari 17.4) — kokoro-js's `phonemizer` dependency does
 * `for await (const chunk of stream)` over a decompressed data-file stream and
 * throws "undefined is not a function" without this. Chromium/Firefox already
 * support it, so this only ever installs the shim once, lazily.
 */
function polyfillReadableStreamAsyncIterator() {
  const proto = ReadableStream.prototype as ReadableStream & {
    [Symbol.asyncIterator]?: () => AsyncGenerator<unknown>;
  };
  if (proto[Symbol.asyncIterator]) return;
  proto[Symbol.asyncIterator] = async function* (this: ReadableStream) {
    const reader = this.getReader();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) return;
        yield value;
      }
    } finally {
      reader.releaseLock();
    }
  };
}

function loadSharedModel(): Promise<KokoroTTS> {
  if (!sharedModel) {
    polyfillReadableStreamAsyncIterator();
    sharedModel = import("kokoro-js")
      .then(({ KokoroTTS: KokoroTTSCtor }) =>
        KokoroTTSCtor.from_pretrained(KOKORO_MODEL_ID, { dtype: "q8" })
      )
      .then((tts) => {
        sharedModelReady = true;
        return tts;
      })
      .catch((err) => {
        // Clear the cache so a later call can retry rather than being stuck
        // with a permanently rejected promise.
        sharedModel = null;
        throw err;
      });
  }
  return sharedModel;
}

/**
 * Lazy-loads `kokoro-js` and wraps its generate → decode → play flow behind a
 * small, reusable API. The model itself is cached at module scope (see
 * `sharedModel`) so it survives across components; per-hook state covers only
 * this consumer's playback.
 */
export function useKokoroTTS() {
  const [status, setStatus] = useState<KokoroTTSStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [voices, setVoices] = useState<KokoroVoiceOption[]>([]);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  // Resolver for the in-flight `speak()` promise. `stop()` closes the
  // AudioContext, which can prevent a pending `ended` event from ever firing —
  // without settling the promise here, an awaiting caller would hang forever.
  const pendingResolveRef = useRef<(() => void) | null>(null);

  const cleanupPlayback = useCallback(() => {
    pendingResolveRef.current?.();
    pendingResolveRef.current = null;
    sourceRef.current = null;
    setAnalyser(null);
    audioCtxRef.current?.close().catch(() => {
      // Already-closed contexts reject; nothing to recover from here.
    });
    audioCtxRef.current = null;
  }, []);

  /** Loads (and caches) the Kokoro model, populating `voices` once ready. */
  const load = useCallback(async (): Promise<KokoroTTS> => {
    if (!sharedModelReady) setStatus("loading");
    setError(null);
    try {
      const tts = await loadSharedModel();
      setVoices(
        Object.entries(tts.voices).map(([id, voice]) => ({
          id,
          name: voice.name,
          language: voice.language,
          gender: voice.gender,
        }))
      );
      setStatus((current) => (current === "loading" ? "idle" : current));
      return tts;
    } catch (e) {
      setStatus("error");
      setError((e as Error).message);
      throw e;
    }
  }, []);

  /** Stops any in-flight playback and tears down its audio graph. */
  const stop = useCallback(() => {
    sourceRef.current?.stop();
    cleanupPlayback();
    setStatus((current) => (current === "error" ? current : "idle"));
  }, [cleanupPlayback]);

  /**
   * Generates and plays `text` in `voice`, resolving once playback ends (so
   * callers can `await speak()` before starting to listen for a reply).
   */
  const speak = useCallback(
    async (text: string, voice: string): Promise<void> => {
      // Cancel anything already playing first: two overlapping calls would
      // otherwise race over `audioCtxRef`, and the earlier call's teardown
      // would close the later call's context mid-playback. Reachable from the
      // mic-test page, whose play button stays enabled during playback.
      if (sourceRef.current) stop();

      setError(null);
      let audioCtx: AudioContext | null = null;
      try {
        const tts = await load();

        setStatus("generating");
        const audio = await tts.generate(text, {
          voice: voice as KokoroVoiceId,
        });
        const wav = audio.toWav();

        audioCtx = new AudioContext();
        audioCtxRef.current = audioCtx;
        const buffer = await audioCtx.decodeAudioData(wav.slice(0));

        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        const analyserNode = audioCtx.createAnalyser();
        analyserNode.fftSize = 256;
        source.connect(analyserNode);
        analyserNode.connect(audioCtx.destination);
        sourceRef.current = source;
        setAnalyser(analyserNode);

        setStatus("playing");
        await new Promise<void>((resolve) => {
          pendingResolveRef.current = resolve;
          source.onended = () => resolve();
          source.start();
        });
        setStatus((current) => (current === "playing" ? "idle" : current));
      } catch (e) {
        setStatus("error");
        setError((e as Error).message);
        throw e;
      } finally {
        // Only tear down if this call still owns the audio graph — a newer
        // `speak()` may already have replaced it.
        if (audioCtx && audioCtxRef.current === audioCtx) cleanupPlayback();
      }
    },
    [load, stop, cleanupPlayback]
  );

  // Release the audio graph if the consumer unmounts mid-utterance.
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return { status, error, voices, speak, stop, analyser, load };
}
