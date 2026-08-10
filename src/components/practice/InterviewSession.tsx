"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Badge, Button, Card } from "@/components/ui";
import { AudioVisualizer } from "@/components/voice/AudioVisualizer";
import {
  buildInterviewSystemPrompt,
  getNextInterviewTurn,
} from "@/lib/llm/interview/interviewSession";
import { resolveInterviewStyleGuide } from "@/lib/llm/prompts/interviewStyles";
import { ProviderFactory } from "@/lib/llm/providers";
import { useKokoroTTS } from "@/lib/voice/useKokoroTTS";
import { useSpeechRecognition } from "@/lib/voice/useSpeechRecognition";
import { InterviewTranscriptJSON, InterviewTurn } from "@/types/interview";
import { JobDetailsJSON, ResumeJSON } from "@/types/resume";

import { resolveInterviewLLMOptions } from "./resolveInterviewLLMOptions";
import { InterviewSetupChoices } from "./types";

import type { LLMProvider, PromptMessage } from "@pranavraut033/llm-core";

type SessionPhase =
  | "initializing"
  | "interviewer_thinking"
  | "interviewer_speaking"
  | "candidate_listening"
  | "ended";

const PHASE_LABEL: Record<SessionPhase, string> = {
  initializing: "Starting the interview…",
  interviewer_thinking: "Interviewer is thinking of a question…",
  interviewer_speaking: "Interviewer is speaking…",
  candidate_listening: "Listening for your answer…",
  ended: "Interview ended",
};

interface InterviewSessionProps {
  jobDetails: JobDetailsJSON;
  resume: ResumeJSON;
  setup: InterviewSetupChoices;
  /** Called with whatever transcript exists so far — on explicit "End interview" too. */
  onEnd: (transcript: InterviewTranscriptJSON) => void;
}

function transcriptToPromptHistory(
  transcript: InterviewTranscriptJSON
): PromptMessage[] {
  return transcript.map((turn) => ({
    role: turn.role === "interviewer" ? "assistant" : "user",
    content: turn.text,
  }));
}

/**
 * The live turn-taking loop: interviewer asks (streamed + spoken), candidate
 * answers (STT, submitted via an explicit "I'm done answering" control since
 * `useSpeechRecognition`'s `onend` can fire on any silence gap), repeat.
 * "End interview" is available at every point and hands back whatever
 * transcript exists so far.
 */
