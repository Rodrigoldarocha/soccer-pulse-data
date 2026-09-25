import { cn } from "@/lib/utils";

interface OddsCellProps {
  odds: number | null;
  isMarket?: boolean;
  isFair?: boolean;
  variant?: "default" | "compact" | "large";
  className?: string;
}

export function OddsCell({ odds, isMarket = true, isFair = false, variant = "default", className }: OddsCellProps) {
  if (odds == null) {
    return (
      <span className={cn("font-mono tabular-nums text-muted-foreground", variantClasses[variant], className)}>
        —
      </span>
    );
  }

  const baseClasses = "font-mono tabular-nums font-bold text-right";
  const variantClasses: Record<string, string> = {
    default: "text-label-md",
    compact: "text-label-sm",
    large: "text-label-lg",
  };
  const colorClasses = isFair
    ? "text-secondary"
    : isMarket
      ? "text-foreground"
      : "text-muted-foreground";

  return (
    <span className={cn(baseClasses, variantClasses[variant], colorClasses, className)}>
      {odds.toFixed(2)}
    </span>
  );
}

interface ProbabilityCellProps {
  probability: number;
  level?: "strong" | "moderate" | "neutral";
  variant?: "default" | "compact" | "large";
  showPercent?: boolean;
  className?: string;
}

export function ProbabilityCell({ probability, level = "moderate", variant = "default", showPercent = true, className }: ProbabilityCellProps) {
  const baseClasses = "font-mono tabular-nums font-bold text-right";
  const variantClasses: Record<string, string> = {
    default: "text-label-md",
    compact: "text-label-sm",
    large: "text-label-lg",
  };
  const levelClasses = {
    strong: "text-primary prob-strong",
    moderate: "text-foreground prob-moderate",
    neutral: "text-muted-foreground prob-neutral",
  };

  return (
    <span className={cn(baseClasses, variantClasses[variant], levelClasses[level], className)}>
      {showPercent ? `${Math.round(probability * 100)}%` : probability.toFixed(3)}
    </span>
  );
}