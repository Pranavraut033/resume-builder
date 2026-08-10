"use client";

import { useEffect, useRef, useState } from "react";

import { ModelSelector } from "@/components/ModelSelector";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { cn } from "@/lib/cn";
import {
  DEFAULT_INTERVIEW_STYLE,
  INTERVIEW_STYLES,
  InterviewStyleId,
} from "@/lib/llm/prompts/interviewStyles";
import { useKokoroTTS } from "@/lib/voice/useKokoroTTS";
import { useModelStore } from "@/store/modelStore";

import { InterviewSetupChoices } from "./types";
import { VoicePodium } from "./VoicePodium";

const FIELD_CLASSES =
  "border-agent-outline-variant placeholder:text-agent-on-surface-variant focus:border-agent-primary focus:ring-agent-primary w-full rounded-xl border bg-(--color-agent-surface-lowest) px-4 py-2.5 text-sm text-(--color-agent-on-surface) focus:ring-1 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60";

const VOICE_SAMPLE_LINE = "Hi, I'm your interviewer today. Shall we get started?";

interface InterviewSetupProps {
  jobTitle: string;
  companyName?: string | null;
  onStart: (choices: InterviewSetupChoices) => void;
}

/**
 * Setup screen for a mock-interview session: voice, tone preset + custom
 * instructions, and model picker. Triggers the Kokoro model load on mount
 * (rather than deferring to Start) so voice list + first-speak latency is
 * paid during setup, not at the start of the actual interview.
 */
export function InterviewSetup({
  jobTitle,
  companyName,
  onStart,
}: InterviewSetupProps) {
  const kokoro = useKokoroTTS();
  const { activeModelPair } = useModelStore();

  const [voice, setVoice] = useState("");
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [styleId, setStyleId] = useState<InterviewStyleId>(
    DEFAULT_INTERVIEW_STYLE
  );
  const [customInstructions, setCustomInstructions] = useState("");

  useEffect(() => {
    kokoro.load().catch(() => {
      // kokoro.error already surfaces the message; nothing else to do here.
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!voice && kokoro.voices.length > 0) {
      setVoice(kokoro.voices[0].id);
    }
  }, [kokoro.voices, voice]);

  const canStart = Boolean(activeModelPair && voice);

  // Kokoro's `generate()` can't be cancelled mid-flight, so clicking through
  // several cards while one is still generating would otherwise queue up a
  // full generate+decode+play cycle per click, all playing back-to-back.
  // Instead: only one preview runs at a time, and a click during playback
  // just replaces "what plays next" rather than adding to the queue.
  const nextVoiceRef = useRef<string | null>(null);
  const isPreviewingRef = useRef(false);

  async function runPreview(id: string) {
    isPreviewingRef.current = true;
    setPreviewing(id);
    try {
      await kokoro.speak(VOICE_SAMPLE_LINE, id);
    } catch {
      // kokoro.error already surfaces the message; nothing else to do here.
    }
    isPreviewingRef.current = false;
    setPreviewing(null);

    const next = nextVoiceRef.current;
    nextVoiceRef.current = null;
    if (next && next !== id) runPreview(next);
  }

  function handleVoiceSelect(id: string) {
    setVoice(id);
    if (isPreviewingRef.current) {
      nextVoiceRef.current = id;
      return;
    }
    runPreview(id);
  }

  function handleStart() {
    if (!activeModelPair) return;
    const [provider, model] = activeModelPair;
    onStart({
      voice,
      styleId,
      customInstructions: customInstructions.trim() || undefined,
      provider,
      model,
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-8">
      <PageHeader
        title="Mock interview setup"
        description={`Practicing for ${jobTitle}${companyName ? ` at ${companyName}` : ""}.`}
      />

      {kokoro.error && (
        <Card
          padding="sm"
          className="border-agent-error bg-agent-error-container/20"
        >
          <p className="text-agent-error text-sm">{kokoro.error}</p>
        </Card>
      )}

      <Card padding="md" className="space-y-3">
        <div className="flex items-center gap-2">
          <p className="text-agent-on-surface-variant text-xs font-medium tracking-wide uppercase">
            Interviewer voice
          </p>
          {kokoro.status === "loading" && (
            <Badge variant="info">Loading voices…</Badge>
          )}
        </div>
        <VoicePodium
          voices={kokoro.voices}
          value={voice}
          onChange={handleVoiceSelect}
          speakingId={previewing}
          loading={kokoro.voices.length === 0}
        />
      </Card>

      <Card padding="md" className="space-y-3">
        <p className="text-agent-on-surface-variant text-xs font-medium tracking-wide uppercase">
          Interview tone
        </p>
        <div className="grid grid-cols-2 gap-2">
          {(
            Object.entries(INTERVIEW_STYLES) as [
              InterviewStyleId,
              (typeof INTERVIEW_STYLES)[InterviewStyleId],
            ][]
          ).map(([id, style]) => (
            <button
              key={id}
              type="button"
              onClick={() => setStyleId(id)}
              className={cn(
                "rounded-xl border p-3 text-left transition-colors",
                styleId === id
                  ? "border-agent-primary bg-agent-primary-container text-agent-on-primary-container"
                  : "border-agent-outline-variant bg-agent-surface-lowest text-agent-on-surface hover:border-agent-primary"
              )}
            >
              <p className="text-sm font-semibold">{style.label}</p>
              <p className="text-xs opacity-80">{style.description}</p>
            </button>
          ))}
        </div>
        <textarea
          value={customInstructions}
          onChange={(e) => setCustomInstructions(e.target.value)}
          placeholder="Any custom instructions for this interview (optional)…"
          rows={3}
          className={cn(FIELD_CLASSES, "resize-none")}
        />
      </Card>

      <Card padding="md" className="space-y-3">
        <p className="text-agent-on-surface-variant text-xs font-medium tracking-wide uppercase">
          Model
        </p>
        <ModelSelector variant="compact" />
      </Card>

      <Button
        onClick={handleStart}
        disabled={!canStart}
        variant="primary"
        size="lg"
        className="w-full"
      >
        Start interview
      </Button>
    </div>
  );
}