export function InterviewSession({
  jobDetails,
  resume,
  setup,
  onEnd,
}: InterviewSessionProps) {
  const [phase, setPhase] = useState<SessionPhase>("initializing");
  const [transcript, setTranscript] = useState<InterviewTranscriptJSON>([]);
  const [liveQuestion, setLiveQuestion] = useState("");
  const [turnError, setTurnError] = useState<string | null>(null);

  const tts = useKokoroTTS();
  const stt = useSpeechRecognition();

  const providerRef = useRef<LLMProvider | null>(null);
  const hasStartedRef = useRef(false);
  const endedRef = useRef(false);
  /** Transcript as it stood at the start of the current attempt — the history
   * a Retry should resume from. */
  const attemptHistoryRef = useRef<InterviewTranscriptJSON>([]);
  // Latest hook instances, kept in refs so the cleanup effect and callbacks
  // below always tear down/read the current audio graph instead of a stale
  // closure over the render that defined them.
  const ttsRef = useRef(tts);
  ttsRef.current = tts;
  const sttRef = useRef(stt);
  sttRef.current = stt;

  const systemPrompt = useMemo(
    () =>
      buildInterviewSystemPrompt({
        jobDetails,
        resume,
        styleGuide: resolveInterviewStyleGuide(setup.styleId),
        customInstructions: setup.customInstructions,
      }),
    [jobDetails, resume, setup.styleId, setup.customInstructions]
  );

  const askNextQuestion = useCallback(
    async (history: InterviewTranscriptJSON) => {
      if (endedRef.current) return;
      // Remember what the transcript looked like going into this attempt, so
      // a Retry can roll back to it. Without this, retrying after a failure
      // that happened *after* the interviewer turn was appended (a TTS or mic
      // error) would append a second question on top of the orphaned first.
      attemptHistoryRef.current = history;
      setPhase("interviewer_thinking");
      setLiveQuestion("");
      setTurnError(null);

      try {
        let provider = providerRef.current;
        if (!provider) {
          provider = await ProviderFactory.getInstance(setup.provider);
          if (!provider) {
            throw new Error(`Provider "${setup.provider}" is not available.`);
          }
          providerRef.current = provider;
        }

        const promptHistory = transcriptToPromptHistory(history);
        const options = resolveInterviewLLMOptions(setup.provider, setup.model);

        let full = "";
        for await (const chunk of getNextInterviewTurn(
          provider,
          setup.model,
          systemPrompt,
          promptHistory,
          options
        )) {
          if (endedRef.current) return;
          full += chunk;
          setLiveQuestion(full);
        }

        if (endedRef.current) return;
        if (!full.trim()) {
          throw new Error(
            "The interviewer didn't return a question — try again."
          );
        }

        const turn: InterviewTurn = {
          role: "interviewer",
          text: full,
          at: new Date().toISOString(),
        };
        const nextTranscript = [...history, turn];
        setTranscript(nextTranscript);

        setPhase("interviewer_speaking");
        await ttsRef.current.speak(full, setup.voice);
        if (endedRef.current) return;

        setPhase("candidate_listening");
        const listening = await sttRef.current.start();
        if (!listening) {
          // `start()` reports mic/recognizer failures by returning false, not
          // by throwing. Surfacing it as a turn error is what makes the Retry
          // affordance appear — otherwise the session would sit in
          // "Listening for your answer…" on a microphone that never opened.
          throw new Error(
            "Couldn't start the microphone — check permissions and retry."
          );
        }
      } catch (err) {
        if (endedRef.current) return;
        setTurnError(
          err instanceof Error
            ? err.message
            : "Something went wrong getting the next question."
        );
      }
    },
    [setup, systemPrompt]
  );

  // Start the interview exactly once on mount, with an empty history.
  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;
    void askNextQuestion([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tear down any in-flight audio/mic on unmount. `endedRef` is reset on
  // (re)mount rather than only initialized at declaration: StrictMode runs
  // this effect's cleanup once in dev before re-running it, which would
  // otherwise leave `endedRef` stuck true — the first turn's LLM call then
  // returns silently and the session hangs on "Thinking…" forever.
  useEffect(() => {
    endedRef.current = false;
    return () => {
      endedRef.current = true;
      ttsRef.current.stop();
      sttRef.current.stop();
    };
  }, []);

  const handleDoneAnswering = useCallback(() => {
    const answerText = stt.transcript.trim();
    stt.stop();

    if (!answerText) {
      setTurnError(
        "No answer was captured — check your microphone and try again."
      );
      return;
    }

    const turn: InterviewTurn = {
      role: "candidate",
      text: answerText,
      at: new Date().toISOString(),
    };
    const nextTranscript = [...transcript, turn];
    setTranscript(nextTranscript);
    void askNextQuestion(nextTranscript);
  }, [stt, transcript, askNextQuestion]);

  const handleEndInterview = useCallback(() => {
    endedRef.current = true;
    ttsRef.current.stop();
    sttRef.current.stop();
    setPhase("ended");
    onEnd(transcript);
  }, [transcript, onEnd]);

  const inlineError = turnError || tts.error || stt.error;
  const phaseBadgeVariant =
    phase === "ended"
      ? "default"
      : phase === "candidate_listening"
        ? "success"
        : "info";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-agent-on-surface text-xl font-bold">
            Mock interview
          </h1>
          <p className="text-agent-on-surface-variant text-sm">
            {jobDetails.job.job_title || "This role"}
          </p>
        </div>
        <Button
          variant="danger"
          onClick={handleEndInterview}
          disabled={phase === "ended"}
        >
          End interview
        </Button>
      </div>

      {inlineError && (
        <Card
          padding="sm"
          className="border-agent-error bg-agent-error-container/20"
        >
          <p className="text-agent-error mb-2 text-sm">{inlineError}</p>
          {turnError && phase !== "ended" && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void askNextQuestion(attemptHistoryRef.current)}
            >
              Retry
            </Button>
          )}
        </Card>
      )}

      <Card padding="lg" className="space-y-4">
        <Badge variant={phaseBadgeVariant}>{PHASE_LABEL[phase]}</Badge>

        <p className="text-agent-on-surface min-h-16 text-lg leading-relaxed">
          {liveQuestion ||
            (phase === "interviewer_thinking" ? "Thinking…" : "")}
        </p>

        {phase === "interviewer_speaking" && (
          <AudioVisualizer analyser={tts.analyser} />
        )}

        {phase === "candidate_listening" && (
          <div className="space-y-3">
            <AudioVisualizer analyser={stt.analyser} />
            <p className="text-agent-on-surface-variant text-sm italic">
              {stt.transcript || "Listening…"}
            </p>
            <Button onClick={handleDoneAnswering} variant="primary">
              I&rsquo;m done answering
            </Button>
          </div>
        )}
      </Card>

      {transcript.length > 0 && (
        <Card padding="md" className="max-h-72 space-y-3 overflow-y-auto">
          <p className="text-agent-on-surface-variant text-xs font-medium tracking-wide uppercase">
            Transcript
          </p>
          {transcript.map((turn, i) => (
            <p key={i} className="text-agent-on-surface text-sm">
              <span className="font-semibold">
                {turn.role === "interviewer" ? "Interviewer" : "You"}:
              </span>{" "}
              {turn.text}
            </p>
          ))}
        </Card>
      )}
    </div>
  );
}
