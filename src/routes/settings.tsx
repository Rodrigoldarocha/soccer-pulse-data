import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Configurações — PulseLab" },
      { name: "description", content: "Preferências do painel de análise esportiva." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const [defaultStake, setDefaultStake] = useState(10);
  const [aggressive, setAggressive] = useState(false);

  return (
    <div className="max-w-2xl space-y-6">
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">Configurações</h1>
        <p className="mt-1 text-sm text-muted-foreground/60">Preferências locais do bilhete e do painel.</p>
      </motion.header>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="card-premium space-y-5 p-6"
      >
        <label className="block">
          <span className="text-sm font-medium text-foreground">Aporte padrão (R$)</span>
          <input
            type="number"
            min={1}
            value={defaultStake}
            onChange={(e) => setDefaultStake(Number(e.target.value) || 0)}
            className="mt-1.5 w-full rounded-xl border border-border/50 bg-white/[0.03] px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/30 focus:border-primary/50 focus:ring-2 focus:ring-primary/15 transition-all duration-200"
          />
          <span className="mt-1.5 block text-xs text-muted-foreground/50">
            Usado como valor inicial do bilhete em novas seleções.
          </span>
        </label>

        <label className="flex items-start gap-3 rounded-xl border border-border/30 bg-white/[0.02] p-4 cursor-pointer">
          <input
            type="checkbox"
            checked={aggressive}
            onChange={(e) => setAggressive(e.target.checked)}
            className={cn(
              "mt-0.5 h-4 w-4 rounded border-border/50 text-primary focus:ring-primary/30",
              "accent-primary",
            )}
          />
          <div>
            <div className="text-sm font-medium text-foreground">Modo ousado</div>
            <div className="text-xs text-muted-foreground/50">
              Prioriza sugestões da IA com mais pernas e odds mais altas.
            </div>
          </div>
        </label>

        <div className="rounded-xl border border-border/30 bg-white/[0.02] p-4 text-xs text-muted-foreground/50">
          <div className="font-display text-sm font-semibold text-foreground">Dados e IA</div>
          <p className="mt-1.5 leading-relaxed">
            As predições usam modelo estatístico xG + Poisson e são combinadas com o modelo
            <span className="font-medium text-foreground"> estatístico ensemble</span> para sugerir múltiplas.
            Todas as odds e probabilidades exibidas são recalculadas no servidor para garantir
            consistência matemática.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
