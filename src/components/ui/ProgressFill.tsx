import { cn } from "@/lib/cn";

/**
 * Absolutely-positioned fill bar for a `relative overflow-hidden` button.
 * Pair with `useFakeProgress` and give the button's label/icon `relative
 * z-10` so it paints above this (position:absolute with no z-index would
 * otherwise stack above static siblings).
 */
export function ProgressFill({
  percent,
  className,
}: {
  percent: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "absolute inset-y-0 left-0 bg-white/20 transition-[width] duration-200 ease-out",
        className
      )}
      style={{ width: `${percent}%` }}
    />
  );
}
