import { cn, getPhaseColor, formatPhase } from "@/lib/utils";
import type { Phase } from "@/lib/types";

interface PhaseTagProps {
  phase: Phase;
  size?: "sm" | "md";
  className?: string;
}

export default function PhaseTag({ phase, size = "md", className }: PhaseTagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs",
        getPhaseColor(phase),
        className
      )}
    >
      {formatPhase(phase)}
    </span>
  );
}
