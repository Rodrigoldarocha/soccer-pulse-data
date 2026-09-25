import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface BentoCardProps {
  children: ReactNode;
  icon?: ReactNode;
  iconColor?: "primary" | "secondary" | "tertiary";
  className?: string;
}

export function BentoCard({ children, icon, iconColor = "primary", className }: BentoCardProps) {
  const iconColorClasses = {
    primary: "text-primary",
    secondary: "text-secondary",
    tertiary: "text-tertiary",
  };

  return (
    <div className={cn("bento-card", className)}>
      {icon && (
        <div className={cn("bento-icon", iconColorClasses[iconColor])}>
          {icon}
        </div>
      )}
      {children}
    </div>
  );
}