import { cn } from "@/lib/utils";

interface FairValueBadgeProps {
  fairOdds: number;
  variant?: "default" | "compact" | "inline";
  className?: string;
}

export function FairValueBadge({ fairOdds, variant = "default", className }: FairValueBadgeProps) {
  const baseClasses = "inline-flex items-center gap-1 font-mono font-medium rounded-full border border-secondary/30 bg-secondary/10 text-secondary transition-colors";
  const variantClasses = {
    default: "text-label-sm px-2 py-0.5",
    compact: "text-label-xs px-1.5 py-0.5",
    inline: "text-label-xs px-1.5 py-0.5",
  };

  return (
    <span className={cn(baseClasses, variantClasses[variant], className)} title="Fair odds calculado pelo modelo (1/p calibrado)">
      <span className="font-sans text-[10px] uppercase tracking-wider">FV</span>
      <span className="tabular-nums">{fairOdds.toFixed(2)}</span>
    </span>
  );
}