import { useState } from "react";
import { Info, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface PipelineStatusStripProps {
  weights?: { api: number; dc: number; market: number };
  calibrationResidue?: number;
  oddsFilter?: { min: number; max: number; trap: number };
  dispersionRule?: string;
  className?: string;
}

export function PipelineStatusStrip({
  weights = { api: 0.45, dc: 0.35, market: 0.20 },
  calibrationResidue = 0.018,
  oddsFilter = { min: 1.40, max: 4.50, trap: 1.25 },
  dispersionRule = "1 mercado / confronto",
  className,
}: PipelineStatusStripProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={cn("pipeline-status", className)}>
      <div className="pipeline-indicator">
        <span className="pipeline-dot" aria-hidden="true" />
        <span className="font-label-xs text-label-xs text-primary uppercase tracking-wider truncate">
          Pipeline Ativo · Platt/Isotonic Calib
        </span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="px-1.5 py-0.5 rounded-md bg-surface-base font-label-xs text-label-xs text-secondary font-medium">
          Brier W: {weights.api}/{weights.dc}/{weights.market}
        </span>
        <button
          aria-label={expanded ? "Ocultar detalhes da calibração" : "Mostrar detalhes da calibração"}
          className="flex items-center justify-center w-6 h-6 rounded-md bg-surface-base text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      <div
        className={cn(
          "mt-2 p-space-sm rounded-lg bg-canvas text-muted-foreground font-label-xs text-label-xs space-y-1 transition-all duration-200 overflow-hidden",
          expanded ? "max-h-32 opacity-100" : "max-h-0 opacity-0 pointer-events-none"
        )}
      >
        <div className="flex justify-between">
          <span>Ajuste Isotonic Regression:</span>
          <span className="text-primary font-bold">Resíduo {calibrationResidue.toFixed(3)}</span>
        </div>
        <div className="flex justify-between">
          <span>Filtro de Ruído Odds:</span>
          <span className="text-foreground">Min {oddsFilter.min} — Max {oddsFilter.max} (Trap &lt; {oddsFilter.trap} ignorada)</span>
        </div>
        <div className="flex justify-between">
          <span>Regra de Dispersão:</span>
          <span className="text-secondary font-medium">{dispersionRule}</span>
        </div>
      </div>
    </div>
  );
}