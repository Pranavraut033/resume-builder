"use client";

// Permanent "test your mic/voice config" utility page for end users — not a
// throwaway spike. Built on the same shared voice hooks/components the real
// mock-interview `/practice` feature uses (see src/lib/voice/, src/components/voice/)
// so this page and the real feature never diverge.

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { AudioVisualizer } from "@/components/voice/AudioVisualizer";
import { useKokoroTTS } from "@/lib/voice/useKokoroTTS";
import { useSpeechRecognition } from "@/lib/voice/useSpeechRecognition";

const SAMPLE_TEXT =
  "The quick brown fox jumps over the lazy dog while preparing for the interview.";
const READ_ALOUD_PROMPT = "I am ready for my interview today.";
const DEFAULT_KOKORO_VOICE = "af_sky";

type Support = { tts: boolean; stt: boolean; mic: boolean };

function SupportBadge({
  label,
  ok,
}: {
  label: string;
  ok: boolean | undefined;
}) {
  if (ok === undefined) return <Badge>{label}: checking…</Badge>;
  return (
    <Badge variant={ok ? "success" : "error"}>
      {label}: {ok ? "available" : "missing"}
    </Badge>
  );
}

export default function MicTestPage() {
  const [support, setSupport] = useState<Support | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const kokoro = useKokoroTTS();
  const stt = useSpeechRecognition();

  useEffect(() => {
    const w = window as unknown as {
      SpeechRecognition?: unknown;
      webkitSpeechRecognition?: unknown;
    };
    setSupport({
      tts: "speechSynthesis" in window,
      stt: !!(w.SpeechRecognition || w.webkitSpeechRecognition),
      mic: !!navigator.mediaDevices?.getUserMedia,
    });
  }, []);

  function playSample() {
    setError(null);
    const utter = new SpeechSynthesisUtterance(SAMPLE_TEXT);
    utter.onstart = () => setSpeaking(true);
    utter.onend = () => setSpeaking(false);
    utter.onerror = (e) => setError(`TTS error: ${e.error}`);
    window.speechSynthesis.speak(utter);
  }

  async function playKokoroSample() {
    try {
      await kokoro.speak(SAMPLE_TEXT, DEFAULT_KOKORO_VOICE);
    } catch {
      // kokoro.error already surfaces the message; nothing else to do here.
    }
  }

  async function toggleListening() {
    setError(null);
    if (stt.status === "listening") {
      stt.stop();
      return;
    }
    await stt.start();
  }

  const kokoroLabel = {
    idle: "Play sample (Kokoro TTS)",
    error: "Play sample (Kokoro TTS)",
    loading: "Loading model (~86MB, first time only)…",
    generating: "Generating…",
    playing: "Playing…",
  }[kokoro.status];

  const topLevelError = error || stt.error;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-8">
      <PageHeader
        title="Mic / speaker test"
        description="Test your microphone, speakers, and voice configuration for the mock-interview feature — TTS quality and the waveform visualizer."
      />

      <Card padding="md">
        <p className="text-agent-on-surface-variant mb-3 text-xs font-medium tracking-wide uppercase">
          Browser feature detection
        </p>
        <div className="flex flex-wrap gap-2">
          <SupportBadge label="speechSynthesis (TTS)" ok={support?.tts} />
          <SupportBadge label="SpeechRecognition (STT)" ok={support?.stt} />
          <SupportBadge label="getUserMedia (mic)" ok={support?.mic} />
        </div>
      </Card>

      {topLevelError && (
        <Card
          padding="sm"
          className="border-agent-error bg-agent-error-container/20"
        >
          <p className="text-agent-error text-sm">{topLevelError}</p>
        </Card>
      )}

      <Card padding="md">
        <p className="text-agent-on-surface-variant mb-1 text-xs font-medium tracking-wide uppercase">
          System TTS
        </p>
        <p className="text-agent-on-surface mb-4 italic">
          &ldquo;{SAMPLE_TEXT}&rdquo;
        </p>
        <Button onClick={playSample} variant="secondary">
          {speaking ? "Speaking…" : "Play sample (system TTS)"}
        </Button>
      </Card>

      <Card padding="md">
        <div className="mb-1 flex items-center gap-2">
          <p className="text-agent-on-surface-variant text-xs font-medium tracking-wide uppercase">
            Kokoro TTS
          </p>
          <Badge variant="info">local ML model · real audio</Badge>
        </div>
        <p className="text-agent-on-surface mb-4 italic">
          &ldquo;{SAMPLE_TEXT}&rdquo;
        </p>
        {kokoro.error && (
          <p className="text-agent-error mb-3 text-sm">{kokoro.error}</p>
        )}
        <Button
          onClick={playKokoroSample}
          disabled={
            kokoro.status === "loading" || kokoro.status === "generating"
          }
          variant="primary"
          className="mb-4"
        >
          {kokoroLabel}
        </Button>
        <AudioVisualizer analyser={kokoro.analyser} />
      </Card>

      <Card padding="md">
        <p className="text-agent-on-surface-variant mb-1 text-xs font-medium tracking-wide uppercase">
          Speech-to-text
        </p>
        <p className="text-agent-on-surface mb-4 italic">
          &ldquo;{READ_ALOUD_PROMPT}&rdquo;
        </p>
        <Button
          onClick={toggleListening}
          variant={stt.status === "listening" ? "danger" : "secondary"}
          className="mb-4"
        >
          {stt.status === "listening"
            ? "Stop"
            : "Start listening (STT + mic visualizer)"}
        </Button>
        <AudioVisualizer analyser={stt.analyser} />
        <p className="text-agent-on-surface-variant mt-3 text-sm">
          Transcript:{" "}
          <span className="text-agent-on-surface">
            {stt.transcript || "(nothing yet)"}
          </span>
        </p>
      </Card>
    </div>
  );
}
