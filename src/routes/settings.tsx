import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

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
      <header>
        <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">Configurações</h1>
        <p className="text-sm text-muted-foreground">Preferências locais do bilhete e do painel.</p>
      </header>

      <div className="card-elevated space-y-4 p-6">
        <label className="block">
          <span className="text-sm font-medium text-foreground">Aporte padrão (R$)</span>
          <input
            type="number"
            min={1}
            value={defaultStake}
            onChange={(e) => setDefaultStake(Number(e.target.value) || 0)}
            className="mt-1 w-full rounded-xl border border-border bg-white/5 px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
          />
          <span className="mt-1 block text-xs text-muted-foreground">
            Usado como valor inicial do bilhete em novas seleções.
          </span>
        </label>

        <label className="flex items-start gap-3 rounded-xl border border-border bg-white/3 p-3">
          <input
            type="checkbox"
            checked={aggressive}
            onChange={(e) => setAggressive(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
          />
          <div>
            <div className="text-sm font-medium text-foreground">Modo ousado</div>
            <div className="text-xs text-muted-foreground">
              Prioriza sugestões da IA com mais pernas e odds mais altas.
            </div>
          </div>
        </label>

        <div className="rounded-xl border border-border bg-white/3 p-4 text-xs text-muted-foreground">
          <div className="font-display text-sm font-semibold text-foreground">Dados e IA</div>
          <p className="mt-1">
            As predições usam modelo estatístico xG + Poisson e são combinadas com o modelo
            <span className="font-medium text-foreground"> estatístico ensemble</span> para sugerir múltiplas.
            Todas as odds e probabilidades exibidas são recalculadas no servidor para garantir
            consistência matemática.
          </p>
        </div>
      </div>
    </div>
  );
}
