/**
 * Small helper to merge class names safely for Tailwind usage.
 * Uses `clsx` for conditional joining and `twMerge` to dedupe Tailwind classes.
 */
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(...inputs));
}

export default cn;
