import { cn } from "@/lib/utils";

interface EdgeBadgeProps {
  ev: number;
  variant?: "default" | "compact" | "large";
  showIcon?: boolean;
  className?: string;
}

export function EdgeBadge({ ev, variant = "default", showIcon = true, className }: EdgeBadgeProps) {
  const isPositive = ev > 0;
  const evPct = (ev * 100).toFixed(1);

  const baseClasses = "inline-flex items-center gap-1 font-mono font-medium rounded-full px-2 py-0.5 transition-colors";
  const variantClasses = {
    default: "text-label-sm",
    compact: "text-label-xs px-1.5",
    large: "text-label-md px-3 py-1",
  };
  const colorClasses = isPositive
    ? "bg-primary/10 border border-primary text-primary"
    : "bg-destructive/10 border border-destructive text-destructive";

  const icon = isPositive ? "▲" : "▼";

  return (
    <span
      className={cn(baseClasses, variantClasses[variant], colorClasses, className)}
      title={`EV: ${isPositive ? "+" : ""}${evPct}%`}
    >
      {showIcon && <span aria-hidden="true">{icon}</span>}
      <span className="tabular-nums">{isPositive ? "+" : ""}{evPct}%</span>
      <span className="hidden sm:inline">EV</span>
    </span>
  );
}