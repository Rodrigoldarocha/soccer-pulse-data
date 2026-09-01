import { AnimatePresence, motion } from "framer-motion";
import { Trash2, Sparkles, Wallet, Trophy, TrendingUp, AlertTriangle, Zap } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { riskLevel, useBetSlip } from "@/lib/bet-slip";

function toneClasses(tone: ReturnType<typeof riskLevel>["tone"]) {
  switch (tone) {
    case "safe": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "moderate": return "bg-sky-500/10 text-sky-400 border-sky-500/20";
    case "aggressive": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case "danger": return "bg-orange-500/10 text-orange-400 border-orange-500/20";
    case "extreme": return "bg-rose-500/10 text-rose-400 border-rose-500/20";
    default: return "bg-white/5 text-muted-foreground border-border";
  }
}

function BetSlipCard({ compact = false }: { compact?: boolean }) {
  const { legs, removeLeg, clear, stake, setStake, totals } = useBetSlip();
  const risk = riskLevel(totals.probability, legs.length);

  return (
    <div className={cn(
      "flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lg",
      compact && "max-h-[75vh]",
    )}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Wallet className="h-4 w-4" />
          </div>
          <div>
            <div className="font-display text-sm font-semibold text-foreground">Bilhete</div>
            <div className="text-xs text-muted-foreground">
              {legs.length} seleç{legs.length === 1 ? "ão" : "ões"}
            </div>
          </div>
        </div>
        {legs.length > 0 ? (
          <button
            onClick={clear}
            className="text-xs font-medium text-muted-foreground transition hover:text-destructive"
          >
            Limpar
          </button>
        ) : null}
      </div>

      {/* Legs list */}
      <div className="flex-1 divide-y divide-border overflow-y-auto">
        {legs.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <Sparkles className="mx-auto mb-3 h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              Selecione mercados nos cards para montar sua múltipla.
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {legs.map((l) => (
              <motion.div
                key={`${l.matchId}-${l.market}`}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 40 }}
                className="flex items-start justify-between gap-3 px-5 py-3"
              >
                <div className="min-w-0">
                  <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
                    {l.leagueLabel}
                  </div>
                  <div className="truncate text-sm font-medium text-foreground">{l.matchLabel}</div>
                  <div className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                    {l.marketLabel}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="font-display text-sm font-bold text-foreground tabular-nums">
                    {l.odds.toFixed(2)}
                  </span>
                  <button
                    onClick={() => removeLeg(l.matchId)}
                    className="rounded-lg p-1 text-muted-foreground/50 transition hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Remover"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Totals + stake */}
      <div className="space-y-3 border-t border-border bg-white/2 p-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/5 p-3">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground/60">Odds combinadas</div>
            <div className="mt-1 font-display text-lg font-bold text-foreground tabular-nums">
              {legs.length ? totals.odds.toFixed(2) : "—"}
            </div>
          </div>
          <div className="rounded-xl bg-white/5 p-3">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground/60">Prob. real</div>
            <div className="mt-1 font-display text-lg font-bold text-foreground tabular-nums">
              {legs.length ? `${(totals.probability * 100).toFixed(1)}%` : "—"}
            </div>
          </div>
        </div>

        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Aporte (R$)</span>
          <input
            type="number"
            min={1}
            step={1}
            value={stake}
            onChange={(e) => setStake(Math.max(0, Number(e.target.value) || 0))}
            className="mt-1 w-full rounded-xl border border-border bg-white/5 px-3 py-2.5 text-sm font-medium text-foreground outline-none transition placeholder:text-muted-foreground/40 focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/5 p-3">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground/60">Retorno</div>
            <div className="mt-1 flex items-center gap-1.5 font-display text-base font-bold text-foreground tabular-nums">
              <Trophy className="h-3.5 w-3.5 text-primary" />
              R$ {totals.ret.toFixed(2)}
            </div>
          </div>
          <div className="rounded-xl bg-white/5 p-3">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground/60">Lucro</div>
            <div className="mt-1 flex items-center gap-1.5 font-display text-base font-bold text-emerald-400 tabular-nums">
              <TrendingUp className="h-3.5 w-3.5" />
              R$ {totals.profit.toFixed(2)}
            </div>
          </div>
        </div>

        <div className={cn("flex items-start gap-2 rounded-xl border p-3 text-xs", toneClasses(risk.tone))}>
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <div className="font-semibold">{risk.label}</div>
            <div className="opacity-80">{risk.hint}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function BetSlipDesktop() {
  return (
    <aside className="sticky top-6 hidden lg:block">
      <BetSlipCard />
    </aside>
  );
}

export function BetSlipMobileFloating() {
  const { legs, totals } = useBetSlip();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition active:scale-95 glow-green lg:hidden",
          legs.length === 0 && "opacity-90",
        )}
        aria-label="Abrir bilhete"
      >
        <Wallet className="h-4 w-4" />
        <span>{legs.length} seleç{legs.length === 1 ? "ão" : "ões"}</span>
        <span className="rounded-full bg-white/20 px-3 py-0.5 font-display text-xs tabular-nums">
          {legs.length ? totals.odds.toFixed(2) : "—"}
        </span>
      </button>

      <AnimatePresence>
        {open ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 glass lg:hidden"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-card border-t border-border lg:hidden"
            >
              <div className="flex justify-center py-2">
                <div className="h-1 w-10 rounded-full bg-border" />
              </div>
              <BetSlipCard compact />
              <button
                onClick={() => setOpen(false)}
                className="mx-5 mb-4 mt-2 w-[calc(100%-2.5rem)] rounded-xl border border-border py-2.5 text-sm font-medium text-muted-foreground hover:bg-white/5 transition-colors"
              >
                Fechar
              </button>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
