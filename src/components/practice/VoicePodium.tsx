"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/cn";
import { KokoroVoiceOption } from "@/lib/voice/useKokoroTTS";

import { VoiceFace } from "./VoiceFace";

interface VoicePodiumProps {
  voices: KokoroVoiceOption[];
  value: string;
  onChange: (id: string) => void;
  speakingId: string | null;
  loading: boolean;
}

/**
 * Horizontal scroll-snap carousel of voice face cards. The selected card is
 * centred and raised (podium look); distance-from-selection alone drives the
 * scale/opacity, so no scroll-position tracking is needed.
 */
export function VoicePodium({
  voices,
  value,
  onChange,
  speakingId,
  loading,
}: VoicePodiumProps) {
  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    cardRefs.current[value]?.scrollIntoView({
      inline: "center",
      block: "nearest",
      behavior: "smooth",
    });
  }, [value]);

  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-hidden px-[20%] py-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="border-agent-outline-variant bg-agent-surface-lowest flex w-28 shrink-0 animate-pulse flex-col items-center gap-2 rounded-2xl border p-3"
          >
            <div className="bg-agent-outline-variant/50 h-16 w-16 rounded-full" />
            <div className="bg-agent-outline-variant/50 h-3 w-16 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const selectedIndex = voices.findIndex((v) => v.id === value);

  return (
    <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-[45%] py-4">
      {voices.map((v, i) => {
        const selected = v.id === value;
        const distance = Math.abs(i - selectedIndex);
        return (
          <button
            key={v.id}
            ref={(el) => {
              cardRefs.current[v.id] = el;
            }}
            type="button"
            aria-pressed={selected}
            title={`${v.name} (${v.language}, ${v.gender})`}
            onClick={() => onChange(v.id)}
            className={cn(
              "flex w-28 shrink-0 snap-center flex-col items-center gap-2 rounded-2xl border p-3 transition-all duration-300",
              selected
                ? "border-agent-primary bg-agent-primary-container -translate-y-2 scale-110 shadow-(--shadow-agent-card)"
                : distance === 1
                  ? "border-agent-outline-variant bg-agent-surface-lowest scale-95 opacity-80"
                  : "border-agent-outline-variant bg-agent-surface-lowest scale-90 opacity-50"
            )}
          >
            <VoiceFace
              voiceId={v.id}
              gender={v.gender}
              speaking={speakingId === v.id}
              className="h-16 w-16"
            />
            <p className="text-agent-on-surface w-full truncate text-center text-xs font-semibold">
              {v.name}
            </p>
            <p className="text-agent-on-surface-variant text-[10px]">
              {v.language} · {v.gender}
            </p>
          </button>
        );
      })}
    </div>
  );
}

export default VoicePodium;
