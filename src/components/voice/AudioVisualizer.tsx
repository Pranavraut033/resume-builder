"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/cn";

interface AudioVisualizerProps {
  /** Live analyser node to visualize, or `null` while idle/unavailable. */
  analyser: AnalyserNode | null;
  className?: string;
  width?: number;
  height?: number;
}

const BAR_COLOR = "#6366f1";

/**
 * Bar-style canvas visualizer driven by an `AnalyserNode`'s frequency data.
 * Runs its own `requestAnimationFrame` loop while `analyser` is set, and
 * cancels it on unmount or whenever `analyser` changes/clears.
 */
export function AudioVisualizer({
  analyser,
  className,
  width = 600,
  height = 90,
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    // Idle: wipe the last drawn frame rather than leaving it frozen on screen
    // (visible on the mic-test page, where the canvas stays mounted after
    // playback or listening stops).
    if (!analyser) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const data = new Uint8Array(analyser.frequencyBinCount);

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(data);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = canvas.width / data.length;
      data.forEach((value, i) => {
        const barHeight = (value / 255) * canvas.height;
        ctx.fillStyle = BAR_COLOR;
        ctx.fillRect(
          i * barWidth,
          canvas.height - barHeight,
          barWidth - 1,
          barHeight
        );
      });
    };
    draw();

    return () => {
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    };
  }, [analyser]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={cn(
        "border-agent-outline-variant bg-agent-surface-low w-full rounded-lg border",
        className
      )}
    />
  );
}
