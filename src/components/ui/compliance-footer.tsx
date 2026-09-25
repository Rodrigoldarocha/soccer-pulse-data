import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComplianceFooterProps {
  version?: string;
  latency?: string;
  className?: string;
}

export function ComplianceFooter({ version = "4.2.1", latency = "<14ms", className }: ComplianceFooterProps) {
  return (
    <footer className={cn("compliance-footer", className)}>
      <div className="flex items-center gap-1.5">
        <Shield className="h-3 w-3" aria-hidden="true" />
        <span>Modelos de Probabilidade Quantitativa · Fins Educacionais</span>
      </div>
      <p className="max-w-xs text-muted-foreground/70">
        Rentabilidade passada não é garantia de retornos futuros. Pratique gestão de banca consciente. Não aposte dinheiro reservado.
      </p>
      <div className="flex items-center gap-2 mt-1">
        <span className="px-2 py-0.5 rounded-md bg-surface-overlay text-muted-foreground font-label-xs text-label-xs font-bold">+18</span>
        <span className="font-label-xs text-label-xs text-muted-foreground/50">
          PulseLab Engine v{version} · Latência {latency}
        </span>
      </div>
    </footer>
  );
}