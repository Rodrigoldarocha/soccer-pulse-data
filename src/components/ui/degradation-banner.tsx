import { AlertTriangle, WifiOff, Database, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface DegradationBannerProps {
  warnings: Array<{
    type: "bzzoiro_offline" | "supabase_offline" | "pipeline_timeout" | "no_calibration" | "insufficient_history";
    message: string;
  }>;
  className?: string;
}

export function DegradationBanner({ warnings, className }: DegradationBannerProps) {
  if (warnings.length === 0) return null;

  const typeConfig = {
    bzzoiro_offline: { icon: WifiOff, color: "tertiary", bg: "bg-tertiary/10 border-tertiary/30" },
    supabase_offline: { icon: Database, color: "tertiary", bg: "bg-tertiary/10 border-tertiary/30" },
    pipeline_timeout: { icon: AlertCircle, color: "destructive", bg: "bg-destructive/10 border-destructive/30" },
    no_calibration: { icon: AlertTriangle, color: "secondary", bg: "bg-secondary/10 border-secondary/30" },
    insufficient_history: { icon: AlertTriangle, color: "secondary", bg: "bg-secondary/10 border-secondary/30" },
  } as const;

  return (
    <div className={cn("px-margin mb-4 space-y-2", className)}>
      {warnings.map((w, i) => {
        const config = typeConfig[w.type];
        const Icon = config.icon;
        return (
          <div
            key={i}
            className={cn(
              "rounded-xl border p-space-sm flex items-start gap-3",
              config.bg
            )}
          >
            <Icon className={cn("h-5 w-5 shrink-0 mt-0.5", `text-${config.color}`)} aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className={cn("font-label-sm text-label-sm", `text-${config.color}`)}>{w.message}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface PipelineWarningProps {
  type: "partial" | "timeout" | "fallback";
  message: string;
  details?: string[];
  className?: string;
}

export function PipelineWarning({ type, message, details, className }: PipelineWarningProps) {
  const config = {
    partial: { icon: AlertTriangle, color: "tertiary", label: "Dados Parciais" },
    timeout: { icon: AlertCircle, color: "destructive", label: "Timeout" },
    fallback: { icon: Info, color: "secondary", label: "Modo Fallback" },
  }[type];

  const Icon = config.icon;

  return (
    <div className={cn("rounded-xl border p-space-sm flex items-start gap-3", type === "partial" ? "bg-tertiary/10 border-tertiary/30" : type === "timeout" ? "bg-destructive/10 border-destructive/30" : "bg-secondary/10 border-secondary/30", className)}>
      <Icon className={cn("h-5 w-5 shrink-0 mt-0.5", `text-${config.color}`)} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className={cn("font-label-sm text-label-sm font-semibold", `text-${config.color}`)}>{config.label}</p>
        <p className={cn("mt-0.5 text-label-xs", `text-${config.color}/80`)}>{message}</p>
        {details && details.length > 0 && (
          <ul className={cn("mt-1 space-y-0.5 text-label-xs", `text-${config.color}/70`)}>
            {details.map((d, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="h-1 w-1 rounded-full mt-1.5 shrink-0" />
                {d}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

interface SkeletonCardProps {
  className?: string;
}

export function SkeletonCard({ className }: SkeletonCardProps) {
  return (
    <div className={cn("skeleton rounded-xl h-40", className)} aria-hidden="true" />
  );
}

interface SkeletonRowProps {
  className?: string;
}

export function SkeletonRow({ className }: SkeletonRowProps) {
  return (
    <div className={cn("skeleton h-12 rounded-lg", className)} aria-hidden="true" />
  );
}

interface SkeletonGridProps {
  cols?: number;
  rows?: number;
  className?: string;
}

export function SkeletonGrid({ cols = 3, rows = 2, className }: SkeletonGridProps) {
  return (
    <div className={cn("grid gap-4", `sm:grid-cols-${cols}`, className)}>
      {Array.from({ length: cols * rows }).map((_, i) => (
        <div key={i} className="skeleton h-24 rounded-xl" aria-hidden="true" />
      ))}
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: { label: string; href: string };
  className?: string;
}

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div className={cn("empty-block", className)}>
      {icon && <div className="mb-2 text-primary">{icon}</div>}
      <p className="empty-title">{title}</p>
      {description && <p className="empty-body">{description}</p>}
      {action && (
        <a href={action.href} className="empty-link">
          {action.label}
        </a>
      )}
    </div>
  );
}