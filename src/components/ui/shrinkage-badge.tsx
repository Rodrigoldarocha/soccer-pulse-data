import { cn } from "@/lib/utils";

interface ShrinkageBadgeProps {
  label?: string;
  variant?: "default" | "compact" | "xg-estimated";
  className?: string;
}

export function ShrinkageBadge({ label, variant = "default", className }: ShrinkageBadgeProps) {
  const baseClasses = "inline-flex items-center gap-1 font-medium rounded-full border border-tertiary/30 bg-tertiary/10 text-tertiary transition-colors";
  const variantClasses = {
    default: "text-label-sm px-2 py-0.5",
    compact: "text-label-xs px-1.5 py-0.5",
    "xg-estimated": "text-label-xs px-1.5 py-0.5",
  };

  const defaultLabel = variant === "xg-estimated" ? "xG est." : "Alta var.";

  return (
    <span className={cn(baseClasses, variantClasses[variant], className)} title={variant === "xg-estimated" ? "xG estimado (não medido)" : "Shrinkage / alta variância — amostra reduzida ou volatilidade por lesão"}>
      {label ?? defaultLabel}
    </span>
  );
}