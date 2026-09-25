import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface KellyGlowCardProps {
  children: ReactNode;
  ev?: number;
  threshold?: number;
  className?: string;
  onClick?: () => void;
}

export function KellyGlowCard({ children, ev, threshold = 0.08, className, onClick }: KellyGlowCardProps) {
  const isHighEv = ev != null && ev > threshold;

  return (
    <article
      className={cn(
        "kelly-glow-card",
        isHighEv && "high-ev",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") onClick(); } : undefined}
    >
      {children}
    </article>
  );
}