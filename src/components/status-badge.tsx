import { cn } from "cn";

import type { Tone } from "@/lib/api/types";

const TONE_DOT: Record<Tone, string> = {
  neutral: "bg-tone-neutral",
  info: "bg-tone-info",
  success: "bg-tone-success",
  warning: "bg-tone-warning",
  danger: "bg-tone-danger",
};

interface StatusBadgeProps {
  label: string;
  tone?: Tone;
  className?: string;
}

/**
 * Status as a neutral pill with a coloured dot. The label always uses the normal text
 * colour, so it stays readable in both themes; only the dot carries the tone.
 */
export function StatusBadge({ label, tone = "neutral", className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full border bg-card px-2 text-xs font-medium whitespace-nowrap text-foreground",
        className,
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", TONE_DOT[tone])} />
      {label}
    </span>
  );
}
