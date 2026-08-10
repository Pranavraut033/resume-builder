"use client";

import { useCallback, useRef, useState } from "react";

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
 * Lazy-loads `kokoro-js` and wraps its generate → decode → play flow behind a
 * small, reusable API. The model instance is cached in a ref for the
 * lifetime of the hook so repeated `speak()` calls don't reload it.
 */
export function useKokoroTTS() {
  const [status, setStatus] = useState<KokoroTTSStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [voices, setVoices] = useState<KokoroVoiceOption[]>([]);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const kokoroRef = useRef<KokoroTTS | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  const cleanupPlayback = useCallback(() => {
    sourceRef.current = null;
    setAnalyser(null);
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
  }, []);

  /** Loads (and caches) the Kokoro model, populating `voices` once ready. */
  const load = useCallback(async (): Promise<KokoroTTS> => {
    if (kokoroRef.current) return kokoroRef.current;

    setStatus("loading");
    setError(null);
    try {
      const { KokoroTTS: KokoroTTSCtor } = await import("kokoro-js");
      const tts = await KokoroTTSCtor.from_pretrained(KOKORO_MODEL_ID, {
        dtype: "q8",
      });
      kokoroRef.current = tts;
      setVoices(
        Object.entries(tts.voices).map(([id, voice]) => ({
          id,
          name: voice.name,
          language: voice.language,
          gender: voice.gender,
        }))
      );
      setStatus("idle");
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
    setStatus("idle");
  }, [cleanupPlayback]);

  /**
   * Generates and plays `text` in `voice`, resolving once playback ends (so
   * callers can `await speak()` before starting to listen for a reply).
   */
  const speak = useCallback(
    async (text: string, voice: string): Promise<void> => {
      setError(null);
      try {
        const tts = kokoroRef.current ?? (await load());

        setStatus("generating");
        const audio = await tts.generate(text, {
          voice: voice as KokoroVoiceId,
        });
        const wav = audio.toWav();

        const audioCtx = new AudioContext();
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
          source.onended = () => resolve();
          source.start();
        });
        setStatus("idle");
      } catch (e) {
        setStatus("error");
        setError((e as Error).message);
        throw e;
      } finally {
        cleanupPlayback();
      }
    },
    [load, cleanupPlayback]
  );

  return { status, error, voices, speak, stop, analyser, load };
}
